import assert from "node:assert/strict";
import { test } from "node:test";
import { answerCaseMetadata, applicantFromTitle, metadataQuestion } from "@/lib/case-metadata";
import { validateEvidenceAnswer, uniqueCitations } from "@/lib/ask-evidence";
import { parseGeminiJSON, requestGeminiJSON } from "@/lib/gemini";
import type { EvidenceCitation } from "@/lib/contracts";
import { askAuthFailure, selectedAskCase } from "@/lib/ask-access";
import { extractiveFallback } from "@/lib/ask-extractive";
import { rankPassages } from "@/lib/retrieval";

const originalKey = process.env.GEMINI_API_KEY;
const originalModel = process.env.GEMINI_MODEL;

function setGeminiEnv(key: string | undefined, model?: string) {
  if (key === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = key;
  if (model === undefined) delete process.env.GEMINI_MODEL;
  else process.env.GEMINI_MODEL = model;
}

test("case metadata answers read only actual selected record fields", () => {
  const record = {
    reference: "CL-1002", title: "Wage and termination dispute", case_type: "Employment",
    status: "Open – initial evidence review", created_at: "2026-11-18T10:00:00.000Z",
    metadata: {
      applicant_name: "Amina Raza", employer_name: "Northstar Packaging (Pvt.) Ltd.",
      applicant_location: "Hyderabad, Sindh, Pakistan", employment_start_date: "2024-02-03",
      employment_end_date: "2025-09-18",
    },
  };
  assert.equal(metadataQuestion("what is the location of the applicant amina raza"), true);
  assert.deepEqual(answerCaseMetadata("what is the location of the applicant amina raza", record), [
    { label: "Case location", value: "Hyderabad, Sindh, Pakistan", recorded: true },
  ]);
  assert.deepEqual(answerCaseMetadata("Who is the applicant?", record)[0], { label: "Applicant", value: "Amina Raza", recorded: true });
  assert.deepEqual(answerCaseMetadata("Who is the employer?", record)[0], { label: "Employer / respondent", value: "Northstar Packaging (Pvt.) Ltd.", recorded: true });
  assert.deepEqual(answerCaseMetadata("When was this case created?", record)[0], { label: "Case creation date", value: "2026-11-18T10:00:00.000Z", recorded: true });
  assert.deepEqual(answerCaseMetadata("What is the case status?", record)[0], { label: "Case status", value: "Open – initial evidence review", recorded: true });
  assert.deepEqual(answerCaseMetadata("When did the employee start work?", record)[0], { label: "Employment start date", value: "2024-02-03", recorded: true });
});

test("missing case metadata is reported as unrecorded instead of guessed", () => {
  const answers = answerCaseMetadata("Who is the applicant?", { reference: "CL-1" });
  assert.equal(answers[0]?.recorded, false);
  assert.equal(answers[0]?.value, "Not recorded in the selected case record.");
});

test("applicant title extraction requires an explicit role label", () => {
  assert.equal(applicantFromTitle("CL-1005 · Applicant: Amina Raza"), "Amina Raza");
  assert.equal(applicantFromTitle("Amina Raza"), null);
});

const locationPage: EvidenceCitation = {
  documentId: "doc-cl1005",
  source: "CL-1005-intake.pdf",
  page: 1,
  quote: "Case Metadata\nApplicant: Amina Raza\nLocation: Hyderabad, Sindh, Pakistan",
};

test("extractive fallback identifies applicant from an explicitly labeled document passage", () => {
  const answer = extractiveFallback("Who is the applicant?", [locationPage]);
  assert.equal(answer?.summary, "The applicant is Amina Raza.");
  assert.ok(!answer?.summary.includes(locationPage.quote));
  assert.equal(answer?.citations[0]?.documentId, "doc-cl1005");
  assert.equal(answer?.citations[0]?.page, 1);
  assert.equal(answer?.citations[0]?.quote, locationPage.quote);
  assert.equal(answer?.claims[0]?.text, answer?.summary);
});

test("extractive location answers preserve the source label and do not imply residence or workplace", () => {
  for (const question of ["What is the applicant's location?", "What location is listed in the case file?", "Where is Amina Raza from?", "Where does Amina Raza live?", "Which city is the applicant associated with?"]) {
    const answer = extractiveFallback(question, [locationPage]);
    assert.equal(answer?.summary, "The case file lists the location as Hyderabad, Sindh, Pakistan.");
    assert.ok(!answer?.summary.includes(locationPage.quote));
    assert.equal(answer?.citations[0]?.page, 1);
    assert.equal(answer?.citations[0]?.quote, locationPage.quote);
  }
});

test("generic case-file location does not become a residential address", () => {
  const answer = extractiveFallback("What is the applicant's residential address?", [locationPage]);
  assert.match(answer?.summary ?? "", /does not establish the applicant’s residential address/);
  assert.match(answer?.claims[0]?.text ?? "", /Location: Hyderabad, Sindh, Pakistan/);
  assert.equal(answer?.citations[0]?.page, 1);
});

test("applicant-location questions do not reuse a workplace-only location", () => {
  const workplace: EvidenceCitation = {
    documentId: "doc-offer", source: "Offer.pdf", page: 1,
    quote: "Employer: Northstar Packaging\nWorkplace Location: Industrial Road, Hyderabad",
  };
  assert.equal(extractiveFallback("What is the applicant's location?", [workplace]), null);
});

test("extractive fallback abstains when location is missing or lacks a clear label", () => {
  assert.equal(extractiveFallback("What is the applicant's location?", [{ ...locationPage, quote: "Case Metadata\nApplicant: Amina Raza" }]), null);
  assert.equal(extractiveFallback("What is the applicant's location?", [{ ...locationPage, quote: "Amina Raza is associated with Hyderabad." }]), null);
});

test("simple salary and employment-date facts extract only explicitly labeled values", () => {
  const salary = extractiveFallback("What salary is recorded?", [{
    documentId: "doc-offer", source: "Offer.pdf", page: 3, quote: "Monthly Salary: PKR 48,000 per month",
  }]);
  assert.equal(salary?.summary, "The document lists monthly salary: PKR 48,000 per month.");
  assert.equal(salary?.citations[0]?.page, 3);

  const startDate = extractiveFallback("When did the employee start work?", [{
    documentId: "doc-offer", source: "Offer.pdf", page: 1, quote: "Employment Start Date: 03 February 2024",
  }]);
  assert.equal(startDate?.summary, "The document lists an employment start date of 03 February 2024.");
  assert.equal(startDate?.citations[0]?.documentId, "doc-offer");

  const endDate = extractiveFallback("When did the employee finish work?", [{
    documentId: "doc-intake", source: "Intake.pdf", page: 2, quote: "Last Working Date: 18 September 2025",
  }]);
  assert.equal(endDate?.summary, "The document lists an employment end date of 18 September 2025.");
});

test("offer salary and claimed employment start use concise question-appropriate phrasing", () => {
  const salary = extractiveFallback("What is the monthly salary stated in the offer letter?", [{
    documentId: "offer-1", source: "Offer Letter.pdf", page: 2,
    quote: `Compensation
Monthly Gross Salary: PKR 45,000
The employee will receive payment monthly.`,
  }]);
  assert.equal(salary?.summary, "The offer letter states a monthly gross salary of PKR 45,000.");
  assert.equal(salary?.citations[0]?.quote, "Compensation\nMonthly Gross Salary: PKR 45,000\nThe employee will receive payment monthly.");

  const start = extractiveFallback("When did the applicant claim employment started?", [{
    documentId: "intake-1", source: "Applicant Intake.pdf", page: 1,
    quote: "Employment Start Date: 03 February 2024",
  }]);
  assert.equal(start?.summary, "The applicant reports starting on 03 February 2024.");
});

test("salary sentences extract offer terms separately from applicant-reported usual salary", () => {
  const offer: EvidenceCitation = {
    documentId: "doc-02", source: "DOC-02 - Offer Letter.pdf", page: 3,
    quote: "Your monthly gross salary will be PKR 45,000, payable monthly in arrears.",
  };
  const intake: EvidenceCitation = {
    documentId: "doc-01", source: "DOC-01 - Applicant Statement.pdf", page: 2,
    quote: "Usual monthly salary was PKR 48,000.",
  };

  const answer = extractiveFallback("What is the monthly salary stated in the offer letter?", [offer, intake]);
  assert.equal(answer?.summary, "The offer letter states a monthly gross salary of PKR 45,000.");
  assert.deepEqual(answer?.citations.map(item => [item.documentId, item.page]), [["doc-02", 3]]);
  assert.equal(answer?.citations[0]?.quote, offer.quote);

  const both = extractiveFallback("What salary figures are stated in these documents?", [offer, intake]);
  assert.match(both?.summary ?? "", /different contexts/);
  assert.equal(both?.claims.length, 2);
  assert.equal(both?.issueClaims.length, 0);
  assert.deepEqual(both?.citations.map(item => item.documentId), ["doc-02", "doc-01"]);
});

test("page-one case-summary location survives retrieval and is not treated as a residential address", () => {
  const summaryPassage = {
    id: "page-one-summary", document_id: "test-file", documents: { filename: "caselens_test_case_file.pdf" }, page: 1,
    content: "Case Summary\nLocation: Hyderabad, Sindh, Pakistan\nMatter: Employment claim",
  };
  const distractors = Array.from({ length: 12 }, (_, index) => ({
    id: `location-${index}`, document_id: `doc-${index}`, documents: { filename: `Other-${index}.pdf` }, page: index + 1,
    content: `Location details for unrelated exhibit ${index}.`,
  }));
  const retrieved = rankPassages([summaryPassage, ...distractors], "What is the location listed in the case file?", 30);
  const evidence = retrieved.map(passage => ({
    documentId: passage.document_id,
    source: passage.documents.filename,
    page: passage.page,
    quote: passage.content,
  }));
  assert.ok(evidence.some(item => item.documentId === "test-file" && item.page === 1));

  const answer = extractiveFallback("What is the location listed in the case file?", evidence);
  assert.equal(answer?.summary, "The case file lists the location as Hyderabad, Sindh, Pakistan.");
  assert.equal(answer?.citations[0]?.documentId, "test-file");
  assert.equal(answer?.citations[0]?.page, 1);
  assert.equal(answer?.citations[0]?.quote, summaryPassage.content);
  assert.match(extractiveFallback("What is the applicant's residential address?", evidence)?.summary ?? "", /does not establish the applicant’s residential address/);
});

test("complex contradictory evidence remains structured and both source passages stay available", () => {
  const second: EvidenceCitation = { documentId: "other", source: "Other.pdf", page: 4, quote: "Case Metadata\nLocation: Karachi, Sindh, Pakistan\nAdditional case narrative follows." };
  const answer = extractiveFallback("What location is listed in the case file?", [locationPage, second]);
  assert.match(answer?.summary ?? "", /conflicting location information/);
  assert.equal(answer?.claims.length, 2);
  assert.deepEqual(answer?.citations.map(citation => citation.quote), [locationPage.quote, second.quote]);
  assert.equal(answer?.issueClaims[0]?.citations.length, 2);
});

test("missing-information questions do not turn arbitrary retrieved text into an answer", () => {
  assert.equal(extractiveFallback("What evidence is missing?", [locationPage]), null);
});

test("contradictory explicit locations are reported with citations to both passages", () => {
  const second: EvidenceCitation = {
    documentId: "doc-cl1005-payroll",
    source: "Payroll-summary.pdf",
    page: 2,
    quote: "Case Metadata\nLocation: Karachi, Sindh, Pakistan",
  };
  const answer = extractiveFallback("What location is listed in the case file?", [locationPage, second]);
  assert.match(answer?.summary ?? "", /conflicting location information/);
  assert.equal(answer?.claims.length, 2);
  assert.deepEqual(answer?.citations.map(item => item.documentId), ["doc-cl1005", "doc-cl1005-payroll"]);
  assert.equal(answer?.issueClaims[0]?.citations.length, 2);
});

test("Ask rejects missing authentication and maps RLS-hidden case rows to not found", async () => {
  const unauthorized = Response.json({ error: "Sign in is required." }, { status: 401 });
  assert.equal(askAuthFailure(null, unauthorized), unauthorized);
  assert.equal(askAuthFailure({ id: "user-1" }, null), null);

  const calls: string[] = [];
  const fakeSupabase = {
    from: (table: string) => {
      calls.push(`from:${table}`);
      return { select: (columns: string) => {
        calls.push(`select:${columns}`);
        return { eq: (column: string, value: string) => {
          calls.push(`eq:${column}:${value}`);
          return { eq: (ownerColumn: string, userId: string) => {
            calls.push(`eq:${ownerColumn}:${userId}`);
            return { maybeSingle: async () => ({ data: null, error: null }) };
          } };
        } };
      } };
    },
  } as unknown as Parameters<typeof selectedAskCase>[0];
  const result = await selectedAskCase(fakeSupabase, "foreign-case-id", "user-1");
  assert.equal(result.data, null);
  assert.deepEqual(calls, ["from:cases", "select:*", "eq:id:foreign-case-id", "eq:owner_id:user-1"]);
});

test("evidence claims resolve valid indexes to retrieved citations and discard invalid claims", () => {
  const evidence: EvidenceCitation[] = [
    { documentId: "doc-1", source: "Offer letter.pdf", page: 2, quote: "Monthly salary: PKR 48,000" },
    { documentId: "doc-2", source: "Payroll.csv", page: 1, quote: "Monthly wages: PKR 43,500" },
  ];
  const answer = validateEvidenceAnswer({
    claims: [
      { text: "The offer states PKR 48,000 per month.", citationIndexes: [0, 99] },
      { text: "Payroll lists PKR 43,500.", citationIndexes: [1] },
      { text: "This unsupported text must not survive.", citationIndexes: [99] },
    ],
    issues: [{ text: "The two salary figures differ.", citationIndexes: [0, 1] }],
    nextSteps: ["Review both originals."],
  }, evidence);
  assert.equal(answer?.claims.length, 2);
  assert.equal(answer?.claims[0]?.citations[0]?.documentId, "doc-1");
  assert.equal(answer?.issues[0]?.citations[1]?.documentId, "doc-2");
  assert.equal(uniqueCitations([...(answer?.claims ?? []), ...(answer?.issues ?? [])]).length, 2);
  assert.equal(validateEvidenceAnswer({ claims: [{ text: "No citation", citationIndexes: [] }] }, evidence), null);
});

test("Gemini JSON helper parses object payloads and rejects malformed JSON", () => {
  assert.deepEqual(parseGeminiJSON('{"intent":"document_question"}'), { intent: "document_question" });
  assert.equal(parseGeminiJSON("not json"), null);
  assert.equal(parseGeminiJSON("[]"), null);
});

test("Gemini REST integration handles success, HTTP failure, malformed response, and timeout with mocks", async () => {
  setGeminiEnv("unit-test-key", "gemini-3.8-flash");
  try {
    const request = { system: "system", prompt: "hello", maxOutputTokens: 20 };
    const success = await requestGeminiJSON(request, async (input, init) => {
      assert.match(String(input), /models\/gemini-3\.8-flash:generateContent$/);
      assert.equal(new Headers(init?.headers).get("x-goog-api-key"), "unit-test-key");
      return Response.json({ candidates: [{ content: { parts: [{ text: "{\"summary\":\"Hello\"}" }] } }] });
    });
    assert.deepEqual(success, { ok: true, text: '{"summary":"Hello"}' });

    const httpFailure = await requestGeminiJSON(request, async () => new Response("{}", { status: 429 }));
    assert.deepEqual(httpFailure, { ok: false, failure: "http_error", status: 429 });

    const malformed = await requestGeminiJSON(request, async () => Response.json({ candidates: [] }));
    assert.deepEqual(malformed, { ok: false, failure: "invalid_response" });

    const timeout = await requestGeminiJSON(request, async () => { const error = new Error("timeout"); error.name = "TimeoutError"; throw error; });
    assert.deepEqual(timeout, { ok: false, failure: "timeout" });
  } finally {
    setGeminiEnv(originalKey, originalModel);
  }
});

test("Gemini reports missing server configuration without making a request", async () => {
  setGeminiEnv(undefined);
  try {
    const result = await requestGeminiJSON({ system: "", prompt: "", maxOutputTokens: 1 }, async () => { throw new Error("should not call"); });
    assert.deepEqual(result, { ok: false, failure: "not_configured" });
  } finally {
    setGeminiEnv(originalKey, originalModel);
  }
});

test("Gemini unavailable still allows a deterministic answer from explicit evidence", async () => {
  setGeminiEnv(undefined);
  try {
    const model = await requestGeminiJSON({ system: "", prompt: "", maxOutputTokens: 1 }, async () => { throw new Error("should not call"); });
    assert.deepEqual(model, { ok: false, failure: "not_configured" });
    const answer = extractiveFallback("Who is the applicant?", [locationPage]);
    assert.match(answer?.summary ?? "", /Amina Raza/);
    assert.equal(answer?.citations[0]?.quote, locationPage.quote);
  } finally {
    setGeminiEnv(originalKey, originalModel);
  }
});
