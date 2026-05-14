# Multi-Tenant Hiring Platform

A bilingual (Arabic / English) ATS where companies publish jobs on branded public pages, candidates apply with a CV, and an AI scoring pipeline ranks applicants for HR.

## Features

- **Multi-tenant companies** — each company has its own slug, logo, theme colors, and font (`/company/:slug`).
- **Bilingual UI** — Arabic & English with RTL support (`react-i18next`).
- **Roles**
  - `super_admin` — manages companies, sectors, and invites HR users.
  - `hr` — manages jobs and applications scoped to their company.
- **Public job board** — active jobs are listed on the company page; candidates apply with name, email, phone, and a CV (PDF / DOCX, max 5 MB).
- **AI CV scoring** — on submission, an edge function extracts CV text, calls Lovable AI for structured analysis, and stores a 0–100 score with a breakdown.
- **Email invitations** — super admins invite HR users via an edge function.

## Tech Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui, react-router-dom, react-i18next, TanStack Query.
- **Backend (Lovable Cloud)**: Postgres + Row-Level Security, Storage (`cvs` bucket), Edge Functions (Deno).
- **AI**: Lovable AI Gateway (`google/gemini-3-flash-preview`) via tool calling for structured output.

## Project Structure

```
src/
  pages/
    Landing.tsx              # Marketing landing page
    Auth.tsx                 # Login / signup
    CompanyPublic.tsx        # Public job listings per company
    JobDetails.tsx           # Public job page + application form
    admin/                   # Super admin: companies, HR invites
    hr/                      # HR: jobs, job form, applications
  components/
    CompanyThemeProvider.tsx # Loads company theme by slug
    LanguageSwitcher.tsx
    ProtectedRoute.tsx
  hooks/useAuth.tsx          # Session, role, company_id
  i18n/                      # en.ts, ar.ts
  integrations/supabase/     # Auto-generated client + types

supabase/
  functions/
    process-cv/              # CV text extraction + AI scoring
    invite-hr-user/          # Super admin invites HR via email
    seed-super-admin/        # One-shot bootstrap of the first admin
  migrations/                # SQL schema, RLS, roles
```

## Database

| Table | Purpose |
|---|---|
| `companies` | Tenant record (slug, logo, theme). |
| `profiles` | Mirrors `auth.users` with `company_id` / `sector`. |
| `user_roles` | `super_admin` or `hr` — checked via `has_role()` SECURITY DEFINER function. |
| `jobs` | Bilingual title / description / requirements, `status`, and `sector` ENUM. |
| `candidates` | Applicant info, `cv_file_url`, AI `parsed_data`. |
| `applications` | Links candidate ↔ job, `status`, `score`, `score_breakdown`. |

All tables use RLS. Roles live in a separate `user_roles` table (never on `profiles`) to avoid privilege escalation.

## AI Scoring Pipeline

When a candidate applies, `JobDetails.tsx` invokes the `process-cv` edge function which:

1. Downloads the CV from the `cvs` storage bucket.
2. Extracts text — PDF (`pdfjs-serverless`) or DOCX (unzip + strip XML).
3. Detects language (Arabic vs English) to pick the matching job text.
4. Calls Lovable AI with a `score_cv` tool that returns
   `{ skills[], experience_years, keywords[], summary }`.
5. Computes a weighted 0–100 score:

| Component | Weight | Logic |
|---|---|---|
| Skills | 40% | % of AI skills found in the job text |
| Experience | 30% | `min(years / 8, 1) × 100` |
| Keywords | 20% | % of AI keywords found in the job text |
| Signals | 10% | `100` if summary > 50 chars, else `50` |

Results are written to `applications.score` + `score_breakdown`; the raw AI output is cached on `candidates.parsed_data`.

## Roles & Routes

| Route | Access |
|---|---|
| `/`, `/auth`, `/company/:slug`, `/company/:slug/jobs/:jobId` | Public |
| `/admin/companies`, `/admin/companies/:id` | `super_admin` |
| `/hr/jobs`, `/hr/jobs/new`, `/hr/jobs/:id/edit`, `/hr/jobs/:id/applications` | `hr` (scoped to their company) |

## Bootstrapping

1. **Seed the super admin** — set the `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` secrets, then call the `seed-super-admin` edge function once.
2. Sign in as super admin → create a company → invite an HR user.
3. HR signs in via the email invite, sets a password, creates jobs.
4. Candidates apply at `/company/:slug`; AI scores appear in `/hr/jobs/:id/applications`.

## Local Development

```bash
npm install
npm run dev
```

The Supabase client and `.env` are managed by Lovable Cloud — do not edit `src/integrations/supabase/client.ts`, `src/integrations/supabase/types.ts`, or `.env` manually.

## Edge Function Secrets

| Secret | Used by |
|---|---|
| `LOVABLE_API_KEY` | `process-cv` (AI Gateway) |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | All edge functions |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | `seed-super-admin` |
