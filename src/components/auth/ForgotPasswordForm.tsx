"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { supabaseConfig } from "@/lib/supabase/config";
import { requestPasswordReset } from "@/lib/auth-recovery";
import { ThemeToggleButton } from "@/components/theme/ThemeToggleButton";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(""); setError("");
    if (!supabaseConfig()) { setError("Password recovery is not configured for this deployment."); return; }
    setBusy(true);
    try {
      const { error: requestError } = await requestPasswordReset(createClient().auth, email, window.location.origin);
      if (requestError) throw requestError;
      setMessage("If an account exists for that email, a password reset link is on its way.");
    } catch {
      setError("We couldn’t send the reset request right now. Please check the address and try again.");
    } finally { setBusy(false); }
  }

  return <main className="site-auth-shell relative grid min-h-screen place-items-center px-5 py-12">
    <div className="site-auth-theme"><ThemeToggleButton/></div>
    <section className="site-auth-card w-full max-w-md border p-7 shadow-[0_16px_50px_rgba(35,49,60,.08)] sm:p-9">
      <Link href="/" className="site-brand"><span>CaseLens <b>AI</b></span></Link>
      <p className="mt-8 text-xs font-semibold uppercase tracking-[.18em] text-[#718594]">Account recovery</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Forgot your password?</h1>
      <p className="mt-2 text-sm leading-6 text-[#74818a]">Enter your email and we’ll send a secure link if an account is registered with it.</p>
      <form onSubmit={submit} className="mt-7 space-y-4">
        <label className="block text-sm font-medium">Email<div className="relative mt-1.5"><Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#84949d]"/><input required type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} className="h-11 w-full border border-[#cbd3d8] bg-white pl-9 pr-3 outline-none focus:border-[#617f91]" placeholder="you@example.org"/></div></label>
        {error && <p role="alert" className="border border-[#d8b8b3] bg-[#f7ecea] p-3 text-sm text-[#824f4a]">{error}</p>}
        {message && <p role="status" className="border border-[#bfd5cb] bg-[#eaf3ee] p-3 text-sm text-[#3f6a58]">{message}</p>}
        <button type="submit" disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 bg-[#344b5c] text-sm font-semibold text-white disabled:opacity-60">{busy ? "Sending…" : "Send reset link"}<ArrowRight size={16}/></button>
      </form>
      <Link href="/login" className="mt-6 inline-block text-sm font-semibold text-[#425f72] underline-offset-4 hover:underline">Return to sign in</Link>
    </section>
  </main>;
}
