import { Link } from "react-router-dom";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export const PublicHeader = () => {
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
          <LanguageSwitcher />
        </nav>
      </div>
    </header>
  );
};
