"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, BriefcaseBusiness, FileText, ShieldCheck, TriangleAlert, CircleHelp } from "lucide-react";
import { apiCollection } from "@/components/api";
import { normalizeCaseRecord, type CaseRecord } from "@/components/demo-data";
import { Badge, PageHeading, Panel, PanelTitle } from "@/components/ui";

type ActivityRecord = { text: string; meta: string; kind: string };
const cards = [
  { key: "cases", label: "Open cases", icon: BriefcaseBusiness, note: "Active matters" },
  { key: "documents", label: "Documents", icon: FileText, note: "Across case files" },
  { key: "reviews", label: "Pending reviews", icon: ShieldCheck, note: "Human verification" },
  { key: "conflicts", label: "Conflicts found", icon: TriangleAlert, note: "Check source evidence" },
  { key: "missing", label: "Missing information", icon: CircleHelp, note: "Confirm with client" },
] as const;

export default function Dashboard() {
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [caseSource, setCaseSource] = useState<"loading" | "live" | "unavailable">("loading");
  const [counts, setCounts] = useState({ cases: 0, documents: 0, reviews: 0, conflicts: 0, missing: 0 });
  const [sources, setSources] = useState<Record<string, "loading" | "live" | "unavailable">>({ cases: "loading", documents: "loading", reviews: "loading", conflicts: "loading", missing: "loading" });
  const [activity, setActivity] = useState<ActivityRecord[]>([]);
  const [activitySource, setActivitySource] = useState<"loading" | "live" | "unavailable">("loading");
  const [reviewItems, setReviewItems] = useState<{ id: string; title: string; severity: string; source: string }[]>([]);

  useEffect(() => {
    let active = true;
    void Promise.all([
      apiCollection<unknown>("/api/cases", "cases"),
      apiCollection<unknown>("/api/documents", "documents"),
      apiCollection<unknown>("/api/conflicts", "conflicts"),
      apiCollection<unknown>("/api/missing", "missing"),
      apiCollection<unknown>("/api/audit", "audit"),
      apiCollection<unknown>("/api/review", "reviews"),
    ]).then(([liveCases, documents, conflicts, missing, audit, reviews]) => {
      if (!active) return;
      const nextSources: Record<string, "loading" | "live" | "unavailable"> = { cases: liveCases === null ? "unavailable" : "live", documents: documents === null ? "unavailable" : "live", reviews: reviews === null ? "unavailable" : "live", conflicts: conflicts === null ? "unavailable" : "live", missing: missing === null ? "unavailable" : "live" };
      const nextCounts = { cases: 0, documents: 0, reviews: 0, conflicts: 0, missing: 0 };
      if (liveCases !== null) {
        const normalized = liveCases.map(normalizeCaseRecord).filter((item): item is NonNullable<typeof item> => item !== null);
        setCases(normalized);
        setCaseSource("live");
        nextSources.cases = "live";
        nextCounts.cases = normalized.filter(item => item.status.toLowerCase() !== "closed").length;
      } else { setCases([]); setCaseSource("unavailable"); }
      if (documents !== null) { nextCounts.documents = documents.length; nextSources.documents = "live"; }
      if (conflicts !== null) { nextCounts.conflicts = conflicts.length; nextSources.conflicts = "live"; }
      if (missing !== null) { nextCounts.missing = missing.length; nextSources.missing = "live"; }
      if (reviews !== null) { nextCounts.reviews = reviews.length; nextSources.reviews = "live"; }
      if (reviews !== null) setReviewItems(reviews.flatMap((entry, index) => {
        if (!entry || typeof entry !== "object") return [];
        const item = entry as Record<string, unknown>;
        return [{ id: String(item.id ?? index), title: String(item.title ?? "Finding awaiting review"), severity: String(item.severity ?? "Review"), source: String(item.description ?? "Check the source evidence") }];
      })); else setReviewItems([]);
      if (audit !== null) {
        const liveActivity = audit.flatMap((entry, index) => {
          if (!entry || typeof entry !== "object") return [];
          const item = entry as Record<string, unknown>;
          const text = item.action ?? item.event ?? item.type;
          if (typeof text !== "string") return [];
          const context = item.finding ?? item.caseTitle ?? item.subject ?? "Case activity";
          const time = item.timestamp ?? item.createdAt ?? item.time ?? "Time unavailable";
          return [{ text, meta: `${String(context)} · ${String(time)}`, kind: String(item.status ?? index) }];
        });
        setActivity(liveActivity);
        setActivitySource("live");
      } else { setActivity([]); setActivitySource("unavailable"); }
      setCounts(nextCounts);
      setSources(nextSources);
    });
    return () => { active = false; };
  }, []);

  const live = activitySource === "live" || Object.values(sources).some(source => source === "live");
  const chartStats = caseSource === "live"
    ? cases.reduce((result, item) => {
      const status = item.status.toLowerCase();
      if (status.includes("close")) result.closed += 1;
      else if (status.includes("review")) result.review += 1;
      else result.active += 1;
      return result;
    }, { active: 0, review: 0, closed: 0 })
    : { active: 0, review: 0, closed: 0 };
  const chartTotal = chartStats.active + chartStats.review + chartStats.closed;
  const chartWidth = (value: number) => chartTotal ? `${value / chartTotal * 100}%` : "0%";
  return <>
    <PageHeading eyebrow="Casework overview" title="Your workspace" description="A current view of cases, documents, and review work in your account." action={<Badge tone={live ? "green" : "neutral"}>{live ? "Live account data" : "Connecting to your workspace"}</Badge>}/>
    <div className="mb-5 flex flex-wrap gap-2"><Link href="/cases" className="inline-flex min-h-10 items-center gap-2 border px-4 text-sm font-semibold"><BriefcaseBusiness size={16}/> New case</Link><Link href="/documents" className="inline-flex min-h-10 items-center gap-2 border px-4 text-sm font-semibold"><FileText size={16}/> Add documents</Link><Link href="/ask" className="inline-flex min-h-10 items-center gap-2 border px-4 text-sm font-semibold"><ArrowRight size={16}/> Ask about a case</Link></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">{cards.map(({ key, label, icon: Icon, note }) => <Panel key={key} className="p-5 sm:p-6"><div className="flex items-center justify-between"><span className="text-sm text-[#748079]">{label}</span><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e3eaec] text-[#486b7e]"><Icon size={18}/></span></div><div className="mt-4 flex items-end justify-between gap-2"><div className="text-[34px] font-semibold tracking-[-.05em]">{counts[key]}</div><Badge tone={sources[key] === "live" ? "green" : "neutral"}>{sources[key] === "live" ? "Live" : sources[key] === "loading" ? "Loading" : "Unavailable"}</Badge></div><div className="mt-1 text-xs text-[#89928e]">{note}</div></Panel>)}</div>
    <div className="mt-6 grid gap-5 xl:grid-cols-[1.4fr_.9fr]"><Panel><PanelTitle title="Recent cases" action={<Link href="/cases" className="text-sm font-semibold text-[#926d2d]">All cases <ArrowRight className="ml-1 inline" size={14}/></Link>}/><div className="divide-y divide-[#edf0ee]">{cases.slice(0, 4).map(item => <Link href={`/cases/${item.id}`} key={item.id} className="case-row flex items-center gap-4 px-5 py-4 transition hover:bg-[#f8f6f0] sm:px-6"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#f2ead9] text-[#a47b33]"><BriefcaseBusiness size={19}/></div><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{item.title}</div><div className="mt-1 text-xs text-[#89928e]">{item.reference} · {item.type} · {item.documents} documents</div></div><Badge tone={item.status === "Active" ? "green" : item.status === "In review" ? "amber" : "neutral"}>{item.status}</Badge></Link>)}</div>{!cases.length&&<div className="p-8 text-center text-sm text-[#89928e]">No cases yet. Create one to get started.</div>}</Panel>
      <Panel><PanelTitle title="Recent activity" action={<div className="flex items-center gap-3"><Badge tone={activitySource === "live" ? "green" : "neutral"}>{activitySource === "live" ? "Live" : activitySource === "loading" ? "Loading" : "Unavailable"}</Badge><Link href="/audit" className="text-sm font-semibold text-[#486b7e]">View audit</Link></div>}/><div className="space-y-6 p-5 sm:p-6">{activity.map((item, index) => <div className="flex gap-3" key={`${item.text}-${index}`}><div className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${index === 0 ? "bg-[#54778a]" : index === 1 ? "bg-[#658675]" : "bg-[#8d9eaa]"}`}/><div><div className="text-sm font-medium">{item.text}</div><div className="mt-1 text-xs text-[#909993]">{item.meta}</div></div></div>)}{!activity.length && <div className="text-sm text-[#849089]">{activitySource === "loading" ? "Loading recent activity…" : "No recent activity is available."}</div>}</div></Panel></div>
    <div className="mt-6 grid gap-5 lg:grid-cols-2"><Panel><PanelTitle title="Review queue" action={<Link href="/review" className="text-sm font-semibold text-[#486b7e]">Open review center</Link>}/><div className="divide-y divide-[#edf0ee]">{reviewItems.slice(0, 3).map(finding => <div key={finding.id} className="flex items-start gap-3 px-5 py-4 sm:px-6"><ShieldCheck size={18} className="mt-0.5 text-[#54778a]"/><div className="flex-1"><div className="text-sm font-medium">{finding.title}</div><div className="mt-1 text-xs text-[#8c9690]">{finding.source}</div></div><Badge tone={finding.severity === "High" ? "red" : "amber"}>{finding.severity}</Badge></div>)}</div><div className="border-t px-5 py-3 text-xs text-[#8c867c]">{sources.reviews === "live" ? `${reviewItems.length} review item(s) from your account.` : sources.reviews === "loading" ? "Loading review items…" : "Review items are unavailable until the case API responds."}</div></Panel>
      <Panel><PanelTitle title="Case status overview" action={<Badge tone={caseSource === "live" ? "green" : "neutral"}>{caseSource === "live" ? "Live account data" : caseSource === "loading" ? "Loading" : "Unavailable"}</Badge>}/><div className="p-5 sm:p-6"><div className="mb-4 flex justify-between text-xs text-[#84908a]"><span>{chartTotal} total cases</span><span>Status distribution</span></div><div className="flex h-3 overflow-hidden bg-[#e7ecec]"><div style={{ width: chartWidth(chartStats.active) }} className="bg-[#54778a]"/><div style={{ width: chartWidth(chartStats.review) }} className="bg-[#88a2ad]"/><div style={{ width: chartWidth(chartStats.closed) }} className="bg-[#a3b0b4]"/></div><div className="mt-4 grid grid-cols-3 gap-2 text-xs"><div>Active <b className="ml-1">{chartStats.active}</b></div><div>In review <b className="ml-1">{chartStats.review}</b></div><div>Closed <b className="ml-1">{chartStats.closed}</b></div></div>{caseSource === "unavailable" && <div className="mt-5 flex items-start gap-2 border bg-[#f2f4f3] p-4 text-xs leading-relaxed text-[#64737b]"><CircleHelp size={16} className="mt-0.5 shrink-0"/>Your case status breakdown will appear when the API is available.</div>}</div></Panel></div>
  </>;
}
