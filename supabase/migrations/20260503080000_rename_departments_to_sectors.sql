-- Rename departments table to sectors
ALTER TABLE IF EXISTS public.departments RENAME TO sectors;

-- Rename columns in jobs and profiles
ALTER TABLE IF EXISTS public.jobs RENAME COLUMN department_id TO sector_id;
ALTER TABLE IF EXISTS public.profiles RENAME COLUMN department_id TO sector_id;

-- Rename policies for clarity
ALTER POLICY IF EXISTS "Departments publicly readable" ON public.sectors RENAME TO "Sectors publicly readable";
ALTER POLICY IF EXISTS "Super admins manage departments" ON public.sectors RENAME TO "Super admins manage sectors";
