import { apiError, authorizedClient, ownedCase, writeAudit } from "@/lib/api-utils";
import { extractDocument } from "@/lib/documents";
import { refreshFindings } from "@/lib/findings";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { supabase, user, response } = await authorizedClient();
    if (response || !user) return response;
    const url = new URL(request.url);
    const caseId = url.searchParams.get("caseId");
    let query = supabase.from("documents").select("id,case_id,filename,mime_type,size_bytes,status,status_note,page_count,analysis_status,created_at").order("created_at", { ascending: false }).limit(500);
    if (caseId) query = query.eq("case_id", caseId);
    const { data, error } = await query;
    if (error) throw error;
    return Response.json({ documents: (data ?? []).map(item => ({ ...item, caseId: item.case_id, type: item.filename.split(".").pop()?.toUpperCase() ?? "Document", size: item.size_bytes, createdAt: item.created_at })) });
  } catch (error) { return apiError(error, "Documents could not be loaded."); }
}

export async function POST(request: Request) {
  try {
    const { supabase, user, response } = await authorizedClient();
    if (response || !user) return response;
    const form = await request.formData();
    const file = form.get("file");
    const caseId = String(form.get("caseId") ?? "");
    if (!(file instanceof File) || !caseId) return Response.json({ error: "Choose a file and a case." }, { status: 400 });
    const { data: caseRecord, error: caseError } = await ownedCase(supabase, caseId);
    if (caseError) throw caseError;
    if (!caseRecord) return Response.json({ error: "Case not found." }, { status: 404 });

    const extracted = await extractDocument(file);
    const { data: document, error: insertError } = await supabase.from("documents").insert({
      case_id: caseId, filename: file.name.slice(0, 240), mime_type: file.type || "application/octet-stream",
      size_bytes: file.size, status: extracted.passages.length ? "Processed" : "Needs review",
      status_note: extracted.note, page_count: extracted.pageCount,
      analysis_status: extracted.passages.length ? "processed" : "no_text",
    }).select("id,case_id,filename,mime_type,size_bytes,status,status_note,page_count,analysis_status,created_at").single();
    if (insertError) {
      if (insertError.code === "23505") return Response.json({ error: "This file already exists in the selected case." }, { status: 409 });
      throw insertError;
    }

    try {
      for (let index = 0; index < extracted.passages.length; index += 100) {
        const batch = extracted.passages.slice(index, index + 100).map(passage => ({ case_id: caseId, document_id: document.id, page: passage.page, position: passage.position, content: passage.content }));
        const { error } = await supabase.from("passages").insert(batch);
        if (error) throw error;
      }
      if (extracted.passages.length) await refreshFindings(supabase, caseId);
      await writeAudit(supabase, { caseId, action: "Document processed", subject: file.name, note: extracted.note, userId: user.id, userName: user.email });
    } catch (error) {
      await supabase.from("documents").delete().eq("id", document.id);
      throw error;
    }
    return Response.json({ document: { ...document, caseId: document.case_id, type: file.name.split(".").pop()?.toUpperCase() ?? "Document", size: document.size_bytes, createdAt: document.created_at } }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && /4 MB|Supported file types|character limit/.test(error.message)) return Response.json({ error: error.message }, { status: 400 });
    return apiError(error, "The document could not be processed.");
  }
}
