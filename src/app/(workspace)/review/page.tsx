"use client";

import { useEffect, useState } from "react";
import { Check, X, Clock3, ShieldCheck } from "lucide-react";
import { api, apiCollection } from "@/components/api";
import { demoFindings, type Finding } from "@/components/demo-data";
import { Badge, Button, Evidence, PageHeading, Panel, PanelTitle } from "@/components/ui";
import { enqueueReviewAction, flushPendingReviewActions, readPendingReviewActions, subscribeReviewQueue, type PendingReviewAction } from "@/components/offline";

type EvidenceSource = { source: string; page?: number; quote: string };
type ReviewFinding = Finding & { evidence: EvidenceSource[] };
const sampleFindings: ReviewFinding[] = demoFindings.map(finding => ({ ...finding, evidence: [{ source: finding.source, page: finding.page || undefined, quote: finding.quote }] }));

function normalizeFinding(value: unknown, index: number): ReviewFinding | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const title = item.title ?? item.name ?? item.field;
  if (typeof title !== "string") return null;
  const rawEvidence = Array.isArray(item.evidence) ? item.evidence : Array.isArray(item.citations) ? item.citations : [];
  const evidence = rawEvidence.flatMap((entry): EvidenceSource[] => {
    if (!entry || typeof entry !== "object") return [];
    const citation = entry as Record<string, unknown>;
    const source = citation.source ?? citation.filename ?? citation.documentName;
    const quote = citation.quote ?? citation.excerpt ?? citation.text;
    return typeof source === "string" && typeof quote === "string" ? [{ source, quote, page: typeof citation.page === "number" ? citation.page : undefined }] : [];
  });
  return { id: String(item.id ?? index), title, description: String(item.description ?? item.explanation ?? "Review this finding against its case source."), source: String(item.source ?? item.documentName ?? "Source details unavailable"), page: Number(item.page ?? 0), quote: String(item.quote ?? item.excerpt ?? "Open the original source to verify this finding."), severity: String(item.severity ?? "Review"), status: String(item.status ?? "Pending"), evidence };
}

