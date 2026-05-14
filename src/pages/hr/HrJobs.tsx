import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

interface Job {
  id: string;
  title_en: string | null;
  title_ar: string | null;
  status: "active" | "inactive";
  created_at: string;
}

export default function HrJobs() {
  const { t, i18n } = useTranslation();
  const [jobs, setJobs] = useState<Job[]>([]);
  const loadJobs = () => {
    supabase.from("jobs").select("id, title_en, title_ar, status, created_at").order("created_at", { ascending: false }).then(({ data }) => setJobs((data as Job[]) ?? []));
  };
  
  useEffect(() => {
    loadJobs();
  }, []);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(t("common.confirmDelete", `Are you sure you want to delete ${title}?`))) return;
    
    const { error } = await supabase.from("jobs").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t("common.deleted", "Deleted successfully"));
      loadJobs();
    }
  };
  const title = (j: Job) => (i18n.language === "ar" ? j.title_ar || j.title_en : j.title_en || j.title_ar) || "—";

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t("hr.jobs")}</h1>
          <Button asChild><Link to="/hr/jobs/new" className="gap-1.5"><Plus className="h-4 w-4" />{t("hr.newJob")}</Link></Button>
        </div>
        <Card className="mt-6">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("common.name")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                  <TableHead>{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((j) => (
                  <TableRow key={j.id}>
                    <TableCell className="font-medium">{title(j)}</TableCell>
                    <TableCell>
                      <Badge variant={j.status === "active" ? "default" : "secondary"}>
                        {j.status === "active" ? t("hr.active") : t("hr.inactive")}
                      </Badge>
                    </TableCell>
                    <TableCell className="flex gap-2">
                      <Button size="sm" variant="outline" asChild><Link to={`/hr/jobs/${j.id}`}>{t("common.edit")}</Link></Button>
                      <Button size="sm" variant="ghost" asChild><Link to={`/hr/jobs/${j.id}/applications`}>{t("hr.viewApplications")}</Link></Button>
                      <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(j.id, title(j))}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {jobs.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">{t("common.none")}</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
