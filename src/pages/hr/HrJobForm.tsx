import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface Department { id: string; name: string; }

export default function HrJobForm() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === "new";
  const navigate = useNavigate();
  const { user, companyId } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  const [titleEn, setTitleEn] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [descEn, setDescEn] = useState("");
  const [descAr, setDescAr] = useState("");
  const [reqEn, setReqEn] = useState("");
  const [reqAr, setReqAr] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [departmentId, setDepartmentId] = useState<string>("");

  useEffect(() => {
    if (!companyId) return;
    supabase.from("departments").select("id, name").eq("company_id", companyId).then(({ data }) => setDepartments(data ?? []));
  }, [companyId]);

  useEffect(() => {
    if (isNew || !id) return;
    supabase.from("jobs").select("*").eq("id", id).maybeSingle().then(({ data }) => {
      if (data) {
        setTitleEn(data.title_en ?? ""); setTitleAr(data.title_ar ?? "");
        setDescEn(data.description_en ?? ""); setDescAr(data.description_ar ?? "");
        setReqEn(data.requirements_en ?? ""); setReqAr(data.requirements_ar ?? "");
        setStatus(data.status); setDepartmentId(data.department_id ?? "");
      }
      setLoading(false);
    });
  }, [id, isNew]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !user) { toast.error(t("errors.generic")); return; }
    setSaving(true);
    const payload = {
      company_id: companyId,
      department_id: departmentId || null,
      title_en: titleEn || null, title_ar: titleAr || null,
      description_en: descEn || null, description_ar: descAr || null,
      requirements_en: reqEn || null, requirements_ar: reqAr || null,
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
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2"><Label>{t("hr.requirementsEn")}</Label><Textarea rows={4} value={reqEn} onChange={(e) => setReqEn(e.target.value)} /></div>
                <div className="space-y-2"><Label>{t("hr.requirementsAr")}</Label><Textarea dir="rtl" rows={4} value={reqAr} onChange={(e) => setReqAr(e.target.value)} /></div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("hr.department")}</Label>
                  <Select value={departmentId} onValueChange={setDepartmentId}>
                    <SelectTrigger><SelectValue placeholder={t("common.optional")} /></SelectTrigger>
                    <SelectContent>{departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("common.status")}</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as "active" | "inactive")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">{t("hr.active")}</SelectItem>
                      <SelectItem value="inactive">{t("hr.inactive")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>{saving ? t("common.loading") : t("common.save")}</Button>
                <Button type="button" variant="outline" onClick={() => navigate("/hr")}>{t("common.cancel")}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
