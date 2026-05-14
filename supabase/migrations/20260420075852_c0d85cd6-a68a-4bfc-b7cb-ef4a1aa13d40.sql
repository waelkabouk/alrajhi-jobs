
  -- ============ ENUMS ============
  CREATE TYPE public.app_role AS ENUM ('super_admin', 'hr');
  CREATE TYPE public.job_status AS ENUM ('active', 'inactive');
  CREATE TYPE public.application_status AS ENUM ('pending', 'reviewed', 'accepted', 'rejected');

  -- ============ COMPANIES ============
  CREATE TABLE public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    logo_url TEXT,
    primary_color TEXT DEFAULT '#2563eb',
    secondary_color TEXT DEFAULT '#1e40af',
    font_family TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX idx_companies_slug ON public.companies(slug);

  -- ============ DEPARTMENTS ============
  CREATE TABLE public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX idx_departments_company ON public.departments(company_id);

  -- ============ PROFILES ============
  CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT NOT NULL,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX idx_profiles_company ON public.profiles(company_id);

  -- ============ USER ROLES ============
  CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.app_role NOT NULL,
    UNIQUE(user_id, role)
  );

  -- ============ HAS_ROLE FUNCTION (security definer, avoids RLS recursion) ============
  CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
  RETURNS BOOLEAN
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
    SELECT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id AND role = _role
    )
  $$;

  -- Helper: get the company_id of the current user
  CREATE OR REPLACE FUNCTION public.current_user_company_id()
  RETURNS UUID
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  $$;

  -- ============ JOBS ============
  CREATE TABLE public.jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    title_ar TEXT,
    title_en TEXT,
    description_ar TEXT,
    description_en TEXT,
    requirements_ar TEXT,
    requirements_en TEXT,
    status public.job_status NOT NULL DEFAULT 'active',
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX idx_jobs_company ON public.jobs(company_id);
  CREATE INDEX idx_jobs_status ON public.jobs(status);

  -- ============ CANDIDATES ============
  CREATE TABLE public.candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    cv_file_url TEXT,
    cv_text TEXT,
    cv_language TEXT,
    parsed_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX idx_candidates_email ON public.candidates(email);

  -- ============ APPLICATIONS ============
  CREATE TABLE public.applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    status public.application_status NOT NULL DEFAULT 'pending',
    score INTEGER,
    score_breakdown JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE INDEX idx_applications_company ON public.applications(company_id);
  CREATE INDEX idx_applications_job ON public.applications(job_id);
  CREATE INDEX idx_applications_score ON public.applications(score DESC);

  -- ============ ENABLE RLS ============
  ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

  -- ============ COMPANIES POLICIES ============
  -- Public can read companies (for branded landing pages by slug)
  CREATE POLICY "Companies are publicly readable"
  ON public.companies FOR SELECT
  USING (true);

  CREATE POLICY "Super admins manage companies"
  ON public.companies FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

  -- ============ DEPARTMENTS POLICIES ============
  CREATE POLICY "Departments publicly readable"
  ON public.departments FOR SELECT
  USING (true);

  CREATE POLICY "Super admins manage departments"
  ON public.departments FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

  -- ============ PROFILES POLICIES ============
  CREATE POLICY "Users view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

  CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

  CREATE POLICY "Super admins insert profiles"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR id = auth.uid());

  CREATE POLICY "Super admins delete profiles"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

  -- ============ USER ROLES POLICIES ============
  CREATE POLICY "Users view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

  CREATE POLICY "Super admins manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

  -- ============ JOBS POLICIES ============
  -- Public can read active jobs (for company public pages)
  CREATE POLICY "Active jobs are publicly readable"
  ON public.jobs FOR SELECT
  USING (status = 'active' OR public.has_role(auth.uid(), 'super_admin') OR company_id = public.current_user_company_id());

  CREATE POLICY "HR manages own company jobs"
  ON public.jobs FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR (public.has_role(auth.uid(), 'hr') AND company_id = public.current_user_company_id())
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin')
    OR (public.has_role(auth.uid(), 'hr') AND company_id = public.current_user_company_id())
  );

  -- ============ CANDIDATES POLICIES ============
  -- Public can insert (apply) — anyone may submit a candidate record
  CREATE POLICY "Anyone can create candidate"
  ON public.candidates FOR INSERT
  WITH CHECK (true);

  -- HR can read candidates that have applied to jobs in their company
  CREATE POLICY "HR reads candidates for own company applications"
  ON public.candidates FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR EXISTS (
      SELECT 1 FROM public.applications a
      WHERE a.candidate_id = candidates.id
        AND a.company_id = public.current_user_company_id()
    )
  );

  CREATE POLICY "HR updates candidates for own company"
  ON public.candidates FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR EXISTS (
      SELECT 1 FROM public.applications a
      WHERE a.candidate_id = candidates.id
        AND a.company_id = public.current_user_company_id()
    )
  );

  -- ============ APPLICATIONS POLICIES ============
  -- Public can apply (insert)
  CREATE POLICY "Anyone can submit application"
  ON public.applications FOR INSERT
  WITH CHECK (true);

  CREATE POLICY "HR reads own company applications"
  ON public.applications FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR (public.has_role(auth.uid(), 'hr') AND company_id = public.current_user_company_id())
  );

  CREATE POLICY "HR updates own company applications"
  ON public.applications FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'super_admin')
    OR (public.has_role(auth.uid(), 'hr') AND company_id = public.current_user_company_id())
  );

  -- ============ AUTO-CREATE PROFILE ON SIGNUP ============
  CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
  BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
  END;
  $$;

  CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

  -- ============ STORAGE: CV BUCKET (private) ============
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('cvs', 'cvs', false)
  ON CONFLICT (id) DO NOTHING;

  -- Anyone can upload a CV (public application form)
  CREATE POLICY "Anyone can upload CV"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'cvs');

  -- HR can read CVs from their company applications (path layout: {company_id}/...)
  CREATE POLICY "HR reads CVs for own company"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'cvs' AND (
      public.has_role(auth.uid(), 'super_admin')
      OR (storage.foldername(name))[1] = public.current_user_company_id()::text
    )
  );
