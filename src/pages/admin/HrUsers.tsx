import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Edit, Trash2 } from "lucide-react";

interface HrUser {
  id: string;
  email: string;
  full_name: string | null;
  sector: "industrial" | "contracting" | "trading" | null;
}

export default function HrUsers() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<HrUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [inviting, setInviting] = useState(false);

  // Edit state
  const [editUser, setEditUser] = useState<HrUser | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editSector, setEditSector] = useState<"industrial" | "contracting" | "trading" | "">("");
  const [updating, setUpdating] = useState(false);

  // Form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sector, setSector] = useState<"industrial" | "contracting" | "trading" | "">("");

  const loadUsers = async () => {
    setLoading(true);
    // 1. Get HR user IDs
    const { data: roles, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "hr");

    if (rolesError) {
      toast.error(rolesError.message);
      setLoading(false);
      return;
    }

    const hrIds = roles?.map((r) => r.user_id) || [];

    if (hrIds.length === 0) {
      setUsers([]);
      setLoading(false);
      return;
    }

    // 2. Get profiles for those IDs
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, email, full_name, sector")
      .in("id", hrIds);

    if (profilesError) {
      toast.error(profilesError.message);
    } else {
      setUsers(profiles as HrUser[] || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password || !sector) {
      toast.error(t("errors.generic", "Please fill in all fields"));
      return;
    }

    setInviting(true);
    const { error } = await supabase.functions.invoke("invite-hr-user", {
      body: { email, password, fullName, sector },
    });
    setInviting(false);

    if (error) {
      toast.error(error.message || t("errors.generic"));
    } else {
      toast.success("HR User invited successfully");
      setIsOpen(false);
      setFullName("");
      setEmail("");
      setPassword("");
      setSector("");
      loadUsers();
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    
    setUpdating(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: editFullName, sector: editSector || null })
      .eq("id", editUser.id);
    
    setUpdating(false);
    
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t("common.save", "Saved successfully"));
      setEditUser(null);
      loadUsers();
    }
  };

  const handleDelete = async (user: HrUser) => {
    if (!confirm(`Are you sure you want to revoke HR access for ${user.full_name || user.email}?`)) return;
    
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", user.id)
      .eq("role", "hr");

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("HR access revoked");
      loadUsers();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold">{t("admin.hrUsers", "HR Users")}</h1>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                {t("admin.inviteHr", "Invite HR user")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("admin.inviteHr", "Invite HR user")}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleInvite} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>{t("auth.fullName", "Full Name")}</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>{t("common.email", "Email")}</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>{t("auth.password", "Password")}</Label>
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>{t("hr.sector", "Sector")}</Label>
                  <Select value={sector} onValueChange={(v) => setSector(v as "industrial" | "contracting" | "trading")}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("common.required", "Required")}>
                        {sector === "industrial" ? t("sectors.industrial", "Industrial") :
                         sector === "contracting" ? t("sectors.contracting", "Contracting") :
                         sector === "trading" ? t("sectors.trading", "Trading") : ""}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="industrial">{t("sectors.industrial", "Industrial")}</SelectItem>
                      <SelectItem value="contracting">{t("sectors.contracting", "Contracting")}</SelectItem>
                      <SelectItem value="trading">{t("sectors.trading", "Trading")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="pt-2">
                  <Button type="submit" className="w-full" disabled={inviting}>
                    {inviting ? t("common.loading", "Loading...") : t("common.submit", "Submit")}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Edit User Dialog */}
          <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("common.edit", "Edit")} HR User</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleUpdate} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>{t("auth.fullName", "Full Name")}</Label>
                  <Input value={editFullName} onChange={(e) => setEditFullName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>{t("hr.sector", "Sector")}</Label>
                  <Select value={editSector} onValueChange={(v) => setEditSector(v as "industrial" | "contracting" | "trading")}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("common.required", "Required")}>
                        {editSector === "industrial" ? t("sectors.industrial", "Industrial") :
                         editSector === "contracting" ? t("sectors.contracting", "Contracting") :
                         editSector === "trading" ? t("sectors.trading", "Trading") : ""}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="industrial">{t("sectors.industrial", "Industrial")}</SelectItem>
                      <SelectItem value="contracting">{t("sectors.contracting", "Contracting")}</SelectItem>
                      <SelectItem value="trading">{t("sectors.trading", "Trading")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="pt-2 flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setEditUser(null)}>
                    {t("common.cancel", "Cancel")}
                  </Button>
                  <Button type="submit" disabled={updating}>
                    {updating ? t("common.loading", "Loading...") : t("common.save", "Save")}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.name", "Name")}</TableHead>
                <TableHead>{t("common.email", "Email")}</TableHead>
                <TableHead>{t("hr.sector", "Sector")}</TableHead>
                <TableHead className="w-[100px] text-right">{t("common.actions", "Actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    {t("common.loading", "Loading...")}
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    {t("common.none", "None")}
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name || "—"}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {user.sector ? t(`sectors.${user.sector}`, user.sector) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => {
                          setEditUser(user);
                          setEditFullName(user.full_name || "");
                          setEditSector(user.sector || "");
                        }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(user)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  );
}
