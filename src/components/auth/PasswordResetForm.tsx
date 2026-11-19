"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { supabaseConfig } from "@/lib/supabase/config";
import { isRecoveryLink, recoveryMarkerKey, recoverySessionIsValid, recoveryTokenHash, updateRecoveryPassword } from "@/lib/auth-recovery";
import { ThemeToggleButton } from "@/components/theme/ThemeToggleButton";

type RecoveryState = "checking" | "ready" | "invalid" | "updated";

export function PasswordResetForm() {
  const [state, setState] = useState<RecoveryState>("checking");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const configured = Boolean(supabaseConfig());

  useEffect(() => {
    if (!configured) return;
    const supabase = createClient();
    const href = window.location.href;
    const linkIsRecovery = isRecoveryLink(href);
    const tokenHash = recoveryTokenHash(href);
    const hasMarker = window.sessionStorage.getItem(recoveryMarkerKey) === "valid";
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) {
        window.sessionStorage.setItem(recoveryMarkerKey, "valid");
        setState("ready");
      }
    });
    if (tokenHash) {
      void supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" }).then(({ data, error: verifyError }) => {
        if (!verifyError && data.session) {
          window.sessionStorage.setItem(recoveryMarkerKey, "valid");
          setState("ready");
        } else {
          setError("This reset link is expired, invalid, or already used. Request a new password reset email to continue.");
          setState("invalid");
        }
      }).catch(() => {
        setError("This reset link could not be verified. Request a new password reset email to continue.");
        setState("invalid");
      });
      return () => subscription.unsubscribe();
    }
    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      const valid = !sessionError && recoverySessionIsValid(data.session, linkIsRecovery, hasMarker);
      if (valid) {
        window.sessionStorage.setItem(recoveryMarkerKey, "valid");
        setState("ready");
      } else {
        setError("This reset link is expired, invalid, or already used. Request a new password reset email to continue.");
        setState("invalid");
      }
    }).catch(() => {
      setError("This reset link could not be verified. Request a new password reset email to continue.");
      setState("invalid");
    });
    return () => subscription.unsubscribe();
  }, [configured]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (state !== "ready") return;
    setBusy(true);
    try {
      const auth = createClient().auth;
      const result = await updateRecoveryPassword(auth, password, confirmation);
      if (result.error) { setError(result.error); return; }
      window.sessionStorage.removeItem(recoveryMarkerKey);
      await auth.signOut({ scope: "local" });
      setState("updated");
    } catch {
      setError("The password could not be updated. This reset link may have expired; request a new one and try again.");
    } finally { setBusy(false); }
  }

  return <main className="site-auth-shell relative grid min-h-screen place-items-center px-5 py-12">
    <div className="site-auth-theme"><ThemeToggleButton/></div>
    <section className="site-auth-card w-full max-w-md border p-7 shadow-[0_16px_50px_rgba(35,49,60,.08)] sm:p-9">
      <Link href="/" className="site-brand"><span>CaseLens <b>AI</b></span></Link>
      <p className="mt-8 text-xs font-semibold uppercase tracking-[.18em] text-[#718594]">Account recovery</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Choose a new password</h1>
      {!configured && <div className="mt-5 space-y-4"><p role="alert" className="border border-[#d8b8b3] bg-[#f7ecea] p-3 text-sm text-[#824f4a]">Password recovery is not configured for this deployment.</p><Link href="/forgot-password" className="inline-block text-sm font-semibold text-[#425f72] underline-offset-4 hover:underline">Request a reset email</Link></div>}
      {configured && state === "checking" && <p role="status" className="mt-5 text-sm text-[#74818a]">Verifying your secure reset link…</p>}
      {configured && state === "ready" && <form onSubmit={submit} className="mt-7 space-y-4">
        <label className="block text-sm font-medium">New password<div className="relative mt-1.5"><LockKeyhole size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#84949d]"/><input required minLength={8} type="password" autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} placeholder="At least 8 characters" className="h-11 w-full border border-[#cbd3d8] bg-white pl-9 pr-3 outline-none focus:border-[#617f91]"/></div></label>
        <label className="block text-sm font-medium">Confirm new password<input required minLength={8} type="password" autoComplete="new-password" value={confirmation} onChange={event => setConfirmation(event.target.value)} placeholder="Enter the same password again" className="mt-1.5 h-11 w-full border border-[#cbd3d8] bg-white px-3 outline-none focus:border-[#617f91]"/></label>
        {error && <p role="alert" className="border border-[#d8b8b3] bg-[#f7ecea] p-3 text-sm text-[#824f4a]">{error}</p>}
        <button type="submit" disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 bg-[#344b5c] text-sm font-semibold text-white disabled:opacity-60">{busy ? "Updating…" : "Update password"}<ArrowRight size={16}/></button>
      </form>}
      {configured && state === "invalid" && <div className="mt-5 space-y-4"><p role="alert" className="border border-[#d8b8b3] bg-[#f7ecea] p-3 text-sm text-[#824f4a]">{error}</p><Link href="/forgot-password" className="inline-block text-sm font-semibold text-[#425f72] underline-offset-4 hover:underline">Request another reset email</Link></div>}
      {configured && state === "updated" && <div className="mt-5 space-y-4"><p role="status" className="border border-[#bfd5cb] bg-[#eaf3ee] p-3 text-sm text-[#3f6a58]">Your password has been updated. Sign in with your new password.</p><Link href="/login" className="inline-block text-sm font-semibold text-[#425f72] underline-offset-4 hover:underline">Go to sign in</Link></div>}
      {configured && state !== "invalid" && state !== "updated" && <Link href="/login" className="mt-6 inline-block text-sm font-semibold text-[#425f72] underline-offset-4 hover:underline">Return to sign in</Link>}
    </section>
  </main>;
}
