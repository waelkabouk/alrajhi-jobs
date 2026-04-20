import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useAuth } from "@/hooks/useAuth";
import { Briefcase } from "lucide-react";

export const AppHeader = () => {
  const { t } = useTranslation();
  const { user, roles, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <header className="border-b bg-card">
      <div className="container flex h-14 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <Briefcase className="h-5 w-5 text-primary" />
          <span>{t("app.name")}</span>
        </Link>
        <nav className="flex items-center gap-2">
          {roles.includes("super_admin") && (
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/companies">{t("nav.admin")}</Link>
            </Button>
          )}
          {roles.includes("hr") && (
            <Button variant="ghost" size="sm" asChild>
              <Link to="/hr">{t("nav.hr")}</Link>
            </Button>
          )}
          <LanguageSwitcher />
          {user ? (
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              {t("nav.signOut")}
            </Button>
          ) : (
            <Button size="sm" asChild>
              <Link to="/auth">{t("nav.signIn")}</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
};
