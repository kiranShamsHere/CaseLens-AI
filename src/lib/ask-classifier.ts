export type AskIntent =
  | "greeting"
  | "case_metadata"
  | "document_question"
  | "evidence_comparison"
  | "contradiction"
  | "missing_information"
  | "timeline"
  | "product_knowledge"
  | "domain_redirect"
  | "needs_model";

function normalizeQuestion(question: string): string {
  return question.trim().toLowerCase().normalize("NFKC").replace(/[’]/g, "'")
    .replace(/\b(?:u|ya)\b/g, "you").replace(/\bur\b/g, "your")
    .replace(/\bwhats\b/g, "what is").replace(/\bwht\b/g, "what")
    .replace(/\bwher\b/g, "where").replace(/\bwhos\b/g, "who is")
    .replace(/\bwheres\b/g, "where is").replace(/\bpls\b/g, "please")
    .replace(/\s+/g, " ");
}

const GREETING = /^(?:hi|hello|hey|hiya|howdy|good\s+(?:morning|afternoon|evening))(?:\s+(?:there|caselens|case\s*lens|ai))?[!.?,\s]*$/i;
const STUDY_REQUEST = /\b(?:homework|assignment|essay|study guide|exam prep|quiz me|schoolwork|coursework|mathematics homework|solve this problem)\b/i;
const CASE_CONTEXT = /\b(?:(?:this|that|selected|current|my|our) case|(?:in|for|about|from) (?:this|that|the|my|our|selected|current) case|case file|client|claim|legal matter|applicant|claimant|employee|employer|respondent|uploaded document|attached document|selected document|source document|offer letter|payroll|agreement|employment|salary|wages?|tenant|landlord|rent|benefits?|immigration|family matter|evidence|court|hearing|termination|overtime)\b/i;
const PRODUCT = /\b(?:what is (?:case\s*lens(?:\s+ai)?|(?:the )?purpose of case\s*lens|your purpose)|purpose of case\s*lens|case\s*lens features?|case\s*lens functionality|your features?|your purpose|what can you do|who (?:developed|created|built|made) (?:you|case\s*lens)|how (?:does|do) (?:you|case\s*lens|your system) work|how does (?:evidence retrieval|the review workflow) work|supported file types?|supported formats|upload limits?|review center|audit (?:log|history)|row.level security|access controls|product architecture)\b/i;
const METADATA = /\b(?:who (?:is|'s) (?:the )?(?:applicant|claimant|client|employee|employer|respondent)|(?:applicant|claimant|client|employee|employer|respondent) name|where (?:does|is) (?:the )?(?:applicant|claimant|client|employee) (?:live|located)|(?:case|applicant|client) location|location of (?:this|the|my) case|location of (?:the )?(?:applicant|claimant|client)|case reference|reference number|case number|case title|what is this case called|matter type|case type|case status|when (?:was|did) (?:(?:this|the|my) )?case (?:created|opened)|case creation date|employment (?:start|end|beginning) date|when did (?:the )?(?:applicant|employee|employment|work) (?:start|begin|end|finish))\b/i;
const COMPARISON = /\b(?:compare|comparison|across|between|both|different sources|differences? between|versus|\bvs\b)\b/i;
const CONTRADICTION = /\b(?:contradict|contradiction|inconsisten(?:t|cy|cies)|conflict(?:ing)?|disagree|different (?:dates|amounts|values|claims))\b/i;
const MISSING = /\b(?:missing|not provided|not included|still needed|what else (?:is|do we) need|should (?:we|i) request|sufficient records|enough evidence|unsupported)\b/i;
const TIMELINE = /\b(?:timeline|chronolog(?:y|ical)|sequence of events|order of events|when did .* happen)\b/i;
const DOCUMENT = /\b(?:(?:uploaded|attached|selected|this|that|my|the) document|(?:uploaded|attached|selected|this|that|my|the) file|agreement|contract|offer letter|payroll|payslip|message|messaging transcript|applicant statement|evidence checklist|what does .* say|what is stated in)\b/i;

export function classifyAskIntent(question: string): AskIntent {
  const text = normalizeQuestion(question);
  if (GREETING.test(text)) return "greeting";
  if (STUDY_REQUEST.test(text)) return "domain_redirect";
  if (PRODUCT.test(text)) return "product_knowledge";
  if (METADATA.test(text)) return "case_metadata";
  if (CONTRADICTION.test(text)) return "contradiction";
  if (COMPARISON.test(text)) return "evidence_comparison";
  if (MISSING.test(text)) return "missing_information";
  if (TIMELINE.test(text)) return "timeline";
  if (DOCUMENT.test(text) || CASE_CONTEXT.test(text)) return "document_question";
  return "needs_model";
}

/** Safe classification when Gemini is unavailable: analyze only requests with clear case context. */
export function classifyAskWithoutModel(question: string): AskIntent {
  const intent = classifyAskIntent(question);
  return intent === "needs_model" ? "domain_redirect" : intent;
}
