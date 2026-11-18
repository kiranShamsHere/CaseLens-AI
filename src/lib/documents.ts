import ExcelJS from "exceljs";
import { extractText } from "unpdf";

export type ExtractedPassage = { page: number | null; position: number; content: string };
const MAX_CHARS = 180_000;
const MAX_PASSAGE = 1_800;

function splitPassages(text: string, page: number | null, start: number) {
  const clean = text.replace(/\u0000/g, " ").replace(/\r/g, "").replace(/[\t ]+/g, " ").trim();
  if (!clean) return [];
  const result: ExtractedPassage[] = [];
  let cursor = 0;
  while (cursor < clean.length && result.length < 300) {
    let end = Math.min(cursor + MAX_PASSAGE, clean.length);
    if (end < clean.length) {
      const boundary = Math.max(clean.lastIndexOf(". ", end), clean.lastIndexOf("\n", end), clean.lastIndexOf(" ", end));
      if (boundary > cursor + 600) end = boundary + 1;
    }
    const content = clean.slice(cursor, end).trim();
    if (content) result.push({ page, position: start + result.length, content });
    cursor = end;
    while (cursor < clean.length && /\s/.test(clean[cursor])) cursor++;
  }
  return result;
}

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object" && "text" in value) return String(value.text ?? "");
  if (typeof value === "object" && "result" in value) return String(value.result ?? "");
  return String(value);
}

export async function extractDocument(file: File): Promise<{ passages: ExtractedPassage[]; pageCount: number | null; note: string }> {
  const extension = file.name.toLowerCase().split(".").pop();
  if (file.size > 4 * 1024 * 1024) throw new Error("Each file must be 4 MB or smaller on the current Vercel upload path.");
  if (!extension || !["pdf", "txt", "csv", "xlsx"].includes(extension)) throw new Error("Supported file types are PDF, TXT, CSV, and XLSX.");

  if (extension === "pdf") {
    const result = await extractText(new Uint8Array(await file.arrayBuffer()));
    const pages = Array.isArray(result.text) ? result.text : [result.text];
    let position = 0;
    const passages = pages.flatMap((text, index) => {
      const pagePassages = splitPassages(text, index + 1, position);
      position += pagePassages.length;
      return pagePassages;
    });
    return { passages, pageCount: result.totalPages, note: passages.length ? "Text extracted; check source quotations against the original PDF." : "No selectable text was found. This may be a scanned PDF; OCR is not enabled." };
  }

  if (extension === "xlsx") {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(await file.arrayBuffer()) as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    const passages: ExtractedPassage[] = [];
    for (const sheet of workbook.worksheets) {
      sheet.eachRow((row, rowNumber) => {
        const values = row.values as ExcelJS.CellValue[];
        const text = values.slice(1).map(cellText).filter(Boolean).join(" | ");
        if (text) passages.push(...splitPassages(`${sheet.name} · row ${rowNumber}: ${text}`, null, passages.length));
      });
    }
    return { passages: passages.slice(0, 300), pageCount: null, note: passages.length ? "Spreadsheet rows extracted with sheet and row labels." : "No readable cell text was found." };
  }

  const text = await file.text();
  if (text.length > MAX_CHARS) throw new Error("Extracted text exceeds the 180,000 character processing limit.");
  const passages = splitPassages(text, 1, 0).slice(0, 300);
  return { passages, pageCount: 1, note: passages.length ? "Text extracted." : "No readable text was found." };
}

export function excerpt(text: string, max = 700) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}
