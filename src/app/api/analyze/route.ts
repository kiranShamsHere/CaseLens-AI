import { z } from "zod";
import { apiError, authorizedClient, writeAudit } from "@/lib/api-utils";
import { refreshFindings } from "@/lib/findings";

const schema = z.object({ caseId: z.string().uuid() });

export async function POST(request: Request) {
  try {
    const { supabase, user, response } = await authorizedClient();
    if (response || !user) return response;
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "Choose a valid case to analyze." }, { status: 400 });
    const { data: caseRecord, error: caseError } = await supabase.from("cases").select("id").eq("id", parsed.data.caseId).maybeSingle();
    if (caseError) throw caseError;
    if (!caseRecord) return Response.json({ error: "Case not found." }, { status: 404 });
    await refreshFindings(supabase, caseRecord.id);
    const { data, error } = await supabase.from("findings").select("id,kind,title,description,severity,status,evidence").eq("case_id", caseRecord.id).in("status", ["Pending", "Needs review"]);
    if (error) throw error;
    await writeAudit(supabase, { caseId: caseRecord.id, action: "Case analysis refreshed", subject: `${data?.length ?? 0} item(s) require review`, userId: user.id, userName: user.email });
    return Response.json({ findings: data ?? [], count: data?.length ?? 0, needsHumanReview: true });
  } catch (error) { return apiError(error, "Case analysis could not be completed."); }
}
