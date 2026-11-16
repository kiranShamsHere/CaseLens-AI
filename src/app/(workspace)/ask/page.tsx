"use client";

import { useEffect, useState } from "react";
import { Bot, Check, Copy, Pencil, Send, Sparkles, UserRound, MessageSquareText } from "lucide-react";
import { api, apiCollection } from "@/components/api";
import { demoCases, normalizeCaseRecord, type CaseRecord } from "@/components/demo-data";
import { Badge, Evidence, PageHeading, Panel } from "@/components/ui";

type Citation = { source: string; page?: number; quote: string };
type Answer = { text: string; citations: Citation[]; conflicts: string[] };
type ConversationTurn = { question: string; answer: Answer | null; error: string };
const suggestions = ["When did the client start working?", "What salary is recorded in the file?", "Which documents are still missing?"];

function MessageActions({ copied, disabled, onCopy, onEdit }: { copied: boolean; disabled: boolean; onCopy: () => void; onEdit: () => void }) {
  return <div className="mt-1 flex justify-end gap-1">
    <button type="button" disabled={disabled} onClick={onCopy} aria-label={copied ? "Message copied" : "Copy message"} title={copied ? "Copied" : "Copy message"} className="grid h-7 w-7 place-items-center rounded-md text-[#778592] transition hover:bg-[#e8edf0] hover:text-[#344b5c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 disabled:opacity-40">
      {copied ? <Check size={14}/> : <Copy size={14}/>}
    </button>
    <button type="button" disabled={disabled} onClick={onEdit} aria-label="Edit message" title="Edit message" className="grid h-7 w-7 place-items-center rounded-md text-[#778592] transition hover:bg-[#e8edf0] hover:text-[#344b5c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 disabled:opacity-40">
      <Pencil size={14}/>
    </button>
  </div>;
}

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
  const [history, setHistory] = useState<ConversationTurn[]>([]);
  const [askedQuestion, setAskedQuestion] = useState("");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedQuestion, setCopiedQuestion] = useState("");

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
    if (askedQuestion) setHistory(current => [...current, { question: askedQuestion, answer, error }]);
    setAskedQuestion(value.trim()); setQuestion(""); setLoading(true); setAnswer(null); setError("");
    try {
      const raw = await api<unknown>("/api/ask", { method: "POST", body: JSON.stringify({ caseId, question: value.trim() }) });
      const parsed = normalizeAnswer(raw);
      if (!parsed) throw new Error("The API response did not include an answer in a recognized format.");
      setAnswer(parsed);
    } catch (issue) {
      if (issue instanceof Error) {
        const status = issue.message.match(/Request failed \((\d{3})\)/)?.[1];
        setError(status === "404"
          ? "The Ask AI endpoint is not connected yet. Your question is kept in this conversation, but no answer was generated."
          : status
            ? `The case API returned an error (${status}). No answer was generated.`
            : issue.message);
      } else setError("The case API could not be reached. Your question is kept in this conversation, but no answer was generated.");
    } finally { setLoading(false); }
  };

  const copyQuestion = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedQuestion(value);
      window.setTimeout(() => setCopiedQuestion(current => current === value ? "" : current), 1400);
    } catch {
      setCopiedQuestion("");
    }
  };

  const editQuestion = (value: string, historyIndex?: number) => {
    if (typeof historyIndex === "number") setHistory(current => current.slice(0, historyIndex));
    setAskedQuestion("");
    setAnswer(null);
    setError("");
    setQuestion(value);
    window.requestAnimationFrame(() => document.getElementById("question")?.focus());
  };

  const chooseSuggestion = (value: string) => {
    setQuestion(value);
    window.requestAnimationFrame(() => document.getElementById("question")?.focus());
  };

  return <>
    <PageHeading eyebrow="Evidence-based case research" title="Ask CaseLens" description="Ask about the case file and inspect every cited source before relying on an answer." action={<Badge tone={error ? "amber" : "blue"}>{error ? "API unavailable" : "Live API required"}</Badge>}/>
    <Panel className="flex min-h-[600px] w-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
        <label className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-[#69756f]"><span>Case</span><select value={caseId} onChange={event => { setCaseId(event.target.value); setAnswer(null); setAskedQuestion(""); setHistory([]); setError(""); }} className="app-search min-w-0 max-w-[280px] rounded-lg border py-2 pl-2 pr-6 text-sm font-medium text-[#39453f] outline-none">{caseOptions.map(item => <option key={item.id} value={item.id}>{item.reference} · {item.title}</option>)}</select></label>
        <span className="flex items-center gap-2 text-xs text-[#84918a]"><Sparkles size={15}/> Human review required</span>
      </div>
      <div className="flex-1 space-y-6 p-5 sm:p-8">
        {history.map((turn, index) => <div key={`${turn.question}-${index}`} className="space-y-4 border-b pb-5">
          <div className="flex justify-end">
            <div className="flex max-w-[90%] items-start gap-2 sm:max-w-[80%]">
              <div className="min-w-0"><div className="rounded-xl border border-[#cbd8e0] bg-[#e8eff3] px-4 py-3 text-sm leading-relaxed text-[#263b49]">{turn.question}</div><MessageActions copied={copiedQuestion === turn.question} disabled={loading} onCopy={() => void copyQuestion(turn.question)} onEdit={() => editQuestion(turn.question, index)}/></div>
              <UserRound size={17} className="mt-3 shrink-0 text-[#54748a]"/>
            </div>
          </div>
          {turn.answer && <div className="flex items-start gap-3"><div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#e9ece8] text-[#526b7b]"><Bot size={17}/></div><div className="min-w-0 max-w-[90%] sm:max-w-[85%]"><div className="mb-2 flex items-center gap-2 text-sm font-semibold"><span>Evidence summary</span><Badge tone="amber">Unverified</Badge></div><p className="text-sm leading-6">{turn.answer.text}</p>{turn.answer.citations.map((citation, citationIndex) => <div className="mt-3" key={`${citation.source}-${citationIndex}`}><Evidence source={citation.source} page={citation.page} quote={citation.quote}/></div>)}{!turn.answer.citations.length && <p className="mt-2 text-xs text-[#9a5c49]">No source citations were returned; do not rely on this answer without verification.</p>}</div></div>}
          {turn.error && <div role="alert" className="flex items-start gap-3"><div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#e9ece8] text-[#526b7b]"><Bot size={17}/></div><div className="max-w-[90%] rounded-lg border border-[#d3d9dc] bg-[#f7f7f3] p-4 text-sm text-[#667680] sm:max-w-[85%]">{turn.error} No answer was generated or marked verified.</div></div>}
        </div>)}
        {!askedQuestion && !loading && !history.length && <div className="mx-auto max-w-lg py-12 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-xl bg-[#e9eef1] text-[#526b7b]"><MessageSquareText size={24}/></div><h2 className="mt-5 text-xl font-semibold">Start with a question</h2><p className="mt-2 text-sm leading-relaxed text-[#858f89]">CaseLens searches the selected case records and returns source evidence for your review.</p><p className="mt-6 text-xs font-medium text-[#778592]">Choose a question to add it to your message</p><div className="mt-3 flex flex-wrap justify-center gap-2">{suggestions.map(suggestion => <button type="button" aria-label={`Use question: ${suggestion}`} onClick={() => chooseSuggestion(suggestion)} key={suggestion} className="cursor-pointer rounded-lg border border-[#cbd8e0] bg-[#e8eff3] px-4 py-2.5 text-sm font-medium text-[#344b5c] shadow-sm transition duration-150 hover:-translate-y-0.5 hover:border-[#91a8b6] hover:bg-[#dbe6ec] hover:shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#54748a] active:translate-y-0">{suggestion}<span aria-hidden="true" className="ml-2 text-[#54748a]">↗</span></button>)}</div></div>}
        {askedQuestion && <div className="flex justify-end"><div className="flex max-w-[90%] items-start gap-2 sm:max-w-[80%]"><div className="min-w-0"><div className="rounded-xl border border-[#cbd8e0] bg-[#e8eff3] px-4 py-3 text-sm leading-relaxed text-[#263b49]">{askedQuestion}</div><MessageActions copied={copiedQuestion === askedQuestion} disabled={loading} onCopy={() => void copyQuestion(askedQuestion)} onEdit={() => editQuestion(askedQuestion)}/></div><UserRound size={17} className="mt-3 shrink-0 text-[#54748a]"/></div></div>}
        {loading && <div role="status" className="flex items-center gap-3 text-sm text-[#7d8982]"><div className="grid h-8 w-8 place-items-center rounded-lg bg-[#e9ece8] text-[#526b7b]"><Bot size={17}/></div><span className="animate-pulse">Searching case evidence…</span></div>}
        {error && <div role="alert" className="flex items-start gap-3"><div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#e9ece8] text-[#526b7b]"><Bot size={17}/></div><div className="max-w-[90%] rounded-lg border border-[#d3d9dc] bg-[#f7f7f3] p-4 text-sm leading-relaxed text-[#667680] sm:max-w-[85%]"><div className="mb-1 font-semibold text-[#344b5c]">I couldn’t retrieve an answer</div><p>{error}</p><div className="mt-2 text-xs">No answer was generated or marked verified.</div></div></div>}
        {answer && <div className="flex items-start gap-3"><div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#e9ece8] text-[#526b7b]"><Bot size={17}/></div><div className="min-w-0 max-w-[90%] sm:max-w-[85%]"><div className="mb-3 flex flex-wrap items-center gap-2"><span className="text-base font-semibold">Evidence summary</span><Badge tone="amber">Unverified · review sources</Badge></div><p className="text-sm leading-7 text-[#58645e]">{answer.text}</p>{answer.citations.length > 0 ? <div className="mt-4 space-y-3">{answer.citations.map((citation, index) => <Evidence key={`${citation.source}-${index}`} source={citation.source} page={citation.page} quote={citation.quote}/>)}</div> : <div className="mt-4 rounded-xl border border-[#ead4c9] bg-[#fbf1ed] p-4 text-sm leading-relaxed text-[#8d5747]">No source citations were returned. Do not rely on this answer until evidence is located and verified.</div>}{answer.conflicts.map((conflict, index) => <div key={index} className="mt-3 rounded-xl border border-[#ebdfc8] bg-[#faf4e8] p-4 text-sm leading-relaxed text-[#816538]">Conflict requires review: {conflict}</div>)}<div className="mt-3 text-xs text-[#8c948f]">Live API response · verify each citation against the original document.</div></div></div>}
      </div>
      <form onSubmit={event => { event.preventDefault(); void submit(); }} className="border-t p-4 sm:p-5"><label className="sr-only" htmlFor="question">Ask a question</label><div className="flex items-end gap-2 rounded-xl border bg-[#f7f8f6] p-2"><textarea id="question" rows={2} value={question} onChange={event => setQuestion(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void submit(); } }} placeholder="Ask about a fact, date, document…" className="min-h-[48px] max-h-28 flex-1 resize-y bg-transparent px-3 py-2 text-sm outline-none"/><button aria-label="Send question" type="submit" disabled={loading || !question.trim()} className="grid h-10 w-10 place-items-center rounded-lg bg-[#344b5c] text-white transition hover:bg-[#263b49] disabled:opacity-50"><Send size={16}/></button></div><div className="mt-2 text-[11px] text-[#9aa39f]">Enter to send · Shift + Enter for a new line</div></form>
    </Panel>
  </>;
}
