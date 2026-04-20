
-- Replace overly-permissive INSERT policies with validating versions

DROP POLICY IF EXISTS "Anyone can create candidate" ON public.candidates;
CREATE POLICY "Anyone can create candidate"
ON public.candidates FOR INSERT
WITH CHECK (
  length(trim(name)) > 0
  AND length(trim(email)) > 3
  AND email LIKE '%_@_%.__%'
);

DROP POLICY IF EXISTS "Anyone can submit application" ON public.applications;
CREATE POLICY "Anyone can submit application"
ON public.applications FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.jobs j
    WHERE j.id = job_id
      AND j.company_id = applications.company_id
      AND j.status = 'active'
  )
);
