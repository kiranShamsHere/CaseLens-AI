"use client";

import { useState, useSyncExternalStore, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, BriefcaseBusiness, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { supabaseConfig } from "@/lib/supabase/config";
import { ThemeToggleButton } from "@/components/theme/ThemeToggleButton";

type AuthFormProps = { mode: "login" | "register" };

function subscribeToLocation(callback: () => void) {
  window.addEventListener("popstate", callback);
  return () => window.removeEventListener("popstate", callback);
}

function accountDeletedSnapshot() {
  return new URLSearchParams(window.location.search).get("accountDeleted") === "1";
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const configured = Boolean(supabaseConfig());
  const accountDeleted = useSyncExternalStore(subscribeToLocation, accountDeletedSnapshot, () => false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!configured) { setError("Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to enable accounts."); return; }
    setBusy(true);
    try {
      const supabase = createClient();
      if (mode === "login") {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) throw authError;
        router.replace("/dashboard");
        router.refresh();
      } else {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(), password,
          options: { data: { full_name: name.trim() }, emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (authError) throw authError;
        if (data.session) { router.replace("/dashboard"); router.refresh(); }
        else setNotice("Check your inbox for the confirmation link, then sign in to CaseLens.");
      }
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "The account request could not be completed. Try again.");
    } finally { setBusy(false); }
  };

  const onOAuth = async () => {
    setError("");
    if (!configured) { setError("Add the Supabase project URL and publishable key to enable sign in."); return; }
    setBusy(true);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback?next=/dashboard` },
      });
      if (authError) throw authError;
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Social sign in is not configured yet.");
      setBusy(false);
    }
  };

  return <main className="site-auth-shell relative min-h-screen bg-[#eff0ec] text-[#202b34]">
    <div className="site-auth-theme"><ThemeToggleButton/></div>
    <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-5 py-10 lg:grid-cols-[1fr_440px] lg:px-10">
      <section className="hidden lg:block">
        <Link href="/" className="inline-flex items-center gap-3"><Image src="/caselens-mark.svg" alt="" width={44} height={44}/><span className="text-lg font-semibold tracking-wide">CaseLens <span className="text-[#617f91]">AI</span></span></Link>
        <p className="mt-16 max-w-xl text-xs font-semibold uppercase tracking-[.22em] text-[#617f91]">Evidence, kept in context</p>
        <h1 className="mt-5 max-w-xl text-5xl font-semibold leading-[1.12] tracking-tight">A calmer way to work through a complex case file.</h1>
        <p className="mt-6 max-w-lg text-lg leading-8 text-[#667680]">Bring case records together, find supporting material, and keep human review visible at every important step.</p>
        <div className="mt-10 grid max-w-xl gap-3 sm:grid-cols-2"><div className="border border-[#d3d9dc] bg-[#f7f7f3] p-4"><BriefcaseBusiness size={19} className="text-[#617f91]"/><p className="mt-3 text-sm font-semibold">Organized matters</p><p className="mt-1 text-xs leading-5 text-[#74818a]">Cases and source documents in one workspace.</p></div><div className="border border-[#d3d9dc] bg-[#f7f7f3] p-4"><ShieldCheck size={19} className="text-[#617f91]"/><p className="mt-3 text-sm font-semibold">People remain in control</p><p className="mt-1 text-xs leading-5 text-[#74818a]">Evidence is surfaced for review, never treated as a legal decision.</p></div></div>
      </section>
      <section className="site-auth-card mx-auto w-full max-w-md border border-[#d3d9dc] bg-[#f7f7f3] p-6 shadow-[0_16px_50px_rgba(35,49,60,.08)] sm:p-9">
        <Link href="/" className="inline-flex items-center gap-3 lg:hidden"><Image src="/caselens-mark.svg" alt="" width={40} height={40}/><span className="font-semibold">CaseLens <span className="text-[#617f91]">AI</span></span></Link>
        <div className="mt-7"><p className="text-xs font-semibold uppercase tracking-[.18em] text-[#718594]">{mode === "login" ? "Welcome back" : "Create your workspace account"}</p><h2 className="mt-2 text-3xl font-semibold tracking-tight">{mode === "login" ? "Sign in" : "Register"}</h2><p className="mt-2 text-sm text-[#74818a]">{mode === "login" ? "Continue to your case intelligence workspace." : "Your account keeps case data private to your workspace."}</p></div>
        <div className="mt-7"><button type="button" disabled={busy || !configured} onClick={() => void onOAuth()} className="flex h-11 w-full items-center justify-center gap-2 border border-[#cbd3d8] bg-white text-sm font-medium transition hover:bg-[#edf1f2] disabled:cursor-not-allowed disabled:opacity-50"><span aria-hidden="true" className="font-semibold text-[#54748a]">G</span>Continue with Google</button></div>
        <div className="my-6 flex items-center gap-3 text-[11px] text-[#96a0a6]"><span className="h-px flex-1 bg-[#d9dfe2]"/>or use email<span className="h-px flex-1 bg-[#d9dfe2]"/></div>
        {!configured && <div role="status" className="mb-4 border border-[#d9dfe2] bg-[#edf1f2] p-3 text-xs leading-5 text-[#536d7c]">Connect Supabase to enable login and registration. Setup instructions are in the project README.</div>}
        <form onSubmit={onSubmit} className="space-y-4">
          {mode === "register" && <label className="block text-sm font-medium">Full name<input required minLength={2} autoComplete="name" value={name} onChange={event => setName(event.target.value)} className="mt-1.5 h-11 w-full border border-[#cbd3d8] bg-white px-3 outline-none focus:border-[#617f91]" placeholder="Your name"/></label>}
          <label className="block text-sm font-medium">Email<div className="relative mt-1.5"><Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#84949d]"/><input required type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} className="h-11 w-full border border-[#cbd3d8] bg-white pl-9 pr-3 outline-none focus:border-[#617f91]" placeholder="you@example.org"/></div></label>
          <label className="block text-sm font-medium">Password<div className="relative mt-1.5"><LockKeyhole size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#84949d]"/><input required type={showPassword ? "text" : "password"} minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={event => setPassword(event.target.value)} className="h-11 w-full border border-[#cbd3d8] bg-white pl-9 pr-10 outline-none focus:border-[#617f91]" placeholder={mode === "register" ? "At least 8 characters" : "Your password"}/><button type="button" onClick={() => setShowPassword(value => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#84949d]" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}</button></div></label>
          {error && <div role="alert" className="border border-[#d8b8b3] bg-[#f7ecea] p-3 text-sm text-[#824f4a]">{error}</div>}
          {accountDeleted && mode === "login" && <div role="status" className="border border-[#bfd5cb] bg-[#eaf3ee] p-3 text-sm text-[#3f6a58]">Your account and its owned CaseLens records were permanently deleted.</div>}
          {notice && <div role="status" className="border border-[#bfd5cb] bg-[#eaf3ee] p-3 text-sm text-[#3f6a58]">{notice}</div>}
          {mode === "login" && <Link href="/forgot-password" className="text-left text-xs font-semibold text-[#425f72] underline-offset-4 hover:underline">Forgot password?</Link>}
          <button type="submit" disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 bg-[#344b5c] text-sm font-semibold text-white transition hover:bg-[#263b49] disabled:opacity-60">{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}<ArrowRight size={16}/></button>
        </form>
        <p className="mt-6 text-center text-sm text-[#71808a]">{mode === "login" ? "New to CaseLens?" : "Already have an account?"} <Link className="font-semibold text-[#425f72] underline-offset-4 hover:underline" href={mode === "login" ? "/register" : "/login"}>{mode === "login" ? "Create an account" : "Sign in"}</Link></p>
        <p className="mt-6 border-t border-[#d9dfe2] pt-4 text-center text-[11px] leading-5 text-[#8a969d]">For demonstration, use fictional case information only. CaseLens supports review; it does not provide legal advice.</p>
      </section>
    </div>
  </main>;
}
