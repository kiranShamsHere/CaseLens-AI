import assert from "node:assert/strict";
import { test } from "node:test";
import ExcelJS from "exceljs";
import { extractDocument } from "@/lib/documents";
import { candidatesFromPassages, normalizeAmountValue, normalizeDateValue, valuesContradict } from "@/lib/findings";
import { quoteAppearsIn, rankPassages } from "@/lib/retrieval";
import { classifyAskIntent } from "@/lib/ask-classifier";

test("TXT and CSV preserve extracted text with source page markers", async () => {
  const note = new File(["Client started work on 1 April 2024."], "intake.txt", { type: "text/plain" });
  const text = await extractDocument(note);
  assert.equal(text.pageCount, 1);
  assert.equal(text.passages[0]?.page, 1);
  assert.match(text.passages[0]?.content ?? "", /started work/);

  const csv = new File(["date,amount\n2024-04-01,48000"], "payroll.csv", { type: "text/csv" });
  const spreadsheet = await extractDocument(csv);
  assert.equal(spreadsheet.passages[0]?.page, 1);
  assert.match(spreadsheet.passages[0]?.content ?? "", /48000/);
});

test("XLSX extraction keeps worksheet and row context", async () => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Payroll");
  sheet.addRow(["Employee", "Monthly salary"]);
  sheet.addRow(["Client", "PKR 48,000"]);
  const bytes = await workbook.xlsx.writeBuffer();
  const file = new File([new Uint8Array(bytes)], "payroll.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const extracted = await extractDocument(file);
  assert.ok(extracted.passages.some(passage => passage.content.includes("Payroll · row 2") && passage.content.includes("PKR 48,000")));
});

test("upload validation rejects unsupported files and oversized uploads", async () => {
  await assert.rejects(() => extractDocument(new File(["x"], "image.png")), /Supported file types/);
  const large = new File([new Uint8Array(4 * 1024 * 1024 + 1)], "large.txt");
  await assert.rejects(() => extractDocument(large), /4 MB or smaller/);
});

test("retrieval ranks relevant case passages and excludes unrelated material", () => {
  const relevant = { id: "p1", page: 2, content: "The client salary was PKR 48,000 per month.", documents: { filename: "intake.pdf" } };
  const unrelated = { id: "p2", page: 1, content: "The property inspection was completed in June.", documents: { filename: "housing.txt" } };
  const result = rankPassages([unrelated, relevant], "What monthly salary is recorded?");
  assert.equal(result[0]?.id, "p1");
  assert.equal(result.length, 1);
});

test("citations must be present in source text and facts normalize dates and amounts", () => {
  assert.equal(quoteAppearsIn("Started 1 April 2024", "The client STARTED   1 April 2024."), true);
  assert.equal(quoteAppearsIn("Started 7 April 2024", "The client started 1 April 2024."), false);
  assert.equal(normalizeDateValue("1 April 2024"), "2024-04-01");
  assert.equal(normalizeDateValue("2024-04-01"), "2024-04-01");
  assert.equal(normalizeDateValue("01/04/24"), "2024-04-01");
  assert.equal(normalizeAmountValue("Rs. 48,000 per month"), "PKR:48000");
  assert.equal(normalizeAmountValue("PKR 48000"), "PKR:48000");
  assert.equal(normalizeAmountValue("48,000 per month"), "48000");
  assert.equal(valuesContradict("salary", ["48000", "PKR:48000"]), false);
  assert.equal(valuesContradict("salary", ["PKR:48000", "PKR:43500"]), true);
  assert.equal(valuesContradict("salary", ["PKR:48000", "USD:48000"]), true);

  const passages = [
    { id: "p1", case_id: "case-1", document_id: "doc-1", page: 1, content: "Employment started 1 April 2024.", documents: { filename: "intake.pdf" } },
    { id: "p2", case_id: "case-1", document_id: "doc-2", page: 3, content: "Employment started 15 April 2024.", documents: { filename: "employer.pdf" } },
  ];
  const candidates = candidatesFromPassages(passages);
  assert.equal(candidates.filter(item => item.key === "employment_start_date").length, 2);
  assert.notEqual(candidates[0].normalized, candidates[1].normalized);
});

test("Ask intent handles conversational greetings naturally", () => {
  for (const greeting of ["hello", "hi", "hey", "Hey there!"]) {
    assert.equal(classifyAskIntent(greeting), "greeting", greeting);
  }
});

test("Ask intent recognizes product questions and informal phrasing", () => {
  const productQuestions = [
    "What is CaseLens AI?",
    "What features does CaseLens provide?",
    "What is the purpose of CaseLens?",
    "What is your purpose?",
    "Who developed you?",
    "Who created u?",
    "What can you do?",
    "How does your system work?",
    "How does evidence retrieval work?",
    "How does the human review workflow work?",
    "whats caselens ai?",
    "wht is case lens ai?",
  ];
  for (const question of productQuestions) {
    assert.equal(classifyAskIntent(question), "product_knowledge", question);
  }
});

test("Ask intent prioritizes selected-case questions and metadata wording", () => {
  const caseQuestions = [
    "How does CaseLens identify contradictions in this case?",
    "Can CaseLens find missing information in my uploaded agreement?",
    "What evidence supports this client's claim?",
    "What evidence has CaseLens retrieved for my case?",
    "What does this uploaded document say about the client's wages?",
    "When was this case created?",
  ];
  for (const question of caseQuestions) {
    assert.equal(classifyAskIntent(question), "case_analysis", question);
  }
});

test("Ask intent defers uncertain wording for Gemini and redirects explicit study requests", () => {
  assert.equal(classifyAskIntent("Explain photosynthesis."), "needs_model");
  assert.equal(classifyAskIntent("Help me with my mathematics homework."), "domain_redirect");
  assert.equal(classifyAskIntent("Explain how a document is structured."), "needs_model");
  assert.equal(classifyAskIntent("What is a workflow in healthcare?"), "needs_model");
  assert.equal(classifyAskIntent("Explain information retrieval in mathematics."), "needs_model");
  assert.equal(classifyAskIntent("What are basic security principles?"), "needs_model");
});
