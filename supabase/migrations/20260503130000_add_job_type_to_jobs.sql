CREATE TYPE public.job_type AS ENUM ('full-time', 'part-time', 'contract');

ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS job_type public.job_type DEFAULT 'full-time';
