"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, FileSpreadsheet, File, UploadCloud, X, CheckCircle2 } from "lucide-react";
import { api, apiCollection } from "@/components/api";
import { demoCases, type CaseRecord } from "@/components/demo-data";
import { Badge, Button, PageHeading, Panel, PanelTitle } from "@/components/ui";

type DocumentRecord = { id: string; name: string; details: string; status: string };
const sampleDocuments: DocumentRecord[] = [
  { id: "sample-1", name: "Client intake form.pdf", details: "PDF · 1.2 MB", status: "Processed" },
  { id: "sample-2", name: "Employer letter.pdf", details: "PDF · 824 KB", status: "Processed" },
  { id: "sample-3", name: "Payroll summary.xlsx", details: "Spreadsheet · 28 KB", status: "Processed" },
  { id: "sample-4", name: "Client interview notes.txt", details: "Text · 8 KB", status: "Processed" },
];

function normalizeDocument(value: unknown, index: number): DocumentRecord | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const name = item.filename ?? item.fileName ?? item.name ?? item.title;
  if (typeof name !== "string") return null;
  const size = typeof item.size === "number" ? `${Math.max(1, Math.round(item.size / 1024))} KB` : "";
  const uploadedAt = item.uploadedAt ?? item.createdAt;
  const uploaded = typeof uploadedAt === "string" ? `Uploaded ${uploadedAt}` : "Upload date unavailable";
  return { id: String(item.id ?? index), name, details: [String(item.type ?? item.mimeType ?? "Document"), size, uploaded].filter(Boolean).join(" · "), status: String(item.status ?? "Uploaded") };
}