export default function Review() {
  const [items, setItems] = useState<ReviewFinding[]>(sampleFindings);
  const [source, setSource] = useState("Sample findings");
  const [choice, setChoice] = useState<{ finding: ReviewFinding; action: string } | null>(null);
  const [notes, setNotes] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [queued, setQueued] = useState<PendingReviewAction[]>([]);

  useEffect(() => {
    let active = true;
    void Promise.all([apiCollection<unknown>("/api/conflicts", "conflicts"), apiCollection<unknown>("/api/missing", "missing")]).then(([conflicts, missing]) => {
      if (!active || (conflicts === null && missing === null)) return;
      const live = [...(conflicts ?? []), ...(missing ?? [])].map(normalizeFinding).filter((item): item is ReviewFinding => item !== null);
      setItems(live); setSource("Live API findings");
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const refresh = () => setQueued(readPendingReviewActions());
    refresh();
    const unsubscribe = subscribeReviewQueue(refresh);
    const reconnect = () => {
      void flushPendingReviewActions().then(synced => {
        if (!synced.length) return;
        setItems(current => current.map(finding => {
          const action = synced.find(item => item.findingId === finding.id);
          if (!action) return finding;
          return { ...finding, status: action.decision === "approve" ? "Approved" : action.decision === "reject" ? "Rejected" : "Needs review" };
        }));
        setNotice(`${synced.length} queued review decision${synced.length === 1 ? " was" : "s were"} accepted by the API.`);
      });
    };
    if (navigator.onLine) reconnect();
    window.addEventListener("online", reconnect);
    return () => { unsubscribe(); window.removeEventListener("online", reconnect); };
  }, []);

  const act = async (id: string, action: string) => {
    if (busy) return;
    setBusy(true); setNotice("");
    try {
      await api<unknown>("/api/review", { method: "POST", body: JSON.stringify({ findingId: id, decision: action.toLowerCase().replaceAll(" ", "_"), notes }) });
      setItems(current => current.map(finding => finding.id === id ? { ...finding, status: action === "Needs review" ? "Needs review" : action === "Approve" ? "Approved" : "Rejected" } : finding));
      setNotice("The review decision was accepted by the case API."); setChoice(null); setNotes("");
    } catch (issue) {
      if ((!navigator.onLine || issue instanceof TypeError) && enqueueReviewAction({ findingId: id, decision: action.toLowerCase().replaceAll(" ", "_"), notes })) {
        setNotice("Connection lost. This review decision is queued on this device and has not been sent to the server yet.");
        setChoice(null); setNotes(""); setQueued(readPendingReviewActions());
      } else {
        setNotice("The API could not confirm this decision. It remains pending and was not reported as saved.");
      }
    } finally { setBusy(false); }
  };

  return <><PageHeading eyebrow="Human verification" title="Review center" description="Verify source evidence before approving high impact findings." action={<Badge tone={source.startsWith("Live") ? "green" : "amber"}>{source}</Badge>}/>{notice && <div role="status" className="mb-4 rounded-xl border border-[#e4d5b5] bg-[#f7f0e2] p-4 text-sm text-[#725c31]">{notice}</div>}<div className="space-y-5">{items.map(finding => { const queuedAction = queued.find(item => item.findingId === finding.id); return <Panel key={finding.id}><PanelTitle title={finding.title} action={queuedAction ? <Badge tone="amber">Queued · not synced</Badge> : <Badge tone={finding.status === "Pending" ? "amber" : finding.status === "Approved" ? "green" : "neutral"}>{finding.status}</Badge>}/><div className="p-5 sm:p-6"><div className="mb-4 flex items-start gap-3"><ShieldCheck size={18} className="mt-0.5 text-[#a47b33]"/><div><p className="text-sm leading-relaxed text-[#647069]">{finding.description}</p><div className="mt-1 text-xs text-[#919b95]">Finding {finding.id} · {finding.severity} priority</div></div></div>{finding.evidence.length ? <div className="space-y-3">{finding.evidence.map((evidence, index) => <Evidence key={`${evidence.source}-${index}`} source={evidence.source} page={evidence.page} quote={evidence.quote}/>)}</div> : <div className="rounded-xl border border-[#ead4c9] bg-[#fbf1ed] p-4 text-sm text-[#8d5747]">No supporting source was returned. Do not approve until evidence is reviewed.</div>}<div className="mt-4 rounded-xl bg-[#f7f5ef] p-4"><div className="text-xs font-semibold text-[#66736c]">AI explanation</div><p className="mt-1 text-sm leading-relaxed text-[#859089]">{finding.description} Review the cited passages and verify with the client before relying on this finding.</p></div>{finding.status === "Pending" && !queuedAction && <div className="mt-4 flex flex-wrap gap-2"><Button onClick={() => setChoice({ finding, action: "Approve" })}><Check size={16}/> Approve</Button><Button secondary onClick={() => setChoice({ finding, action: "Reject" })}><X size={16}/> Reject</Button><Button secondary onClick={() => setChoice({ finding, action: "Needs review" })}><Clock3 size={16}/> Needs review</Button></div>}</div></Panel>; })}{!items.length && <Panel className="p-10 text-center text-sm text-[#849089]">No findings currently need human review.</Panel>}</div>{choice && <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-2xl"><h2 className="text-xl font-semibold">Confirm {choice.action.toLowerCase()}</h2><p className="mt-2 text-sm leading-relaxed text-[#78837d]">{choice.action} “{choice.finding.title}”? We’ll wait for the API to confirm before marking this decision saved.</p><label className="mt-4 block text-sm font-medium">Reviewer note <span className="font-normal text-[#929b96]">(optional)</span><textarea value={notes} onChange={event => setNotes(event.target.value)} rows={3} className="app-search mt-2 w-full rounded-xl border p-3 text-sm outline-none focus:border-[#b78a3e]" placeholder="Add context for the audit trail"/></label><div className="mt-5 flex justify-end gap-2"><Button secondary onClick={() => setChoice(null)}>Cancel</Button><Button onClick={() => void act(choice.finding.id, choice.action)}>{busy ? "Saving…" : "Confirm"}</Button></div></div></div>}</>;
}
