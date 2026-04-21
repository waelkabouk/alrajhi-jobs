-- ============ CANDIDATES: extend with AI-extracted profile fields ============
ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS gender        TEXT,
  ADD COLUMN IF NOT EXISTS nationality   TEXT,
  ADD COLUMN IF NOT EXISTS marital_status TEXT,
  ADD COLUMN IF NOT EXISTS qualifications TEXT,
  ADD COLUMN IF NOT EXISTS experience_years NUMERIC,
  ADD COLUMN IF NOT EXISTS location      TEXT;

-- Enforce non-empty phone at the DB level (trimmed)
-- We add a CHECK constraint; existing NULL rows are allowed so we don't break old data.
ALTER TABLE public.candidates
  ADD CONSTRAINT candidates_phone_nonempty
  CHECK (phone IS NULL OR trim(phone) <> '');

-- ============ APPLICATIONS: add AI notes + HR notes ============
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS ai_notes TEXT,
  ADD COLUMN IF NOT EXISTS hr_notes TEXT;
