import { apiError, authorizedClient } from "@/lib/api-utils";

export async function GET(request: Request) {
  try {
    const { supabase, user, response } = await authorizedClient();
    if (response || !user) return response;
    const caseId = new URL(request.url).searchParams.get("caseId");
    let query = supabase.from("findings").select("id,case_id,title,description,severity,status,evidence,created_at").eq("kind", "missing").in("status", ["Needs review", "Pending"]).order("created_at", { ascending: false }).limit(500);
    if (caseId) query = query.eq("case_id", caseId);
    const { data, error } = await query;
    if (error) throw error;
    return Response.json({ missing: data ?? [] });
  } catch (error) { return apiError(error, "Missing-information items could not be loaded."); }
}
