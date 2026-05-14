import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useLocationData } from "@/hooks/useLocationData";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";

type AppStatus = "pending" | "reviewed" | "accepted" | "rejected";

interface CandidateData {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  cv_file_url: string | null;
  gender: string | null;
  nationality: string | null;
  marital_status: string | null;
  qualifications: string | null;
  experience_years: number | null;
  residence_country: string | null;
  residence_region: string | null;
  location: string | null;
  job_title: string | null;
  current_salary: number | null;
  expected_salary: number | null;
  notice_period: number | null;
  transferable_iqama: boolean | null;
  notes: string | null;
}

interface Row {
  id: string;
  status: AppStatus;
  score: number | null;
  ai_notes: string | null;
  hr_notes: string | null;
  created_at: string;
  candidates: CandidateData | null;
}

const scoreVariant = (s: number | null): "default" | "secondary" | "outline" | "destructive" => {
  if (s == null) return "secondary";
  if (s >= 75) return "default";
  if (s >= 50) return "outline";
  return "destructive";
};

/** Truncate long text with a tooltip for the full content */
function TruncatedCell({ text, maxLen = 60 }: { text: string | null; maxLen?: number }) {
  if (!text) return <span className="text-muted-foreground">—</span>;
  if (text.length <= maxLen) return <span>{text}</span>;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-help underline decoration-dotted">
            {text.slice(0, maxLen)}…
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs whitespace-pre-wrap">{text}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/** Inline-editable HR notes cell */
function HrNotesCell({
  appId,
  initial,
  placeholder,
}: {
  appId: string;
  initial: string | null;
  placeholder: string;
}) {
  const [value, setValue] = useState(initial ?? "");
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = async (text: string) => {
    setSaving(true);
    const { error } = await supabase
      .from("applications")
      .update({ hr_notes: text || null })
      .eq("id", appId);
    setSaving(false);
    if (error) toast.error(error.message);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setValue(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => save(v), 800);
  };

  const handleBlur = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    save(value);
  };

  return (
    <div className="relative">
      <Textarea
        className="min-h-[60px] w-[180px] resize-none text-xs"
        value={value}
        placeholder={placeholder}
        onChange={handleChange}
        onBlur={handleBlur}
      />
      {saving && (
        <span className="absolute bottom-1 right-1 text-[10px] text-muted-foreground">
          saving…
        </span>
      )}
    </div>
  );
}

