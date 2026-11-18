"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, TriangleAlert } from "lucide-react";
import { api, apiCollection } from "@/components/api";
import { normalizeCaseRecord, type CaseRecord } from "@/components/demo-data";
import { Badge, Button, Evidence, PageHeading, Panel, PanelTitle } from "@/components/ui";
import { readOfflineCache, writeOfflineCache } from "@/components/offline";

type CaseDocument = { id: string; name: string; details: string; status: string };
type CaseFlag = { id: string; title: string; description: string; source: string; quote: string; severity: string; kind: "conflict" | "missing" };
type CaseOfflineSummary = { caseRecord: CaseRecord; documents: CaseDocument[]; flags: CaseFlag[] };

function normalizeDocument(value: unknown, index: number): CaseDocument | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const name = item.filename ?? item.fileName ?? item.name ?? item.title;
  if (typeof name !== "string") return null;
  const bytes = Number(item.size ?? item.size_bytes ?? 0);
  return { id: String(item.id ?? index), name, details: [String(item.type ?? item.mimeType ?? "Case document"), bytes > 0 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : ""].filter(Boolean).join(" · "), status: String(item.status ?? "Uploaded") };
}

function normalizeFlag(value: unknown, index: number, kind: CaseFlag["kind"]): CaseFlag | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const title = item.title ?? item.name ?? item.field;
  if (typeof title !== "string") return null;
  const evidence = Array.isArray(item.evidence) ? item.evidence[0] : null;
  const sourceEvidence = evidence && typeof evidence === "object" ? evidence as Record<string, unknown> : {};
  return { id: String(item.id ?? index), title, description: String(item.description ?? item.explanation ?? "Review this information against the source documents."), source: String(sourceEvidence.source ?? item.source ?? item.sourceName ?? item.documentName ?? "Source details unavailable"), quote: String(sourceEvidence.quote ?? item.quote ?? item.excerpt ?? "Open the source document to verify this finding."), severity: String(item.severity ?? "Review"), kind };
}