export default function Documents() {
  const ref = useRef<HTMLInputElement>(null);
  const [caseOptions, setCaseOptions] = useState(demoCases);
  const [caseId, setCaseId] = useState(demoCases[0].id);
  const [files, setFiles] = useState<File[]>([]);
  const [documents, setDocuments] = useState(sampleDocuments);
  const [source, setSource] = useState("Sample documents");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const add = (list: FileList | null) => { if (list) setFiles(old => [...old, ...Array.from(list).filter(file => /\.(pdf|txt|csv|xlsx)$/i.test(file.name))]); };

  useEffect(() => {
    let active = true;
    void apiCollection<unknown>("/api/cases", "cases").then(result => {
      if (!active || result === null) return;
      const liveCases = result.flatMap((value, index) => {
        if (!value || typeof value !== "object") return [];
        const item = value as Record<string, unknown>;
        const title = item.title ?? item.name ?? item.caseName;
        if (typeof title !== "string") return [];
        const id = String(item.id ?? item.reference ?? item.caseNumber ?? index);
        return [{ id, title, reference: String(item.reference ?? item.caseNumber ?? id), type: String(item.type ?? item.caseType ?? "Case"), status: String(item.status ?? "Open"), updated: "", documents: 0 } satisfies CaseRecord];
      });
      if (active) {
        setCaseOptions(liveCases);
        if (liveCases.length) setCaseId(current => liveCases.some(item => item.id === current) ? current : liveCases[0].id);
      }
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    void apiCollection<unknown>(`/api/documents?caseId=${encodeURIComponent(caseId)}`, "documents").then(result => {
      if (!active) return;
      if (result === null) { setSource("API unavailable · showing samples"); setDocuments(sampleDocuments); return; }
      setDocuments(result.map(normalizeDocument).filter((item): item is DocumentRecord => item !== null));
      setSource("Live case documents");
    });
    return () => { active = false; };
  }, [caseId]);

  const upload = async () => {
    if (!caseId || !files.length || busy) return;
    setBusy(true); setMessage("");
    const pending = [...files];
    const failed: File[] = [];
    for (const file of pending) {
      const form = new FormData(); form.append("file", file); form.append("caseId", caseId);
      try { await api<unknown>("/api/documents", { method: "POST", body: form }); }
      catch { failed.push(file); }
    }
    setFiles([]); setBusy(false);
    if (failed.length) {
      setMessage(`${pending.length - failed.length} file(s) saved by the server. ${failed.length} file(s) could not reach the API and were not stored locally. Retain your originals and retry when connected.`);
    } else setMessage(`${pending.length} file(s) accepted by the server. Processing status will update when the API returns it.`);
    const result = await apiCollection<unknown>(`/api/documents?caseId=${encodeURIComponent(caseId)}`, "documents");
    if (result !== null) { setDocuments(result.map(normalizeDocument).filter((item): item is DocumentRecord => item !== null)); setSource("Live case documents"); }
    if (ref.current) ref.current.value = "";
  };

  return <><PageHeading eyebrow="Document library" title="Documents" description="Upload case materials and track extraction status. Client files are only sent to the configured case API." action={<Badge tone={source.startsWith("Live") ? "green" : "blue"}>{source}</Badge>}/><div className="mb-5 flex flex-col gap-4 rounded-2xl border bg-white p-5 sm:flex-row sm:items-end sm:p-6"><label className="w-full max-w-sm text-sm font-medium text-[#65716b]">Upload to case<select value={caseId} onChange={event => setCaseId(event.target.value)} className="app-search mt-2 h-12 w-full rounded-xl border px-3 text-sm"><option value="">Select case…</option>{caseOptions.map(item => <option key={item.id} value={item.id}>{item.reference} · {item.title}</option>)}</select></label><div className="text-xs leading-relaxed text-[#89938d]">Supported: PDF, TXT, CSV, XLSX · Document contents are never saved in local browser storage.</div></div><input ref={ref} type="file" multiple accept=".pdf,.txt,.csv,.xlsx" className="hidden" onChange={event => add(event.target.files)}/><div onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); add(event.dataTransfer.files); }} className="upload-zone rounded-2xl border border-dashed border-[#c5b38c] bg-[#f7f1e5] px-5 py-12 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white text-[#a47b33] shadow-md shadow-[#a47b33]/10"><UploadCloud size={25}/></div><div className="mt-5 text-lg font-semibold">Drop files here to add to your case</div><div className="mt-2 text-sm text-[#7e8983]">PDF, TXT, CSV or XLSX</div><div className="mt-5"><Button secondary onClick={() => ref.current?.click()}>Choose files</Button></div></div>{message && <div role="status" className="mt-4 rounded-xl border border-[#e6dfd0] bg-white p-4 text-sm text-[#655b49]">{message}</div>}{files.length > 0 && <Panel className="mt-5"><PanelTitle title={`Ready to upload · ${files.length} file${files.length === 1 ? "" : "s"}`} action={<Button onClick={upload}>{busy ? "Uploading…" : "Upload documents"}</Button>}/><div className="divide-y divide-[#edf0ee]">{files.map((file, index) => <div key={`${file.name}-${index}`} className="flex items-center gap-3 px-5 py-4"><FileText size={18} className="text-[#a47b33]"/><div className="flex-1 text-sm">{file.name}<div className="mt-1 text-xs text-[#929b96]">{(file.size / 1024).toFixed(0)} KB</div></div><button onClick={() => setFiles(files.filter((_, position) => position !== index))} aria-label={`Remove ${file.name}`} className="text-[#8b9690]"><X size={17}/></button></div>)}</div></Panel>}<Panel className="mt-5"><PanelTitle title="Case documents" action={<Badge tone={source.startsWith("Live") ? "green" : "neutral"}>{source}</Badge>}/><div className="divide-y divide-[#edf0ee]">{documents.map(document => <div key={document.id} className="flex items-center gap-3 px-5 py-4 sm:px-6">{document.name.toLowerCase().endsWith("xlsx") || document.name.toLowerCase().endsWith("csv") ? <FileSpreadsheet size={18} className="text-[#688f70]"/> : <File size={18} className="text-[#a47b33]"/>}<div className="flex-1"><div className="text-sm font-medium">{document.name}</div><div className="mt-1 text-xs text-[#929b96]">{document.details}</div></div>{document.status.toLowerCase().includes("process") ? <Badge tone="green"><CheckCircle2 size={13} className="mr-1"/>{document.status}</Badge> : <Badge tone="amber">{document.status}</Badge>}</div>)}{!documents.length && <div className="p-10 text-center text-sm text-[#849089]">No documents found for this case.</div>}</div></Panel><p className="mt-3 text-xs leading-relaxed text-[#929b96]">OCR and extraction depend on the connected backend. A successful upload only confirms receipt, not that text extraction succeeded.</p></>;
}
