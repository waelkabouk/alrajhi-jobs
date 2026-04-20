import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ExternalLink, Plus } from "lucide-react";

interface Company {
  id: string;
  name: string;
  slug: string;
  primary_color: string | null;
  secondary_color: string | null;
  logo_url: string | null;
}

export default function AdminCompanies() {
  const { t } = useTranslation();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [primary, setPrimary] = useState("#2563eb");
  const [secondary, setSecondary] = useState("#1e40af");
  const [logo, setLogo] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("companies")
      .select("id, name, slug, primary_color, secondary_color, logo_url")
      .order("created_at", { ascending: false });
    setCompanies(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("companies").insert({
      name,
      slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
      primary_color: primary,
      secondary_color: secondary,
      logo_url: logo || null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t("common.save"));
    setOpen(false);
    setName(""); setSlug(""); setLogo("");
    load();
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t("admin.companies")}</h1>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4" />{t("admin.newCompany")}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{t("admin.newCompany")}</DialogTitle></DialogHeader>
              <form onSubmit={create} className="space-y-4">
                <div className="space-y-2"><Label>{t("common.name")}</Label><Input required value={name} onChange={(e) => setName(e.target.value)} /></div>
                <div className="space-y-2"><Label>{t("admin.slug")}</Label><Input required value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="acme" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>{t("admin.primaryColor")}</Label><Input type="color" value={primary} onChange={(e) => setPrimary(e.target.value)} /></div>
                  <div className="space-y-2"><Label>{t("admin.secondaryColor")}</Label><Input type="color" value={secondary} onChange={(e) => setSecondary(e.target.value)} /></div>
                </div>
                <div className="space-y-2"><Label>{t("admin.logoUrl")}</Label><Input value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="https://..." /></div>
                <DialogFooter>
                  <Button type="submit" disabled={saving}>{saving ? t("common.loading") : t("common.create")}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <Card className="mt-6">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("common.name")}</TableHead>
                  <TableHead>{t("admin.slug")}</TableHead>
                  <TableHead>{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell><code className="text-xs">{c.slug}</code></TableCell>
                    <TableCell className="flex gap-2">
                      <Button size="sm" variant="outline" asChild>
                        <Link to={`/admin/companies/${c.id}`}>{t("common.edit")}</Link>
                      </Button>
                      <Button size="sm" variant="ghost" asChild>
                        <a href={`/company/${c.slug}`} target="_blank" rel="noreferrer" className="gap-1">
                          <ExternalLink className="h-3 w-3" />{t("admin.publicLink")}
                        </a>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {companies.length === 0 && (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">{t("common.none")}</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
