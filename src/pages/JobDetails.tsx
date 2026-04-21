import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { CompanyThemeProvider } from "@/components/CompanyThemeProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Briefcase, ArrowLeft, ArrowRight, Loader2, Sparkles } from "lucide-react";
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
const PHONE_RE = /^\+?[0-9 ()\-]{7,20}$/;

/** Fields that the AI can fill */
interface AiProfile {
  name: string;
  email: string;
  phone: string;
  gender: "male" | "female" | "unspecified";
  nationality: string;
  marital_status: "single" | "married" | "divorced" | "widowed" | "unspecified";
  qualifications: string;
  experience_years: number;
  location: string;
}

/** Which form fields were AI-filled */
type AiFilled = Partial<Record<keyof AiProfile, boolean>>;

const buildSchema = (t: (k: string) => string) =>
  z.object({
    name: z.string().min(1, t("common.required")),
    email: z.string().email(t("errors.generic")),
    phone: z
      .string()
      .min(1, t("public.phoneRequired"))
      .regex(PHONE_RE, t("public.phoneInvalid")),
    gender: z
      .enum(["male", "female", "unspecified"])
      .default("unspecified"),
    nationality: z.string().optional(),
    marital_status: z
      .enum(["single", "married", "divorced", "widowed", "unspecified"])
      .default("unspecified"),
    qualifications: z.string().optional(),
    experience_years: z.coerce.number().min(0).optional(),
    location: z.string().optional(),
  });

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

