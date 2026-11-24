import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function response(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function defaultKey(environmentName: string): string | undefined {
  const raw = Deno.env.get(environmentName);
  if (!raw) return undefined;
  try {
    const keys = JSON.parse(raw) as Record<string, unknown>;
    return typeof keys.default === "string" ? keys.default : undefined;
  } catch {
    return undefined;
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return response(405, { error: "Method not allowed." });

  const authorization = request.headers.get("Authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  const url = Deno.env.get("SUPABASE_URL");
  const publishableKey = Deno.env.get("SUPABASE_ANON_KEY")
    ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")
    ?? defaultKey("SUPABASE_PUBLISHABLE_KEYS");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    ?? defaultKey("SUPABASE_SECRET_KEYS");
  if (!token || !url || !publishableKey || !serviceRoleKey) {
    return response(401, { error: "Authentication required." });
  }

  const authClient = createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !authData.user) return response(401, { error: "Invalid session." });

  const adminClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: caller, error: callerError } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", authData.user.id)
    .maybeSingle();
  if (callerError || caller?.role !== "admin") return response(403, { error: "Administrator permission required." });

  let body: { action?: unknown; userId?: unknown; role?: unknown; offset?: unknown };
  try {
    body = await request.json();
  } catch {
    return response(400, { error: "Invalid request body." });
  }

  if (body.action === "list") {
    const requestedOffset = typeof body.offset === "number" ? body.offset : 0;
    const offset = Number.isInteger(requestedOffset) ? Math.max(0, Math.min(requestedOffset, 1000000)) : 0;
    const { data, count, error } = await adminClient
      .from("profiles")
      .select("id,email,full_name,role,created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + 99);
    if (error) return response(500, { error: "Could not load user accounts." });
    return response(200, { users: data ?? [], total: count ?? 0, offset });
  }

  if (body.action === "update-role") {
    const userId = typeof body.userId === "string" ? body.userId : "";
    const role = body.role;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) {
      return response(400, { error: "Select a valid account." });
    }
    if (userId === authData.user.id) return response(400, { error: "You cannot change your own administrator role." });
    if (role !== "student" && role !== "admin") return response(400, { error: "Select a valid account role." });

    const { data: target, error: targetError } = await adminClient
      .from("profiles")
      .select("id,role")
      .eq("id", userId)
      .maybeSingle();
    if (targetError || !target) return response(404, { error: "Account not found." });

    if (target.role === "admin" && role === "student") {
      const { count, error: countError } = await adminClient
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "admin");
      if (countError) return response(500, { error: "Could not verify administrator accounts." });
      if ((count ?? 0) <= 1) return response(409, { error: "The last administrator cannot be demoted." });
    }

    const { error } = await adminClient.from("profiles").update({ role }).eq("id", userId);
    if (error) return response(500, { error: "Could not update the account role." });
    return response(200, { success: true });
  }

  return response(400, { error: "Unsupported action." });
});
