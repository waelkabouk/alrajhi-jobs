-- Drop existing policies that depend on company
DROP POLICY IF EXISTS "Companies are publicly readable" ON public.companies;
DROP POLICY IF EXISTS "Super admins manage companies" ON public.companies;

DROP POLICY IF EXISTS "Active jobs are publicly readable" ON public.jobs;
DROP POLICY IF EXISTS "HR manages own company jobs" ON public.jobs;

DROP POLICY IF EXISTS "HR reads candidates for own company applications" ON public.candidates;
DROP POLICY IF EXISTS "HR updates candidates for own company" ON public.candidates;

DROP POLICY IF EXISTS "HR reads own company applications" ON public.applications;
DROP POLICY IF EXISTS "HR updates own company applications" ON public.applications;

DROP POLICY IF EXISTS "HR reads CVs for own company" ON storage.objects;

-- Alter tables to drop company_id and related foreign keys
ALTER TABLE public.departments DROP COLUMN IF EXISTS company_id;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS company_id;
ALTER TABLE public.jobs DROP COLUMN IF EXISTS company_id;
ALTER TABLE public.applications DROP COLUMN IF EXISTS company_id;

-- Drop companies table
DROP TABLE IF EXISTS public.companies CASCADE;

-- Drop current_user_company_id function
DROP FUNCTION IF EXISTS public.current_user_company_id();

-- Re-create simplified policies for single-tenant system

-- JOBS
CREATE POLICY "Active jobs are publicly readable"
ON public.jobs FOR SELECT
USING (status = 'active' OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'hr'));

CREATE POLICY "HR manages jobs"
ON public.jobs FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'hr'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'hr'));

-- CANDIDATES
CREATE POLICY "HR reads all candidates"
ON public.candidates FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'hr'));

CREATE POLICY "HR updates candidates"
ON public.candidates FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'hr'));

-- APPLICATIONS
CREATE POLICY "HR reads all applications"
ON public.applications FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'hr'));

CREATE POLICY "HR updates all applications"
ON public.applications FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'hr'));

-- STORAGE
CREATE POLICY "HR reads all CVs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'cvs' AND (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'hr')
  )
);
