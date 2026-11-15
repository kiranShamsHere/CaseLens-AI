export type CaseRecord = { id: string; title: string; reference: string; type: string; status: string; updated: string; documents: number };
export type Finding = { id: string; title: string; description: string; source: string; page: number; quote: string; severity: string; status: string };

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

// Clearly separated sample records used until the backend and shared contracts are present.
export const demoCases: CaseRecord[] = [
  { id: "CL-2048", title: "Rahman v. Northstar Textiles", reference: "CL-2048", type: "Employment", status: "Active", updated: "Today, 10:42 AM", documents: 8 },
  { id: "CL-2039", title: "Ayesha Malik — wage claim", reference: "CL-2039", type: "Wage dispute", status: "In review", updated: "Yesterday", documents: 5 },
  { id: "CL-2027", title: "Khan family — housing support", reference: "CL-2027", type: "Housing", status: "Active", updated: "Nov 12, 2026", documents: 12 },
  { id: "CL-2018", title: "Sana Iqbal — benefits appeal", reference: "CL-2018", type: "Benefits", status: "Closed", updated: "Nov 10, 2026", documents: 4 },
];

export const demoFindings: Finding[] = [
  { id: "F-018", title: "Conflicting employment start date", description: "The intake form and employer letter report different start dates.", source: "Intake form.pdf · p. 2 and Employer letter.pdf · p. 1", page: 2, quote: 'Intake: “Started 14 March 2024.” Employer letter: “Employment commenced 1 April 2024.”', severity: "High", status: "Pending" },
  { id: "F-021", title: "Monthly salary needs verification", description: "The reported monthly amount differs between the client statement and payroll sheet.", source: "Client statement.pdf · p. 3 and Payroll summary.xlsx · row 8", page: 3, quote: 'Client statement: “PKR 48,000 per month.” Payroll summary: “PKR 43,500.”', severity: "Medium", status: "Pending" },
  { id: "F-024", title: "Missing termination notice", description: "No termination notice was found in the uploaded case file.", source: "Case file · all 8 documents", page: 0, quote: "No matching evidence found. Confirm with the client before relying on this finding.", severity: "Medium", status: "Needs review" },
];

export const demoActivity = [
  { text: "Conflicting start dates flagged", meta: "Rahman v. Northstar Textiles · 18 min ago", kind: "warning" },
  { text: "Employer letter processed", meta: "Rahman v. Northstar Textiles · 42 min ago", kind: "success" },
  { text: "Review requested for salary finding", meta: "Ayesha Malik · Yesterday", kind: "review" },
];
