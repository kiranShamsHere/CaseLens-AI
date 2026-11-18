"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Activity, Archive, BriefcaseBusiness, FileText, Wifi, WifiOff, LayoutDashboard, Search, Settings, ShieldCheck, Sparkles, TriangleAlert, Menu, X, Sun, Moon, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { flushPendingReviewActions, setOfflineUserScope } from "@/components/offline";
import { createClient as createSupabaseClient } from "@/lib/supabase/browser";
import { useTheme } from "@/components/theme/useTheme";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/cases", label: "Cases", icon: BriefcaseBusiness },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/ask", label: "Ask AI", icon: Sparkles },
  { href: "/conflicts", label: "Conflicts", icon: TriangleAlert },
  { href: "/review", label: "Review center", icon: ShieldCheck },
  { href: "/audit", label: "Audit logs", icon: Activity },
];

export function AppShell({ children, userId, userName, userEmail }: { children: React.ReactNode; userId: string; userName: string; userEmail: string }) {
  setOfflineUserScope(userId);
  const pathname = usePathname();
  const router = useRouter();
  const [online, setOnline] = useState(true);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const [theme, setTheme] = useTheme();

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    const reconnect = () => { sync(); void flushPendingReviewActions(); };
    sync();
    if (navigator.onLine) void flushPendingReviewActions();
    window.addEventListener("online", reconnect);
    window.addEventListener("offline", sync);
    return () => { window.removeEventListener("online", reconnect); window.removeEventListener("offline", sync); };
  }, []);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", closeOnEscape);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", closeOnEscape); document.body.style.overflow = ""; };
  }, [open]);

  const toggleTheme = () => setTheme(theme === "light" ? "dark" : "light");
  const signOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try { await createSupabaseClient().auth.signOut(); } finally { router.replace("/login"); router.refresh(); }
  };
  const initials = userName.split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
  const title = nav.find(item => pathname.startsWith(item.href))?.label || (pathname.startsWith("/settings") ? "Settings" : "CaseLens");
  return <>
  <style jsx global>{`
    .app-frame { background-image: none !important; }
    .app-frame [class*="rounded-2xl"], .app-frame [class*="rounded-xl"], .app-frame [class*="rounded-lg"] { border-radius: 7px !important; }
    .app-frame .app-panel { border-radius: 8px !important; }
    .app-frame .app-search, .app-frame input:not([type="checkbox"]), .app-frame textarea, .app-frame select { border-radius: 6px !important; }
    .app-frame .nav-link, .app-frame .theme-toggle { border-radius: 6px !important; }
    .app-frame .nav-link:not(.nav-active):hover { color: #304b5c !important; background: #e2e7e8 !important; }
    .app-frame .nav-link:not(.nav-active):hover svg { color: #617f91 !important; }
    .app-frame .nav-active { color: #304b5c !important; background: #dce4e8 !important; box-shadow: inset 2px 0 rgba(83, 116, 137, .7) !important; }
    .app-frame[data-theme="dark"] .nav-link:not(.nav-active):hover { color: #edf0f2 !important; background: #263540 !important; }
    .app-frame[data-theme="dark"] .nav-link:not(.nav-active):hover svg { color: #9bb7c4 !important; }
    .app-frame[data-theme="dark"] .nav-active { color: #b2cbd6 !important; background: #293944 !important; box-shadow: inset 2px 0 rgba(136, 168, 184, .62) !important; }
    .app-frame .brand-logo { border-radius: 6px !important; filter: none !important; }
    .app-frame .brand-logo:hover { filter: none !important; }
    .app-frame .app-panel::before { background: linear-gradient(90deg, transparent, var(--gold), transparent) !important; }
    .app-frame .app-panel:hover { border-color: color-mix(in srgb, var(--gold) 32%, var(--line)) !important; box-shadow: 0 18px 42px rgba(35, 49, 60, .09) !important; }
    .app-frame[data-theme="dark"] .app-panel:hover { border-color: rgba(136, 168, 184, .24) !important; }
    .app-frame [data-tone="amber"] { color: #486577 !important; background: #dce5e9 !important; }
    .app-frame[data-theme="dark"] [data-tone="amber"] { color: #b2cbd6 !important; background: #2a3b46 !important; }
    .app-frame ::selection { color: #f7f8f7; background: #617f91; }
    .app-frame[data-theme="dark"] ::selection { color: #111820; background: #88a8b8; }
  `}</style>
  <div data-theme={theme} className="app-frame min-h-screen md:flex">
    {open && <button aria-label="Close navigation" onClick={() => setOpen(false)} className="fixed inset-0 z-30 bg-black/40 md:hidden" />}
    <aside aria-label="Workspace navigation" aria-modal={open || undefined} role={open ? "dialog" : undefined} className={`${open ? "translate-x-0" : "-translate-x-full"} app-sidebar fixed inset-y-0 left-0 z-40 flex h-dvh max-h-dvh w-[264px] flex-col overflow-x-hidden overflow-y-auto overscroll-contain border-r transition-transform md:sticky md:top-0 md:h-dvh md:translate-x-0`}>
      <div className="flex h-[76px] shrink-0 items-center gap-4 border-b px-5">
        <Link href="/dashboard" aria-label="CaseLens AI dashboard" className="brand-logo grid h-11 w-11 shrink-0 place-items-center">
          <Image src="/caselens-mark.svg" alt="" width={44} height={44} priority/>
        </Link>
        <div className="min-w-0"><div className="flex items-baseline gap-2 text-base font-semibold tracking-[.02em]"><span>CaseLens</span><span className="gold-text">AI</span></div></div>
        <button onClick={() => setOpen(false)} className="ml-auto md:hidden" aria-label="Close navigation"><X size={19}/></button>
      </div>
      <nav aria-label="Workspace" className="sidebar-nav flex-1 px-3 pb-3 pt-5"><div className="px-3 pb-3 text-[11px] font-semibold uppercase tracking-[.16em] text-[#99a19d]">Workspace</div>{nav.map(({ href, label, icon: Icon }) => { const active = pathname === href; return <Link onClick={() => setOpen(false)} key={href} href={href} className={`nav-link mb-2 flex min-h-12 items-center gap-3 rounded-xl px-3 py-3 text-sm ${active ? "nav-active font-semibold" : "text-[#68736e]"}`}><Icon size={18} strokeWidth={1.8}/><span>{label}</span></Link>; })}</nav>
      <div className="sidebar-bottom shrink-0 p-3"><Link href="/settings" className="nav-link flex min-h-12 items-center gap-3 rounded-xl px-3 py-3 text-sm"><Settings size={18}/> Settings</Link><div className="offline-card mt-3 rounded-2xl border p-4"><div className="flex items-center gap-2 text-xs font-semibold"><Archive size={15} className="gold-text"/> Offline-ready workspace</div><p className="mt-2 text-[11px] leading-relaxed text-[#89928e]">Viewed case summaries and evidence can stay on this device for up to 14 days. Documents are never cached.</p><div className="mt-3 flex items-center gap-2 text-[11px]">{online ? <><Wifi size={13} className="text-[#39836d]"/> Connected</> : <><WifiOff size={13} className="text-[#b46b45]"/> Offline mode</>}</div></div><div className="mt-4 flex items-center gap-2.5 border-t px-2 pt-4"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#dce5e9] text-xs font-semibold text-[#344b5c]">{initials}</div><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{userName}</div><div className="truncate text-[11px] text-[#8a938f]">{userEmail}</div></div><button type="button" onClick={() => void signOut()} disabled={signingOut} className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-[#78858d] transition hover:bg-[#e6ebed] hover:text-[#344b5c] disabled:opacity-50" aria-label="Sign out" title="Sign out"><LogOut size={16}/></button></div></div>
    </aside>
    <main className="app-main flex min-h-screen min-w-0 flex-1 flex-col"><header className="app-topbar sticky top-0 z-20 flex h-[68px] shrink-0 items-center gap-3 border-b px-4 backdrop-blur-xl md:px-8"><button onClick={() => setOpen(true)} className="rounded-lg p-2 md:hidden" aria-label="Open navigation"><Menu size={20}/></button><div className="text-[15px] font-semibold">{title}</div><div className="relative ml-auto hidden w-full max-w-[360px] sm:block"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa39f]"/><input aria-label="Search workspace" value={search} onChange={event => setSearch(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && search.trim()) router.push(`/cases?search=${encodeURIComponent(search.trim())}`); }} placeholder="Search cases, documents…" className="app-search h-10 w-full rounded-xl border pl-10 pr-3 text-sm outline-none focus:border-[#b78a3e]"/></div><button onClick={toggleTheme} className="theme-toggle ml-auto grid h-10 w-10 place-items-center rounded-xl border transition hover:-translate-y-0.5 sm:ml-2" aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`} title={`Switch to ${theme === "light" ? "dark" : "light"} theme`}>{theme === "light" ? <Moon size={17}/> : <Sun size={17}/>}</button><span className={`hidden items-center gap-2 rounded-full px-3 py-2 text-[11px] font-medium sm:flex ${online ? "bg-[#edf5f1] text-[#387b68]" : "bg-[#fff3e9] text-[#a35e32]"}`}>{online ? <Wifi size={13}/> : <WifiOff size={13}/ >}{online ? "Online" : "Offline"}</span><button onClick={() => void signOut()} title={`Sign out ${userName}`} className="ml-1 grid h-9 w-9 place-items-center rounded-full bg-[#dce5e9] text-[11px] font-semibold text-[#344b5c]" aria-label="Sign out">{initials}</button></header><div className="app-page mx-auto w-full max-w-[1440px] flex-1 p-4 sm:p-6 md:p-7">{children}</div><footer className="app-footer mt-auto border-t px-4 py-5 md:px-8"><div className="mx-auto flex max-w-[1440px] flex-col gap-2 text-center text-[11px] sm:flex-row sm:items-center sm:justify-between sm:text-left"><span>© {new Date().getFullYear()} CaseLens AI</span><span>Built for legal-aid teams · Evidence checked by people</span></div></footer></main>
  </div>
  </>;
}
