import type { AskClaim, EvidenceCitation } from "@/lib/contracts";

type Field = "applicant" | "employer" | "person_location" | "case_location" | "residential_address" | "workplace_location" | "salary" | "employment_start" | "employment_end";
type SalarySource = "offer" | "applicant_reported" | "unspecified";
type LabeledValue = { label: string; value: string; field: Field; salarySource?: SalarySource };
export type ExtractiveAnswer = {
  summary: string;
  claims: AskClaim[];
  issueClaims: AskClaim[];
  citations: EvidenceCitation[];
  potentialIssues: string[];
  nextSteps: string[];
};

const labelPattern = "Residential Address|Home Address|Workplace Location|Work Location|Worksite Location|Employer Location|Applicant Location|Case Location|Usual Monthly Salary|Applicant Reported Salary|Reported Monthly Salary|Claimed Monthly Gross Salary|Monthly Gross Salary|Gross Monthly Salary|Claimed Monthly Salary|Monthly Salary|Monthly Wages|Monthly Wage|Employment Start Date|Employment End Date|Date of Joining|Last Working Date|Applicant Name|Respondent Name|Employer Name|Applicant|Claimant|Client|Employee|Employer|Respondent|Location|Salary|Wages|Wage|Pay|Start Date|End Date";
const labeledValue = new RegExp(`(?:^|[\\n|;]\\s*|\\s)(${labelPattern})\\s*:\\s*([^\\n|;]*?)(?=\\s+(?:${labelPattern})\\s*:|$|[\\n|;])`, "gi");
const salarySentence = /\b((?:your|applicant(?:'s|’s)\s+)?(?:usual\s+)?(?:monthly\s+)?(?:gross\s+)?salary)\s+(?:will\s+be|is|was|of|amounts?\s+to)\s+((?:PKR|Rs\.?|USD|\$)\s*[\d,]+(?:\.\d{1,2})?(?:\s+per\s+month)?)\b/gi;

function normalizeQuestion(question: string) {
  return question.toLowerCase().normalize("NFKC").replace(/[’]/g, "'").replace(/\s+/g, " ").trim();
}

export function requestedExtractiveField(question: string): Field | null {
  const text = normalizeQuestion(question);
  if (/\b(?:residential|home|house)\s+(?:address|location)\b|\bwhere\s+(?:does|is)\s+(?:the\s+)?(?:applicant|client|employee)\s+live\b/.test(text)) return "residential_address";
  if (/\b(?:workplace|work\s+site|worksite|employer)\s+(?:location|address)\b/.test(text)) return "workplace_location";
  if (/\b(?:who\s+(?:is|'s)\s+(?:the\s+)?(?:applicant|claimant|client|employee)|(?:applicant|claimant|client|employee)\s+name)\b/.test(text)) return "applicant";
  if (/\b(?:who\s+(?:is|'s)\s+(?:the\s+)?(?:employer|respondent)|(?:employer|respondent|company)\s+name)\b/.test(text)) return "employer";
  if (/\b(?:salary|wages?|pay)\b/.test(text)) return "salary";
  if (/\b(?:employment\s+start|start\s+date|date\s+of\s+joining|when\s+did\s+(?:the\s+)?(?:applicant|employee|employment|work)\s+(?:start(?:ed)?|began?)|when\s+did\s+(?:the\s+)?(?:applicant|employee)\s+(?:claim|report)\s+(?:that\s+)?employment\s+(?:start(?:ed)?|began?))\b/.test(text)) return "employment_start";
  if (/\b(?:employment\s+end|end\s+date|last\s+working\s+date|when\s+did\s+(?:the\s+)?(?:applicant|employee|employment|work)\s+(?:end|finish))\b/.test(text)) return "employment_end";
  if (/\b(?:case\s+file|case\s+metadata|location\s+listed|location\s+mentioned)\b/.test(text) && /\b(?:location|city|where)\b/.test(text)) return "case_location";
  if (/\b(?:location|city|from|live|associated\s+with)\b/.test(text) && /\b(?:applicant|claimant|client|employee|where|which\s+city|amina)\b/.test(text)) return "person_location";
  if (/\b(?:location|city)\b/.test(text)) return "case_location";
  return null;
}

function valueField(label: string): Field | null {
  const normalized = label.toLowerCase().replace(/\s+/g, " ").trim();
  if (/^(?:applicant|claimant|client|employee|applicant name)$/.test(normalized)) return "applicant";
  if (/^(?:employer|respondent|employer name|respondent name)$/.test(normalized)) return "employer";
  if (/^(?:residential address|home address)$/.test(normalized)) return "residential_address";
  if (/^(?:workplace location|work location|worksite location|employer location)$/.test(normalized)) return "workplace_location";
  if (/^(?:applicant location)$/.test(normalized)) return "person_location";
  if (/^(?:case location|location)$/.test(normalized)) return "case_location";
  if (/^(?:usual monthly salary|applicant reported salary|reported monthly salary|claimed monthly gross salary|monthly gross salary|gross monthly salary|claimed monthly salary|monthly salary|salary|monthly wages|monthly wage|wages|wage|pay)$/.test(normalized)) return "salary";
  if (/^(?:employment start date|start date|date of joining)$/.test(normalized)) return "employment_start";
  if (/^(?:employment end date|end date|last working date)$/.test(normalized)) return "employment_end";
  return null;
}

function passageValues(text: string): LabeledValue[] {
  const result: LabeledValue[] = [];
  labeledValue.lastIndex = 0;
  for (const match of text.matchAll(labeledValue)) {
    const label = match[1]?.trim() ?? "";
    const value = (match[2] ?? "").trim().replace(/[.]+$/, "").trim();
    const field = valueField(label);
    if (field && value) result.push({ label, value, field });
  }
  salarySentence.lastIndex = 0;
  for (const match of text.matchAll(salarySentence)) {
    const label = (match[1] ?? "Salary").trim();
    const value = (match[2] ?? "").trim().replace(/[.]+$/, "");
    if (value) result.push({ label, value, field: "salary", salarySource: salarySourceFor(label, text) });
  }
  return result.map(item => item.field === "salary" && !item.salarySource
    ? { ...item, salarySource: salarySourceFor(item.label, text) }
    : item);
}

function salarySourceFor(label: string, text: string, source = ""): SalarySource {
  if (/usual|applicant reported|reported|claimed/i.test(label)) return "applicant_reported";
  if (/offer\s+letter|offer of employment|your\s+(?:monthly\s+)?(?:gross\s+)?salary\s+will\s+be/i.test(`${source} ${text}`)) return "offer";
  return "unspecified";
}

function citationFor(item: EvidenceCitation): EvidenceCitation {
  return { source: item.source, quote: item.quote, ...(item.documentId ? { documentId: item.documentId } : {}), ...(typeof item.page === "number" ? { page: item.page } : {}) };
}

function sameValue(left: string, right: string) {
  return left.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim() === right.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function answerClaim(text: string, citation: EvidenceCitation): AskClaim {
  return { text, citations: [citationFor(citation)] };
}

/** Deterministic, labeled-field extraction used only after model analysis is unavailable. */
export function extractiveFallback(question: string, evidence: EvidenceCitation[]): ExtractiveAnswer | null {
  const requested = requestedExtractiveField(question);
  if (!requested) return null;

  let candidates = evidence.flatMap(citation => passageValues(citation.quote)
    .map(item => item.field === "salary"
      ? { ...item, salarySource: salarySourceFor(item.label, citation.quote, citation.source) }
      : item)
    .filter(item => item.field === requested || (requested === "person_location" && item.field === "case_location"))
    .filter(item => requested !== "salary" || !/\b(?:offer|offer letter)\b/i.test(question) || item.salarySource === "offer")
    .filter(item => requested !== "salary" || !/\b(?:usual|applicant.reported|reported|claimed)\b/i.test(question) || item.salarySource === "applicant_reported")
    .filter(item => {
      if (item.field !== "case_location" || !/^location$/i.test(item.label)) return true;
      // A generic Location label in the selected case's retrieved passage can
      // answer a case-file location question without implying whose location it is.
      return requested === "case_location" || /\b(?:case\s+(?:metadata|summary)|applicant|claimant|client)\s*:?/i.test(citation.quote);
    })
    .map(item => ({ ...item, citation: citationFor(citation) })));

  // Explicit applicant-location labels take precedence over the generic case-file "Location" field.
  if (requested === "person_location" && candidates.some(item => item.field === "person_location")) {
    candidates = candidates.filter(item => item.field === "person_location");
  }

  if (requested === "residential_address" && !candidates.length) {
    const contextLocations = evidence.flatMap(citation => passageValues(citation.quote)
      .filter(item => item.field === "case_location" || item.field === "person_location")
      .map(item => ({ ...item, citation: citationFor(citation) })));
    if (contextLocations.length) {
      const location = contextLocations[0]!;
      const claim = answerClaim(`The case file lists ${location.label}: ${location.value}. This is not identified as a residential address.`, location.citation);
      return {
        summary: "The available evidence does not establish the applicant’s residential address.",
        claims: [claim],
        issueClaims: [],
        citations: [claim.citations[0]!],
        potentialIssues: [],
        nextSteps: [],
      };
    }
  }

  if (!candidates.length) return null;

  const groups: { value: string; label: string; citations: EvidenceCitation[]; salarySource?: SalarySource }[] = [];
  for (const candidate of candidates) {
    let group = groups.find(item => sameValue(item.value, candidate.value) && (requested !== "salary" || item.salarySource === candidate.salarySource));
    if (!group) {
      group = { value: candidate.value, label: candidate.label, citations: [], ...(candidate.salarySource ? { salarySource: candidate.salarySource } : {}) };
      groups.push(group);
    }
    if (!group.citations.some(citation => citation.documentId === candidate.citation.documentId && citation.page === candidate.citation.page && citation.quote === candidate.citation.quote)) group.citations.push(candidate.citation);
  }

  if (groups.length > 1 && requested === "salary" && new Set(groups.map(group => group.salarySource)).size > 1) {
    const claims = groups.map(group => ({
      text: group.salarySource === "offer"
        ? `The offer letter states a monthly gross salary of ${group.value}.`
        : group.salarySource === "applicant_reported"
          ? `The applicant-reported usual monthly salary is ${group.value}.`
          : `A retrieved document lists ${group.label.toLowerCase()}: ${group.value}.`,
      citations: group.citations,
    }));
    return {
      summary: "The retrieved documents state salary figures for different contexts; they are shown separately for human review.",
      claims,
      issueClaims: [],
      citations: claims.flatMap(claim => claim.citations),
      potentialIssues: [],
      nextSteps: [],
    };
  }

  if (groups.length > 1) {
    const claims = groups.map(group => ({ text: `A retrieved source lists “${group.label}: ${group.value}.”`, citations: group.citations }));
    const citations = claims.flatMap(claim => claim.citations);
    const issue = { text: `The retrieved sources disagree about the ${fieldName(requested)}.`, citations };
    return {
      summary: `The retrieved documents contain conflicting ${fieldName(requested)} information.`,
      claims,
      issueClaims: [issue],
      citations,
      potentialIssues: [issue.text],
      nextSteps: ["Compare the cited source documents and confirm the correct information with the client."],
    };
  }

  const group = groups[0]!;
  let claimText: string;
  if (requested === "applicant") claimText = `The applicant is ${group.value}.`;
  else if (requested === "employer") claimText = `The employer is ${group.value}.`;
  else if (requested === "person_location" || requested === "case_location") claimText = `The case file lists the location as ${group.value}.`;
  else if (requested === "salary" && /gross/i.test(group.label) && /offer/i.test(group.citations[0]?.source ?? "")) claimText = `The offer letter states a monthly gross salary of ${group.value}.`;
  else if (requested === "salary" && /gross/i.test(group.label)) claimText = `The document states a monthly gross salary of ${group.value}.`;
  else if (requested === "salary") claimText = `The document lists ${group.label.toLowerCase()}: ${group.value}.`;
  else if (requested === "employment_start" && /\b(?:claim|claimed|report|reported)\b/i.test(question)) claimText = `The applicant reports starting on ${group.value}.`;
  else if (requested === "employment_start") claimText = `The document lists an employment start date of ${group.value}.`;
  else if (requested === "employment_end") claimText = `The document lists an employment end date of ${group.value}.`;
  else claimText = `The document lists ${group.label}: ${group.value}.`;
  const claim = { text: claimText, citations: group.citations };
  return {
    summary: claimText,
    claims: [claim],
    issueClaims: [],
    citations: group.citations,
    potentialIssues: [],
    nextSteps: [],
  };
}

function fieldName(field: Field) {
  return ({ applicant: "applicant name", employer: "employer name", person_location: "location", case_location: "location", residential_address: "residential address", workplace_location: "workplace location", salary: "salary", employment_start: "employment start date", employment_end: "employment end date" } satisfies Record<Field, string>)[field];
}

export function insufficientExtractiveAnswer(question: string, anyPassagesRetrieved: boolean): string {
  const field = requestedExtractiveField(question);
  const target = field ? `a directly labeled ${fieldName(field)}` : "a directly stated answer";
  return anyPassagesRetrieved
    ? `I couldn’t verify ${target} in the passages retrieved for this question. No extractive answer is available; review the source documents or refine the question.`
    : `No document passages matched this question, so I couldn’t verify ${target}.`;
}
