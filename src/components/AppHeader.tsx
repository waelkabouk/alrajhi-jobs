import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useAuth } from "@/hooks/useAuth";

export const AppHeader = () => {
  const { t } = useTranslation();
  const { user, roles, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <header className="border-b bg-white shadow-sm sticky top-0 z-50">
      <div className="container flex h-16 items-center justify-between gap-4">
        {/* Logo — links to the jobs listing */}
        <Link to="/" className="flex items-center gap-3 shrink-0">
          <img
            src="/logo.svg"
            alt="AlRajhi Building & Construction"
            className="h-10 w-auto"
          />
        </Link>

        <nav className="flex items-center gap-2">
          {roles.includes("super_admin") && (
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin">{t("nav.admin")}</Link>
            </Button>
          )}
          {(roles.includes("super_admin") || roles.includes("hr")) && (
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
