"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { supabaseConfig } from "@/lib/supabase/config";
import { ThemeToggleButton } from "@/components/theme/ThemeToggleButton";

export function PasswordResetForm() {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage("");
    if (!supabaseConfig()) { setError("Supabase is not configured for this deployment."); return; }
    setBusy(true);
    try {
      const { error: updateError } = await createClient().auth.updateUser({ password });
      if (updateError) throw updateError;
      setMessage("Your password has been updated. You can sign in now.");
    } catch (issue) { setError(issue instanceof Error ? issue.message : "The password could not be updated. Request a new reset link."); }
    finally { setBusy(false); }
  }
  return <main className="site-auth-shell relative grid min-h-screen place-items-center px-5 py-12">
    <div className="site-auth-theme"><ThemeToggleButton/></div>
    <section className="site-auth-card w-full max-w-md border p-7 shadow-[0_16px_50px_rgba(35,49,60,.08)] sm:p-9">
      <Link href="/" className="site-brand"><span>CaseLens <b>AI</b></span></Link>
      <p className="mt-8 text-xs font-semibold uppercase tracking-[.18em] text-[#718594]">Account recovery</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Choose a new password</h1>
      <form onSubmit={submit} className="mt-7 space-y-4"><label className="block text-sm font-medium">New password<div className="relative mt-1.5"><LockKeyhole size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#84949d]"/><input required minLength={8} type="password" autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} placeholder="At least 8 characters" className="h-11 w-full border bg-white pl-9 pr-3 outline-none focus:border-[#617f91]"/></div></label>
        {error && <p role="alert" className="border border-[#d8b8b3] bg-[#f7ecea] p-3 text-sm text-[#824f4a]">{error}</p>}{message && <p role="status" className="border border-[#bfd5cb] bg-[#eaf3ee] p-3 text-sm text-[#3f6a58]">{message}</p>}
        <button type="submit" disabled={busy || Boolean(message)} className="flex h-12 w-full items-center justify-center gap-2 bg-[#344b5c] text-sm font-semibold text-white disabled:opacity-60">{busy ? "Updating…" : "Update password"}<ArrowRight size={16}/></button>
      </form><Link href="/login" className="mt-6 inline-block text-sm font-semibold text-[#425f72] underline-offset-4 hover:underline">Return to sign in</Link>
    </section>
  </main>;
}
