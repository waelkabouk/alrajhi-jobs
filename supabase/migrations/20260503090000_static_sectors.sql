-- Create ENUM for sectors
CREATE TYPE public.job_sector AS ENUM ('industrial', 'contracting', 'trading');

-- Alter jobs table
ALTER TABLE public.jobs ADD COLUMN sector public.job_sector;
ALTER TABLE public.jobs DROP COLUMN sector_id;

-- Alter profiles table
ALTER TABLE public.profiles ADD COLUMN sector public.job_sector;
ALTER TABLE public.profiles DROP COLUMN sector_id;

-- Drop sectors table
DROP TABLE public.sectors CASCADE;
