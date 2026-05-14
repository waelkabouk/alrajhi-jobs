import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";



export default function HrJobForm() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === "new";
  const navigate = useNavigate();
  const { user, roles, sector: userSector } = useAuth();
  const isSuperAdmin = roles.includes("super_admin");

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  const [titleEn, setTitleEn] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [descEn, setDescEn] = useState("");
  const [descAr, setDescAr] = useState("");

  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [sector, setSector] = useState<"industrial" | "contracting" | "trading" | "">("");
  const [jobType, setJobType] = useState<"full-time" | "part-time" | "contract" | "">("full-time");
  const [location, setLocation] = useState("");

  useEffect(() => {
    if (isNew || !id) {
      if (!isSuperAdmin && userSector) {
        setSector(userSector);
      }
      return;
    }
    supabase.from("jobs").select("*").eq("id", id).maybeSingle().then(({ data }) => {
      if (data) {
        setTitleEn(data.title_en ?? ""); setTitleAr(data.title_ar ?? "");
        setDescEn(data.description_en ?? ""); setDescAr(data.description_ar ?? "");

        setStatus(data.status); setSector((data.sector as "industrial" | "contracting" | "trading" | "") ?? "");
        setJobType((data.job_type as "full-time" | "part-time" | "contract" | "") ?? "full-time");
        setLocation(data.location ?? "");
      }
      setLoading(false);
    });
  }, [id, isNew, isSuperAdmin, userSector]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      sector: sector || null,
      job_type: jobType || null,
      location: location || null,
      title_en: titleEn || null, title_ar: titleAr || null,
      description_en: descEn || null, description_ar: descAr || null,

      status,
      created_by: user.id,
    };
    const { error } = isNew
      ? await supabase.from("jobs").insert(payload)
      : await supabase.from("jobs").update(payload).eq("id", id!);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t("common.save"));
    navigate("/hr");
  };

  if (loading) return <div className="min-h-screen bg-background"><AppHeader /><div className="container py-8">{t("common.loading")}</div></div>;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container max-w-3xl py-8">
        <Card>
          <CardHeader><CardTitle>{isNew ? t("hr.newJob") : t("common.edit")}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={save} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2"><Label>{t("hr.titleEn")}</Label><Input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} /></div>
                <div className="space-y-2"><Label>{t("hr.titleAr")}</Label><Input dir="rtl" value={titleAr} onChange={(e) => setTitleAr(e.target.value)} /></div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2"><Label>{t("hr.descriptionEn")}</Label><Textarea rows={5} value={descEn} onChange={(e) => setDescEn(e.target.value)} /></div>
                <div className="space-y-2"><Label>{t("hr.descriptionAr")}</Label><Textarea dir="rtl" rows={5} value={descAr} onChange={(e) => setDescAr(e.target.value)} /></div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>{t("hr.sector")}</Label>
                  <Select value={sector} onValueChange={(v) => setSector(v as "industrial" | "contracting" | "trading")} disabled={!isSuperAdmin}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("common.optional")}>
                        {sector === "industrial" ? t("sectors.industrial") : 
                         sector === "contracting" ? t("sectors.contracting") : 
                         sector === "trading" ? t("sectors.trading") : ""}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="industrial">{t("sectors.industrial")}</SelectItem>
                      <SelectItem value="contracting">{t("sectors.contracting")}</SelectItem>
                      <SelectItem value="trading">{t("sectors.trading")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("hr.jobType")}</Label>
                  <Select value={jobType} onValueChange={(v) => setJobType(v as "full-time" | "part-time" | "contract")}>
                    <SelectTrigger>
                      <SelectValue>
                        {jobType === "full-time" ? t("hr.fullTime") :
                         jobType === "part-time" ? t("hr.partTime") :
                         jobType === "contract" ? t("hr.contract") : ""}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full-time">{t("hr.fullTime")}</SelectItem>
                      <SelectItem value="part-time">{t("hr.partTime")}</SelectItem>
                      <SelectItem value="contract">{t("hr.contract")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("common.status")}</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as "active" | "inactive")}>
                    <SelectTrigger>
                      <SelectValue>
                        {status === "active" ? t("hr.active") : t("hr.inactive")}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">{t("hr.active")}</SelectItem>
                      <SelectItem value="inactive">{t("hr.inactive")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("public.provinceRegion", "Location")}</Label>
                  <Select value={location} onValueChange={setLocation}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("common.optional", "Optional")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Riyadh Region">Riyadh Region</SelectItem>
                      <SelectItem value="Makkah Region">Makkah Region</SelectItem>
                      <SelectItem value="Madinah Region">Madinah Region</SelectItem>
                      <SelectItem value="Eastern Province">Eastern Province</SelectItem>
                      <SelectItem value="Qassim Region">Qassim Region</SelectItem>
                      <SelectItem value="Asir Region">Asir Region</SelectItem>
                      <SelectItem value="Tabuk Region">Tabuk Region</SelectItem>
                      <SelectItem value="Hail Region">Hail Region</SelectItem>
                      <SelectItem value="Northern Borders Region">Northern Borders Region</SelectItem>
                      <SelectItem value="Jazan Region">Jazan Region</SelectItem>
                      <SelectItem value="Najran Region">Najran Region</SelectItem>
                      <SelectItem value="Al Baha Region">Al Baha Region</SelectItem>
                      <SelectItem value="Al Jawf Region">Al Jawf Region</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={saving}>{saving ? t("common.loading") : t("common.save")}</Button>
                <Button type="button" variant="outline" onClick={() => navigate("/hr")}>{t("common.cancel")}</Button>
                {!isNew && (
                  <Button
                    type="button"
                    variant="secondary"
                    className="gap-1.5"
                    onClick={() => window.open(`/jobs/${id}`, "_blank", "noreferrer")}
                  >
                    <ExternalLink className="h-4 w-4" />
                    {t("hr.viewJobForum")}
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
