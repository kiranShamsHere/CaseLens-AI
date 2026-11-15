"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Activity, Archive, BriefcaseBusiness, ChevronDown, FileText, Wifi, WifiOff, LayoutDashboard, Search, Settings, ShieldCheck, Sparkles, TriangleAlert, Menu, X, Sun, Moon } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";

function subscribeTheme(callback: () => void) {
  window.addEventListener("caselens-theme-change", callback);
  return () => window.removeEventListener("caselens-theme-change", callback);
}
function readTheme(): "light" | "dark" {
  const current = document.documentElement.dataset.theme;
  if (current === "dark" || current === "light") return current;
  return window.localStorage.getItem("caselens-theme") === "dark" ? "dark" : "light";
}
function readServerTheme(): "light" | "dark" { return "light"; }

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/cases", label: "Cases", icon: BriefcaseBusiness },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/ask", label: "Ask AI", icon: Sparkles },
  { href: "/conflicts", label: "Conflicts", icon: TriangleAlert },
  { href: "/review", label: "Review center", icon: ShieldCheck },
  { href: "/audit", label: "Audit logs", icon: Activity },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [online, setOnline] = useState(true);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const theme = useSyncExternalStore(subscribeTheme, readTheme, readServerTheme);

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => { window.removeEventListener("online", sync); window.removeEventListener("offline", sync); };
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem("caselens-theme");
    const selected = saved === "dark" || saved === "light" ? saved : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    document.documentElement.dataset.theme = selected;
    window.dispatchEvent(new Event("caselens-theme-change"));
  }, []);

  const toggleTheme = () => {
    const selected = theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = selected;
    window.localStorage.setItem("caselens-theme", selected);
    window.dispatchEvent(new Event("caselens-theme-change"));
  };
  const title = nav.find(item => pathname.startsWith(item.href))?.label || "CaseLens";

  return <div data-theme={theme} className="app-frame min-h-screen md:flex">
    {open && <button aria-label="Close navigation" onClick={() => setOpen(false)} className="fixed inset-0 z-30 bg-black/40 md:hidden" />}
    <aside className={`${open ? "translate-x-0" : "-translate-x-full"} app-sidebar fixed inset-y-0 left-0 z-40 flex h-dvh max-h-dvh w-[264px] flex-col overflow-x-hidden overflow-y-auto overscroll-contain border-r transition-transform md:sticky md:top-0 md:h-dvh md:translate-x-0`}>
      <div className="flex h-[72px] shrink-0 items-center gap-3 border-b px-5">
        <Link href="/dashboard" aria-label="CaseLens AI dashboard" className="brand-logo grid h-10 w-10 shrink-0 place-items-center rounded-xl">
          <Image src="/caselens-mark.svg" alt="" width={40} height={40} priority/>
        </Link>
        <div><div className="text-base font-semibold tracking-tight">CaseLens <span className="gold-text">AI</span></div><div className="text-[11px] uppercase tracking-[.16em] text-[#89928e]">Case intelligence</div></div>
        <button onClick={() => setOpen(false)} className="ml-auto md:hidden" aria-label="Close navigation"><X size={19}/></button>
      </div>
      <nav aria-label="Workspace" className="sidebar-nav flex-1 px-3 pb-3 pt-5"><div className="px-3 pb-3 text-[11px] font-semibold uppercase tracking-[.16em] text-[#99a19d]">Workspace</div>{nav.map(({ href, label, icon: Icon }) => { const active = pathname === href; return <Link onClick={() => setOpen(false)} key={href} href={href} className={`nav-link mb-2 flex min-h-12 items-center gap-3 rounded-xl px-3 py-3 text-sm ${active ? "nav-active font-semibold" : "text-[#68736e]"}`}><Icon size={18} strokeWidth={1.8}/><span>{label}</span></Link>; })}</nav>
      <div className="sidebar-bottom shrink-0 p-3"><Link href="/settings" className="nav-link flex min-h-12 items-center gap-3 rounded-xl px-3 py-3 text-sm"><Settings size={18}/> Settings</Link><div className="offline-card mt-3 rounded-2xl border p-4"><div className="flex items-center gap-2 text-xs font-semibold"><Archive size={15} className="gold-text"/> Offline-ready workspace</div><p className="mt-2 text-[11px] leading-relaxed text-[#89928e]">Previously viewed case summaries stay available on this device.</p><div className="mt-3 flex items-center gap-2 text-[11px]">{online ? <><Wifi size={13} className="text-[#39836d]"/> Connected</> : <><WifiOff size={13} className="text-[#b46b45]"/> Offline mode</>}</div></div><div className="mt-4 flex items-center gap-2.5 border-t px-2 pt-4"><div className="grid h-9 w-9 place-items-center rounded-full bg-[#e5d6b9] text-xs font-semibold text-[#6d511f]">GB</div><div className="min-w-0"><div className="text-sm font-semibold">Ghulame Bilal</div><div className="truncate text-[11px] text-[#8a938f]">Case worker</div></div><ChevronDown size={15} className="ml-auto text-[#8a938f]"/></div></div>
    </aside>
    <main className="app-main flex min-h-screen min-w-0 flex-1 flex-col"><header className="app-topbar sticky top-0 z-20 flex h-[68px] shrink-0 items-center gap-3 border-b px-4 backdrop-blur-xl md:px-8"><button onClick={() => setOpen(true)} className="rounded-lg p-2 md:hidden" aria-label="Open navigation"><Menu size={20}/></button><div className="text-[15px] font-semibold">{title}</div><div className="relative ml-auto hidden w-full max-w-[360px] sm:block"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa39f]"/><input aria-label="Search workspace" value={search} onChange={event => setSearch(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && search.trim()) router.push(`/cases?search=${encodeURIComponent(search.trim())}`); }} placeholder="Search cases, documents…" className="app-search h-10 w-full rounded-xl border pl-10 pr-3 text-sm outline-none focus:border-[#b78a3e]"/></div><button onClick={toggleTheme} className="theme-toggle ml-auto grid h-10 w-10 place-items-center rounded-xl border transition hover:-translate-y-0.5 sm:ml-2" aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`} title={`Switch to ${theme === "light" ? "dark" : "light"} theme`}>{theme === "light" ? <Moon size={17}/> : <Sun size={17}/>}</button><span className={`hidden items-center gap-2 rounded-full px-3 py-2 text-[11px] font-medium sm:flex ${online ? "bg-[#edf5f1] text-[#387b68]" : "bg-[#fff3e9] text-[#a35e32]"}`}>{online ? <Wifi size={13}/> : <WifiOff size={13}/ >}{online ? "Online" : "Offline"}</span><button className="ml-1 grid h-9 w-9 place-items-center rounded-full bg-[#e5d6b9] text-[11px] font-semibold text-[#6d511f]" aria-label="Profile">GB</button></header><div className="app-page mx-auto w-full max-w-[1440px] flex-1 p-4 sm:p-6 md:p-7">{children}</div><footer className="app-footer mt-auto border-t px-4 py-5 md:px-8"><div className="mx-auto flex max-w-[1440px] flex-col gap-2 text-center text-[11px] sm:flex-row sm:items-center sm:justify-between sm:text-left"><span>© {new Date().getFullYear()} CaseLens AI · Case intelligence workspace</span><span>Built for legal-aid teams · Evidence checked by people</span></div></footer></main>
  </div>;
}
