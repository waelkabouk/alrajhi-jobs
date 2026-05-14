import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { COUNTRY_CODES } from "@/lib/constants";
import { useLocationData } from "@/hooks/useLocationData";
import { supabase } from "@/integrations/supabase/client";
import { PublicHeader } from "@/components/PublicHeader";
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

import { ArrowLeft, ArrowRight, Loader2, CheckCircle2, Sparkles, Clock, Building, MapPin, Briefcase, User, Phone, FileText } from "lucide-react";
import { toast } from "sonner";

interface Job {
  id: string;
  title_ar: string | null;
  title_en: string | null;
  description_ar: string | null;
  description_en: string | null;
  requirements_ar: string | null;
  requirements_en: string | null;
  job_type: "full-time" | "part-time" | "contract" | null;
  sector: "industrial" | "contracting" | "trading" | null;
  location: string | null;
}

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = ".pdf,.docx";
const PHONE_RE = /^\+?[0-9 ()-]{7,20}$/;

const buildSchema = (t: (k: string) => string) =>
  z.object({
    first_name: z.string().min(1, t("common.required")),
    last_name: z.string().min(1, t("common.required")),
    email: z.string().email(t("errors.generic")),
    country_code: z.string().min(1, t("common.required")),
    phone_number: z.string().min(1, t("public.phoneRequired")).regex(/^[0-9 ()-]{7,20}$/, t("public.phoneInvalid")),
    gender: z
      .enum(["male", "female", "unspecified"])
      .default("unspecified"),
    nationality: z.string().min(1, t("common.required")),
    transferable_iqama: z.enum(["yes", "no"]).optional(),
    marital_status: z
      .enum(["single", "married", "divorced", "widowed", "unspecified"])
      .default("unspecified"),
    qualifications: z.string().optional(),
    experience_years: z.coerce.number().min(0).optional(),
    residence_country: z.string().min(1, t("common.required")),
    residence_region: z.string().min(1, t("common.required")),
    other_city: z.string().optional(),
    job_title: z.string().optional(),
    current_salary: z.coerce.number().min(0).optional(),
    expected_salary: z.coerce.number().min(0).optional(),
    notice_period: z.coerce.number().min(0).optional(),
    notes: z.string().optional(),
  });

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

type Phase = "form" | "processing" | "result";



