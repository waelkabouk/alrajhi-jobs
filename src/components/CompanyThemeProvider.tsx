import { useEffect, useState, ReactNode } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Company {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  font_family: string | null;
}

const hexToHsl = (hex: string): string => {
  const m = hex.replace("#", "");
  if (m.length !== 6) return "222 47% 11%";
  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16) / 255;
  const b = parseInt(m.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

interface Props {
  children: (company: Company | null, loading: boolean) => ReactNode;
}

export const CompanyThemeProvider = ({ children }: Props) => {
  const { slug } = useParams<{ slug: string }>();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    supabase
      .from("companies")
      .select("id, name, slug, logo_url, primary_color, secondary_color, font_family")
      .eq("slug", slug)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setCompany(data ?? null);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [slug]);

  const style: React.CSSProperties = {};
  if (company?.primary_color) {
    (style as Record<string, string>)["--primary"] = hexToHsl(company.primary_color);
    (style as Record<string, string>)["--ring"] = hexToHsl(company.primary_color);
  }
  if (company?.secondary_color) {
    (style as Record<string, string>)["--secondary"] = hexToHsl(company.secondary_color);
  }
  if (company?.font_family) {
    style.fontFamily = company.font_family;
  }

  return (
    <div style={style} className="min-h-screen bg-background text-foreground">
      {children(company, loading)}
    </div>
  );
};
