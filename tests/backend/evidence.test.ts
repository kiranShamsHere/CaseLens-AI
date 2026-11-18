import assert from "node:assert/strict";
import { test } from "node:test";
import ExcelJS from "exceljs";
import { extractDocument } from "@/lib/documents";
import { candidatesFromPassages, normalizeAmountValue, normalizeDateValue, valuesContradict } from "@/lib/findings";
import { quoteAppearsIn, rankPassages } from "@/lib/retrieval";

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