export default function JobDetails() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { jobId } = useParams<{ jobId: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  const [phase, setPhase] = useState<Phase>("form");
  const [file, setFile] = useState<File | null>(null);
  const { loading: loadingLocations, getCountries, getCitiesForCountry, loadCountryCities } = useLocationData();

  const schema = buildSchema(t);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      gender: "unspecified",
      marital_status: "unspecified",
      country_code: "+966",
    },
  });

  useEffect(() => {
    if (!jobId) return;
    supabase
      .from("jobs")
      .select(
        "id, title_ar, title_en, description_ar, description_en, requirements_ar, requirements_en, job_type, sector, location"
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const chosen = e.target.files?.[0] ?? null;
    if (chosen) {
      if (chosen.size > MAX_BYTES) {
        toast.error(t("public.fileTooLarge"));
        e.target.value = "";
        setFile(null);
        return;
      }
      const ext = chosen.name.split(".").pop()?.toLowerCase();
      if (ext !== "pdf" && ext !== "docx") {
        toast.error(t("public.invalidFile"));
        e.target.value = "";
        setFile(null);
        return;
      }
    }
    setFile(chosen);
  };

  const onSubmit = async (values: FormValues) => {
    if (!job) return;
    if (!file) {
      toast.error(t("public.cvRequired"));
      return;
    }

    setPhase("processing");

    try {
      // 1. Upload CV
      const ext = file.name.split(".").pop()?.toLowerCase();
      const tmpPath = `tmp/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("cvs")
        .upload(tmpPath, file, { contentType: file.type, upsert: false });

      if (upErr) throw upErr;

      // 2. Insert Candidate
      const candidateId = crypto.randomUUID();
      const name = `${values.first_name} ${values.last_name}`.trim();
      
      const fullPhone = `${values.country_code} ${values.phone_number}`;
      const finalCity = values.residence_region === "OTHER-CITY" ? values.other_city : values.residence_region;
      let iqama: boolean | null = null;
      if (values.nationality && values.nationality !== "SA" && values.transferable_iqama) {
        iqama = values.transferable_iqama === "yes";
      }

      const { error: candErr } = await supabase.from("candidates").insert({
        id: candidateId,
        name: name,
        first_name: values.first_name,
        last_name: values.last_name,
        email: values.email,
        phone: fullPhone,
        cv_file_url: tmpPath,
        gender: values.gender === "unspecified" ? null : values.gender,
        nationality: values.nationality || null,
        transferable_iqama: iqama,
        marital_status: values.marital_status === "unspecified" ? null : values.marital_status,
        qualifications: values.qualifications || null,
        experience_years: values.experience_years || null,
        residence_country: values.residence_country || null,
        residence_region: finalCity || null,
        job_title: values.job_title || null,
        current_salary: values.current_salary || null,
        expected_salary: values.expected_salary || null,
        notice_period: values.notice_period || null,
        notes: values.notes || null,
      });
      if (candErr) throw candErr;

      // 3. Insert Application
      const applicationId = crypto.randomUUID();
      const { error: appErr } = await supabase.from("applications").insert({
        id: applicationId,
        candidate_id: candidateId,
        job_id: job.id,
      });
      if (appErr) throw appErr;

      // 4. Synchronously process CV
      const { data: aiData, error: processErr } = await supabase.functions.invoke("process-cv", {
        body: { applicationId },
      });

      if (processErr) {
        console.error("process-cv failed:", processErr.message, processErr);
        // Application was saved — still show success screen
        setPhase("result");
        return;
      }

      setPhase("result");
    } catch (err: unknown) {
      console.error("Submission error:", err);
      toast.error(err instanceof Error ? err.message : t("errors.generic"));
      setPhase("form");
    }
  };

  const genderVal = watch("gender");
  const maritalVal = watch("marital_status");
  const nationalityVal = watch("nationality");
  const countryCodeVal = watch("country_code");
  const resCountryVal = watch("residence_country");
  const resCityVal = watch("residence_region");
  const iqamaVal = watch("transferable_iqama");

  useEffect(() => {
    if (resCountryVal) {
      loadCountryCities(resCountryVal);
    }
  }, [resCountryVal, loadCountryCities]);

  const FieldLabel = ({ htmlFor, label }: { htmlFor: string; label: string }) => (
    <div className="flex items-center gap-2 mb-2">
      <Label htmlFor={htmlFor} className="text-sm font-semibold text-foreground/90">{label}</Label>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background selection:bg-primary/20 relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-1/4 w-[150%] md:w-1/2 h-96 bg-primary/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 -right-1/4 w-[150%] md:w-1/2 h-96 bg-blue-500/5 blur-[120px] rounded-full" />
      </div>
      <PublicHeader />
      <main className="container max-w-7xl py-12 relative z-10">
        {loading || loadingLocations ? (
          <div className="flex justify-center p-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !job ? (
          <div className="text-center p-10 text-muted-foreground">{t("errors.generic")}</div>
        ) : phase === "form" ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            {/* Sidebar: Job Information */}
            <aside className="lg:col-span-4 space-y-6">
              <Button variant="ghost" size="sm" asChild className="mb-2">
                <Link to="/" className="gap-1.5">
                  {i18n.language === "ar" ? (
                    <ArrowRight className="h-4 w-4" />
                  ) : (
                    <ArrowLeft className="h-4 w-4" />
                  )}
                  {t("public.backToJobs")}
                </Link>
              </Button>

              <div className="space-y-4">
                <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground leading-normal pb-2 bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/80">
                  {pick(job.title_ar, job.title_en)}
                </h1>
                
                <div className="flex flex-wrap gap-2">
                  {job.job_type && (
                    <div className="flex items-center gap-1.5 bg-background/50 backdrop-blur-sm px-3 py-1.5 rounded text-secondary-foreground text-sm font-semibold border border-border/50 shadow-sm hover:border-primary/30 transition-colors">
                      <Clock className="h-3.5 w-3.5 text-primary" />
                      <span className="capitalize">{job.job_type.replace("-", " ")}</span>
                    </div>
                  )}
                  {job.sector && (
                    <div className="flex items-center gap-1.5 bg-background/50 backdrop-blur-sm px-3 py-1.5 rounded text-secondary-foreground text-sm font-semibold border border-border/50 shadow-sm hover:border-primary/30 transition-colors">
                      <Building className="h-3.5 w-3.5 text-primary" />
                      <span className="capitalize">{job.sector}</span>
                    </div>
                  )}
                  {job.location && (
                    <div className="flex items-center gap-1.5 bg-background/50 backdrop-blur-sm px-3 py-1.5 rounded text-secondary-foreground text-sm font-semibold border border-border/50 shadow-sm hover:border-primary/30 transition-colors">
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                      <span>{job.location}</span>
                    </div>
                  )}
                </div>
              </div>

              {pick(job.description_ar, job.description_en) && (
                <Card className="border-border/40 shadow-lg shadow-black/5 bg-background/60 backdrop-blur-xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-primary/20">
                  <CardHeader className="pb-3 border-b border-border/40 bg-gradient-to-r from-muted/50 to-muted/20 px-4 py-4">
                    <CardTitle className="text-base flex items-center gap-3 font-bold">
                      <div className="p-1.5 rounded bg-primary/10 text-primary">
                        <Briefcase className="h-4 w-4" />
                      </div>
                      {t("public.description")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 px-4 pb-4">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                      {pick(job.description_ar, job.description_en)}
                    </p>
                  </CardContent>
                </Card>
              )}
            </aside>

            {/* Main Content: Application Form */}
            <div className="lg:col-span-8 space-y-8">
              <div className="flex items-center gap-4 group">
                <h2 className="text-3xl font-extrabold tracking-tight pb-1 bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">{t("public.apply")}</h2>
                <div className="h-px bg-gradient-to-r from-border to-transparent flex-1 transition-all duration-500 group-hover:from-primary/30"></div>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                
                {/* 1. Personal Information */}
                <Card className="border-border/40 shadow-lg shadow-black/5 bg-background/60 backdrop-blur-xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-primary/20 group">
                  <div className="bg-gradient-to-r from-muted/50 to-muted/20 px-6 py-4 border-b border-border/40 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                      <User className="h-5 w-5" />
                    </div>
                    <h3 className="font-bold text-lg tracking-tight">{t("public.personalInfo")}</h3>
                  </div>
                  <CardContent className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <FieldLabel htmlFor="f-first-name" label={`${t("public.firstName")} *`} />
                        <Input id="f-first-name" className="bg-background/50 backdrop-blur-sm focus-visible:ring-primary/30 transition-all" {...register("first_name")} />
                        {errors.first_name && (
                          <p className="text-xs text-destructive">{errors.first_name.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <FieldLabel htmlFor="f-last-name" label={`${t("public.lastName")} *`} />
                        <Input id="f-last-name" className="bg-background/50 backdrop-blur-sm focus-visible:ring-primary/30 transition-all" {...register("last_name")} />
                        {errors.last_name && (
                          <p className="text-xs text-destructive">{errors.last_name.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <FieldLabel htmlFor="f-gender" label={t("public.gender")} />
                        <Select
                          value={genderVal}
                          onValueChange={(v) =>
                            setValue("gender", v as "male" | "female" | "unspecified")
                          }
                        >
                          <SelectTrigger id="f-gender">
                            <SelectValue>
                              {genderVal === "male" ? t("public.genderMale") : 
                               genderVal === "female" ? t("public.genderFemale") : 
                               t("public.genderUnspecified")}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">{t("public.genderMale")}</SelectItem>
                            <SelectItem value="female">{t("public.genderFemale")}</SelectItem>
                            <SelectItem value="unspecified">{t("public.genderUnspecified")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <FieldLabel htmlFor="f-marital" label={t("public.maritalStatus")} />
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
                            <SelectValue>
                              {maritalVal === "single" ? t("public.maritalSingle") : 
                               maritalVal === "married" ? t("public.maritalMarried") : 
                               maritalVal === "divorced" ? t("public.maritalDivorced") : 
                               maritalVal === "widowed" ? t("public.maritalWidowed") : 
                               t("public.maritalUnspecified")}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="single">{t("public.maritalSingle")}</SelectItem>
                            <SelectItem value="married">{t("public.maritalMarried")}</SelectItem>
                            <SelectItem value="divorced">{t("public.maritalDivorced")}</SelectItem>
                            <SelectItem value="widowed">{t("public.maritalWidowed")}</SelectItem>
                            <SelectItem value="unspecified">{t("public.maritalUnspecified")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <FieldLabel htmlFor="f-nationality" label={`${t("public.nationality")} *`} />
                        <Select
                          value={nationalityVal}
                          onValueChange={(v) => setValue("nationality", v)}
                        >
                          <SelectTrigger id="f-nationality">
                            <SelectValue placeholder={t("public.nationality")} />
                          </SelectTrigger>
                          <SelectContent>
                            {getCountries().map((c) => (
                              <SelectItem key={c.code} value={c.code}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.nationality && (
                          <p className="text-xs text-destructive">{errors.nationality.message}</p>
                        )}
                      </div>
                    </div>

                    {nationalityVal && nationalityVal !== "SA" && (
                      <div className="space-y-2 border-l-4 border-primary pl-4 py-2 bg-primary/5 rounded-r-md mt-4">
                        <FieldLabel htmlFor="f-iqama" label={`${t("public.transferableIqama", "Transferable Saudi Iqama")} *`} />
                        <Select
                          value={iqamaVal}
                          onValueChange={(v) => setValue("transferable_iqama", v as "yes" | "no")}
                        >
                          <SelectTrigger id="f-iqama" className="w-full md:w-1/2">
                            <SelectValue placeholder={t("common.select", "Select")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="yes">{t("common.yes", "Yes")}</SelectItem>
                            <SelectItem value="no">{t("common.no", "No")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 2. Contact Details */}
                <Card className="border-border/40 shadow-lg shadow-black/5 bg-background/60 backdrop-blur-xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-primary/20 group">
                  <div className="bg-gradient-to-r from-muted/50 to-muted/20 px-6 py-4 border-b border-border/40 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                      <Phone className="h-5 w-5" />
                    </div>
                    <h3 className="font-bold text-lg tracking-tight">{t("public.contactDetails")}</h3>
                  </div>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <FieldLabel htmlFor="f-email" label={`${t("common.email")} *`} />
                        <Input id="f-email" type="email" className="bg-background/50 backdrop-blur-sm focus-visible:ring-primary/30 transition-all" {...register("email")} />
                        {errors.email && (
                          <p className="text-xs text-destructive">{errors.email.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <FieldLabel htmlFor="f-phone" label={`${t("common.phone")} *`} />
                        <div className="flex gap-2">
                          <Select
                            value={countryCodeVal}
                            onValueChange={(v) => setValue("country_code", v)}
                          >
                            <SelectTrigger id="f-country-code" className="w-[100px] sm:w-[130px] shrink-0">
                              <SelectValue placeholder={t("common.code")} />
                            </SelectTrigger>
                            <SelectContent>
                              {COUNTRY_CODES.map((c) => (
                                <SelectItem key={c.code} value={c.code}>
                                  {c.code}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="flex-1">
                            <Input id="f-phone" type="tel" className="bg-background/50 backdrop-blur-sm focus-visible:ring-primary/30 transition-all" {...register("phone_number")} />
                          </div>
                        </div>
                        {(errors.country_code || errors.phone_number) && (
                          <p className="text-xs text-destructive">
                            {errors.country_code?.message || errors.phone_number?.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 3. Location Details */}
                <Card className="border-border/40 shadow-lg shadow-black/5 bg-background/60 backdrop-blur-xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-primary/20 group">
                  <div className="bg-gradient-to-r from-muted/50 to-muted/20 px-6 py-4 border-b border-border/40 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <h3 className="font-bold text-lg tracking-tight">{t("public.locationDetails")}</h3>
                  </div>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <FieldLabel htmlFor="f-res-country" label={`${t("public.countryOfResidence", "Country of Residence")} *`} />
                        <Select
                          value={resCountryVal}
                          onValueChange={(v) => {
                            setValue("residence_country", v);
                            setValue("residence_region", ""); // Reset region when country changes
                          }}
                        >
                          <SelectTrigger id="f-res-country">
                            <SelectValue placeholder={t("common.select", "Select")} />
                          </SelectTrigger>
                          <SelectContent>
                            {getCountries().map((c) => (
                              <SelectItem key={c.code} value={c.code}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.residence_country && (
                          <p className="text-xs text-destructive">{errors.residence_country.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <FieldLabel htmlFor="f-res-city" label={`${t("public.provinceRegion", "Province / Region")} *`} />
                        <Select
                          value={resCityVal}
                          onValueChange={(v) => setValue("residence_region", v)}
                          disabled={!resCountryVal}
                        >
                          <SelectTrigger id="f-res-city">
                            <SelectValue placeholder={t("common.select", "Select")} />
                          </SelectTrigger>
                          <SelectContent>
                            {getCitiesForCountry(resCountryVal).map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.residence_region && (
                          <p className="text-xs text-destructive">{errors.residence_region.message}</p>
                        )}
                      </div>
                    </div>
                    
                    {resCityVal === "OTHER-CITY" && (
                      <div className="space-y-2 mt-6">
                        <FieldLabel htmlFor="f-other-city" label={t("public.specifyProvince", "Please specify")} />
                        <Input id="f-other-city" {...register("other_city")} />
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 4. Professional Details */}
                <Card className="border-border/40 shadow-lg shadow-black/5 bg-background/60 backdrop-blur-xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-primary/20 group">
                  <div className="bg-gradient-to-r from-muted/50 to-muted/20 px-6 py-4 border-b border-border/40 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                      <Briefcase className="h-5 w-5" />
                    </div>
                    <h3 className="font-bold text-lg tracking-tight">{t("public.professionalDetails")}</h3>
                  </div>
                  <CardContent className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <FieldLabel htmlFor="f-job-title" label={t("public.jobTitle")} />
                        <Input id="f-job-title" className="bg-background/50 backdrop-blur-sm focus-visible:ring-primary/30 transition-all" {...register("job_title")} />
                      </div>
                      <div className="space-y-2">
                        <FieldLabel htmlFor="f-exp" label={t("public.yearsExperience")} />
                        <Input
                          id="f-exp"
                          type="number"
                          min={0}
                          step={0.5}
                          className="bg-background/50 backdrop-blur-sm focus-visible:ring-primary/30 transition-all"
                          {...register("experience_years")}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <FieldLabel htmlFor="f-current-salary" label={t("public.currentSalary")} />
                        <Input id="f-current-salary" type="number" min={0} className="bg-background/50 backdrop-blur-sm focus-visible:ring-primary/30 transition-all" {...register("current_salary")} />
                      </div>
                      <div className="space-y-2">
                        <FieldLabel htmlFor="f-expected-salary" label={t("public.expectedSalary")} />
                        <Input id="f-expected-salary" type="number" min={0} className="bg-background/50 backdrop-blur-sm focus-visible:ring-primary/30 transition-all" {...register("expected_salary")} />
                      </div>
                      <div className="space-y-2">
                        <FieldLabel htmlFor="f-notice-period" label={t("public.noticePeriod", "Notice Period")} />
                        <Input 
                          id="f-notice-period" 
                          type="number"
                          min={0}
                          placeholder={t("public.noticePeriodPlaceholder", "e.g. 30")} 
                          className="bg-background/50 backdrop-blur-sm focus-visible:ring-primary/30 transition-all"
                          {...register("notice_period")} 
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <FieldLabel htmlFor="f-qualifications" label={t("public.qualifications")} />
                      <Textarea
                        id="f-qualifications"
                        rows={2}
                        placeholder={t("public.qualificationsPlaceholder")}
                        {...register("qualifications")}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* 5. Attachments & Notes */}
                <Card className="border-border/40 shadow-lg shadow-black/5 bg-background/60 backdrop-blur-xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-primary/20 group">
                  <div className="bg-gradient-to-r from-muted/50 to-muted/20 px-6 py-4 border-b border-border/40 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                      <FileText className="h-5 w-5" />
                    </div>
                    <h3 className="font-bold text-lg tracking-tight">{t("public.attachments")}</h3>
                  </div>
                  <CardContent className="p-6 space-y-6">
                    <div className="space-y-2">
                      <FieldLabel htmlFor="f-notes" label={t("public.applicantNotes")} />
                      <Textarea
                        id="f-notes"
                        rows={3}
                        placeholder={t("public.applicantNotesPlaceholder")}
                        {...register("notes")}
                      />
                    </div>

                    <div className="relative p-8 border-2 border-dashed border-primary/20 rounded-xl bg-primary/5 hover:bg-primary/10 transition-colors flex flex-col items-center justify-center text-center group cursor-pointer overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="p-4 bg-background rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform duration-300 relative z-10">
                        <FileText className="h-8 w-8 text-primary" />
                      </div>
                      <div className="space-y-2 w-full max-w-sm relative z-10">
                        <Label htmlFor="cv-upload" className="text-base font-semibold cursor-pointer text-primary hover:underline">
                          {file ? file.name : t("public.cvFile") + " *"}
                        </Label>
                        <Input
                          id="cv-upload"
                          type="file"
                          accept={ACCEPT}
                          onChange={handleFileChange}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                        />
                        <p className="text-xs text-muted-foreground pt-1 font-medium">
                          {file ? t("public.fileSelected", "File ready for upload") : t("public.uploadCvHint", "Supported formats: PDF, DOCX (Max 5MB)")}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="pt-6 flex justify-end">
                  <Button type="submit" size="lg" className="w-full md:w-auto px-10 py-6 text-lg font-bold shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden group" disabled={isSubmitting}>
                    <span className="relative z-10">{t("public.submitApplication")}</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer" />
                  </Button>
                </div>
              </form>
            </div>
          </div>
        ) : phase === "processing" ? (
          <div className="flex flex-col items-center justify-center p-12 text-center space-y-6">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse"></div>
              <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center relative">
                <Sparkles className="h-10 w-10 text-primary animate-pulse" />
              </div>
            </div>
            <div className="space-y-2 max-w-md">
              <h2 className="text-2xl font-bold">{t("public.processing")}</h2>
              <p className="text-muted-foreground leading-relaxed">{t("public.processingHint")}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-6 bg-background/60 backdrop-blur-xl border border-border/40 rounded-2xl shadow-xl shadow-black/5 max-w-lg mx-auto relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent" />
              <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center dark:bg-green-900/30 relative z-10 shadow-lg shadow-green-500/20">
                <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-500" />
              </div>
              <div className="relative z-10 space-y-2">
                <h2 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/80">{t("public.applicationSuccess")}</h2>
                <p className="text-muted-foreground text-lg">{t("public.applicationSuccessHint")}</p>
              </div>
              <Button variant="outline" asChild className="mt-8 relative z-10 hover:bg-green-50 hover:text-green-700 hover:border-green-200 transition-colors">
                <Link to="/">{t("public.backToJobs")}</Link>
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
