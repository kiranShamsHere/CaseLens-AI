"use client";

import { useEffect, useState } from "react";
import { Search, ShieldCheck, Clock3, FileText } from "lucide-react";
import { apiCollection } from "@/components/api";
import { Badge, PageHeading, Panel } from "@/components/ui";

type AuditEvent = { id: string; action: string; finding: string; reviewer: string; time: string; note: string };
const sampleEvents: AuditEvent[] = [
  { id: "a1", action: "Flagged conflict", finding: "Conflicting employment start date", reviewer: "CaseLens AI", time: "Sample event · Nov 16", note: "Two source dates differ; review required." },
  { id: "a2", action: "Document processed", finding: "Employer letter.pdf", reviewer: "System", time: "Sample event · Nov 16", note: "Text extracted. OCR confidence not available in demo." },
  { id: "a3", action: "Review requested", finding: "Monthly salary needs verification", reviewer: "Case worker", time: "Sample event · Nov 15", note: "Asked client to confirm net monthly amount." },
  { id: "a4", action: "Case created", finding: "Rahman v. Northstar Textiles", reviewer: "Case worker", time: "Sample event · Nov 14", note: "Initial intake." },
];

function normalizeEvent(value: unknown, index: number): AuditEvent | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const action = item.action ?? item.event ?? item.type;
  if (typeof action !== "string") return null;
  return { id: String(item.id ?? index), action, finding: String(item.finding ?? item.subject ?? item.target ?? "—"), reviewer: String(item.reviewer ?? item.actor ?? "—"), time: String(item.timestamp ?? item.createdAt ?? item.time ?? "Timestamp unavailable"), note: String(item.notes ?? item.note ?? item.description ?? "") };
}

export default function Audit() {
  const [query, setQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("All actions");
  const [caseFilter, setCaseFilter] = useState("");
  const [events, setEvents] = useState(sampleEvents);
  const [source, setSource] = useState("Sample history");
  useEffect(() => {
    let active = true;
    const path = caseFilter.trim() ? `/api/audit?caseId=${encodeURIComponent(caseFilter.trim())}` : "/api/audit";
    void apiCollection<unknown>(path, "audit").then(result => {
      if (!active) return;
      if (result === null) { setSource("API unavailable · samples shown"); return; }
      setEvents(result.map(normalizeEvent).filter((item): item is AuditEvent => item !== null));
      setSource("Live audit history");
    });
    return () => { active = false; };
  }, [caseFilter]);
  const filtered = events.filter(event => {
    const matchesQuery = `${event.action} ${event.finding} ${event.reviewer} ${event.note}`.toLowerCase().includes(query.toLowerCase());
    const action = event.action.toLowerCase();
    const matchesAction = actionFilter === "All actions" || (actionFilter === "Reviews" ? action.includes("review") || action.includes("approv") || action.includes("reject") : actionFilter === "Documents" ? action.includes("document") || action.includes("upload") : actionFilter === "Cases" ? action.includes("case") : !action.includes("review") && !action.includes("approv") && !action.includes("reject") && !action.includes("document") && !action.includes("upload") && !action.includes("case"));
    return matchesQuery && matchesAction;
  });
  return <><PageHeading eyebrow="Traceability" title="Audit logs" description="Review a history of case activity and decisions." action={<Badge tone={source.startsWith("Live") ? "green" : "amber"}>{source}</Badge>}/><div className="mb-4 flex flex-col gap-3 sm:flex-row"><div className="relative max-w-lg flex-1"><Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9aa39f]"/><input aria-label="Search audit events" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search actions, findings or reviewers" className="app-search h-12 w-full rounded-xl border pl-11 pr-3 text-sm outline-none focus:border-[#b78a3e]"/></div><input aria-label="Filter audit events by case ID" value={caseFilter} onChange={event => setCaseFilter(event.target.value)} placeholder="Case ID (optional)" className="app-search h-12 rounded-xl border px-3 text-sm outline-none focus:border-[#b78a3e] sm:max-w-48"/><label className="sr-only" htmlFor="audit-filter">Filter audit actions</label><select id="audit-filter" value={actionFilter} onChange={event => setActionFilter(event.target.value)} className="app-search h-12 rounded-xl border px-3 text-sm outline-none focus:border-[#b78a3e]"><option>All actions</option><option>Reviews</option><option>Documents</option><option>Cases</option><option>Other activity</option></select></div><Panel><div className="hidden grid-cols-[1fr_1.5fr_1fr_1.2fr] gap-4 border-b px-6 py-4 text-[11px] font-semibold uppercase tracking-[.12em] text-[#969f9a] md:grid"><span>Action</span><span>Finding / item</span><span>Reviewer</span><span>Timestamp</span></div>{filtered.map(event => <div key={event.id} className="grid gap-3 border-b px-5 py-5 last:border-0 md:grid-cols-[1fr_1.5fr_1fr_1.2fr] md:items-center md:px-6"><div className="flex items-center gap-3 text-sm font-medium"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#f2ead9] text-[#a47b33]">{event.action.toLowerCase().includes("review") ? <ShieldCheck size={16}/> : event.action.toLowerCase().includes("document") ? <FileText size={16}/> : <Clock3 size={16}/>}</span>{event.action}</div><div><div className="text-sm text-[#46534c]">{event.finding}</div><div className="mt-1 text-xs text-[#8d9891]">{event.note}</div></div><div className="text-sm text-[#647069]">{event.reviewer}</div><div className="text-xs text-[#8b9690]">{event.time}</div></div>)}{!filtered.length && <div className="p-10 text-center text-sm text-[#849089]">No audit events match these filters.</div>}</Panel>{source.startsWith("Sample") || source.startsWith("API") ? <p className="mt-3 text-xs text-[#949d98]">Audit events are labeled sample records. Live history appears when the audit endpoint is connected.</p> : null}</>;
}
