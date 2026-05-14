-- Drop existing policies that need to be updated with sector logic
DROP POLICY IF EXISTS "Active jobs are publicly readable" ON public.jobs;
DROP POLICY IF EXISTS "HR manages jobs" ON public.jobs;
DROP POLICY IF EXISTS "HR reads all candidates" ON public.candidates;
DROP POLICY IF EXISTS "HR updates candidates" ON public.candidates;
DROP POLICY IF EXISTS "HR reads all applications" ON public.applications;
DROP POLICY IF EXISTS "HR updates all applications" ON public.applications;

-- Function to get current user's sector
CREATE OR REPLACE FUNCTION public.current_user_sector()
RETURNS public.job_sector
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sector FROM public.profiles WHERE id = auth.uid()
$$;

-- JOBS
CREATE POLICY "Active jobs are publicly readable"
ON public.jobs FOR SELECT
USING (
  status = 'active' 
  OR public.has_role(auth.uid(), 'super_admin') 
  OR (public.has_role(auth.uid(), 'hr') AND sector = public.current_user_sector())
);

CREATE POLICY "HR manages jobs"
ON public.jobs FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin') 
  OR (public.has_role(auth.uid(), 'hr') AND sector = public.current_user_sector())
)
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin') 
  OR (public.has_role(auth.uid(), 'hr') AND sector = public.current_user_sector())
);

-- APPLICATIONS
CREATE POLICY "HR reads all applications"
ON public.applications FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin') 
  OR (
    public.has_role(auth.uid(), 'hr') 
    AND EXISTS (
      SELECT 1 FROM public.jobs j 
      WHERE j.id = applications.job_id AND j.sector = public.current_user_sector()
    )
  )
);

CREATE POLICY "HR updates all applications"
ON public.applications FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin') 
  OR (
    public.has_role(auth.uid(), 'hr') 
    AND EXISTS (
      SELECT 1 FROM public.jobs j 
      WHERE j.id = applications.job_id AND j.sector = public.current_user_sector()
    )
  )
);

-- CANDIDATES
CREATE POLICY "HR reads all candidates"
ON public.candidates FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin') 
  OR (
    public.has_role(auth.uid(), 'hr') 
    AND EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.jobs j ON j.id = a.job_id
      WHERE a.candidate_id = candidates.id AND j.sector = public.current_user_sector()
    )
  )
);

CREATE POLICY "HR updates candidates"
ON public.candidates FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin') 
  OR (
    public.has_role(auth.uid(), 'hr') 
    AND EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.jobs j ON j.id = a.job_id
      WHERE a.candidate_id = candidates.id AND j.sector = public.current_user_sector()
    )
  )
);
