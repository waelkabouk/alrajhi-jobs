import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
// Use legacy build of pdfjs to avoid native canvas dependency in Deno
import * as pdfjs from "https://esm.sh/pdfjs-dist@3.11.174/legacy/build/pdf.mjs";
import mammoth from "https://esm.sh/mammoth@1.7.0";

// Disable worker (not needed for text extraction)
// @ts-expect-error worker not needed
pdfjs.GlobalWorkerOptions.workerSrc = "";
const getDocument = pdfjs.getDocument;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const detectLang = (text: string): "ar" | "en" => {
  const arabic = (text.match(/[\u0600-\u06FF]/g) ?? []).length;
  const latin = (text.match(/[A-Za-z]/g) ?? []).length;
  return arabic > latin ? "ar" : "en";
};

async function extractText(bytes: Uint8Array, ext: string): Promise<string> {
  if (ext === "pdf") {
    const doc = await getDocument({ data: bytes }).promise;
    let out = "";
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      out += content.items.map((it: { str?: string }) => it.str ?? "").join(" ") + "\n";
    }
    return out;
  }
  if (ext === "docx") {
    const result = await mammoth.extractRawText({ buffer: bytes as unknown as Buffer });
    return result.value;
  }
  return "";
}

interface ScoreResult {
  skills: string[];
  experience_years: number;
  keywords: string[];
  summary: string;
}

async function callAi(cvText: string, jobText: string, lang: string): Promise<ScoreResult> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

  const sys = `You are an ATS analyst. Extract structured data from a CV and compare it to a job. Respond in ${lang === "ar" ? "Arabic" : "English"}.`;
  const userMsg = `JOB:\n${jobText}\n\nCV:\n${cvText.slice(0, 12000)}`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [{ role: "system", content: sys }, { role: "user", content: userMsg }],
      tools: [{
        type: "function",
        function: {
          name: "score_cv",
          description: "Return structured CV analysis vs job",
          parameters: {
            type: "object",
            properties: {
              skills: { type: "array", items: { type: "string" }, description: "Skills from the CV that match the job" },
              experience_years: { type: "number", description: "Total relevant years of experience" },
              keywords: { type: "array", items: { type: "string" }, description: "Important keywords matched" },
              summary: { type: "string", description: "Short summary of fit, 1-2 sentences" },
            },
            required: ["skills", "experience_years", "keywords", "summary"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "score_cv" } },
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`AI gateway ${res.status}: ${txt}`);
  }
  const json = await res.json();
  const call = json.choices?.[0]?.message?.tool_calls?.[0];
  if (!call) throw new Error("No tool call returned");
  return JSON.parse(call.function.arguments) as ScoreResult;
}

function computeScore(parsed: ScoreResult, jobText: string): { score: number; breakdown: Record<string, number> } {
  const jobLower = jobText.toLowerCase();
  // Skills: % of CV skills mentioned in job
  const skillHits = parsed.skills.filter((s) => jobLower.includes(s.toLowerCase())).length;
  const skillScore = parsed.skills.length ? (skillHits / parsed.skills.length) * 100 : 0;
  // Experience: cap at 8 yrs = 100%
  const expScore = Math.min(parsed.experience_years / 8, 1) * 100;
  // Keywords
  const kwHits = parsed.keywords.filter((k) => jobLower.includes(k.toLowerCase())).length;
  const kwScore = parsed.keywords.length ? (kwHits / parsed.keywords.length) * 100 : 0;
  // Signals: summary length proxy
  const signalScore = parsed.summary.length > 50 ? 100 : 50;

  const total = skillScore * 0.4 + expScore * 0.3 + kwScore * 0.2 + signalScore * 0.1;
  return {
    score: Math.round(total),
    breakdown: {
      skills: Math.round(skillScore),
      experience: Math.round(expScore),
      keywords: Math.round(kwScore),
      signals: Math.round(signalScore),
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { applicationId } = await req.json();
    if (!applicationId) {
      return new Response(JSON.stringify({ error: "applicationId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: app, error: appErr } = await admin
      .from("applications")
      .select("id, candidate_id, job_id, jobs ( title_en, title_ar, description_en, description_ar, requirements_en, requirements_ar ), candidates ( id, cv_file_url )")
      .eq("id", applicationId)
      .maybeSingle();
    if (appErr || !app) throw new Error(appErr?.message || "Application not found");

    const cvPath = (app.candidates as { cv_file_url: string | null } | null)?.cv_file_url;
    if (!cvPath) throw new Error("No CV file");

    const { data: file, error: dlErr } = await admin.storage.from("cvs").download(cvPath);
    if (dlErr || !file) throw new Error(dlErr?.message || "Download failed");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const ext = cvPath.split(".").pop()?.toLowerCase() ?? "";

    let cvText = "";
    try {
      cvText = await extractText(bytes, ext);
    } catch (e) {
      console.error("extract failed", e);
    }
    const lang = detectLang(cvText);

    const job = app.jobs as { title_en?: string; title_ar?: string; description_en?: string; description_ar?: string; requirements_en?: string; requirements_ar?: string } | null;
    const jobText = lang === "ar"
      ? [job?.title_ar, job?.description_ar, job?.requirements_ar].filter(Boolean).join("\n")
      : [job?.title_en, job?.description_en, job?.requirements_en].filter(Boolean).join("\n");

    let score = 0;
    let breakdown: Record<string, number> = {};
    let parsed: ScoreResult | null = null;
    if (cvText.trim().length > 30 && jobText.trim().length > 0) {
      try {
        parsed = await callAi(cvText, jobText, lang);
        const r = computeScore(parsed, jobText);
        score = r.score; breakdown = r.breakdown;
      } catch (e) {
        console.error("AI scoring failed", e);
      }
    }

    await admin.from("candidates").update({
      cv_text: cvText.slice(0, 20000),
      cv_language: lang,
      parsed_data: parsed as unknown as Record<string, unknown> | null,
    }).eq("id", (app.candidates as { id: string }).id);

    await admin.from("applications").update({
      score,
      score_breakdown: breakdown,
    }).eq("id", applicationId);

    return new Response(JSON.stringify({ ok: true, score, breakdown }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