export default function JobDetails() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { slug, jobId } = useParams<{ slug: string; jobId: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  // Step 1 state
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);

  // Step 2 state
  const [step, setStep] = useState<1 | 2>(1);
  const [tmpCvPath, setTmpCvPath] = useState<string | null>(null);
  const [aiFilled, setAiFilled] = useState<AiFilled>({});

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const schema = buildSchema(t);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      gender: "unspecified",
      marital_status: "unspecified",
    },
  });

  useEffect(() => {
    if (!jobId) return;
    supabase
      .from("jobs")
      .select(
        "id, company_id, title_ar, title_en, description_ar, description_en, requirements_ar, requirements_en"
      )
      .eq("id", jobId)
      .maybeSingle()
      .then(({ data }) => {
        setJob(data ?? null);
        setLoading(false);
      });
  }, [jobId]);

  const pick = (ar: string | null, en: string | null) =>
    (lang === "ar" ? ar || en : en || ar) || "";

  /** Step 1: upload CV then call extract-cv */
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const chosen = e.target.files?.[0] ?? null;
    setFile(chosen);
    if (!chosen || !job) return;

    if (chosen.size > MAX_BYTES) {
      toast.error(t("public.fileTooLarge"));
      return;
    }
    const ext = chosen.name.split(".").pop()?.toLowerCase();
    if (ext !== "pdf" && ext !== "docx") {
      toast.error(t("public.invalidFile"));
      return;
    }

    // Upload to tmp path
    setUploading(true);
    const tmpPath = `${job.company_id}/tmp/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("cvs")
      .upload(tmpPath, chosen, { contentType: chosen.type, upsert: false });
    setUploading(false);

    if (upErr) {
      toast.error(upErr.message);
      return;
    }
    setTmpCvPath(tmpPath);

    // Extract profile
    setExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke("extract-cv", {
        body: { path: tmpPath },
      });
      if (error) throw new Error(error.message);

      const profile: AiProfile = data?.profile;
      if (profile) {
        const filled: AiFilled = {};
        const fill = <K extends keyof AiProfile>(key: K, val: AiProfile[K]) => {
          const strVal = val !== undefined && val !== null ? String(val) : "";
          if (strVal && strVal !== "unspecified" && strVal !== "0") {
            (setValue as (k: string, v: unknown) => void)(key, val);
            filled[key] = true;
          }
        };
        fill("name", profile.name);
        fill("email", profile.email);
        fill("phone", profile.phone);
        fill("gender", profile.gender);
        fill("nationality", profile.nationality);
        fill("marital_status", profile.marital_status);
        fill("qualifications", profile.qualifications);
        if (profile.experience_years > 0) {
          setValue("experience_years", profile.experience_years);
          filled["experience_years"] = true;
        }
        fill("location", profile.location);
        setAiFilled(filled);
      }
    } catch (err) {
      console.error("extract-cv failed", err);
      toast.info(t("public.extractionFailed"));
    } finally {
      setExtracting(false);
      setStep(2);
    }
  };

  /** Step 2: submit the full application */
  const onSubmit = async (values: FormValues) => {
    if (!job || !tmpCvPath) return;
    setSubmitting(true);

    try {
      const candidateId = crypto.randomUUID();
      const { error: candErr } = await supabase.from("candidates").insert({
        id: candidateId,
        name: values.name,
        email: values.email,
        phone: values.phone,
        cv_file_url: tmpCvPath,
        gender: values.gender ?? null,
        nationality: values.nationality ?? null,
        marital_status: values.marital_status ?? null,
        qualifications: values.qualifications ?? null,
        experience_years: values.experience_years ?? null,
        location: values.location ?? null,
      });
      if (candErr) throw candErr;

      const applicationId = crypto.randomUUID();
      const { error: appErr } = await supabase.from("applications").insert({
        id: applicationId,
        candidate_id: candidateId,
        job_id: job.id,
        company_id: job.company_id,
      });
      if (appErr) throw appErr;

      // Fire-and-forget scoring
      supabase.functions
        .invoke("process-cv", { body: { applicationId } })
        .catch((e) => console.error("process-cv invoke failed", e));

      setSubmitted(true);
      toast.success(t("public.applicationSubmitted"));
    } catch (err) {
      console.error(err);
      toast.error(t("errors.generic"));
    } finally {
      setSubmitting(false);
    }
  };

  const genderVal = watch("gender");
  const maritalVal = watch("marital_status");

  const AiBadge = () => (
    <Badge variant="secondary" className="gap-1 text-xs font-normal py-0.5 px-1.5">
      <Sparkles className="h-3 w-3" />
      {t("public.aiFilled")}
    </Badge>
  );

  const FieldLabel = ({
    htmlFor,
    label,
    isAi,
  }: {
    htmlFor: string;
    label: string;
    isAi?: boolean;
  }) => (
    <div className="flex items-center gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {isAi && <AiBadge />}
    </div>
  );

  return (
    <CompanyThemeProvider>
      {(company, cLoading) => {
        if (cLoading || loading)
          return (
            <div className="flex min-h-screen items-center justify-center">
              {t("common.loading")}
            </div>
          );
        if (!company || !job)
          return (
            <div className="flex min-h-screen items-center justify-center">
              {t("errors.notFound")}
            </div>
          );
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
                  {i18n.language === "ar" ? (
                    <ArrowRight className="h-4 w-4" />
                  ) : (
                    <ArrowLeft className="h-4 w-4" />
                  )}
                  {t("public.backToJobs")}
                </Link>
              </Button>
              <div>
                <h1 className="text-3xl font-bold">{pick(job.title_ar, job.title_en)}</h1>
              </div>
              {pick(job.description_ar, job.description_en) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{t("public.description")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {pick(job.description_ar, job.description_en)}
                    </p>
                  </CardContent>
                </Card>
              )}
              {pick(job.requirements_ar, job.requirements_en) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{t("public.requirements")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {pick(job.requirements_ar, job.requirements_en)}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Apply Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {step === 1 ? t("public.apply") : t("public.confirmDetails")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {submitted ? (
                    <p className="text-sm text-muted-foreground">
                      {t("public.applicationSubmitted")}
                    </p>
                  ) : step === 1 ? (
                    /* ── STEP 1: Upload CV ── */
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">{t("public.uploadCvHint")}</p>
                      <div className="space-y-2">
                        <Label htmlFor="cv-upload">{t("public.cvFile")}</Label>
                        <Input
                          id="cv-upload"
                          type="file"
                          accept={ACCEPT}
                          disabled={uploading || extracting}
                          onChange={handleFileChange}
                        />
                      </div>
                      {(uploading || extracting) && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {t("public.analyzingCv")}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* ── STEP 2: Confirm & edit ── */
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                      {/* Name */}
                      <div className="space-y-2">
                        <FieldLabel htmlFor="f-name" label={t("common.name")} isAi={aiFilled.name} />
                        <Input id="f-name" {...register("name")} />
                        {errors.name && (
                          <p className="text-xs text-destructive">{errors.name.message}</p>
                        )}
                      </div>
                      {/* Email */}
                      <div className="space-y-2">
                        <FieldLabel
                          htmlFor="f-email"
                          label={t("common.email")}
                          isAi={aiFilled.email}
                        />
                        <Input id="f-email" type="email" {...register("email")} />
                        {errors.email && (
                          <p className="text-xs text-destructive">{errors.email.message}</p>
                        )}
                      </div>
                      {/* Phone (mandatory) */}
                      <div className="space-y-2">
                        <FieldLabel
                          htmlFor="f-phone"
                          label={`${t("common.phone")} *`}
                          isAi={aiFilled.phone}
                        />
                        <Input id="f-phone" type="tel" {...register("phone")} />
                        {errors.phone && (
                          <p className="text-xs text-destructive">{errors.phone.message}</p>
                        )}
                      </div>
                      {/* Gender */}
                      <div className="space-y-2">
                        <FieldLabel
                          htmlFor="f-gender"
                          label={t("public.gender")}
                          isAi={aiFilled.gender}
                        />
                        <Select
                          value={genderVal}
                          onValueChange={(v) =>
                            setValue("gender", v as "male" | "female" | "unspecified")
                          }
                        >
                          <SelectTrigger id="f-gender">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">{t("public.genderMale")}</SelectItem>
                            <SelectItem value="female">{t("public.genderFemale")}</SelectItem>
                            <SelectItem value="unspecified">
                              {t("public.genderUnspecified")}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {/* Nationality */}
                      <div className="space-y-2">
                        <FieldLabel
                          htmlFor="f-nationality"
                          label={t("public.nationality")}
                          isAi={aiFilled.nationality}
                        />
                        <Input id="f-nationality" {...register("nationality")} />
                      </div>
                      {/* Marital Status */}
                      <div className="space-y-2">
                        <FieldLabel
                          htmlFor="f-marital"
                          label={t("public.maritalStatus")}
                          isAi={aiFilled.marital_status}
                        />
                        <Select
                          value={maritalVal}
                          onValueChange={(v) =>
                            setValue(
                              "marital_status",
                              v as "single" | "married" | "divorced" | "widowed" | "unspecified"
                            )
                          }
                        >
                          <SelectTrigger id="f-marital">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="single">{t("public.maritalSingle")}</SelectItem>
                            <SelectItem value="married">{t("public.maritalMarried")}</SelectItem>
                            <SelectItem value="divorced">{t("public.maritalDivorced")}</SelectItem>
                            <SelectItem value="widowed">{t("public.maritalWidowed")}</SelectItem>
                            <SelectItem value="unspecified">
                              {t("public.maritalUnspecified")}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {/* Qualifications */}
                      <div className="space-y-2">
                        <FieldLabel
                          htmlFor="f-qualifications"
                          label={t("public.qualifications")}
                          isAi={aiFilled.qualifications}
                        />
                        <Textarea
                          id="f-qualifications"
                          rows={3}
                          placeholder={t("public.qualificationsPlaceholder")}
                          {...register("qualifications")}
                        />
                      </div>
                      {/* Years of experience */}
                      <div className="space-y-2">
                        <FieldLabel
                          htmlFor="f-exp"
                          label={t("public.yearsExperience")}
                          isAi={aiFilled.experience_years}
                        />
                        <Input
                          id="f-exp"
                          type="number"
                          min={0}
                          step={0.5}
                          {...register("experience_years")}
                        />
                      </div>
                      {/* Location */}
                      <div className="space-y-2">
                        <FieldLabel
                          htmlFor="f-location"
                          label={t("public.location")}
                          isAi={aiFilled.location}
                        />
                        <Input id="f-location" {...register("location")} />
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setStep(1)}
                          disabled={submitting}
                        >
                          {t("common.back")}
                        </Button>
                        <Button type="submit" className="flex-1" disabled={submitting}>
                          {submitting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            t("public.submitApplication")
                          )}
                        </Button>
                      </div>
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
