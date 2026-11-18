import { apiError, authorizedClient } from "@/lib/api-utils";

export async function GET(request: Request) {
  try {
    const { supabase, user, response } = await authorizedClient();
    if (response || !user) return response;
    const caseId = new URL(request.url).searchParams.get("caseId");
    let query = supabase.from("audit_log").select("id,case_id,action,subject,actor,note,created_at,cases(title)").order("created_at", { ascending: false }).limit(300);
    if (caseId) query = query.eq("case_id", caseId);
    const { data, error } = await query;
    if (error) throw error;
    return Response.json({ audit: (data ?? []).map(item => ({ id: item.id, caseId: item.case_id, action: item.action, subject: item.subject, finding: item.subject || (item.cases as { title?: string } | null)?.title || "Case activity", reviewer: item.actor, actor: item.actor, timestamp: item.created_at, note: item.note, notes: item.note })) });
  } catch (error) { return apiError(error, "Audit history could not be loaded."); }
}
