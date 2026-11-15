"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, TriangleAlert } from "lucide-react";
import { api, apiCollection } from "@/components/api";
import { demoCases, demoFindings, type CaseRecord } from "@/components/demo-data";
import { Badge, Button, Evidence, PageHeading, Panel, PanelTitle } from "@/components/ui";

type CaseDocument = { id: string; name: string; details: string; status: string };
type CaseFlag = { id: string; title: string; description: string; source: string; quote: string; severity: string };
const sampleDocuments: CaseDocument[] = [
  { id: "doc-1", name: "Client intake form.pdf", details: "PDF · 1.2 MB · Page count not verified", status: "Processed" },
  { id: "doc-2", name: "Employer letter.pdf", details: "PDF · 824 KB · Page count not verified", status: "Processed" },
  { id: "doc-3", name: "Payroll summary.xlsx", details: "Spreadsheet · 28 KB", status: "Processed" },
  { id: "doc-4", name: "Client interview notes.txt", details: "Text · 8 KB", status: "Processed" },
];
const sampleFlags: CaseFlag[] = demoFindings.slice(0, 2).map(finding => ({ id: finding.id, title: finding.title, description: finding.description, source: finding.source, quote: finding.quote, severity: finding.severity }));

function normalizeDocument(value: unknown, index: number): CaseDocument | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const name = item.filename ?? item.fileName ?? item.name ?? item.title;
  if (typeof name !== "string") return null;
  return { id: String(item.id ?? index), name, details: String(item.type ?? item.mimeType ?? "Case document"), status: String(item.status ?? "Uploaded") };
}

function normalizeFlag(value: unknown, index: number): CaseFlag | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const title = item.title ?? item.name ?? item.field;
  if (typeof title !== "string") return null;
  return { id: String(item.id ?? index), title, description: String(item.description ?? item.explanation ?? "Review this information against the source documents."), source: String(item.source ?? item.sourceName ?? item.documentName ?? "Source details unavailable"), quote: String(item.quote ?? item.excerpt ?? item.evidence ?? "Open the source document to verify this finding."), severity: String(item.severity ?? "Review") };
}

export default function CaseDetail() {
  const { id } = useParams<{ id: string }>();
  const [caseRecord, setCaseRecord] = useState<CaseRecord>(() => demoCases.find(item => item.id === id) ?? demoCases[0]);
  const [documents, setDocuments] = useState(sampleDocuments);
  const [flags, setFlags] = useState(sampleFlags);
  const [caseSource, setCaseSource] = useState("Sample case");
  const [documentsSource, setDocumentsSource] = useState("Sample documents");
  const [flagsSource, setFlagsSource] = useState("Sample findings");

  useEffect(() => {
    let active = true;
    void Promise.all([
      api<unknown>(`/api/cases/${encodeURIComponent(id)}`).catch(() => null),
      apiCollection<unknown>(`/api/documents?caseId=${encodeURIComponent(id)}`, "documents"),
      apiCollection<unknown>(`/api/conflicts?caseId=${encodeURIComponent(id)}`, "conflicts"),
      apiCollection<unknown>(`/api/missing?caseId=${encodeURIComponent(id)}`, "missing"),
    ]).then(([caseResult, liveDocuments, conflicts, missing]) => {
      if (!active) return;
      if (caseResult && typeof caseResult === "object") {
        const outer = caseResult as Record<string, unknown>;
        const raw = outer.case ?? outer.data ?? caseResult;
        if (raw && typeof raw === "object") {
          const item = raw as Record<string, unknown>;
          const title = item.title ?? item.name ?? item.caseName;
          if (typeof title === "string") {
            setCaseRecord({ id, title, reference: String(item.reference ?? item.caseNumber ?? id), type: String(item.type ?? item.caseType ?? "Case"), status: String(item.status ?? "Open"), updated: String(item.updatedAt ?? "Recently updated"), documents: Number(item.documentCount ?? 0) });
            setCaseSource("Live case record");
          }
        }
      }
      if (liveDocuments !== null) { setDocuments(liveDocuments.map(normalizeDocument).filter((item): item is CaseDocument => item !== null)); setDocumentsSource("Live case documents"); }
      const liveFlags = [...(conflicts ?? []), ...(missing ?? [])].map(normalizeFlag).filter((item): item is CaseFlag => item !== null);
      if (conflicts !== null || missing !== null) { setFlags(liveFlags); setFlagsSource("Live API findings"); }
    });
    return () => { active = false; };
  }, [id]);

  return <><Link href="/cases" className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-[#8b682d]"><ArrowLeft size={16}/> All cases</Link><PageHeading eyebrow={`${caseRecord.reference} · ${caseRecord.type} · ${caseSource}`} title={caseRecord.title} description="Case summary and evidence findings" action={<Badge tone={caseRecord.status === "Active" || caseRecord.status === "Open" ? "green" : "amber"}>{caseRecord.status}</Badge>}/><div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]"><Panel><PanelTitle title="Case documents" action={<Link className="text-sm font-semibold text-[#926d2d]" href="/documents">Manage documents</Link>}/><div className="divide-y divide-[#edf0ee]">{documents.map(document => <div key={document.id} className="flex items-center gap-3 px-5 py-4 sm:px-6"><FileText size={18} className="text-[#a47b33]"/><div className="flex-1"><div className="text-sm font-medium">{document.name}</div><div className="mt-1 text-xs text-[#929b96]">{document.details}</div></div><Badge tone={document.status.toLowerCase().includes("process") ? "green" : "neutral"}>{document.status}</Badge></div>)}{!documents.length && <div className="p-8 text-sm text-[#849089]">No documents are available for this case.</div>}</div><div className="border-t px-5 py-3 text-xs text-[#929b96]">{documentsSource}</div></Panel><Panel><PanelTitle title="Information checklist" action={<Badge tone="neutral">Sample checklist</Badge>}/><div className="space-y-4 p-5">{[["Employment start date", "Conflicting", "amber"], ["Monthly salary", "Conflicting", "amber"], ["Termination notice", "Missing", "red"], ["Client contact details", "Found", "green"]].map(([name, status, tone]) => <div key={name} className="flex items-center justify-between gap-2 border-b border-[#f0f2f1] pb-3 last:border-0"><span className="text-sm text-[#56615b]">{name}</span><Badge tone={tone as "amber" | "red" | "green"}>{status}</Badge></div>)}</div></Panel></div><Panel className="mt-5"><PanelTitle title="Findings needing attention" action={<Badge tone={flagsSource.startsWith("Live") ? "green" : "neutral"}>{flagsSource}</Badge>}/><div className="space-y-4 p-5 sm:p-6">{flags.map(flag => <div key={flag.id} className="grid gap-3 md:grid-cols-[1fr_1fr]"><div><div className="flex items-center gap-2 text-sm font-semibold"><TriangleAlert size={16} className="text-[#b77b43]"/>{flag.title}</div><p className="mt-2 text-sm leading-relaxed text-[#77817c]">{flag.description}</p></div><Evidence source={flag.source} quote={flag.quote}/></div>)}{!flags.length&&<p className="text-sm text-[#849089]">No missing information or conflicts were returned.</p>}</div></Panel><div className="mt-5"><Link href="/ask"><Button>Ask about this case</Button></Link></div></>;
}
