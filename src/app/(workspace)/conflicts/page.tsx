"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TriangleAlert, CalendarDays, Banknote, UserRound } from "lucide-react";
import { apiCollection } from "@/components/api";
import { Badge, Evidence, PageHeading, Panel } from "@/components/ui";

type EvidenceQuote = { source: string; quote: string; page?: number };
type Conflict = { id: string; title: string; description: string; severity: string; evidence: EvidenceQuote[] };
const icons = [CalendarDays, Banknote, UserRound];

function normalizeConflict(value: unknown, index: number): Conflict | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const title = item.title ?? item.name ?? item.field;
  if (typeof title !== "string") return null;
  const evidenceValue = Array.isArray(item.evidence) ? item.evidence : Array.isArray(item.citations) ? item.citations : [];
  const evidence = evidenceValue.flatMap((entry): EvidenceQuote[] => {
    if (!entry || typeof entry !== "object") return [];
    const citation = entry as Record<string, unknown>;
    const quote = citation.quote ?? citation.excerpt ?? citation.text;
    const source = citation.source ?? citation.filename ?? citation.documentName;
    if (typeof quote !== "string" || typeof source !== "string") return [];
    return [{ source, quote, page: typeof citation.page === "number" ? citation.page : undefined }];
  });
  return { id: String(item.id ?? index), title, description: String(item.description ?? item.explanation ?? "Compare the cited passages and confirm the correct fact with the client."), severity: String(item.severity ?? "Review"), evidence };
}

export default function Conflicts() {
  const [filter, setFilter] = useState("All");
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [source, setSource] = useState<"Loading" | "Your conflict records" | "Unavailable">("Loading");
  useEffect(() => {
    let active = true;
    void apiCollection<unknown>("/api/conflicts", "conflicts").then(result => {
      if (!active) return;
      if (result === null) { setConflicts([]); setSource("Unavailable"); return; }
      setConflicts(result.map(normalizeConflict).filter((item): item is Conflict => item !== null));
      setSource("Your conflict records");
    });
    return () => { active = false; };
  }, []);
  const items = conflicts.filter(item => filter === "All" || item.severity.toLowerCase() === filter.toLowerCase());

  return <><PageHeading eyebrow="Evidence discrepancy tracking" title="Conflict center" description="Compare inconsistent claims against their original documents. Resolve conflicts through a human review." action={<Badge tone={source === "Your conflict records" ? "green" : source === "Unavailable" ? "red" : "neutral"}>{source}</Badge>}/><div className="mb-5 flex flex-wrap gap-2">{["All", "High", "Medium"].map(value => <button key={value} onClick={() => setFilter(value)} className={`min-h-10 rounded-full px-4 text-sm font-medium transition ${filter === value ? "bg-[#26221b] text-[#fff7e8] shadow-md" : "border border-[#e3ddcf] bg-white text-[#68746e] hover:bg-[#f5f0e5]"}`}>{value}</button>)}</div><div className="space-y-5">{items.map((item, index) => { const Icon = icons[index] || TriangleAlert; return <Panel key={item.id}><div className="flex flex-wrap items-start gap-3 border-b p-5 sm:items-center sm:px-6"><div className="grid h-11 w-11 place-items-center rounded-xl bg-[#e3eaec] text-[#486b7e]"><Icon size={19}/></div><div className="min-w-0 flex-1"><div className="text-base font-semibold">{item.title}</div><p className="mt-1 text-sm text-[#79847e]">{item.description}</p></div><Badge tone={item.severity.toLowerCase() === "high" ? "red" : "amber"}>{item.severity} severity</Badge><Badge tone="amber">Unresolved</Badge></div><div className="grid gap-3 p-5 sm:p-6 md:grid-cols-2">{item.evidence.length ? item.evidence.map((evidence, evidenceIndex) => <Evidence key={`${evidence.source}-${evidenceIndex}`} source={evidence.source} page={evidence.page} quote={evidence.quote}/>) : <div className="rounded-xl border border-dashed p-4 text-sm text-[#78837d]">No source quotations returned. Verify this finding before acting.</div>}</div><div className="flex flex-col gap-3 border-t bg-[#fcfdfc] px-5 py-4 sm:flex-row sm:items-center sm:px-6"><div className="flex-1 text-sm leading-relaxed text-[#79847e]">Review the source documents and confirm the fact with the client before relying on this finding.</div><Link href="/review" className="rounded-xl border bg-white px-4 py-2.5 text-sm font-semibold text-[#486b7e] transition hover:bg-[#e3eaec]">Open in review center</Link></div></Panel>})}{!items.length && <Panel className="p-10 text-center text-sm text-[#849089]">{source === "Loading" ? "Loading evidence checks…" : source === "Unavailable" ? "Evidence findings could not be loaded. Check your connection and try again." : <div><p>No conflicts have been found in your cases.</p><Link href="/documents" className="mt-3 inline-flex min-h-10 items-center border px-4 font-semibold">Upload case documents</Link></div>}</Panel>}</div></>;
}