export default function HrApplications() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { id: jobId } = useParams<{ id: string }>();
  const [rows, setRows] = useState<Row[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"score" | "date">("score");
  const { getCountries, getCountryName, getCityName, loadCountryCities } = useLocationData();

  const load = async () => {
    if (!jobId) return;
    const { data, error } = await supabase
      .from("applications")
      .select(
        "id, status, score, ai_notes, hr_notes, created_at, candidates ( id, name, email, phone, cv_file_url, gender, nationality, transferable_iqama, marital_status, qualifications, experience_years, residence_country, residence_region, location, job_title, current_salary, expected_salary, notice_period, notes )"
      )
      .eq("job_id", jobId);
    
    if (error) {
      console.error("Failed to load applications:", error);
      toast.error(`Database Error: ${error.message}`);
    }
    setRows((data as unknown as Row[]) ?? []);
  };
  useEffect(() => { load(); }, [jobId]);

  const filtered = useMemo(() => {
    let r = [...rows];
    if (statusFilter !== "all") r = r.filter((x) => x.status === statusFilter);
    r.sort((a, b) => {
      if (sortBy === "score") return (b.score ?? -1) - (a.score ?? -1);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return r;
  }, [rows, statusFilter, sortBy]);

  useEffect(() => {
    const uniqueCountries = Array.from(
      new Set(filtered.map((r) => r.candidates?.residence_country).filter(Boolean))
    );
    uniqueCountries.forEach((code) => {
      if (code) loadCountryCities(code);
    });
  }, [filtered, loadCountryCities]);

  const updateStatus = async (id: string, status: AppStatus) => {
    const { error } = await supabase.from("applications").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success(t("common.save")); load(); }
  };

  const openCv = async (path: string | null) => {
    if (!path) return;
    const { data, error } = await supabase.storage.from("cvs").createSignedUrl(path, 60 * 5);
    if (error || !data) { toast.error(t("errors.generic")); return; }
    window.open(data.signedUrl, "_blank");
  };

  const statusLabel = (s: AppStatus) =>
    t(`hr.status${s.charAt(0).toUpperCase()}${s.slice(1)}`);

  const genderLabel = (g: string) => {
    if (g === "male") return t("public.genderMale");
    if (g === "female") return t("public.genderFemale");
    return t("public.genderUnspecified");
  };

  const maritalLabel = (m: string) => {
    if (m === "single") return t("public.maritalSingle");
    if (m === "married") return t("public.maritalMarried");
    if (m === "divorced") return t("public.maritalDivorced");
    if (m === "widowed") return t("public.maritalWidowed");
    return t("public.maritalUnspecified");
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">{t("hr.applications")}</h1>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44">
                <SelectValue>
                  {statusFilter === "all" ? t("hr.all") : statusLabel(statusFilter as AppStatus)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("hr.all")}</SelectItem>
                <SelectItem value="pending">{t("hr.statusPending")}</SelectItem>
                <SelectItem value="reviewed">{t("hr.statusReviewed")}</SelectItem>
                <SelectItem value="accepted">{t("hr.statusAccepted")}</SelectItem>
                <SelectItem value="rejected">{t("hr.statusRejected")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as "score" | "date")}>
              <SelectTrigger className="w-44">
                <SelectValue>
                  {sortBy === "score" ? t("hr.sortByScore") : t("hr.appliedAt")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="score">{t("hr.sortByScore")}</SelectItem>
                <SelectItem value="date">{t("hr.appliedAt")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card className="mt-6">
          <CardContent className="p-0">
            {/* Horizontal scroll for wide table */}
            <div className="overflow-x-auto">
              <Table className="min-w-[1400px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[150px]">{t("hr.candidate")}</TableHead>
                    <TableHead className="min-w-[150px]">{t("hr.jobTitle")}</TableHead>
                    <TableHead className="min-w-[80px]">{t("hr.gender")}</TableHead>
                    <TableHead className="min-w-[120px]">{t("hr.nationality")}</TableHead>
                    <TableHead className="min-w-[120px]">{t("public.transferableIqama", "Iqama")}</TableHead>
                    <TableHead className="min-w-[120px]">{t("hr.maritalStatus")}</TableHead>
                    <TableHead className="min-w-[200px]">{t("hr.qualifications")}</TableHead>
                    <TableHead className="min-w-[80px]">{t("hr.yearsExperience")}</TableHead>
                    <TableHead className="min-w-[130px]">{t("public.countryOfResidence", "Country")}</TableHead>
                    <TableHead className="min-w-[150px]">{t("public.provinceRegion", "Province / Region")}</TableHead>
                    <TableHead className="min-w-[120px]">{t("hr.currentSalary")}</TableHead>
                    <TableHead className="min-w-[120px]">{t("hr.expectedSalary")}</TableHead>
                    <TableHead className="min-w-[120px]">{t("hr.noticePeriod", "Notice Period")}</TableHead>
                    <TableHead className="min-w-[120px]">{t("common.phone")}</TableHead>
                    <TableHead className="min-w-[160px]">{t("common.email")}</TableHead>
                    <TableHead className="min-w-[200px]">{t("hr.candidateNotes")}</TableHead>
                    <TableHead className="min-w-[80px]">{t("common.score")}</TableHead>
                    <TableHead className="min-w-[200px]">{t("hr.aiNotes")}</TableHead>
                    <TableHead className="min-w-[200px]">{t("hr.hrNotes")}</TableHead>
                    <TableHead className="min-w-[150px]">{t("common.status")}</TableHead>
                    <TableHead className="min-w-[100px]">{t("common.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id}>
                      {/* Name + email combo */}
                      <TableCell>
                        <div className="font-medium">{r.candidates?.name}</div>
                        <div className="text-xs text-muted-foreground">{r.candidates?.email}</div>
                      </TableCell>
                      <TableCell>
                        <TruncatedCell text={r.candidates?.job_title ?? null} maxLen={20} />
                      </TableCell>
                      <TableCell className="capitalize">
                        {r.candidates?.gender && r.candidates.gender !== "unspecified"
                          ? genderLabel(r.candidates.gender)
                          : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        <TruncatedCell text={
                          r.candidates?.nationality
                            ? getCountries().find(c => c.code === r.candidates?.nationality)?.name || r.candidates.nationality
                            : null
                        } maxLen={20} />
                      </TableCell>
                      <TableCell>
                        {r.candidates?.transferable_iqama === true ? t("common.yes", "Yes") : r.candidates?.transferable_iqama === false ? t("common.no", "No") : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="capitalize">
                        {r.candidates?.marital_status && r.candidates.marital_status !== "unspecified"
                          ? maritalLabel(r.candidates.marital_status)
                          : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        <TruncatedCell text={r.candidates?.qualifications ?? null} maxLen={50} />
                      </TableCell>
                      <TableCell>
                        {r.candidates?.experience_years != null
                          ? r.candidates.experience_years
                          : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        <TruncatedCell text={
                          r.candidates?.residence_country 
                            ? getCountryName(r.candidates.residence_country)
                            : r.candidates?.location ?? null
                        } maxLen={20} />
                      </TableCell>
                      <TableCell>
                        <TruncatedCell text={
                          r.candidates?.residence_region && r.candidates?.residence_country
                            ? getCityName(r.candidates.residence_country, r.candidates.residence_region)
                            : null
                        } maxLen={20} />
                      </TableCell>
                      <TableCell>
                        {r.candidates?.current_salary != null
                          ? r.candidates.current_salary
                          : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        {r.candidates?.expected_salary != null
                          ? r.candidates.expected_salary
                          : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        {r.candidates?.notice_period != null
                          ? r.candidates.notice_period
                          : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>{r.candidates?.phone ?? <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell>
                        <TruncatedCell text={r.candidates?.email ?? null} maxLen={22} />
                      </TableCell>
                      <TableCell>
                        <TruncatedCell text={r.candidates?.notes ?? null} maxLen={40} />
                      </TableCell>
                      <TableCell>
                        <Badge variant={scoreVariant(r.score)}>
                          {r.score ?? "—"}
                        </Badge>
                      </TableCell>
                      {/* AI Notes */}
                      <TableCell>
                        <TruncatedCell text={r.ai_notes} maxLen={60} />
                      </TableCell>
                      {/* HR Notes — inline editable */}
                      <TableCell>
                        <HrNotesCell
                          appId={r.id}
                          initial={r.hr_notes}
                          placeholder={t("hr.hrNotesPlaceholder")}
                        />
                      </TableCell>
                      {/* Status */}
                      <TableCell>
                        <Select
                          value={r.status}
                          onValueChange={(v) => updateStatus(r.id, v as AppStatus)}
                        >
                          <SelectTrigger className="w-36">
                            <SelectValue>
                              {statusLabel(r.status)}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {(["pending", "reviewed", "accepted", "rejected"] as AppStatus[]).map((s) => (
                              <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      {/* Actions */}
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          onClick={() => openCv(r.candidates?.cv_file_url ?? null)}
                        >
                          <ExternalLink className="h-3 w-3" />
                          {t("hr.viewCv")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={20} className="text-center text-muted-foreground py-8">
                        {t("hr.noApplications")}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

