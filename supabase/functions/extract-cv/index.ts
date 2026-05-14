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

async function callAiExtract(pdfBytes: Uint8Array): Promise<ExtractedProfile> {
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY missing");
  const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-2.5-flash";

  const sys = `You are an expert CV parser. Read the attached CV PDF and extract structured profile information. 
Be precise and only extract information that is clearly present in the CV. 
For missing fields, use empty string or 'unspecified' as appropriate.
For phone numbers, try to format them in E.164 style if possible (e.g. +966501234567).`;

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
          { text: "Extract the structured profile from this CV." },
        ],
      }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            name: { type: "STRING", description: "Full name of the candidate" },
            email: { type: "STRING", description: "Email address" },
            phone: { type: "STRING", description: "Phone number, ideally E.164 format" },
            gender: {
              type: "STRING",
              enum: ["male", "female", "unspecified"],
              description: "Gender if explicitly stated in the CV",
            },
            nationality: { type: "STRING", description: "Nationality or country of origin" },
            marital_status: {
              type: "STRING",
              enum: ["single", "married", "divorced", "widowed", "unspecified"],
              description: "Marital status if explicitly stated",
            },
            qualifications: {
              type: "STRING",
              description: "Summary of educational qualifications, degrees, and certifications",
            },
            experience_years: {
              type: "NUMBER",
              description: "Total estimated years of professional experience",
            },
            location: { type: "STRING", description: "Current city and country of residence" },
          },
          required: ["name", "email", "phone", "gender", "nationality", "marital_status", "qualifications", "experience_years", "location"],
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

  // Strip markdown code fences if present
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  return JSON.parse(text) as ExtractedProfile;
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

    const { data: file, error: dlErr } = await admin.storage.from("cvs").download(cvPath);
    if (dlErr || !file) throw new Error(dlErr?.message || "Download failed");

    const bytes = new Uint8Array(await file.arrayBuffer());

    const profile = await callAiExtract(bytes);

    return new Response(JSON.stringify({ profile, path: cvPath }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
