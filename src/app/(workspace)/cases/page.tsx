"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search, BriefcaseBusiness } from "lucide-react";
import { api, apiCollection } from "@/components/api";
import { demoCases, normalizeCaseRecord, type CaseRecord } from "@/components/demo-data";
import { Badge, Button, PageHeading, Panel } from "@/components/ui";

type DataSource = "demo" | "live" | "unavailable";

export default function Cases() {
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState(false);
  const [items, setItems] = useState(demoCases);
  const [source, setSource] = useState<DataSource>("demo");
  const [title, setTitle] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    void apiCollection<unknown>("/api/cases", "cases").then(result => {
      if (!active) return;
      if (result === null) { setSource("unavailable"); return; }
      setItems(result.map(normalizeCaseRecord).filter((item): item is CaseRecord => item !== null));
      setSource("live");
    });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => items.filter(item => `${item.title} ${item.reference} ${item.type}`.toLowerCase().includes(query.toLowerCase())), [items, query]);

  const createCase = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const newTitle = title.trim();
    if (!newTitle || saving) return;
    setSaving(true);
    try {
      await api<unknown>("/api/cases", { method: "POST", body: JSON.stringify({ title: newTitle }) });
      const refreshed = await apiCollection<unknown>("/api/cases", "cases");
      if (refreshed !== null) {
        setItems(refreshed.map(normalizeCaseRecord).filter((item): item is CaseRecord => item !== null));
        setSource("live");
      }
      setNotice("The case request was accepted by the case API.");
    } catch {
      setItems(current => [{ id: `draft-${Date.now()}`, title: newTitle, reference: "Draft · local only", type: "Unclassified", status: "Draft", updated: "Just now", documents: 0 }, ...current]);
      setNotice("The API could not save this case. A local draft was created and is not on the server.");
      if (source !== "live") setSource("demo");
    } finally {
      setSaving(false); setTitle(""); setModal(false);
    }
  };

  return <>
    <PageHeading eyebrow="Case management" title="Cases" description="Organize client matters and see the documents attached to each case." action={<Button onClick={() => setModal(true)}><Plus size={17}/> New case</Button>}/>
    {notice && <div role="status" className="mb-4 rounded-xl border border-[#e4d5b5] bg-[#f7f0e2] p-4 text-sm text-[#725c31]">{notice}</div>}
    <div className="mb-5 flex flex-col gap-3 sm:flex-row"><div className="relative max-w-lg flex-1"><Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9aa39f]"/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search by case, reference or type" className="app-search h-12 w-full rounded-xl border px-11 pr-3 text-sm outline-none focus:border-[#b78a3e]"/></div><Badge tone={source === "live" ? "green" : source === "unavailable" ? "amber" : "blue"}>{source === "live" ? "Live case records" : source === "unavailable" ? "API unavailable · showing samples" : "Sample records"}</Badge></div>
    <Panel><div className="case-list-header gap-4 border-b px-6 py-4 text-[11px] font-semibold uppercase tracking-[.12em] text-[#969f9a]"><span>Case</span><span>Case type</span><span>Status</span><span>Updated</span><span>Files</span></div>{filtered.length ? filtered.map(item => <Link href={`/cases/${item.id}`} key={item.id} className="case-list-row min-w-0 gap-3 border-b px-5 py-4 last:border-0 sm:gap-4 sm:px-6"><div className="flex min-w-0 items-center gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#f2ead9] text-[#a47b33]"><BriefcaseBusiness size={19}/></div><div className="min-w-0"><div className="truncate text-sm font-semibold">{item.title}</div><div className="mt-1 text-xs text-[#8b9690]">{item.reference}</div></div></div><div className="case-list-type text-sm text-[#65716b]">{item.type}</div><div><Badge tone={item.status.toLowerCase() === "active" || item.status.toLowerCase() === "open" ? "green" : item.status.toLowerCase().includes("review") ? "amber" : "neutral"}>{item.status}</Badge></div><div className="case-list-wide text-xs text-[#7c8781]">{item.updated}</div><div className="case-list-wide text-xs text-[#68746e]">{item.documents} files</div></Link>) : <div className="p-12 text-center text-sm text-[#87918b]">{items.length ? `No cases match “${query}”.` : "No cases found."}</div>}</Panel>
    {modal && <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-sm"><form onSubmit={createCase} className="w-full max-w-md rounded-2xl border border-[#e6e0d5] bg-white p-6 shadow-2xl sm:p-7"><h2 className="text-xl font-semibold">Create a case</h2><p className="mt-2 text-sm text-[#839089]">We’ll save this to the case API when it is available.</p><label className="mt-6 block text-sm font-medium">Case title<input required autoFocus value={title} onChange={event => setTitle(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-[#e1e8e4] px-3 text-sm outline-none focus:border-[#b78a3e]" placeholder="Client name or matter"/></label><div className="mt-7 flex justify-end gap-2"><Button secondary onClick={() => setModal(false)}>Cancel</Button><Button type="submit">{saving ? "Saving…" : "Create case"}</Button></div></form></div>}
  </>;
}
