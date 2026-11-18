import type { SupabaseClient } from "@supabase/supabase-js";

type Passage = { id: string; case_id: string; document_id: string; page: number | null; content: string; documents?: { filename?: string } | null };
type Candidate = { key: string; label: string; normalized: string; passage: Passage; quote: string };

const months: Record<string, string> = { jan: "01", january: "01", feb: "02", february: "02", mar: "03", march: "03", apr: "04", april: "04", may: "05", jun: "06", june: "06", jul: "07", july: "07", aug: "08", august: "08", sep: "09", september: "09", oct: "10", october: "10", nov: "11", november: "11", dec: "12", december: "12" };

export function normalizeDateValue(value: string) {
  const clean = value.trim().replace(/,/g, "");
  const iso = clean.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  let year: number; let month: number; let day: number;
  if (iso) { year = Number(iso[1]); month = Number(iso[2]); day = Number(iso[3]); }
  else {
    const parts = clean.match(/^(\d{1,2})[\s./-]+([a-z]+|\d{1,2})[\s./-]+(\d{2,4})$/i)
      ?? clean.match(/^([a-z]+)\s+(\d{1,2})\s+(\d{2,4})$/i);
    if (!parts) return clean.toLowerCase().replace(/\s+/g, " ");
    if (/^[a-z]/i.test(parts[1])) { month = Number(months[parts[1].toLowerCase()]); day = Number(parts[2]); year = Number(parts[3]); }
    else {
      day = Number(parts[1]);
      month = /^[a-z]/i.test(parts[2]) ? Number(months[parts[2].toLowerCase()]) : Number(parts[2]);
      year = Number(parts[3]);
    }
  }
  if (year < 100) year += year < 50 ? 2000 : 1900;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return clean.toLowerCase().replace(/\s+/g, " ");
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function normalizeAmountValue(value: string) {
  const currency = /\bPKR\b|\bRs\.?|\brupees?\b/i.test(value) ? "PKR" : /\bUSD\b|\$/i.test(value) ? "USD" : /\bGBP\b|£/i.test(value) ? "GBP" : "UNSPECIFIED";
  const numeric = value.match(/[\d,]+(?:\.\d+)?/)?.[0]?.replace(/,/g, "") ?? "";
  return numeric ? currency === "UNSPECIFIED" ? Number(numeric).toString() : `${currency}:${Number(numeric).toString()}` : value.trim().toLowerCase();
}

export function candidatesFromPassages(passages: Passage[]): Candidate[] {
  const candidates: Candidate[] = [];
  for (const passage of passages) {
    for (const line of passage.content.split(/\n|(?<=[.!?])\s+/).map(item => item.trim()).filter(Boolean)) {
      if (/(salary|wage|pay|remuneration|monthly income|monthly amount)/i.test(line)) {
        const amount = line.match(/(?:PKR|Rs\.?|USD|\$|£)\s*[\d,]+(?:\.\d+)?|[\d,]+(?:\.\d+)?\s*(?:PKR|rupees|per month|monthly)/i)?.[0];
        if (amount) candidates.push({ key: "salary", label: "salary or wage", normalized: normalizeAmountValue(amount), passage, quote: line.slice(0, 600) });
      }
      const date = line.match(/\b(?:\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[ ./-](?:\d{1,2}|Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[ ./-]\d{2,4}|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{4})\b/i)?.[0];
      if (date && /\b(start|commenc|join|began|employment start|last working|terminat|employment end|resign|dismiss)/i.test(line)) {
        const key = /\b(last working|terminat|employment end|resign|dismiss)/i.test(line) ? "employment_end_date" : "employment_start_date";
        candidates.push({ key, label: key === "employment_end_date" ? "employment end date" : "employment start date", normalized: normalizeDateValue(date), passage, quote: line.slice(0, 600) });
      }
    }
  }
  return candidates;
}

export function valuesContradict(key: string, values: string[]) {
  if (key !== "salary") return new Set(values).size > 1;
  const amounts = new Set(values.map(value => value.split(":").at(-1)));
  const currencies = new Set(values.flatMap(value => value.includes(":") ? [value.split(":")[0]] : []));
  return amounts.size > 1 || currencies.size > 1;
}

const checklist = [
  { key: "client_identity", label: "Client identity", matches: /\b(client|applicant|claimant|employee)\b.{0,60}\b(name|named|is)\b/i },
  { key: "employer_details", label: "Employer details", matches: /\b(employer|company|workplace|organization)\b/i },
  { key: "employment_start_date", label: "Employment start date", matches: /\b(started|start date|commenced|joined|began employment|employment began)\b/i },
  { key: "salary", label: "Salary or wage", matches: /\b(salary|wage|pay|remuneration|monthly income)\b/i },
  { key: "payment_proof", label: "Payment records", matches: /\b(payroll|payslip|payment record|bank statement|wage slip)\b/i },
  { key: "termination_notice", label: "End-of-employment information", matches: /\b(termination|dismissal|last working day|resignation|notice period)\b/i },
];

function evidenceSignature(value: unknown) {
  if (!Array.isArray(value)) return "";
  return value.map(entry => {
    if (!entry || typeof entry !== "object") return "";
    const item = entry as Record<string, unknown>;
    return [item.documentId, item.source, item.page, item.quote].map(part => String(part ?? "")).join("|");
  }).sort().join("\n");
}

export async function refreshFindings(supabase: SupabaseClient, caseId: string) {
  const { data: passages, error: passageError } = await supabase.from("passages").select("id,case_id,document_id,page,content,documents(filename)").eq("case_id", caseId).limit(5000);
  if (passageError) throw passageError;
  const sourcePassages = (passages ?? []) as Passage[];
  if (!sourcePassages.length) return;

  const { data: existingFindings, error: existingError } = await supabase.from("findings").select("id,key,status,description,evidence,kind").eq("case_id", caseId);
  if (existingError) throw existingError;
  const existingByKey = new Map((existingFindings ?? []).map((item: { id: string; key: string; status: string; description: string; evidence: unknown }) => [item.key, item]));

  const grouped = new Map<string, Candidate[]>();
  for (const candidate of candidatesFromPassages(sourcePassages)) {
    const group = grouped.get(candidate.key) ?? [];
    group.push(candidate);
    grouped.set(candidate.key, group);
  }
  const activeConflictKeys: string[] = [];
  for (const [key, values] of grouped) {
    const byValue = new Map<string, Candidate[]>();
    values.forEach(value => byValue.set(value.normalized, [...(byValue.get(value.normalized) ?? []), value]));
    const valuesConflict = valuesContradict(key, values.map(value => value.normalized));
    const distinctEvidence = [...byValue.values()].flat().filter((value, index, all) => all.findIndex(other => other.passage.document_id === value.passage.document_id) === index);
    const distinctDocs = new Set(distinctEvidence.map(item => item.passage.document_id));
    if (!valuesConflict || distinctDocs.size < 2) continue;
    const evidence = distinctEvidence.slice(0, 6).map(item => ({ documentId: item.passage.document_id, source: item.passage.documents?.filename ?? "Source document", page: item.passage.page, quote: item.quote }));
    const label = distinctEvidence[0].label;
    activeConflictKeys.push(`conflict:${key}`);
    const existing = existingByKey.get(`conflict:${key}`);
    const status = existing && evidenceSignature(existing.evidence) === evidenceSignature(evidence) ? existing.status : "Pending";
    const { error } = await supabase.from("findings").upsert({
      case_id: caseId, kind: "conflict", key: `conflict:${key}`, title: `Conflicting ${label}`,
      description: `Different ${label} values appear in separate documents. Compare each cited quotation; this flag needs human review.`,
      severity: key.includes("date") ? "High" : "Medium", status, evidence,
    }, { onConflict: "case_id,key" });
    if (error) throw error;
  }
  for (const item of existingFindings ?? []) if (item.kind === "conflict" && !activeConflictKeys.includes(item.key)) await supabase.from("findings").update({ status: "Resolved" }).eq("id", item.id);

  const allText = sourcePassages.map(item => item.content).join("\n");
  for (const item of checklist) {
    const missing = !item.matches.test(allText);
    const key = `missing:${item.key}`;
    const description = missing
      ? `No matching detail was located in the text extracted so far. Confirm with the client or original source; absence from this file is not proof that the information does not exist.`
      : `Matching material was found in the uploaded text. A case worker should still verify the source.`;
    const existing = existingByKey.get(key);
    const status = existing?.description === description ? existing.status : missing ? "Needs review" : "Located · verify";
    const { error } = await supabase.from("findings").upsert({
      case_id: caseId, kind: "missing", key, title: `${item.label} not located`,
      description, severity: "Medium", status, evidence: [],
    }, { onConflict: "case_id,key" });
    if (error) throw error;
  }
}
