import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { resolvePDFJS } from "npm:pdfjs-serverless@0.5.0";
import { unzip } from "npm:unzipit@1.4.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
  const { entries } = await unzip(bytes);
  const docEntry = entries["word/document.xml"];
  if (!docEntry) return "";
  const xml = await docEntry.text();
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

interface ExtractedProfile {
  name: string;
  email: string;
  phone: string;
  gender: "male" | "female" | "unspecified";
  nationality: string;
  marital_status: "single" | "married" | "divorced" | "widowed" | "unspecified";
  qualifications: string;
  experience_years: number;
  location: string;
}

async function callAiExtract(cvText: string): Promise<ExtractedProfile> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

  const sys = `You are an expert CV parser. Extract structured profile information from the provided CV text. 
Be precise and only extract information that is clearly present in the CV. 
For missing fields, use empty string or 'unspecified' as appropriate.
For phone numbers, try to format them in E.164 style if possible (e.g. +966501234567).`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: sys },
        { role: "user", content: `Extract the profile from this CV:\n\n${cvText.slice(0, 12000)}` },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "extract_profile",
            description: "Extract structured profile information from a CV",
            parameters: {
              type: "object",
              properties: {
                name: { type: "string", description: "Full name of the candidate" },
                email: { type: "string", description: "Email address" },
                phone: { type: "string", description: "Phone number, ideally E.164 format" },
                gender: {
                  type: "string",
                  enum: ["male", "female", "unspecified"],
                  description: "Gender if explicitly stated in the CV",
                },
                nationality: { type: "string", description: "Nationality or country of origin" },
                marital_status: {
                  type: "string",
                  enum: ["single", "married", "divorced", "widowed", "unspecified"],
                  description: "Marital status if explicitly stated",
                },
                qualifications: {
                  type: "string",
                  description: "Summary of educational qualifications, degrees, and certifications",
                },
                experience_years: {
                  type: "number",
                  description: "Total estimated years of professional experience",
                },
                location: { type: "string", description: "Current city and country of residence" },
              },
              required: [
                "name",
                "email",
                "phone",
                "gender",
                "nationality",
                "marital_status",
                "qualifications",
                "experience_years",
                "location",
              ],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "extract_profile" } },
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`AI gateway ${res.status}: ${txt}`);
  }

  const json = await res.json();
  const call = json.choices?.[0]?.message?.tool_calls?.[0];
  if (!call) throw new Error("No tool call returned from AI");
  return JSON.parse(call.function.arguments) as ExtractedProfile;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { path: cvPath } = await req.json();
    if (!cvPath) {
      return new Response(
        JSON.stringify({ error: "path (storage path in cvs bucket) is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Download the file from storage using service role (bypasses RLS)
    const { data: file, error: dlErr } = await admin.storage.from("cvs").download(cvPath);
    if (dlErr || !file) throw new Error(dlErr?.message || "Download failed");

    const bytes = new Uint8Array(await file.arrayBuffer());
    const ext = cvPath.split(".").pop()?.toLowerCase() ?? "";

    let cvText = "";
    try {
      cvText = await extractText(bytes, ext);
    } catch (e) {
      console.error("Text extraction failed", e);
    }

    if (cvText.trim().length < 30) {
      return new Response(
        JSON.stringify({ error: "Could not extract text from CV file", path: cvPath }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const profile = await callAiExtract(cvText);

    return new Response(JSON.stringify({ profile, path: cvPath }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    const status = e instanceof Error && e.message.includes("gateway 402") ? 402
      : e instanceof Error && e.message.includes("gateway 429") ? 429
      : 500;
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
