"use client";

import { useEffect, useState } from "react";
import { Bot, UserRound, Send, Sparkles, ChevronDown, MessageSquareText } from "lucide-react";
import { api, apiCollection } from "@/components/api";
import { demoCases, normalizeCaseRecord, type CaseRecord } from "@/components/demo-data";
import { Badge, Evidence, PageHeading, Panel } from "@/components/ui";

type Citation = { source: string; page?: number; quote: string };
type Answer = { text: string; citations: Citation[]; conflicts: string[] };
const suggestions = ["When did the client start working?", "What salary is recorded in the file?", "Which documents are still missing?"];

function normalizeAnswer(value: unknown): Answer | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const text = item.answer ?? item.response ?? item.text;
  if (typeof text !== "string") return null;
  const rawCitations = Array.isArray(item.citations) ? item.citations : Array.isArray(item.evidence) ? item.evidence : Array.isArray(item.sources) ? item.sources : [];
  const citations = rawCitations.flatMap((entry): Citation[] => {
    if (!entry || typeof entry !== "object") return [];
    const citation = entry as Record<string, unknown>;
    const source = citation.source ?? citation.filename ?? citation.documentName;
    const quote = citation.quote ?? citation.excerpt ?? citation.text;
    if (typeof source !== "string" || typeof quote !== "string") return [];
    return [{ source, quote, page: typeof citation.page === "number" ? citation.page : undefined }];
  });
  const rawConflicts = Array.isArray(item.conflicts) ? item.conflicts : [];
  const conflicts = rawConflicts.map(conflict => typeof conflict === "string" ? conflict : conflict && typeof conflict === "object" ? String((conflict as Record<string, unknown>).title ?? (conflict as Record<string, unknown>).description ?? "Conflict requires review") : "");
  return { text, citations, conflicts: conflicts.filter(Boolean) };
}

export default function Ask() {
  const [caseOptions, setCaseOptions] = useState(demoCases);
  const [caseId, setCaseId] = useState(demoCases[0].id);
  const [question, setQuestion] = useState("");
  const [askedQuestion, setAskedQuestion] = useState("");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void apiCollection<unknown>("/api/cases", "cases").then(result => {
      if (!active || result === null) return;
      const live = result.map(normalizeCaseRecord).filter((item): item is CaseRecord => item !== null);
      if (active) { setCaseOptions(live); if (live.length) setCaseId(live[0].id); }
    });
    return () => { active = false; };
  }, []);

  const submit = async (value = question) => {
    if (!value.trim() || loading || !caseId) return;
    setAskedQuestion(value.trim()); setQuestion(value.trim()); setLoading(true); setAnswer(null); setError("");
    try {
      const raw = await api<unknown>("/api/ask", { method: "POST", body: JSON.stringify({ caseId, question: value.trim() }) });
      const parsed = normalizeAnswer(raw);
      if (!parsed) throw new Error("The API response did not include an answer in a recognized format.");
      setAnswer(parsed);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "The case API could not be reached.");
    } finally { setLoading(false); }
  };

  return <><PageHeading eyebrow="Evidence-based case research" title="Ask CaseLens" description="Ask about the case file and inspect every cited source before relying on an answer." action={<Badge tone="blue">Live API required</Badge>}/><Panel className="mx-auto flex min-h-[600px] max-w-4xl flex-col"><div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4"><label className="flex items-center gap-2 text-sm text-[#69756f]"><span>Case</span><select value={caseId} onChange={event => { setCaseId(event.target.value); setAnswer(null); setAskedQuestion(""); setError(""); }} className="app-search max-w-[280px] rounded-lg border py-2 pl-2 pr-6 text-sm font-medium text-[#39453f] outline-none">{caseOptions.map(item => <option key={item.id} value={item.id}>{item.reference} · {item.title}</option>)}</select><ChevronDown size={15}/></label><span className="flex items-center gap-2 text-xs text-[#84918a]"><Sparkles size={15}/> Human review required</span></div><div className="flex-1 space-y-6 p-5 sm:p-8">{!askedQuestion && !loading && <div className="mx-auto max-w-lg py-12 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#f2ead9] text-[#a47b33] shadow-sm"><MessageSquareText size={24}/></div><h2 className="mt-5 text-xl font-semibold">Start with a question</h2><p className="mt-2 text-sm leading-relaxed text-[#858f89]">CaseLens searches the selected case records and returns source evidence for your review.</p><div className="mt-7 flex flex-wrap justify-center gap-2">{suggestions.map(suggestion => <button onClick={() => void submit(suggestion)} key={suggestion} className="rounded-full border border-[#e4eae6] bg-white px-4 py-2.5 text-xs text-[#58665f] transition hover:-translate-y-0.5 hover:bg-[#f4f0e6]">{suggestion}</button>)}</div></div>}{askedQuestion && <div className="ml-auto flex max-w-[85%] items-start gap-3"><div className="rounded-2xl bg-[#f0e8d7] p-4 text-sm leading-relaxed">{askedQuestion}</div><UserRound size={18} className="mt-2 shrink-0 text-[#927039]"/></div>}{loading && <div role="status" className="flex items-center gap-3 text-sm text-[#7d8982]"><Bot size={19} className="gold-text"/><span className="animate-pulse">Searching case evidence…</span></div>}{error && <div role="alert" className="rounded-xl border border-[#ead4c9] bg-[#fbf1ed] p-4 text-sm leading-relaxed text-[#8d5747]">{error}<div className="mt-1 text-xs">No answer has been generated or marked verified.</div></div>}{answer && <div className="flex items-start gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#29251d] text-[#e2c47e]"><Bot size={18}/></div><div className="min-w-0 flex-1"><div className="mb-3 flex flex-wrap items-center gap-2"><span className="text-base font-semibold">Evidence summary</span><Badge tone="amber">Unverified · review sources</Badge></div><p className="text-sm leading-7 text-[#58645e]">{answer.text}</p>{answer.citations.length > 0 ? <div className="mt-4 space-y-3">{answer.citations.map((citation, index) => <Evidence key={`${citation.source}-${index}`} source={citation.source} page={citation.page} quote={citation.quote}/>)}</div> : <div className="mt-4 rounded-xl border border-[#ead4c9] bg-[#fbf1ed] p-4 text-sm leading-relaxed text-[#8d5747]">No source citations were returned. Do not rely on this answer until evidence is located and verified.</div>}{answer.conflicts.map((conflict, index) => <div key={index} className="mt-3 rounded-xl border border-[#ebdfc8] bg-[#faf4e8] p-4 text-sm leading-relaxed text-[#816538]">Conflict requires review: {conflict}</div>)}<div className="mt-3 text-xs text-[#8c948f]">Live API response · verify each citation against the original document.</div></div></div>}</div><form onSubmit={event => { event.preventDefault(); void submit(); }} className="border-t p-4 sm:p-5"><label className="sr-only" htmlFor="question">Ask a question</label><div className="flex items-end gap-2 rounded-2xl border bg-[#fafbfa] p-2"><textarea id="question" rows={2} value={question} onChange={event => setQuestion(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void submit(); } }} placeholder="Ask about a fact, date, document…" className="min-h-[48px] max-h-28 flex-1 resize-y bg-transparent px-3 py-2 text-sm outline-none"/><button aria-label="Send question" type="submit" disabled={loading} className="grid h-11 w-11 place-items-center rounded-xl bg-[#26221b] text-white transition hover:bg-[#463a22] disabled:opacity-50"><Send size={17}/></button></div><div className="mt-2 text-[11px] text-[#9aa39f]">Enter to send · Shift + Enter for a new line</div></form></Panel></>;
}
