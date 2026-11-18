export type CaseRecord = { id: string; title: string; reference: string; type: string; status: string; updated: string; documents: number };
export function normalizeCaseRecord(value: unknown, index: number): CaseRecord | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const title = item.title ?? item.name ?? item.caseName;
  if (typeof title !== "string") return null;
  const id = item.id ?? item.reference ?? item.caseNumber ?? `case-${index + 1}`;
  return {
    id: String(id),
    title,
    reference: String(item.reference ?? item.caseNumber ?? id),
    type: String(item.type ?? item.caseType ?? "Case"),
    status: String(item.status ?? "Open"),
    updated: String(item.updated ?? item.updatedAt ?? "Recently updated"),
    documents: Number(item.documents ?? item.documentCount ?? 0),
  };
}
