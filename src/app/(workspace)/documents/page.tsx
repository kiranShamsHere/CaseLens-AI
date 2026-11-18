"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { File, FileSpreadsheet, FileText, UploadCloud, X, CheckCircle2 } from "lucide-react";
import { api, apiCollection } from "@/components/api";
import { normalizeCaseRecord, type CaseRecord } from "@/components/demo-data";
import { Badge, Button, PageHeading, Panel, PanelTitle } from "@/components/ui";

type DocumentRecord = { id: string; name: string; details: string; status: string };
type LoadState = "loading" | "ready" | "unavailable";

function normalizeDocument(value: unknown, index: number): DocumentRecord | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const name = item.filename ?? item.fileName ?? item.name ?? item.title;
  if (typeof name !== "string") return null;
  const bytes = Number(item.size ?? item.size_bytes ?? 0);
  const size = bytes > 0 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : "";
  const uploaded = item.createdAt ?? item.created_at;
  return { id: String(item.id ?? index), name, details: [String(item.type ?? item.mimeType ?? "Document"), size, typeof uploaded === "string" ? `Uploaded ${new Date(uploaded).toLocaleDateString()}` : ""].filter(Boolean).join(" · "), status: String(item.status ?? "Uploaded") };
}

export default function Documents() {
  const ref = useRef<HTMLInputElement>(null);
  const [caseOptions, setCaseOptions] = useState<CaseRecord[]>([]);
  const [casesState, setCasesState] = useState<LoadState>("loading");
  const [caseId, setCaseId] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [documentsCaseId, setDocumentsCaseId] = useState("");
  const [documentsState, setDocumentsState] = useState<"idle" | LoadState>("idle");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const add = (list: FileList | null) => {
    if (!list) return;
    setFiles(old => [...old, ...Array.from(list).filter(file => /\.(pdf|txt|csv|xlsx)$/i.test(file.name))]);
  };

  useEffect(() => {
    let active = true;
    void apiCollection<unknown>("/api/cases", "cases").then(result => {
      if (!active) return;
      if (result === null) { setCasesState("unavailable"); return; }
      const ownedCases = result.map(normalizeCaseRecord).filter((item): item is CaseRecord => item !== null);
      setCaseOptions(ownedCases);
      setCaseId(ownedCases[0]?.id ?? "");
      setCasesState("ready");
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    if (!caseId) return () => { active = false; };
    void apiCollection<unknown>(`/api/documents?caseId=${encodeURIComponent(caseId)}`, "documents").then(result => {
      if (!active) return;
      setDocumentsCaseId(caseId);
      if (result === null) { setDocuments([]); setDocumentsState("unavailable"); return; }
      setDocuments(result.map(normalizeDocument).filter((item): item is DocumentRecord => item !== null));
      setDocumentsState("ready");
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
    setFiles(failed);
    if (failed.length) setMessage(`${pending.length - failed.length} file(s) were saved. ${failed.length} could not be uploaded; they remain in the upload list for retry.`);
    else setMessage(`${pending.length} file(s) were uploaded to this case.`);
    const result = await apiCollection<unknown>(`/api/documents?caseId=${encodeURIComponent(caseId)}`, "documents");
    if (result !== null) { setDocuments(result.map(normalizeDocument).filter((item): item is DocumentRecord => item !== null)); setDocumentsState("ready"); }
    else setDocumentsState("unavailable");
    if (ref.current && !failed.length) ref.current.value = "";
    setBusy(false);
  };

  const noCases = casesState === "ready" && caseOptions.length === 0;
  const currentDocuments = documentsCaseId === caseId ? documents : [];
  const currentDocumentsState = !caseId ? "idle" : documentsCaseId === caseId ? documentsState : "loading";
  return <>
    <PageHeading eyebrow="Document library" title="Documents" description="Upload case materials and review extraction status." action={<Badge tone={currentDocumentsState === "ready" ? "green" : "neutral"}>{currentDocumentsState === "loading" ? "Loading" : currentDocumentsState === "unavailable" ? "Service unavailable" : caseId ? "Your case documents" : "No case selected"}</Badge>}/>
    <div className="mb-5 flex flex-col gap-4 border bg-white p-5 sm:flex-row sm:items-end sm:p-6">
      <label className="w-full max-w-sm text-sm font-medium">Upload to case<select disabled={casesState !== "ready" || noCases} value={caseId} onChange={event => setCaseId(event.target.value)} className="app-search mt-2 h-12 w-full rounded-xl border px-3 text-sm"><option value="">{casesState === "loading" ? "Loading cases…" : noCases ? "Create a case first" : "Select case…"}</option>{caseOptions.map(item => <option key={item.id} value={item.id}>{item.reference} · {item.title}</option>)}</select></label>
      <div className="text-xs leading-relaxed text-[#89938d]">PDF, TXT, CSV, XLSX · Original files are not cached in the browser.</div>
    </div>
    {casesState === "unavailable" && <div role="alert" className="mb-4 border p-4 text-sm">Your cases could not be loaded. Check your connection and retry.</div>}
    {noCases && <Panel className="mb-5 flex flex-col items-start gap-3 p-6"><p>You haven’t created any cases yet. Create a case before uploading documents.</p><Link href="/cases"><Button>Create your first case</Button></Link></Panel>}
    <input ref={ref} type="file" multiple accept=".pdf,.txt,.csv,.xlsx" className="hidden" onChange={event => add(event.target.files)}/>
    {!noCases && <div onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); add(event.dataTransfer.files); }} className={`upload-zone border border-dashed px-5 py-12 text-center ${caseId ? "" : "opacity-60"}`}><div className="mx-auto grid h-14 w-14 place-items-center bg-[#e3eaec] text-[#486b7e]"><UploadCloud size={25}/></div><div className="mt-5 text-lg font-semibold">Drop files here to add to your case</div><div className="mt-2 text-sm text-[#7e8983]">PDF, TXT, CSV or XLSX</div><div className="mt-5"><Button secondary onClick={() => ref.current?.click()}>{casesState === "loading" ? "Loading cases…" : "Choose files"}</Button></div></div>}
    {message && <div role="status" className="mt-4 border bg-white p-4 text-sm">{message}</div>}
    {files.length > 0 && <Panel className="mt-5"><PanelTitle title={`Ready to upload · ${files.length} file${files.length === 1 ? "" : "s"}`} action={<Button onClick={() => void upload()}>{busy ? "Uploading…" : "Upload documents"}</Button>}/><div className="divide-y">{files.map((file, index) => <div key={`${file.name}-${index}`} className="flex items-center gap-3 px-5 py-4"><FileText size={18}/><div className="flex-1 text-sm">{file.name}<div className="mt-1 text-xs text-[#929b96]">{(file.size / 1024).toFixed(0)} KB</div></div><button type="button" onClick={() => setFiles(current => current.filter((_, position) => position !== index))} aria-label={`Remove ${file.name}`} className="text-[#8b9690]"><X size={17}/></button></div>)}</div></Panel>}
    <Panel className="mt-5"><PanelTitle title="Case documents" action={caseId ? <Badge tone={currentDocumentsState === "ready" ? "green" : currentDocumentsState === "unavailable" ? "red" : "neutral"}>{currentDocumentsState === "loading" ? "Loading" : currentDocumentsState === "unavailable" ? "Unavailable" : "Your records"}</Badge> : undefined}/><div className="divide-y">{currentDocuments.map(document => <div key={document.id} className="flex items-center gap-3 px-5 py-4 sm:px-6">{document.name.toLowerCase().endsWith("xlsx") || document.name.toLowerCase().endsWith("csv") ? <FileSpreadsheet size={18}/> : <File size={18}/>}<div className="flex-1"><div className="text-sm font-medium">{document.name}</div><div className="mt-1 text-xs text-[#929b96]">{document.details}</div></div>{document.status.toLowerCase().includes("process") ? <Badge tone="green"><CheckCircle2 size={13} className="mr-1"/>{document.status}</Badge> : <Badge tone="amber">{document.status}</Badge>}</div>)}{currentDocumentsState === "loading" && <div className="p-10 text-center text-sm">Loading documents…</div>}{currentDocumentsState === "unavailable" && <div className="p-10 text-center text-sm">Documents could not be loaded. Retry when your connection is restored.</div>}{currentDocumentsState === "ready" && !currentDocuments.length && <div className="p-10 text-center text-sm">No documents have been uploaded.</div>}{!caseId && !noCases && casesState === "ready" && <div className="p-10 text-center text-sm">Select one of your cases to view its documents.</div>}</div></Panel>
    <p className="mt-3 text-xs leading-relaxed text-[#929b96]">OCR for scanned PDFs is not available. Upload receipt does not guarantee text extraction.</p>
  </>;
}
