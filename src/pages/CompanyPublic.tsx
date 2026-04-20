import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { CompanyThemeProvider } from "@/components/CompanyThemeProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase } from "lucide-react";

interface Job {
  id: string;
  title_ar: string | null;
  title_en: string | null;
  department_id: string | null;
}

const useJobs = (companyId: string | null) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  useEffect(() => {
    if (!companyId) return;
    supabase
      .from("jobs")
      .select("id, title_ar, title_en, department_id")
      .eq("company_id", companyId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .then(({ data }) => setJobs(data ?? []));
  }, [companyId]);
  return jobs;
};

export default function CompanyPublic() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  return (
    <CompanyThemeProvider>
      {(company, loading) => {
        if (loading) return <div className="flex min-h-screen items-center justify-center">{t("common.loading")}</div>;
        if (!company) return <div className="flex min-h-screen items-center justify-center">{t("errors.notFound")}</div>;
        return <CompanyContent company={company} lang={lang} t={t} />;
      }}
    </CompanyThemeProvider>
  );
}

function CompanyContent({ company, lang, t }: { company: { id: string; slug: string; name: string; logo_url: string | null }; lang: string; t: (k: string) => string }) {
  const jobs = useJobs(company.id);
  const title = (j: Job) => (lang === "ar" ? j.title_ar || j.title_en : j.title_en || j.title_ar) || "—";

  return (
    <>
      <header className="border-b bg-card">
        <div className="container flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {company.logo_url ? (
              <img src={company.logo_url} alt={company.name} className="h-8 w-auto" />
            ) : (
              <Briefcase className="h-6 w-6 text-primary" />
            )}
            <span className="font-semibold">{company.name}</span>
          </div>
          <LanguageSwitcher />
        </div>
      </header>
      <main className="container py-10">
        <h1 className="text-3xl font-bold">{t("public.openings")}</h1>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {jobs.length === 0 && (
            <p className="text-muted-foreground">{t("public.noJobs")}</p>
          )}
          {jobs.map((j) => (
            <Card key={j.id}>
              <CardHeader>
                <CardTitle className="text-lg">{title(j)}</CardTitle>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link to={`/company/${company.slug}/jobs/${j.id}`}>{t("public.apply")}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </>
  );
}
