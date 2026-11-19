"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bot, Check, Copy, Pencil, Send, Sparkles, UserRound, MessageSquareText } from "lucide-react";
import { api, apiCollection } from "@/components/api";
import { normalizeCaseRecord, type CaseRecord } from "@/components/demo-data";
import { Badge, Evidence, PageHeading, Panel } from "@/components/ui";
import type { AskClaim, AskResponse, EvidenceCitation } from "@/lib/contracts";

type Answer = AskResponse;
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
  const summary = item.summary;
  const status = item.status;
  const mode = item.mode;
  if (typeof summary !== "string" || status !== "needs_human_review" || (mode !== "ai_evidence" && mode !== "retrieval_only" && mode !== "case_metadata" && mode !== "product_knowledge" && mode !== "domain_redirect")) return null;

  const citations = (Array.isArray(item.citations) ? item.citations : []).flatMap((entry): EvidenceCitation[] => {
    if (!entry || typeof entry !== "object") return [];
    const citation = entry as Record<string, unknown>;
    if (typeof citation.source !== "string" || typeof citation.quote !== "string") return [];
    return [{
      source: citation.source,
      quote: citation.quote,
      ...(typeof citation.documentId === "string" ? { documentId: citation.documentId } : {}),
      ...(typeof citation.page === "number" ? { page: citation.page } : {}),
      ...(typeof citation.explanation === "string" ? { explanation: citation.explanation } : {}),
    }];
  });
  const toStrings = (input: unknown) => Array.isArray(input)
    ? input.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
    : [];
  const toClaims = (input: unknown): AskClaim[] => Array.isArray(input) ? input.flatMap((entry): AskClaim[] => {
    if (!entry || typeof entry !== "object") return [];
    const claim = entry as Record<string, unknown>;
    if (typeof claim.text !== "string" || !Array.isArray(claim.citations)) return [];
    const claimCitations = claim.citations.flatMap((citation): EvidenceCitation[] => {
      if (!citation || typeof citation !== "object") return [];
      const source = citation as Record<string, unknown>;
      if (typeof source.source !== "string" || typeof source.quote !== "string") return [];
      return [{ source: source.source, quote: source.quote, ...(typeof source.documentId === "string" ? { documentId: source.documentId } : {}), ...(typeof source.page === "number" ? { page: source.page } : {}), ...(typeof source.explanation === "string" ? { explanation: source.explanation } : {}) }];
    });
    return claimCitations.length ? [{ text: claim.text, citations: claimCitations }] : [];
  }) : [];
  return { summary, status, mode, citations, claims: toClaims(item.claims), issueClaims: toClaims(item.issueClaims), potentialIssues: toStrings(item.potentialIssues), nextSteps: toStrings(item.nextSteps), conflicts: toStrings(item.conflicts) };
}

