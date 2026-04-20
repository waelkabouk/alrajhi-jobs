import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";

type AppStatus = "pending" | "reviewed" | "accepted" | "rejected";
interface Row {
  id: string;
  status: AppStatus;
  score: number | null;
  created_at: string;
  candidates: { id: string; name: string; email: string; phone: string | null; cv_file_url: string | null } | null;
}

const scoreVariant = (s: number | null) => {
  if (s == null) return "secondary";
  if (s >= 75) return "default";
  if (s >= 50) return "outline";
  return "destructive";
};

export default function HrApplications() {
  const { t } = useTranslation();
  const { id: jobId } = useParams<{ id: string }>();
  const [rows, setRows] = useState<Row[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"score" | "date">("score");

  const load = async () => {
    if (!jobId) return;
    const { data } = await supabase
      .from("applications")
      .select("id, status, score, created_at, candidates ( id, name, email, phone, cv_file_url )")
      .eq("job_id", jobId);
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

  const statusLabel = (s: AppStatus) => t(`hr.status${s.charAt(0).toUpperCase()}${s.slice(1)}`);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">{t("hr.applications")}</h1>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("hr.all")}</SelectItem>
                <SelectItem value="pending">{t("hr.statusPending")}</SelectItem>
                <SelectItem value="reviewed">{t("hr.statusReviewed")}</SelectItem>
                <SelectItem value="accepted">{t("hr.statusAccepted")}</SelectItem>
                <SelectItem value="rejected">{t("hr.statusRejected")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as "score" | "date")}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="score">{t("hr.sortByScore")}</SelectItem>
                <SelectItem value="date">{t("hr.appliedAt")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Card className="mt-6">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("hr.candidate")}</TableHead>
                  <TableHead>{t("common.score")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                  <TableHead>{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{r.candidates?.name}</div>
                      <div className="text-xs text-muted-foreground">{r.candidates?.email}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={scoreVariant(r.score) as "default" | "secondary" | "outline" | "destructive"}>
                        {r.score ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select value={r.status} onValueChange={(v) => updateStatus(r.id, v as AppStatus)}>
                        <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(["pending", "reviewed", "accepted", "rejected"] as AppStatus[]).map((s) =>
                            <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => openCv(r.candidates?.cv_file_url ?? null)}>
                        <ExternalLink className="h-3 w-3" />{t("hr.viewCv")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">{t("hr.noApplications")}</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

interface JobCardHeaderProps { title: string; }
export const _h = (p: JobCardHeaderProps) => <CardHeader><CardTitle>{p.title}</CardTitle></CardHeader>;
