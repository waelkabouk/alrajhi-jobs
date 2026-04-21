import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ExternalLink, Trash2 } from "lucide-react";

interface Company {
  id: string; name: string; slug: string; primary_color: string | null;
  secondary_color: string | null; logo_url: string | null; font_family: string | null;
}
interface Department { id: string; name: string; }
interface HrUser { id: string; email: string; full_name: string | null; department_id: string | null; }

export default function AdminCompanyDetails() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [company, setCompany] = useState<Company | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [hrUsers, setHrUsers] = useState<HrUser[]>([]);
  const [savingBranding, setSavingBranding] = useState(false);
  const [newDept, setNewDept] = useState("");
  const [hrEmail, setHrEmail] = useState("");
  const [hrPassword, setHrPassword] = useState("");
  const [hrName, setHrName] = useState("");
  const [hrDept, setHrDept] = useState<string>("");
  const [invitingHr, setInvitingHr] = useState(false);

  const load = async () => {
    if (!id) return;
    const [{ data: c }, { data: d }, { data: u }] = await Promise.all([
      supabase.from("companies").select("*").eq("id", id).maybeSingle(),
      supabase.from("departments").select("id, name").eq("company_id", id).order("name"),
      supabase.from("profiles").select("id, email, full_name, department_id").eq("company_id", id),
    ]);
    setCompany(c as Company | null);
    setDepartments(d ?? []);
    setHrUsers(u ?? []);
  };
  useEffect(() => { load(); }, [id]);

  const saveBranding = async () => {
    if (!company) return;
    setSavingBranding(true);
    const { error } = await supabase
      .from("companies")
      .update({
        name: company.name,
        primary_color: company.primary_color,
        secondary_color: company.secondary_color,
        logo_url: company.logo_url,
        font_family: company.font_family,
      })
      .eq("id", company.id);
    setSavingBranding(false);
    if (error) toast.error(error.message);
    else toast.success(t("common.save"));
  };

  const addDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newDept.trim()) return;
    const { error } = await supabase.from("departments").insert({ company_id: id, name: newDept.trim() });
    if (error) { toast.error(error.message); return; }
    setNewDept("");
    load();
  };

  const delDept = async (deptId: string) => {
    const { error } = await supabase.from("departments").delete().eq("id", deptId);
    if (error) toast.error(error.message);
    else load();
  };

  const inviteHr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setInvitingHr(true);
    const { data, error } = await supabase.functions.invoke("invite-hr-user", {
      body: { email: hrEmail, password: hrPassword, fullName: hrName, companyId: id, departmentId: hrDept || null },
    });
    setInvitingHr(false);
    if (error || (data as { error?: string })?.error) {
      toast.error((data as { error?: string })?.error || error?.message || t("errors.generic"));
      return;
    }
    toast.success(t("common.save"));
    setHrEmail(""); setHrPassword(""); setHrName(""); setHrDept("");
    load();
  };

  if (!company) return <div className="min-h-screen bg-background"><AppHeader /><div className="container py-8">{t("common.loading")}</div></div>;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-8 space-y-6 max-w-5xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{company.name}</h1>
            <p className="text-sm text-muted-foreground"><code>/company/{company.slug}</code></p>
          </div>
          <Button
            variant="outline"
            className="gap-1.5 shrink-0"
            onClick={() => window.open(`/company/${company.slug}`, "_blank", "noreferrer")}
          >
            <ExternalLink className="h-4 w-4" />
            {t("admin.viewCompanyPage")}
          </Button>
        </div>

        <Card>
          <CardHeader><CardTitle>{t("admin.branding")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>{t("common.name")}</Label><Input value={company.name} onChange={(e) => setCompany({ ...company, name: e.target.value })} /></div>
              <div className="space-y-2"><Label>{t("admin.logoUrl")}</Label><Input value={company.logo_url ?? ""} onChange={(e) => setCompany({ ...company, logo_url: e.target.value })} /></div>
              <div className="space-y-2"><Label>{t("admin.primaryColor")}</Label><Input type="color" value={company.primary_color ?? "#2563eb"} onChange={(e) => setCompany({ ...company, primary_color: e.target.value })} /></div>
              <div className="space-y-2"><Label>{t("admin.secondaryColor")}</Label><Input type="color" value={company.secondary_color ?? "#1e40af"} onChange={(e) => setCompany({ ...company, secondary_color: e.target.value })} /></div>
              <div className="space-y-2 sm:col-span-2"><Label>{t("admin.fontFamily")}</Label><Input placeholder="Inter, system-ui, sans-serif" value={company.font_family ?? ""} onChange={(e) => setCompany({ ...company, font_family: e.target.value })} /></div>
            </div>
            <Button onClick={saveBranding} disabled={savingBranding}>{savingBranding ? t("common.loading") : t("common.save")}</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t("admin.departments")}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <form onSubmit={addDept} className="flex gap-2">
              <Input placeholder={t("admin.newDepartment")} value={newDept} onChange={(e) => setNewDept(e.target.value)} />
              <Button type="submit">{t("common.create")}</Button>
            </form>
            <ul className="divide-y rounded border">
              {departments.map((d) => (
                <li key={d.id} className="flex items-center justify-between px-3 py-2">
                  <span>{d.name}</span>
                  <Button variant="ghost" size="icon" onClick={() => delDept(d.id)}><Trash2 className="h-4 w-4" /></Button>
                </li>
              ))}
              {departments.length === 0 && <li className="px-3 py-2 text-sm text-muted-foreground">{t("common.none")}</li>}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t("admin.hrUsers")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={inviteHr} className="grid gap-3 sm:grid-cols-2">
              <Input required placeholder={t("auth.fullName")} value={hrName} onChange={(e) => setHrName(e.target.value)} />
              <Input required type="email" placeholder={t("common.email")} value={hrEmail} onChange={(e) => setHrEmail(e.target.value)} />
              <Input required type="password" placeholder={t("auth.password")} value={hrPassword} onChange={(e) => setHrPassword(e.target.value)} />
              <Select value={hrDept} onValueChange={setHrDept}>
                <SelectTrigger><SelectValue placeholder={t("hr.department")} /></SelectTrigger>
                <SelectContent>
                  {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="sm:col-span-2"><Button type="submit" disabled={invitingHr}>{invitingHr ? t("common.loading") : t("admin.inviteHr")}</Button></div>
            </form>
            <ul className="divide-y rounded border">
              {hrUsers.map((u) => (
                <li key={u.id} className="px-3 py-2 text-sm">
                  <div className="font-medium">{u.full_name || u.email}</div>
                  <div className="text-muted-foreground text-xs">{u.email}</div>
                </li>
              ))}
              {hrUsers.length === 0 && <li className="px-3 py-2 text-sm text-muted-foreground">{t("common.none")}</li>}
            </ul>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
