import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { resolvePDFJS } from "npm:pdfjs-serverless@0.5.0";
import { unzip } from "npm:unzipit@1.4.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const detectLang = (text: string): "ar" | "en" => {
  const arabic = (text.match(/[\u0600-\u06FF]/g) ?? []).length;
  const latin = (text.match(/[A-Za-z]/g) ?? []).length;
  return arabic > latin ? "ar" : "en";
};

async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const { getDocument } = await resolvePDFJS();
  const doc = await getDocument({ data: bytes, useSystemFonts: true }).promise;
  let out = "";
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    out += content.items.map((it: { str?: string }) => it.str ?? "").join(" ") + "\n";
  }
  return out;
}

async function extractDocxText(bytes: Uint8Array): Promise<string> {
  // DOCX = zip; word/document.xml contains the body. Strip XML tags for plain text.
  const { entries } = await unzip(bytes);
  const docEntry = entries["word/document.xml"];
  if (!docEntry) return "";
  const xml = await docEntry.text();
  // Insert spaces between tags to keep words separated, then strip tags
  return xml
    .replace(/<\/w:p>/g, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function extractText(bytes: Uint8Array, ext: string): Promise<string> {
  if (ext === "pdf") return await extractPdfText(bytes);
  if (ext === "docx") return await extractDocxText(bytes);
  return "";
}

interface ScoreResult {
  skills: string[];
  experience_years: number;
  keywords: string[];
  summary: string;
  notes: string;
}

async function callAi(pdfBytes: Uint8Array, jobText: string, lang: string): Promise<ScoreResult> {
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY missing");
  const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-2.5-flash";

  const sys = `You are an ATS analyst. Analyze the attached CV PDF and compare it to the job description. Always respond entirely in Arabic.`;
  // Safe base64 encoding — avoids stack overflow on large PDFs (spread operator limit)
  let binary = "";
  for (let i = 0; i < pdfBytes.length; i++) binary += String.fromCharCode(pdfBytes[i]);
  const base64 = btoa(binary);

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: sys }] },
      contents: [{
        role: "user",
        parts: [
          { inlineData: { mimeType: "application/pdf", data: base64 } },
          { text: `Compare this CV to the following job:\n${jobText}` },
        ],
      }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            skills:           { type: "ARRAY", items: { type: "STRING" }, description: "Skills from the CV that match the job" },
            experience_years: { type: "NUMBER", description: "Total relevant years of experience" },
            keywords:         { type: "ARRAY", items: { type: "STRING" }, description: "Important keywords matched" },
            summary:          { type: "STRING", description: "Short summary of fit, 1-2 sentences" },
            notes:            { type: "STRING", description: "1-3 sentences on strengths, gaps, and fit. Write in Arabic." },
          },
          required: ["skills", "experience_years", "keywords", "summary", "notes"],
        },
      },
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Gemini API ${res.status}: ${txt}`);
  }
  const json = await res.json();
  let text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("No text returned from Gemini");
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  return JSON.parse(text) as ScoreResult;
}

function computeScore(parsed: ScoreResult): { score: number; breakdown: Record<string, number> } {
  // Experience: max score at 10+ years (100%), scales linearly
  const expScore = Math.min((parsed.experience_years / 10) * 100, 100);

  // Skills: score based on how many matched skills Gemini found (cap at 10 for 100%)
  const skillScore = Math.min((parsed.skills.length / 10) * 100, 100);

  // Keywords: score based on how many keywords were matched (cap at 8 for 100%)
  const kwScore = Math.min((parsed.keywords.length / 8) * 100, 100);

  // Summary quality: a detailed summary (>80 chars) gets full marks
  const signalScore = parsed.summary.length > 80 ? 100 : parsed.summary.length > 30 ? 60 : 20;

  // Weighted total: skills 35%, experience 30%, keywords 25%, quality signal 10%
  const total = skillScore * 0.35 + expScore * 0.30 + kwScore * 0.25 + signalScore * 0.10;
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
      .select("id, candidate_id, job_id, jobs ( title_en, title_ar, description_en, description_ar, requirements_en, requirements_ar, job_type ), candidates ( id, cv_file_url, cv_language )")
      .eq("id", applicationId)
      .maybeSingle();
    if (appErr || !app) throw new Error(appErr?.message || "Application not found");

    const cvPath = (app.candidates as { cv_file_url: string | null } | null)?.cv_file_url;
    if (!cvPath) throw new Error("No CV file attached to this application");

    const { data: file, error: dlErr } = await admin.storage.from("cvs").download(cvPath);
    if (dlErr || !file) throw new Error(dlErr?.message || "Failed to download CV from storage");
    const pdfBytes = new Uint8Array(await file.arrayBuffer());

    // Detect language from stored candidate preference, default to English
    const lang = (app.candidates as { cv_language?: string | null } | null)?.cv_language ?? "en";

    const job = app.jobs as { title_en?: string; title_ar?: string; description_en?: string; description_ar?: string; requirements_en?: string; requirements_ar?: string; job_type?: string } | null;
    const typeLabel = job?.job_type ? `Job Type: ${job.job_type}` : "";
    
    const jobText = lang === "ar"
      ? [job?.title_ar, job?.description_ar, job?.requirements_ar, typeLabel].filter(Boolean).join("\n")
      : [job?.title_en, job?.description_en, job?.requirements_en, typeLabel].filter(Boolean).join("\n");

    // Build job text — fall back to English if Arabic fields are empty
    const jobTextFinal = jobText.trim().length > 0 ? jobText
      : [job?.title_en, job?.description_en, job?.requirements_en, typeLabel].filter(Boolean).join("\n");

    if (jobTextFinal.trim().length === 0) {
      throw new Error("Job has no description or requirements. Please fill in the job details before processing.");
    }

    let score = 0;
    let breakdown: Record<string, number> = {};
    let parsed: ScoreResult | null = null;

    try {
      // Send raw PDF directly to Gemini — no text extraction needed
      parsed = await callAi(pdfBytes, jobTextFinal, lang);
      const r = computeScore(parsed);
      score = r.score;
      breakdown = r.breakdown;
    } catch (e) {
      console.error("AI scoring failed", e);
      throw new Error(`AI processing failed: ${e instanceof Error ? e.message : "Unknown error"}`);
    }

    await admin.from("candidates").update({
      cv_language: lang,
      parsed_data: parsed as unknown as Record<string, unknown> | null,
    }).eq("id", (app.candidates as { id: string }).id);

    await admin.from("applications").update({
      score,
      score_breakdown: breakdown,
      ai_notes: parsed?.notes ?? null,
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
