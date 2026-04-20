

# Multi-Tenant Recruitment & ATS — Core MVP

A bilingual (AR/EN, RTL/LTR) SaaS where companies post jobs on branded public pages, candidates apply with a CV, and an AI scoring pipeline ranks them in an HR dashboard.

## Stack
- React + Vite + Tailwind + shadcn (existing)
- Lovable Cloud (Supabase) — Postgres, Auth, Storage, Edge Functions
- Lovable AI Gateway (Gemini) for CV analysis & scoring
- i18n via `react-i18next`, RTL via `dir` attribute + Tailwind logical utilities

## Data model (RLS-enforced multi-tenancy)
- `companies` — id, name, slug (unique), logo_url, primary_color, secondary_color, font_family
- `departments` — id, company_id, name
- `profiles` — id (= auth.uid), full_name, email, company_id, department_id
- `user_roles` — id, user_id, role enum(`super_admin`,`hr`) — separate table (security)
- `jobs` — id, company_id, department_id, title_ar/en, description_ar/en, requirements_ar/en, status, created_by, created_at
- `candidates` — id, name, email, phone, cv_file_url, cv_text, cv_language, parsed_data jsonb
- `applications` — id, candidate_id, job_id, company_id (denormalized for RLS), status enum(`pending`,`reviewed`,`accepted`,`rejected`), score int, score_breakdown jsonb, created_at
- Storage bucket `cvs` (private, signed URLs for HR)
- `has_role()` security-definer function; RLS scopes every table by `company_id` via the user's profile

## Roles & access
- **Super admin** (seeded): manages companies, departments, HR users, branding
- **HR**: scoped to their company — manages jobs, views/sorts/filters applications, updates status
- **Candidate**: no account — applies via public `/company/{slug}` page, lookup by email if needed later

## ATS pipeline (edge function `process-cv`)
1. Candidate uploads PDF/DOCX → stored in `cvs` bucket
2. Edge function extracts text locally (`pdfjs` for PDF, `mammoth` for DOCX)
3. Detects language (AR/EN heuristic on character ranges)
4. Sends extracted text + job (in matching language) to Gemini via tool-calling for structured output: `{skills[], experience_years, keywords[], summary}`
5. Computes score: 40% skills · 30% experience · 20% keywords · 10% signals — stored with breakdown
6. Application row updated; HR dashboard reflects ranking

## Routes
- Public: `/` (marketing/landing), `/company/:slug` (branded landing + jobs), `/company/:slug/jobs/:id` (details + apply)
- Auth: `/auth` (HR + super-admin login)
- HR: `/hr` (jobs list), `/hr/jobs/new`, `/hr/jobs/:id`, `/hr/applications/:id`
- Admin: `/admin/companies`, `/admin/companies/:id` (departments, HR users, branding)

## Branding system
- `CompanyThemeProvider` loads branding by slug, injects CSS variables (`--brand-primary`, `--brand-secondary`) into a scoped wrapper, applies font-family. Same layout, only visual tokens change.

## i18n
- `react-i18next` with `ar` + `en` namespaces for all UI strings
- Language switcher persists to `localStorage`
- `<html dir>` and `lang` updated on switch; Tailwind uses logical properties (`ms-`, `me-`, `text-start`)
- Job content stored bilingually; UI displays the active language with graceful fallback

## Design
- Clean, professional ATS aesthetic — neutral base with company brand accents
- shadcn components (Card, Table, Badge, Select, Dialog, Tabs)
- Dashboard: sortable candidate table with score badges (color-coded), status pills, filters
- Mobile-responsive throughout

## Build order
1. Enable Cloud, create schema + RLS + storage bucket + seed super-admin role helper
2. Auth page + role-aware routing + i18n + RTL plumbing
3. Admin: companies/departments/HR users/branding CRUD
4. HR: jobs CRUD + branded preview
5. Public company page + job details + application form with CV upload
6. `process-cv` edge function (parse + Gemini scoring) triggered after upload
7. HR applications dashboard: ranked list, filters, status updates, CV signed-URL viewer
8. Polish: empty states, toasts, loading skeletons, mobile QA

After approval I'll implement step-by-step, testing each layer before moving on.

