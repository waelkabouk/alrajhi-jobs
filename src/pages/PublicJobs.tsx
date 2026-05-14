import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { PublicHeader } from "@/components/PublicHeader";
import { Button } from "@/components/ui/button";
import { Briefcase, ArrowRight, MapPin, Building, Clock } from "lucide-react";

interface Job {
  id: string;
  title_ar: string | null;
  title_en: string | null;
  sector: "industrial" | "contracting" | "trading" | null;
  job_type: "full-time" | "part-time" | "contract" | null;
  location: string | null;
}

const useJobs = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("jobs")
      .select("id, title_ar, title_en, sector, job_type, location")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setJobs(data ?? []);
        setLoading(false);
      });
  }, []);

  return { jobs, loading };
};

export default function PublicJobs() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { jobs, loading } = useJobs();

  const title = (j: Job) => (lang === "ar" ? j.title_ar || j.title_en : j.title_en || j.title_ar) || "—";

  if (loading) return <div className="flex min-h-screen items-center justify-center">{t("common.loading")}</div>;

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main className="container py-10">
        <h1 className="text-3xl font-bold">{t("public.openings")}</h1>
        <div className="mt-6 space-y-4">
          {jobs.length === 0 && (
            <p className="text-muted-foreground">{t("public.noJobs")}</p>
          )}
          {jobs.map((j) => (
            <div
              key={j.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-border bg-card p-5 hover:shadow-md transition-shadow"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Briefcase className="h-5 w-5 shrink-0 text-primary" />
                  <span className="font-semibold text-lg">{title(j)}</span>
                </div>
                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                  {j.job_type && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      <span className="capitalize">{j.job_type.replace("-", " ")}</span>
                    </div>
                  )}
                  {j.sector && (
                    <div className="flex items-center gap-1">
                      <Building className="h-3.5 w-3.5" />
                      <span className="capitalize">{j.sector}</span>
                    </div>
                  )}
                  {j.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{j.location}</span>
                    </div>
                  )}
                </div>
              </div>
              <Button asChild size="sm" className="gap-1.5 shrink-0 sm:w-auto w-full">
                <Link to={`/jobs/${j.id}`}>
                  {t("public.apply")}
                  <ArrowRight className="h-4 w-4 rtl:rotate-180" />
                </Link>
              </Button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
