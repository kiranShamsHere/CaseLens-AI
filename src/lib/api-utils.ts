import { createClient } from "@/lib/supabase/server";

export async function authorizedClient() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { supabase, user: null, response: Response.json({ error: "Sign in is required." }, { status: 401 }) };
  return { supabase, user, response: null };
}

export function apiError(error: unknown, fallback = "The request could not be completed.") {
  const message = error instanceof Error ? error.message : fallback;
  const status = /not configured|missing environment/i.test(message) ? 503 : 500;
  return Response.json({ error: status === 503 ? "The service is not configured yet." : fallback }, { status });
}

export async function writeAudit(supabase: Awaited<ReturnType<typeof createClient>>, input: { caseId: string; action: string; subject?: string; note?: string; userId: string; userName?: string }) {
  const { error } = await supabase.from("audit_log").insert({
    case_id: input.caseId, action: input.action, subject: input.subject ?? "",
    note: input.note ?? "", actor_id: input.userId, actor: input.userName ?? "Case worker",
  });
  if (error) throw error;
}

export async function ownedCase(supabase: Awaited<ReturnType<typeof createClient>>, id: string) {
  return supabase.from("cases").select("id,reference,title,case_type,status,created_at,updated_at").eq("id", id).maybeSingle();
}