function AssistantAnswer({ answer }: { answer: Answer }) {
  const issues = [...(answer.issueClaims?.length ? [] : answer.potentialIssues), ...answer.conflicts.map((conflict) => `Conflict requires review: ${conflict}`)];
  return <div className="min-w-0 max-w-[90%] sm:max-w-[85%]">
    <div className="mb-3 flex flex-wrap items-center gap-2"><span className="text-base font-semibold">CaseLens AI</span><Badge tone="amber">{answer.mode === "retrieval_only" ? "Retrieval only" : answer.mode === "case_metadata" ? "Case record" : answer.mode === "product_knowledge" ? "Product guidance" : answer.mode === "domain_redirect" ? "Outside CaseLens scope" : "Unverified · human review required"}</Badge></div>
    <section><h3 className="text-[11px] font-semibold uppercase tracking-[.14em] text-[#74736D]">Summary</h3><p className="mt-1 whitespace-pre-wrap text-sm leading-7 text-[#4b565f]">{answer.summary}</p></section>
    {answer.claims && answer.claims.length > 1 && <section className="mt-4"><h3 className="text-[11px] font-semibold uppercase tracking-[.14em] text-[#74736D]">Key Findings</h3><ul className="mt-2 list-disc space-y-2 pl-4 text-sm leading-7 text-[#4b565f]">{answer.claims.map((claim, index) => <li key={index}>{claim.text}</li>)}</ul></section>}
    {answer.mode === "ai_evidence" && answer.citations.length === 0 && <p role="alert" className="mt-3 rounded-lg border border-[#ead4c9] bg-[#fbf1ed] p-3 text-sm text-[#8d5747]">No validated source citations were returned. Treat this summary as unverified until supporting evidence is reviewed.</p>}
    {answer.mode === "product_knowledge" && <p className="mt-3 rounded-lg border border-[#e7e0d5] bg-[#F1ECE1] p-3 text-xs text-[#74736D]">Product guidance only. This information is separate from evidence in the selected legal case.</p>}
    {answer.mode === "domain_redirect" && <p className="mt-3 text-xs text-[#74736D]">CaseLens AI supports CaseLens workflows and analysis of the selected legal case.</p>}
    {answer.citations.length > 0 && <section className="mt-4"><h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[.14em] text-[#74736D]">Supporting Evidence</h3><div className="space-y-3">{answer.citations.map((citation, index) => <div key={`${citation.documentId ?? citation.source}-${citation.page ?? ""}-${index}`}><Evidence source={citation.source} page={citation.page} quote={citation.quote}/>{citation.explanation && <p className="mt-1.5 text-xs leading-relaxed text-[#74736D]">{citation.explanation}</p>}</div>)}</div></section>}
    {answer.issueClaims?.length ? <section className="mt-4 rounded-lg border border-[#e7e0d5] bg-[#faf4e8] p-4"><h3 className="text-[11px] font-semibold uppercase tracking-[.14em] text-[#803E4B]">Potential Issues</h3><ul className="mt-3 list-disc space-y-2 pl-4 text-sm leading-relaxed text-[#5f5143]">{answer.issueClaims.map((issue, index) => <li key={index}>{issue.text}</li>)}</ul></section> : null}
    {issues.length > 0 && <section className="mt-4 rounded-lg border border-[#e7e0d5] bg-[#faf4e8] p-4"><h3 className="text-[11px] font-semibold uppercase tracking-[.14em] text-[#803E4B]">Potential Issues</h3><ul className="mt-2 list-disc space-y-1 pl-4 text-sm leading-relaxed text-[#5f5143]">{issues.map((issue, index) => <li key={index}>{issue}</li>)}</ul></section>}
    {answer.nextSteps.length > 0 && <section className="mt-4 rounded-lg border border-[#e7e0d5] bg-[#F1ECE1] p-4"><h3 className="text-[11px] font-semibold uppercase tracking-[.14em] text-[#172B3A]">Recommended Next Steps</h3><ul className="mt-2 list-disc space-y-1 pl-4 text-sm leading-relaxed text-[#4b565f]">{answer.nextSteps.map((step, index) => <li key={index}>{step}</li>)}</ul></section>}
    <p className="mt-3 text-xs text-[#74736D]">{answer.mode === "retrieval_only" ? answer.claims?.length ? "Direct extractive match from retrieved passages; no AI-generated interpretation was used. Verify the cited source text before relying on it." : "No AI-generated interpretation was produced, and no unambiguous extractive answer was found. Review the source documents or refine the question." : answer.mode === "case_metadata" ? "Record-based response from the selected case. Verify the recorded details before relying on them." : answer.mode === "product_knowledge" ? "Product guidance only; it is not evidence about the selected case." : answer.mode === "domain_redirect" ? "No case analysis was performed for this request." : "CaseLens AI evidence-based response. Verify the cited sources before relying on it."}</p>
  </div>;
}

export default function Ask() {
  const [caseOptions, setCaseOptions] = useState<CaseRecord[]>([]);
  const [caseId, setCaseId] = useState("");
  const [casesState, setCasesState] = useState<"loading" | "ready" | "unavailable">("loading");
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
      if (!active) return;
      if (result === null) { setCasesState("unavailable"); return; }
      const live = result.map(normalizeCaseRecord).filter((item): item is CaseRecord => item !== null);
      setCaseOptions(live); setCaseId(live[0]?.id ?? ""); setCasesState("ready");
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
          ? "The Ask CaseLens endpoint is not connected yet. Your question is kept in this conversation, but no answer was generated."
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
    <PageHeading eyebrow="Evidence-based case research" title="Ask CaseLens" description="Ask about the case file and inspect every cited source before relying on an answer." action={<Badge tone={error ? "amber" : "blue"}>{error ? "Service unavailable" : "Human review required"}</Badge>}/>
    <Panel className="flex min-h-[600px] w-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
        <label className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-[#69756f]"><span>Case</span><select value={caseId} onChange={event => { setCaseId(event.target.value); setAnswer(null); setAskedQuestion(""); setHistory([]); setError(""); }} className="app-search min-w-0 max-w-[280px] rounded-lg border py-2 pl-2 pr-6 text-sm font-medium text-[#39453f] outline-none"><option value="">Select a case…</option>{caseOptions.map(item => <option key={item.id} value={item.id}>{item.reference} · {item.title}</option>)}</select></label>
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
          {turn.answer && <div className="flex items-start gap-3"><div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#e9ece8] text-[#526b7b]"><Bot size={17}/></div><AssistantAnswer answer={turn.answer}/></div>}
          {turn.error && <div role="alert" className="flex items-start gap-3"><div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#e9ece8] text-[#526b7b]"><Bot size={17}/></div><div className="max-w-[90%] rounded-lg border border-[#d3d9dc] bg-[#f7f7f3] p-4 text-sm text-[#667680] sm:max-w-[85%]">{turn.error} No answer was generated or marked verified.</div></div>}
        </div>)}
        {!askedQuestion && !loading && !history.length && !caseId && <div className="mx-auto max-w-lg py-12 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-xl bg-[#e9eef1] text-[#526b7b]"><MessageSquareText size={24}/></div><h2 className="mt-5 text-xl font-semibold">{casesState === "loading" ? "Loading your cases…" : casesState === "unavailable" ? "Cases aren’t available" : "Create a case to get started"}</h2><p className="mt-2 text-sm leading-relaxed text-[#858f89]">{casesState === "ready" && !caseOptions.length ? "Ask CaseLens about a case after you create one and add its source records." : casesState === "unavailable" ? "Your case list could not be loaded. Check your connection and try again." : "CaseLens searches the selected case records and returns source evidence for your review."}</p>{casesState === "ready" && !caseOptions.length && <Link href="/cases" className="mt-5 inline-flex min-h-11 items-center border px-4 text-sm font-semibold">Create your first case</Link>}</div>}
        {!askedQuestion && !loading && !history.length && caseId && <div className="mx-auto max-w-lg py-12 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-xl bg-[#e9eef1] text-[#526b7b]"><MessageSquareText size={24}/></div><h2 className="mt-5 text-xl font-semibold">Start with a question</h2><p className="mt-2 text-sm leading-relaxed text-[#858f89]">CaseLens searches the selected case records and returns source evidence for your review.</p><p className="mt-6 text-xs font-medium text-[#778592]">Choose a question to add it to your message</p><div className="mt-3 flex flex-wrap justify-center gap-2">{suggestions.map(suggestion => <button type="button" aria-label={`Use question: ${suggestion}`} onClick={() => chooseSuggestion(suggestion)} key={suggestion} className="cursor-pointer rounded-lg border border-[#cbd8e0] bg-[#e8eff3] px-4 py-2.5 text-sm font-medium text-[#344b5c] shadow-sm transition duration-150 hover:-translate-y-0.5 hover:border-[#91a8b6] hover:bg-[#dbe6ec] hover:shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#54748a] active:translate-y-0">{suggestion}<span aria-hidden="true" className="ml-2 text-[#54748a]">↗</span></button>)}</div></div>}
        {askedQuestion && <div className="flex justify-end"><div className="flex max-w-[90%] items-start gap-2 sm:max-w-[80%]"><div className="min-w-0"><div className="rounded-xl border border-[#cbd8e0] bg-[#e8eff3] px-4 py-3 text-sm leading-relaxed text-[#263b49]">{askedQuestion}</div><MessageActions copied={copiedQuestion === askedQuestion} disabled={loading} onCopy={() => void copyQuestion(askedQuestion)} onEdit={() => editQuestion(askedQuestion)}/></div><UserRound size={17} className="mt-3 shrink-0 text-[#54748a]"/></div></div>}
        {loading && <div role="status" className="flex items-center gap-3 text-sm text-[#7d8982]"><div className="grid h-8 w-8 place-items-center rounded-lg bg-[#e9ece8] text-[#526b7b]"><Bot size={17}/></div><span className="animate-pulse">Searching case evidence…</span></div>}
        {error && <div role="alert" className="flex items-start gap-3"><div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#e9ece8] text-[#526b7b]"><Bot size={17}/></div><div className="max-w-[90%] rounded-lg border border-[#d3d9dc] bg-[#f7f7f3] p-4 text-sm leading-relaxed text-[#667680] sm:max-w-[85%]"><div className="mb-1 font-semibold text-[#344b5c]">I couldn’t retrieve an answer</div><p>{error}</p><div className="mt-2 text-xs">No answer was generated or marked verified.</div></div></div>}
        {answer && <div className="flex items-start gap-3"><div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#e9ece8] text-[#526b7b]"><Bot size={17}/></div><AssistantAnswer answer={answer}/></div>}
      </div>
      <form onSubmit={event => { event.preventDefault(); void submit(); }} className="border-t p-4 sm:p-5"><label className="sr-only" htmlFor="question">Ask a question</label><div className="flex items-end gap-2 rounded-xl border bg-[#f7f8f6] p-2"><textarea id="question" rows={2} value={question} onChange={event => setQuestion(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void submit(); } }} placeholder="Ask about a fact, date, document…" className="min-h-[48px] max-h-28 flex-1 resize-y bg-transparent px-3 py-2 text-sm outline-none"/><button aria-label="Send question" type="submit" disabled={loading || !caseId || !question.trim()} className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--burgundy)] text-white transition hover:bg-[#6d3340] disabled:opacity-50"><Send size={16}/></button></div><div className="mt-2 text-[11px] text-[#9aa39f]">{caseId ? "Enter to send · Shift + Enter for a new line" : "Create a case before asking a question."}</div></form>
    </Panel>
  </>;
}
