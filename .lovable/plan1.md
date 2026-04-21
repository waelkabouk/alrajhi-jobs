

## Goal

Transform the application flow into an AI-first experience: candidate uploads CV → AI extracts a rich profile (name, gender, nationality, marital status, qualifications, years of experience, location, phone, email) → candidate confirms/edits a pre-filled form (phone is mandatory and validated) → HR sees a richer applications table with AI score, AI notes, and per-row HR notes.

## 1. Database changes (migration)

Extend `candidates` with the new structured fields:

- `gender` text
- `nationality` text
- `marital_status` text
- `qualifications` text (free-form summary of degrees/certs)
- `experience_years` numeric
- `location` text
- (existing `phone` becomes effectively required at the application layer)

Extend `applications`:

- `ai_notes` text — short AI summary/fit notes
- `hr_notes` text — free-form HR notes editable in the table

RLS already covers these tables; no policy changes needed (HR update policy already lets HR write `hr_notes`).

Update the public INSERT policy on `candidates` to also require `phone` to be a non-empty trimmed string (best-practice mandatory phone at the database level).

## 2. New edge function: `extract-cv` (pre-application)

Public function (no auth required, like the application submission). Flow:

1. Accepts a temporary uploaded file path in the `cvs` bucket (uploaded by the candidate before any candidate row exists).
2. Downloads the file (service role), extracts text via the same `pdfjs-serverless` / `unzipit` logic already in `process-cv`.
3. Calls Lovable AI (`google/gemini-3-flash-preview`) using a tool-call schema `extract_profile` with strict properties: `name`, `email`, `phone` (E.164-style if possible), `gender` (enum: male/female/unspecified), `nationality`, `marital_status` (enum: single/married/divorced/widowed/unspecified), `qualifications` (string), `experience_years` (number), `location` (string).
4. Returns the parsed JSON + the storage `path` so the client can reuse the same uploaded file when finalizing.

Errors (402/429 from gateway) are surfaced to the client so we can toast a clear message.

## 3. Refactored candidate flow on `JobDetails.tsx`

Two-step UX inside the existing Apply card:

**Step 1 — Upload CV**
- Single file input (PDF/DOCX, ≤5MB, existing validation).
- On select: upload to `cvs/{company_id}/tmp/{uuid}.{ext}`, then call `extract-cv`.
- Show inline "Analyzing your CV…" state with a spinner.

**Step 2 — Confirm & edit (pre-filled form)**
- Form fields pre-filled from AI: Name*, Email*, Phone* (mandatory, validated with a permissive international regex `^\+?[0-9 ()\-]{7,20}$`), Gender (select), Nationality, Marital status (select), Qualifications (textarea), Years of experience (number), Location.
- "AI-filled" badge next to fields that came from extraction; user can freely edit any field.
- Submit button creates the `candidates` row (with all fields) and the `applications` row, then invokes `process-cv` (unchanged) for scoring + AI notes.

Validation uses Zod (already standard in the codebase guidelines): client-side errors shown under each field; phone is required.

If extraction fails, fall back gracefully to an empty form with a toast — candidate can still apply manually.

## 4. Updated `process-cv` edge function

Extend the `score_cv` AI tool to also return a short `notes` string (1–3 sentences: strengths, gaps, fit reasoning in the candidate's CV language). Persist it to `applications.ai_notes` alongside `score` and `score_breakdown`. No change to the scoring formula.

## 5. Rebuilt HR applications table (`HrApplications.tsx`)

Query joins candidate fields. Columns:

| Name | Gender | Nationality | Marital | Qualifications | Years | Location | Phone | Email | AI Score | AI Notes | HR Notes | Status | Actions |

- Long fields (Qualifications, AI Notes) are truncated with a tooltip/popover for full content.
- HR Notes cell is an inline editable textarea (saves on blur, optimistic update, toast on error).
- Status remains an inline select (existing logic).
- Actions: View CV (existing signed-URL flow).
- Filters/sort unchanged (status filter + score/date sort).
- Horizontal scroll wrapper for the wide table on smaller viewports.

## 6. i18n

Add EN + AR keys for all new labels: gender, nationality, maritalStatus, qualifications, yearsExperience, location, aiNotes, hrNotes, analyzingCv, phoneRequired, phoneInvalid, gender options, marital options, "AI-filled" badge, "Confirm your details" step header.

## 7. Files touched

- `supabase/migrations/<new>.sql` — add columns + tighten candidates phone check
- `supabase/functions/extract-cv/index.ts` — new
- `supabase/functions/process-cv/index.ts` — add `notes` to tool schema and persist
- `src/pages/JobDetails.tsx` — two-step flow with Zod validation
- `src/pages/hr/HrApplications.tsx` — wide table with inline HR notes editor
- `src/i18n/locales/en.ts`, `src/i18n/locales/ar.ts` — new keys

## Notes / trade-offs

- AI extraction can be wrong; the confirm-and-edit step keeps the candidate in control and prevents bad data from entering the DB.
- The "tmp" CV upload becomes the final CV on submit (no re-upload), avoiding storage duplication. Untouched tmp uploads (candidate abandons) remain in the bucket — out of scope here; a later cleanup job can purge `tmp/` older than 24h.
- Phone is enforced both client-side (Zod) and server-side (RLS check), per best practice.

