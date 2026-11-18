import { apiError, authorizedClient } from "@/lib/api-utils";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, user, response } = await authorizedClient();
    if (response || !user) return response;
    const { id } = await context.params;
    let query = supabase.from("cases").select("id,reference,title,case_type,status,created_at,updated_at,documents(id)");
    query = /^[0-9a-f-]{36}$/i.test(id) ? query.eq("id", id) : query.eq("reference", id);
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    if (!data) return Response.json({ error: "Case not found." }, { status: 404 });
    return Response.json({ case: { id: data.id, reference: data.reference, title: data.title, type: data.case_type, status: data.status, createdAt: data.created_at, updatedAt: data.updated_at, documentCount: Array.isArray(data.documents) ? data.documents.length : 0 } });
  } catch (error) { return apiError(error, "Case could not be loaded."); }
}
