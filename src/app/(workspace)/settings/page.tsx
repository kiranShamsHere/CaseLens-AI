"use client";

import { useState } from "react";
import { Bell, Database, ShieldCheck, Trash2, Wifi } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge, PageHeading, Panel, PanelTitle } from "@/components/ui";
import { createClient } from "@/lib/supabase/browser";
import { clearOfflineUserData } from "@/components/offline";

export default function Settings() {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function deleteAccount() {
    setError(""); setBusy(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Your session has expired. Sign in again before deleting your account.");
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirmation }),
      });
      const payload = await response.json() as { error?: string; success?: boolean };
      if (!response.ok || !payload.success) throw new Error(payload.error ?? "The account could not be deleted. Please try again.");
      clearOfflineUserData(user.id);
      setDialogOpen(false);
      try { await supabase.auth.signOut({ scope: "local" }); } catch { /* The account was deleted; clear the client session best-effort. */ }
      router.replace("/login?accountDeleted=1");
      router.refresh();
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "The account could not be deleted. Please try again.");
    } finally { setBusy(false); }
  }

  return <>
    <PageHeading eyebrow="Workspace preferences" title="Settings" description="Connectivity, appearance, and data availability for this device." action={<Badge tone="blue">Prototype</Badge>}/>
    <div className="grid w-full grid-cols-1 gap-5">
      <Panel><PanelTitle title="Connectivity"/><div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:p-6"><Wifi size={19} aria-hidden="true" className="mt-0.5 shrink-0 text-[#a47b33]"/><div className="min-w-0 flex-1 sm:max-w-4xl"><h3 className="text-sm font-semibold">Connection status</h3><p className="mt-1 text-sm leading-relaxed text-[#839089]">The workspace detects browser connectivity and sends queued review decisions after reconnection. Each decision remains marked unsynced until the API confirms receipt.</p></div><Badge tone="blue">Review queue enabled</Badge></div></Panel>
      <Panel><PanelTitle title="Offline access"/><div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:p-6"><Database size={19} aria-hidden="true" className="mt-0.5 shrink-0 text-[#a47b33]"/><div className="min-w-0 flex-1 sm:max-w-4xl"><h3 className="text-sm font-semibold">Case summaries and evidence</h3><p className="mt-1 text-sm leading-relaxed text-[#839089]">Viewed case metadata and evidence excerpts may be stored on this device for up to 14 days. Original document files are never cached. Use only on a trusted, access-controlled device.</p></div><Badge tone="green">14-day local cache</Badge></div></Panel>
      <Panel><PanelTitle title="Review preferences"/><div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:p-6"><ShieldCheck size={19} aria-hidden="true" className="mt-0.5 shrink-0 text-[#a47b33]"/><div className="min-w-0 flex-1 sm:max-w-4xl"><h3 className="text-sm font-semibold">Human review required</h3><p className="mt-1 text-sm leading-relaxed text-[#839089]">High-impact findings remain unverified until a case worker checks the source evidence.</p></div></div></Panel>
      <Panel><PanelTitle title="Notifications"/><div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:p-6"><Bell size={19} aria-hidden="true" className="mt-0.5 shrink-0 text-[#a47b33]"/><div className="min-w-0 flex-1 sm:max-w-4xl"><h3 className="text-sm font-semibold">Review reminders</h3><p className="mt-1 text-sm leading-relaxed text-[#839089]">Notifications will be available when the case service supports them.</p></div></div></Panel>
      <Panel><div className="border-b border-[#e7d3d0] px-5 py-4 sm:px-6"><h2 className="text-base font-semibold text-[#8b3d3a]">Danger Zone</h2></div><div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:p-6"><Trash2 size={19} aria-hidden="true" className="mt-0.5 shrink-0 text-[#a34e48]"/><div className="min-w-0 flex-1"><h3 className="text-sm font-semibold">Delete Account</h3><p className="mt-1 max-w-3xl text-sm leading-relaxed text-[#839089]">Permanently delete your account and its owned CaseLens records. This action cannot be undone.</p>{error && <p role="alert" className="mt-3 text-sm text-[#a33d38]">{error}</p>}</div><button type="button" onClick={() => { setError(""); setConfirmation(""); setDialogOpen(true); }} className="shrink-0 border border-[#bb7770] px-4 py-2 text-sm font-semibold text-[#8b3d3a] hover:bg-[#fbefed]">Delete Account</button></div></Panel>
    </div>
    {dialogOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4"><section role="dialog" aria-modal="true" aria-labelledby="delete-account-title" className="w-full max-w-lg border border-[#dfc9c5] bg-white p-6 shadow-2xl"><p className="text-xs font-semibold uppercase tracking-[.16em] text-[#a34e48]">Danger Zone</p><h2 id="delete-account-title" className="mt-2 text-xl font-semibold">Permanently delete your account?</h2><p className="mt-3 text-sm leading-6 text-[#667680]">This permanently deletes your account and the cases, uploaded-document records, extracted passages, findings, reviews, and AI usage records it owns. This cannot be undone.</p><label className="mt-5 block text-sm font-medium">Type <strong>DELETE</strong> to confirm<input autoFocus value={confirmation} onChange={event => setConfirmation(event.target.value)} className="mt-2 h-11 w-full border border-[#cbd3d8] px-3 outline-none focus:border-[#a34e48]" autoComplete="off"/></label>{error && <p role="alert" className="mt-3 text-sm text-[#a33d38]">{error}</p>}<div className="mt-6 flex flex-col-reverse justify-end gap-3 sm:flex-row"><button type="button" disabled={busy} onClick={() => setDialogOpen(false)} className="border border-[#cbd3d8] px-4 py-2 text-sm font-semibold text-[#536d7c]">Cancel</button><button type="button" disabled={busy || confirmation !== "DELETE"} onClick={() => void deleteAccount()} className="bg-[#9e403a] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Deleting account…" : "Permanently delete account"}</button></div></section></div>}
  </>;
}
