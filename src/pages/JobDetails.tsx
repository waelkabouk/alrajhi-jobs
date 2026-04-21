import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { CompanyThemeProvider } from "@/components/CompanyThemeProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Briefcase, ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";

interface Job {
  id: string;
  company_id: string;
  title_ar: string | null;
  title_en: string | null;
  description_ar: string | null;
  description_en: string | null;
  requirements_ar: string | null;
  requirements_en: string | null;
}

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = ".pdf,.docx";

export default function JobDetails() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { slug, jobId } = useParams<{ slug: string; jobId: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!jobId) return;
    supabase
      .from("jobs")
      .select("id, company_id, title_ar, title_en, description_ar, description_en, requirements_ar, requirements_en")
      .eq("id", jobId)
      .maybeSingle()
      .then(({ data }) => {
        setJob(data ?? null);
        setLoading(false);
      });
  }, [jobId]);

  const pick = (ar: string | null, en: string | null) =>
    (lang === "ar" ? ar || en : en || ar) || "";

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!job || !file) return;
    if (file.size > MAX_BYTES) {
      toast.error(t("public.fileTooLarge"));
      return;
    }
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "pdf" && ext !== "docx") {
      toast.error(t("public.invalidFile"));
      return;
    }
    setSubmitting(true);
    try {
      // 1. Upload CV to storage under {company_id}/{uuid}.{ext}
      const path = `${job.company_id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("cvs")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;

      // 2. Create candidate row (client-generated id so we don't need a SELECT after insert)
      const candidateId = crypto.randomUUID();
      const { error: candErr } = await supabase
        .from("candidates")
        .insert({ id: candidateId, name, email, phone, cv_file_url: path });
      if (candErr) throw candErr;

      // 3. Create application row (client-generated id, avoids RLS-blocked returning SELECT)
      const applicationId = crypto.randomUUID();
      const { error: appErr } = await supabase
        .from("applications")
        .insert({ id: applicationId, candidate_id: candidateId, job_id: job.id, company_id: job.company_id });
      if (appErr) throw appErr;

      // 4. Trigger CV processing (fire-and-forget)
      supabase.functions.invoke("process-cv", {
        body: { applicationId },
      }).catch((e) => console.error("process-cv invoke failed", e));

      setSubmitted(true);
      toast.success(t("public.applicationSubmitted"));
    } catch (err) {
      console.error(err);
      toast.error(t("errors.generic"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <CompanyThemeProvider>
      {(company, cLoading) => {
        if (cLoading || loading) return <div className="flex min-h-screen items-center justify-center">{t("common.loading")}</div>;
        if (!company || !job) return <div className="flex min-h-screen items-center justify-center">{t("errors.notFound")}</div>;
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
            <main className="container max-w-3xl py-10 space-y-6">
              <Button variant="ghost" size="sm" asChild>
                <Link to={`/company/${slug}`} className="gap-1.5">
                  {i18n.language === "ar" ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
                  {t("public.backToJobs")}
                </Link>
              </Button>
              <div>
                <h1 className="text-3xl font-bold">{pick(job.title_ar, job.title_en)}</h1>
              </div>
              {pick(job.description_ar, job.description_en) && (
                <Card>
                  <CardHeader><CardTitle className="text-lg">{t("public.description")}</CardTitle></CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{pick(job.description_ar, job.description_en)}</p>
                  </CardContent>
                </Card>
              )}
              {pick(job.requirements_ar, job.requirements_en) && (
                <Card>
                  <CardHeader><CardTitle className="text-lg">{t("public.requirements")}</CardTitle></CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{pick(job.requirements_ar, job.requirements_en)}</p>
                  </CardContent>
                </Card>
              )}
              <Card>
                <CardHeader><CardTitle className="text-lg">{t("public.apply")}</CardTitle></CardHeader>
                <CardContent>
                  {submitted ? (
                    <p className="text-sm text-muted-foreground">{t("public.applicationSubmitted")}</p>
                  ) : (
                    <form onSubmit={onSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="n">{t("public.yourName")}</Label>
                        <Input id="n" required value={name} onChange={(e) => setName(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="e">{t("public.yourEmail")}</Label>
                        <Input id="e" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="p">{t("public.yourPhone")}</Label>
                        <Input id="p" value={phone} onChange={(e) => setPhone(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="f">{t("public.cvFile")}</Label>
                        <Input id="f" type="file" accept={ACCEPT} required onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                      </div>
                      <Button type="submit" className="w-full" disabled={submitting}>
                        {submitting ? t("common.loading") : t("public.submitApplication")}
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            </main>
          </>
        );
      }}
    </CompanyThemeProvider>
  );
}
