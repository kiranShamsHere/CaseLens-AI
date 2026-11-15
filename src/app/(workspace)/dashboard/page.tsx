"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, BriefcaseBusiness, FileText, ShieldCheck, TriangleAlert, CircleHelp } from "lucide-react";
import { apiCollection } from "@/components/api";
import { demoActivity, demoCases, demoFindings, normalizeCaseRecord } from "@/components/demo-data";
import { Badge, PageHeading, Panel, PanelTitle } from "@/components/ui";

type ActivityRecord = { text: string; meta: string; kind: string };
const demoStats = { cases: 24, documents: 186, reviews: 7, conflicts: 4, missing: 1 };
const cards = [
  { key: "cases", label: "Open cases", icon: BriefcaseBusiness, note: "Active matters" },
  { key: "documents", label: "Documents", icon: FileText, note: "Across case files" },
  { key: "reviews", label: "Pending reviews", icon: ShieldCheck, note: "Human verification" },
  { key: "conflicts", label: "Conflicts found", icon: TriangleAlert, note: "Check source evidence" },
  { key: "missing", label: "Missing information", icon: CircleHelp, note: "Confirm with client" },
] as const;

export default function Dashboard() {
  const [cases, setCases] = useState(demoCases);
  const [caseSource, setCaseSource] = useState<"demo" | "live">("demo");
  const [counts, setCounts] = useState(demoStats);
  const [sources, setSources] = useState<Record<string, "demo" | "live">>({ cases: "demo", documents: "demo", reviews: "demo", conflicts: "demo", missing: "demo" });
  const [activity, setActivity] = useState<ActivityRecord[]>(demoActivity);
  const [activitySource, setActivitySource] = useState<"demo" | "live">("demo");

  useEffect(() => {
    let active = true;
    void Promise.all([
      apiCollection<unknown>("/api/cases", "cases"),
      apiCollection<unknown>("/api/documents", "documents"),
      apiCollection<unknown>("/api/conflicts", "conflicts"),
      apiCollection<unknown>("/api/missing", "missing"),
      apiCollection<unknown>("/api/audit", "audit"),
    ]).then(([liveCases, documents, conflicts, missing, audit]) => {
      if (!active) return;
      const nextSources: Record<string, "demo" | "live"> = { cases: "demo", documents: "demo", reviews: "demo", conflicts: "demo", missing: "demo" };
      const nextCounts = { ...demoStats };
      if (liveCases !== null) {
        const normalized = liveCases.map(normalizeCaseRecord).filter((item): item is NonNullable<typeof item> => item !== null);
        setCases(normalized);
        setCaseSource("live");
        nextSources.cases = "live";
        nextCounts.cases = normalized.filter(item => item.status.toLowerCase() !== "closed").length;
      }
      if (documents !== null) { nextCounts.documents = documents.length; nextSources.documents = "live"; }
      if (conflicts !== null) { nextCounts.conflicts = conflicts.length; nextSources.conflicts = "live"; }
      if (missing !== null) { nextCounts.missing = missing.length; nextSources.missing = "live"; }
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
      }
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
    : { active: 14, review: 6, closed: 4 };
  const chartTotal = chartStats.active + chartStats.review + chartStats.closed;
  const chartWidth = (value: number) => chartTotal ? `${value / chartTotal * 100}%` : "0%";
  return <>
    <PageHeading eyebrow="Case intelligence · Today" title="Good morning, Ghulame" description="A clear view of the evidence, open decisions, and cases that need attention." action={<Badge tone={live ? "green" : "blue"}>{live ? "Live API data" : "Demo data · API unavailable"}</Badge>}/>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">{cards.map(({ key, label, icon: Icon, note }) => <Panel key={key} className="p-5 sm:p-6"><div className="flex items-center justify-between"><span className="text-sm text-[#748079]">{label}</span><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f2ead9] text-[#a47b33]"><Icon size={18}/></span></div><div className="mt-4 flex items-end justify-between gap-2"><div className="text-[34px] font-semibold tracking-[-.05em]">{counts[key]}</div><Badge tone={sources[key] === "live" ? "green" : "neutral"}>{sources[key] === "live" ? "Live" : "Sample"}</Badge></div><div className="mt-1 text-xs text-[#89928e]">{note}</div></Panel>)}</div>
    <div className="mt-6 grid gap-5 xl:grid-cols-[1.4fr_.9fr]"><Panel><PanelTitle title="Recent cases" action={<Link href="/cases" className="text-sm font-semibold text-[#926d2d]">All cases <ArrowRight className="ml-1 inline" size={14}/></Link>}/><div className="divide-y divide-[#edf0ee]">{cases.slice(0, 4).map(item => <Link href={`/cases/${item.id}`} key={item.id} className="case-row flex items-center gap-4 px-5 py-4 transition hover:bg-[#f8f6f0] sm:px-6"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#f2ead9] text-[#a47b33]"><BriefcaseBusiness size={19}/></div><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{item.title}</div><div className="mt-1 text-xs text-[#89928e]">{item.reference} · {item.type} · {item.documents} documents</div></div><Badge tone={item.status === "Active" ? "green" : item.status === "In review" ? "amber" : "neutral"}>{item.status}</Badge></Link>)}</div>{!cases.length&&<div className="p-8 text-center text-sm text-[#89928e]">No cases yet. Create one to get started.</div>}</Panel>
      <Panel><PanelTitle title="Recent activity" action={<div className="flex items-center gap-3"><Badge tone={activitySource === "live" ? "green" : "neutral"}>{activitySource === "live" ? "Live" : "Sample"}</Badge><Link href="/audit" className="text-sm font-semibold text-[#926d2d]">View audit</Link></div>}/><div className="space-y-6 p-5 sm:p-6">{activity.map((item, index) => <div className="flex gap-3" key={`${item.text}-${index}`}><div className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${index === 0 ? "bg-[#c99145]" : index === 1 ? "bg-[#60a285]" : "bg-[#8d9eaa]"}`}/><div><div className="text-sm font-medium">{item.text}</div><div className="mt-1 text-xs text-[#909993]">{item.meta}</div></div></div>)}{!activity.length && <div className="text-sm text-[#849089]">No activity returned.</div>}</div></Panel></div>
    <div className="mt-6 grid gap-5 lg:grid-cols-2"><Panel><PanelTitle title="Review queue" action={<Link href="/review" className="text-sm font-semibold text-[#926d2d]">Open review center</Link>}/><div className="divide-y divide-[#edf0ee]">{demoFindings.slice(0, 3).map(finding => <div key={finding.id} className="flex items-start gap-3 px-5 py-4 sm:px-6"><ShieldCheck size={18} className="mt-0.5 text-[#b28b4b]"/><div className="flex-1"><div className="text-sm font-medium">{finding.title}</div><div className="mt-1 text-xs text-[#8c9690]">{finding.source}</div></div><Badge tone={finding.severity === "High" ? "red" : "amber"}>{finding.severity}</Badge></div>)}</div><div className="border-t px-5 py-3 text-xs text-[#8c867c]">{sources.reviews === "live" ? "Review count uses live conflict and missing information results." : "Review findings are illustrative sample records."}</div></Panel>
      <Panel><PanelTitle title="Case status overview" action={<Badge tone={caseSource === "live" ? "green" : "neutral"}>{caseSource === "live" ? "Live cases" : "Sample cases"}</Badge>}/><div className="p-5 sm:p-6"><div className="mb-4 flex justify-between text-xs text-[#84908a]"><span>{chartTotal} total cases</span><span>Status distribution</span></div><div className="flex h-3 overflow-hidden rounded-full bg-[#edf0ee]"><div style={{ width: chartWidth(chartStats.active) }} className="bg-[#b78a3e]"/><div style={{ width: chartWidth(chartStats.review) }} className="bg-[#d6b36e]"/><div style={{ width: chartWidth(chartStats.closed) }} className="bg-[#9ca8a2]"/></div><div className="mt-4 grid grid-cols-3 gap-2 text-xs"><div>Active <b className="ml-1">{chartStats.active}</b></div><div>In review <b className="ml-1">{chartStats.review}</b></div><div>Closed <b className="ml-1">{chartStats.closed}</b></div></div>{caseSource === "demo" && <div className="mt-5 flex items-start gap-2 rounded-xl bg-[#f5f0e5] p-4 text-xs leading-relaxed text-[#75694f]"><CircleHelp size={16} className="mt-0.5 shrink-0 text-[#a07c3d]"/>Status distribution uses sample counts until case records are available from the API.</div>}</div></Panel></div>
  </>;
}
