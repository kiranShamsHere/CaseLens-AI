import { z } from "zod";
import { apiError, authorizedClient, writeAudit } from "@/lib/api-utils";

const reviewInput = z.object({ findingId: z.string().uuid(), decision: z.enum(["approve", "reject", "approved", "rejected", "needs_review"]), notes: z.string().trim().max(2000).optional(), requestId: z.string().uuid().optional() });

export async function GET() {
  try {
    const { supabase, user, response } = await authorizedClient();
    if (response || !user) return response;
    const { data, error } = await supabase.from("findings").select("id,case_id,title,description,severity,status,evidence,kind,created_at").in("status", ["Pending", "Needs review"]).order("created_at", { ascending: false }).limit(500);
    if (error) throw error;
    return Response.json({ reviews: data ?? [] });
  } catch (error) { return apiError(error, "Review queue could not be loaded."); }
}

export async function POST(request: Request) {
  try {
    const { supabase, user, response } = await authorizedClient();
    if (response || !user) return response;
    const parsed = reviewInput.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "Choose a finding and a valid review decision." }, { status: 400 });
    const { findingId, decision, notes = "", requestId } = parsed.data;
    if (requestId) {
      const { data: prior } = await supabase.from("reviews").select("id,decision,reviewer_name,notes,created_at").eq("request_id", requestId).maybeSingle();
      if (prior) return Response.json({ review: prior, idempotent: true });
    }
    const { data: finding, error: findingError } = await supabase.from("findings").select("id,case_id,title").eq("id", findingId).maybeSingle();
    if (findingError) throw findingError;
    if (!finding) return Response.json({ error: "Finding not found." }, { status: 404 });
    const normalizedDecision = decision === "approve" ? "approved" : decision === "reject" ? "rejected" : decision;
    const status = normalizedDecision === "approved" ? "Approved" : normalizedDecision === "rejected" ? "Rejected" : "Needs review";
    const { error: updateError } = await supabase.from("findings").update({ status, updated_at: new Date().toISOString() }).eq("id", findingId);
    if (updateError) throw updateError;
    const { data: review, error: reviewError } = await supabase.from("reviews").insert({
      case_id: finding.case_id, finding_id: finding.id, decision: normalizedDecision.toUpperCase(), reviewer_id: user.id,
      reviewer_name: user.email ?? "Case worker", notes, request_id: requestId ?? null,
    }).select("id,decision,reviewer_name,notes,created_at").single();
    if (reviewError) throw reviewError;
    await writeAudit(supabase, { caseId: finding.case_id, action: `Finding ${status.toLowerCase()}`, subject: finding.title, note: notes, userId: user.id, userName: user.email });
    return Response.json({ review: { ...review, status } }, { status: 201 });
  } catch (error) { return apiError(error, "The review decision could not be saved."); }
}
