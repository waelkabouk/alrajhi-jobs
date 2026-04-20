import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const email = Deno.env.get("SEED_ADMIN_EMAIL");
    const password = Deno.env.get("SEED_ADMIN_PASSWORD");
    if (!email || !password) {
      return new Response(JSON.stringify({ error: "SEED_ADMIN_EMAIL/PASSWORD not set" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Find existing user
    let userId: string | null = null;
    const { data: list } = await admin.auth.admin.listUsers();
    const existing = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (existing) {
      userId = existing.id;
    } else {
      const { data: created, error } = await admin.auth.admin.createUser({
        email, password, email_confirm: true,
        user_metadata: { full_name: "Super Admin" },
      });
      if (error || !created.user) throw new Error(error?.message || "Create failed");
      userId = created.user.id;
    }

    await admin.from("profiles").upsert({ id: userId!, email, full_name: "Super Admin" });
    await admin.from("user_roles").upsert({ user_id: userId!, role: "super_admin" }, { onConflict: "user_id,role" });

    return new Response(JSON.stringify({ ok: true, email, userId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
