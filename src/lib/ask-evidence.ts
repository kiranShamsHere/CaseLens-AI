import type { EvidenceCitation } from "@/lib/contracts";

export type CitedClaim = { text: string; citations: EvidenceCitation[] };
export type ParsedEvidenceAnswer = { claims: CitedClaim[]; issues: CitedClaim[]; nextSteps: string[] };

/** Drop claims without valid indexes and resolve every surviving index to the original retrieved citation. */
export function validateEvidenceAnswer(value: Record<string, unknown>, evidence: EvidenceCitation[]): ParsedEvidenceAnswer | null {
  const citationsFor = (raw: unknown): EvidenceCitation[] => {
    if (!Array.isArray(raw)) return [];
    return [...new Set(raw.filter((index): index is number => typeof index === "number" && Number.isInteger(index) && index >= 0 && index < evidence.length))]
      .map(index => evidence[index]);
  };
  const parseStatements = (raw: unknown): CitedClaim[] => {
    if (!Array.isArray(raw)) return [];
    return raw.flatMap(item => {
      if (!item || typeof item !== "object") return [];
      const statement = item as { text?: unknown; citationIndexes?: unknown };
      if (typeof statement.text !== "string" || !statement.text.trim()) return [];
      const citations = citationsFor(statement.citationIndexes);
      return citations.length ? [{ text: statement.text.trim().slice(0, 1200), citations }] : [];
    }).slice(0, 20);
  };
  const claims = parseStatements(value.claims);
  if (!claims.length) return null;
  const issues = parseStatements(value.issues);
  const nextSteps = Array.isArray(value.nextSteps)
    ? value.nextSteps.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map(item => item.trim().slice(0, 300)).slice(0, 5)
    : [];
  return { claims, issues, nextSteps };
}

export function uniqueCitations(statements: CitedClaim[]): EvidenceCitation[] {
  const citations: EvidenceCitation[] = [];
  for (const statement of statements) for (const citation of statement.citations) {
    if (!citations.some(item => item.documentId === citation.documentId && item.page === citation.page && item.quote === citation.quote)) citations.push(citation);
  }
  return citations;
}
