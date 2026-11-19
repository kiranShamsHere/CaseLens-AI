export type CaseMetadataRecord = Record<string, unknown>;
export type MetadataAnswer = { label: string; value: string; recorded: boolean };

type Field = { label: string; keys: string[]; question: RegExp };

const fields: Field[] = [
  { label: "Applicant", keys: ["applicant_name", "applicant", "claimant_name", "client_name", "employee_name"], question: /\b(?:who (?:is|'s|\?)?\s*(?:the )?(?:applicant|claimant|client|employee)|(?:what is )?(?:the )?(?:applicant|claimant|client|employee) name)\b/i },
  { label: "Employer / respondent", keys: ["employer_name", "respondent_name", "company_name", "employer", "respondent"], question: /\b(?:who (?:is|'s|\?)?\s*(?:the )?(?:employer|respondent)|(?:what is )?(?:the )?(?:employer|respondent|company) name)\b/i },
  { label: "Case reference", keys: ["reference", "case_reference", "case_number"], question: /\b(?:case reference|reference number|case number|reference for (?:this|the|my) case)\b/i },
  { label: "Case title", keys: ["title", "case_title"], question: /\b(?:case title|title of (?:this|the|my) case|what is this case called)\b/i },
  { label: "Case location", keys: ["case_location", "applicant_location", "location", "city", "district"], question: /\b(?:where (?:does|is) (?:the )?(?:applicant|claimant|client|employee) (?:live|from|located)|where (?:does|is) .{1,60} (?:live|from|located)|(?:what is )?(?:the )?(?:applicant|claimant|client|employee)(?:'s)? location|(?:case|applicant|client) location|location of (?:this|the|my) case|location of (?:the )?(?:applicant|claimant|client)|what location (?:is )?(?:listed|mentioned) in (?:the )?case file|which city (?:is )?(?:the )?(?:applicant|client|employee) (?:is )?associated with)\b/i },
  { label: "Residential address", keys: ["residential_address", "home_address", "residence_address", "residential_location"], question: /\b(?:residential|home|house) (?:address|location)\b/i },
  { label: "Matter type", keys: ["matter_type", "case_type", "matter"], question: /\b(?:matter type|case type|type of (?:this|the|my) case)\b/i },
  { label: "Case status", keys: ["status", "case_status"], question: /\b(?:case status|current status of (?:this|the|my) case|status of (?:this|the|my) case)\b/i },
  { label: "Case creation date", keys: ["created_at", "createdAt", "creation_date"], question: /\b(?:when (?:was|did) (?:(?:this|the|my) )?case (?:created|opened)|case creation date|creation date of (?:this|the|my) case)\b/i },
  { label: "Employment start date", keys: ["employment_start_date", "start_date", "date_of_joining", "employment_start"], question: /\b(?:employment (?:start|beginning) date|when did (?:the )?(?:applicant|employee|employment|work) (?:start|begin))\b/i },
  { label: "Employment end date", keys: ["employment_end_date", "end_date", "last_working_date", "employment_end"], question: /\b(?:employment end date|last working date|when did (?:the )?(?:applicant|employee|employment|work) (?:end|finish))\b/i },
];

function normalizeQuestion(question: string) {
  return question.trim().toLowerCase().normalize("NFKC").replace(/[’]/g, "'")
    .replace(/\b(?:u|ya)\b/g, "you").replace(/\bwht\b/g, "what")
    .replace(/\bwher\b/g, "where").replace(/\bwhats\b/g, "what is")
    .replace(/\s+/g, " ");
}

function normalizeKey(key: string) {
  return key.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function readableValue(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (value instanceof Date && Number.isFinite(value.getTime())) return value.toISOString();
  return null;
}

function metadataSources(record: CaseMetadataRecord): CaseMetadataRecord[] {
  const nested = [record.metadata, record.case_metadata, record.details]
    .filter((value): value is CaseMetadataRecord => !!value && typeof value === "object" && !Array.isArray(value));
  return [record, ...nested];
}

function getValue(record: CaseMetadataRecord, keys: string[]): string | null {
  const aliases = new Set(keys.map(normalizeKey));
  for (const source of metadataSources(record)) {
    for (const [key, value] of Object.entries(source)) {
      if (aliases.has(normalizeKey(key))) {
        const result = readableValue(value);
        if (result) return result;
      }
    }
  }
  return null;
}

export function metadataQuestion(question: string): boolean {
  const normalized = normalizeQuestion(question);
  return fields.some(field => field.question.test(normalized));
}

/** Resolve only fields asked about and present in the authenticated selected case row. */
export function answerCaseMetadata(question: string, record: CaseMetadataRecord): MetadataAnswer[] {
  const normalized = normalizeQuestion(question);
  return fields.flatMap(field => {
    if (!field.question.test(normalized)) return [];
    const value = getValue(record, field.keys);
    return [{ label: field.label, value: value ?? "Not recorded in the selected case record.", recorded: value !== null }];
  });
}

/** Only treat a title as an applicant source when the title explicitly labels the role. */
export function applicantFromTitle(title: unknown): string | null {
  if (typeof title !== "string") return null;
  const match = title.match(/(?:^|[|·–—:]\s*)(?:applicant|claimant|client)\s*[:–—-]\s*([\p{L}][\p{L}'’.-]+(?:\s+[\p{L}][\p{L}'’.-]+){1,3})(?=$|\s*[|·–—,])/iu);
  return match?.[1]?.trim() ?? null;
}
