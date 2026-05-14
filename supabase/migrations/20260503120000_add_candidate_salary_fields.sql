-- ============ CANDIDATES: add new applicant profile fields ============
ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS first_name       TEXT,
  ADD COLUMN IF NOT EXISTS last_name        TEXT,
  ADD COLUMN IF NOT EXISTS job_title        TEXT,
  ADD COLUMN IF NOT EXISTS current_salary   NUMERIC,
  ADD COLUMN IF NOT EXISTS expected_salary  NUMERIC,
  ADD COLUMN IF NOT EXISTS notes            TEXT,
  ADD COLUMN IF NOT EXISTS experience_years NUMERIC,
  ADD COLUMN IF NOT EXISTS gender           TEXT,
  ADD COLUMN IF NOT EXISTS nationality      TEXT,
  ADD COLUMN IF NOT EXISTS marital_status   TEXT,
  ADD COLUMN IF NOT EXISTS qualifications   TEXT,
  ADD COLUMN IF NOT EXISTS location         TEXT;
