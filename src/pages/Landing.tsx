import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Briefcase, Sparkles, Globe } from "lucide-react";

export default function Landing() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-16">
        <section className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{t("landing.hero")}</h1>
          <p className="mt-4 text-lg text-muted-foreground">{t("landing.sub")}</p>
          <div className="mt-8">
            <Button size="lg" asChild>
              <Link to="/auth">{t("landing.cta")}</Link>
            </Button>
          </div>
        </section>
        <section className="mt-20 grid gap-6 sm:grid-cols-3">
          {[
            { icon: Briefcase, title: t("landing.feat1Title"), body: t("landing.feat1") },
            { icon: Sparkles, title: t("landing.feat2Title"), body: t("landing.feat2") },
            { icon: Globe, title: t("landing.feat3Title"), body: t("landing.feat3") },
          ].map(({ icon: Icon, title, body }) => (
            <Card key={title}>
              <CardContent className="pt-6">
                <Icon className="h-6 w-6 text-primary" />
                <h3 className="mt-3 font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{body}</p>
              </CardContent>
            </Card>
          ))}
        </section>
      </main>
    </div>
  );
}
