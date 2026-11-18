export type CaseRecord = {
  id: string; reference: string; title: string; type: string; status: string;
  createdAt: string; updatedAt: string; documentCount: number;
};

export type DocumentRecord = {
  id: string; caseId: string; filename: string; mimeType: string; size: number;
  status: string; statusNote: string; pageCount: number | null; analysisStatus: string; createdAt: string;
};

export type EvidenceCitation = { documentId?: string; source: string; page?: number; quote: string };
export type AskRequest = { caseId: string; question: string };
export type AskResponse = { answer: string; status: "needs_human_review"; mode: "gemini" | "retrieval_only"; citations: EvidenceCitation[]; conflicts: string[] };
export type FindingRecord = {
  id: string; caseId: string; kind: "conflict" | "missing"; title: string; description: string;
  severity: string; status: string; evidence: EvidenceCitation[]; createdAt: string;
};
export type ReviewRequest = { findingId: string; decision: "approve" | "reject" | "needs_review"; notes?: string };
export type AuditLogRecord = { id: string; caseId: string | null; action: string; subject: string; actor: string; note: string; timestamp: string };
