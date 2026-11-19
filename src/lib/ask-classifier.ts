export type AskIntent =
  | "greeting"
  | "product_knowledge"
  | "case_analysis"
  | "domain_redirect"
  | "needs_model";

function normalizeQuestion(question: string): string {
  return question.trim().toLowerCase().replace(/[’]/g, "'")
    .replace(/\bwhats\b/g, "what is").replace(/\bwht\b/g, "what")
    .replace(/\bu\b/g, "you").replace(/\s+/g, " ");
}

const GREETING = /^(?:hi|hello|hey|hiya|howdy|good\s+(?:morning|afternoon|evening))(?:\s+(?:there|caselens|case\s*lens|ai))?[!.?,\s]*$/i;
const STUDY_REQUEST = /\b(?:homework|assignment|essay|study guide|exam prep|quiz me|schoolwork|coursework|mathematics homework|solve this problem)\b/i;
const SELECTED_CASE_CONTEXT = /\b(?:in|for|about|from|within)\s+(?:this|that|the|my|our|selected|current)\s+case\b|\b(?:this|that|the|my|our|selected|current)\s+(?:(?:legal|active)\s+)?case\b|\b(?:my|our|this|that|the|selected|uploaded|attached)\s+(?:(?:uploaded|attached)\s+)?(?:document|file|agreement|contract|claim|record)\b|\b(?:this|that|my|our|the)\s+client(?:['’]s)?(?:\s+(?:claim|case|record))?\b|\bclient(?:['’]s)\s+(?:claim|case|record|document)\b/i;
const CASE_ANALYSIS_TOPIC = /\b(?:case|client|legal case|case evidence|case record|case timeline|case finding|employment|salary|wages?|tenant|landlord|rent|benefits?|immigration|family matter|contradictions?|inconsisten(?:cy|cies|t)|missing information)\b/i;
const CASELENS_NAME = /\bcase\s*lens(?:\s+ai)?\b/i;
const PRODUCT_QUESTION = /\b(?:what|who|how|why|which|can|does|is|are|tell me|explain|describe)\b/i;
const PRODUCT_WORKFLOW_QUESTION = /\b(?:evidence retrieval|retrieve evidence|human review workflow|review workflow|case organization workflow|document extraction workflow|supported file types?|supported formats|upload limits?|file size limit|review center|audit (?:log|history)|product architecture|row.level security|access controls)\b/i;
const PRODUCT_SELF_QUESTION = /\b(?:what\s+is\s+(?:case\s*lens(?:\s+ai)?|your purpose)|who\s+(?:developed|created|built)\s+(?:case\s*lens|you)|what\s+can\s+(?:case\s*lens|you)\s+do|how\s+does\s+(?:case\s*lens|your system)\s+work|what\s+features?\s+does\s+case\s*lens\s+(?:provide|have|offer)|purpose\s+of\s+case\s*lens)\b/i;

export function classifyAskIntent(question: string): AskIntent {
  const text = normalizeQuestion(question);
  if (GREETING.test(text)) return "greeting";
  if (SELECTED_CASE_CONTEXT.test(text)) return "case_analysis";
  if (STUDY_REQUEST.test(text)) return "domain_redirect";
  if (PRODUCT_SELF_QUESTION.test(text)) return "product_knowledge";
  if (CASELENS_NAME.test(text) && PRODUCT_QUESTION.test(text)) return "product_knowledge";
  if (PRODUCT_WORKFLOW_QUESTION.test(text) && PRODUCT_QUESTION.test(text)) return "product_knowledge";
  if (CASE_ANALYSIS_TOPIC.test(text)) return "case_analysis";
  return "needs_model";
}