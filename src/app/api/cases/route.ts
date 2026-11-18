import { z } from "zod";
import { apiError, authorizedClient, writeAudit } from "@/lib/api-utils";

const caseInput = z.object({ title: z.string().trim().min(2).max(180), type: z.string().trim().max(80).optional(), caseType: z.string().trim().max(80).optional() });

export async function GET() {
  try {
    const { supabase, user, response } = await authorizedClient();
    if (response || !user) return response;
    const { data, error } = await supabase.from("cases").select("id,reference,title,case_type,status,created_at,updated_at,documents(id)").order("updated_at", { ascending: false }).limit(500);
    if (error) throw error;
    return Response.json({ cases: (data ?? []).map(item => ({ id: item.id, reference: item.reference, title: item.title, type: item.case_type, status: item.status, createdAt: item.created_at, updatedAt: item.updated_at, documentCount: Array.isArray(item.documents) ? item.documents.length : 0 })) });
  } catch (error) { return apiError(error, "Cases could not be loaded."); }
}

export async function POST(request: Request) {
  try {
    const { supabase, user, response } = await authorizedClient();
    if (response || !user) return response;
    const parsed = caseInput.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "Enter a case title between 2 and 180 characters." }, { status: 400 });
    const { title, type, caseType } = parsed.data;
    const { data, error } = await supabase.from("cases").insert({ owner_id: user.id, title, case_type: type ?? caseType ?? "General" }).select("id,reference,title,case_type,status,created_at,updated_at").single();
    if (error) throw error;
    await writeAudit(supabase, { caseId: data.id, action: "Case created", subject: data.title, userId: user.id, userName: user.email });
    return Response.json({ case: { id: data.id, reference: data.reference, title: data.title, type: data.case_type, status: data.status, createdAt: data.created_at, updatedAt: data.updated_at, documentCount: 0 } }, { status: 201 });
  } catch (error) { return apiError(error, "Case could not be created."); }
}