export default function CaseDetail() {
  const { id } = useParams<{ id: string }>();
  const [caseRecord, setCaseRecord] = useState<CaseRecord | null>(null);
  const [documents, setDocuments] = useState<CaseDocument[]>([]);
  const [flags, setFlags] = useState<CaseFlag[]>([]);
  const [caseState, setCaseState] = useState<"loading" | "ready" | "unavailable" | "not-found">("loading");
  const [documentsState, setDocumentsState] = useState("Loading");
  const [flagsState, setFlagsState] = useState("Loading");

  useEffect(() => {
    let active = true;
    const cacheKey = `case:${id}`;
    const cached = readOfflineCache<CaseOfflineSummary>(cacheKey);
    const validCache = cached?.caseRecord?.id === id ? cached : null;
    if (!navigator.onLine && validCache) queueMicrotask(() => {
      if (!active) return;
      setCaseRecord(validCache.caseRecord); setDocuments(validCache.documents); setFlags(validCache.flags);
      setCaseState("ready"); setDocumentsState("Offline · cached for this account"); setFlagsState("Offline · cached for this account");
    });

    void Promise.all([
      api<unknown>(`/api/cases/${encodeURIComponent(id)}`).then(value => ({ value, status: "ok" as const })).catch(error => ({ value: null, status: error instanceof Error && error.message.includes("(404)") ? "not-found" as const : "unavailable" as const })),
      apiCollection<unknown>(`/api/documents?caseId=${encodeURIComponent(id)}`, "documents"),
      apiCollection<unknown>(`/api/conflicts?caseId=${encodeURIComponent(id)}`, "conflicts"),
      apiCollection<unknown>(`/api/missing?caseId=${encodeURIComponent(id)}`, "missing"),
    ]).then(([caseResult, liveDocuments, conflicts, missing]) => {
      if (!active) return;
      if (caseResult.status === "not-found") { setCaseRecord(null); setDocuments([]); setFlags([]); setCaseState("not-found"); setDocumentsState("Case not found"); setFlagsState("Case not found"); return; }
      let nextCase = validCache?.caseRecord ?? null;
      let nextDocuments = validCache?.documents ?? [];
      let nextFlags = validCache?.flags ?? [];
      if (caseResult.status === "ok") {
        const outer = caseResult.value && typeof caseResult.value === "object" ? caseResult.value as Record<string, unknown> : {};
        const normalized = normalizeCaseRecord(outer.case ?? outer.data ?? caseResult.value, 0);
        if (normalized) nextCase = normalized;
      }
      if (caseResult.status === "ok" && !nextCase) { setCaseRecord(null); setCaseState("not-found"); setDocuments([]); setFlags([]); return; }
      if (liveDocuments !== null) nextDocuments = liveDocuments.map(normalizeDocument).filter((item): item is CaseDocument => item !== null);
      if (conflicts !== null || missing !== null) nextFlags = [
        ...(conflicts ?? []).map((item, index) => normalizeFlag(item, index, "conflict")),
        ...(missing ?? []).map((item, index) => normalizeFlag(item, index, "missing")),
      ].filter((item): item is CaseFlag => item !== null);
      if (nextCase) {
        setCaseRecord(nextCase); setCaseState("ready");
        setDocuments(nextDocuments); setDocumentsState(liveDocuments === null ? "Offline · cached for this account" : "Your case documents");
        setFlags(nextFlags); setFlagsState(conflicts === null && missing === null ? "Offline · cached for this account" : "Your evidence findings");
        if (caseResult.status === "ok" && liveDocuments !== null && conflicts !== null && missing !== null) writeOfflineCache(cacheKey, { caseRecord: nextCase, documents: nextDocuments, flags: nextFlags });
      } else { setCaseRecord(null); setCaseState("unavailable"); setDocuments([]); setFlags([]); setDocumentsState("Unavailable"); setFlagsState("Unavailable"); }
    });
    return () => { active = false; };
  }, [id]);

  if (!caseRecord) return <><Link href="/cases" className="mb-5 inline-flex items-center gap-2 text-sm font-medium"><ArrowLeft size={16}/> All cases</Link><PageHeading eyebrow="Case file" title={caseState === "loading" ? "Loading case…" : caseState === "not-found" ? "Case not found" : "Case unavailable"} description={caseState === "not-found" ? "This case doesn’t exist or you don’t have access to it." : caseState === "unavailable" ? "The case service could not be reached." : "Loading your case details."}/></>;

  return <><Link href="/cases" className="mb-5 inline-flex items-center gap-2 text-sm font-medium"><ArrowLeft size={16}/> All cases</Link><PageHeading eyebrow={`${caseRecord.reference} · ${caseRecord.type}`} title={caseRecord.title} description="Your case summary and source-linked findings." action={<Badge tone={caseRecord.status === "Active" || caseRecord.status === "Open" ? "green" : "amber"}>{caseRecord.status}</Badge>}/><div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]"><Panel><PanelTitle title="Case documents" action={<Link className="text-sm font-semibold text-[#486b7e]" href="/documents">Manage documents</Link>}/><div className="divide-y">{documents.map(document => <div key={document.id} className="flex items-center gap-3 px-5 py-4 sm:px-6"><FileText size={18}/><div className="flex-1"><div className="text-sm font-medium">{document.name}</div><div className="mt-1 text-xs text-[#929b96]">{document.details}</div></div><Badge tone={document.status.toLowerCase().includes("process") ? "green" : "neutral"}>{document.status}</Badge></div>)}{!documents.length && <div className="p-8 text-sm text-[#849089]">{documentsState === "Unavailable" ? "Documents could not be loaded." : documentsState.startsWith("Loading") ? "Loading your documents…" : <div><p>No documents have been uploaded.</p><Link href="/documents" className="mt-3 inline-flex"><Button>Upload a document</Button></Link></div>}</div>}</div><div className="border-t px-5 py-3 text-xs text-[#929b96]">{documentsState}</div></Panel><Panel><PanelTitle title="Information checklist" action={<Badge tone="neutral">{flagsState}</Badge>}/><div className="space-y-4 p-5">{flags.length ? flags.map(flag => <div key={flag.id} className="flex items-center justify-between gap-2 border-b pb-3 last:border-0"><span className="text-sm">{flag.title}</span><Badge tone={flag.kind === "missing" ? "red" : "amber"}>{flag.kind === "missing" ? "Missing" : "Conflicting"}</Badge></div>) : <p className="text-sm text-[#849089]">{flagsState === "Unavailable" ? "Evidence findings could not be loaded." : flagsState.startsWith("Loading") ? "Loading your evidence findings…" : "Evidence findings will appear here once documents are analyzed."}</p>}</div></Panel></div><Panel className="mt-5"><PanelTitle title="Findings needing attention" action={<Badge tone="neutral">{flagsState}</Badge>}/><div className="space-y-4 p-5 sm:p-6">{flags.map(flag => <div key={flag.id} className="grid gap-3 md:grid-cols-[1fr_1fr]"><div><div className="flex items-center gap-2 text-sm font-semibold"><TriangleAlert size={16}/>{flag.title}</div><p className="mt-2 text-sm leading-relaxed text-[#77817c]">{flag.description}</p></div><Evidence source={flag.source} quote={flag.quote}/></div>)}{!flags.length && <p className="text-sm text-[#849089]">Evidence findings will appear here after your documents are analyzed.</p>}</div></Panel><div className="mt-5"><Link href="/ask"><Button>Ask about this case</Button></Link></div></>;
}
