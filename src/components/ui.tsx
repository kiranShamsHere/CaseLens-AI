import { ArrowUpRight, Check, Clock3, FileText, ShieldAlert } from "lucide-react";

export function PageHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode }) {
  return <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div>{eyebrow && <div className="mb-2 text-[11px] font-semibold uppercase tracking-[.17em] text-[#b78a3e]">{eyebrow}</div>}<h1 className="text-[30px] font-semibold tracking-[-.04em] text-[#25221d] md:text-[34px]">{title}</h1>{description && <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-[#777167]">{description}</p>}</div>{action}</div>;
}

export function Button({ children, secondary = false, onClick, type = "button" }: { children: React.ReactNode; secondary?: boolean; onClick?: () => void; type?: "button" | "submit" }) {
  return <button type={type} onClick={onClick} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition duration-200 hover:-translate-y-0.5 ${secondary ? "border border-[#e1daca] bg-white text-[#514a3c] hover:bg-[#f7f2e7]" : "bg-[#24211c] text-[#fff9ec] shadow-md shadow-[#b78a3e]/15 hover:bg-[#40351f]"}`}>{children}</button>;
}

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "green" | "amber" | "red" | "blue" }) {
  const styles = { neutral: "bg-[#eeece6] text-[#686258]", green: "bg-[#e6f0e8] text-[#47775f]", amber: "bg-[#f5ecd9] text-[#8b682d]", red: "bg-[#f5e4df] text-[#9a5447]", blue: "bg-[#e6edf1] text-[#4d6c83]" };
  return <span data-tone={tone} className={`inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-semibold tracking-[.01em] ${styles[tone]}`}>{children}</span>;
}

export function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`app-panel rounded-2xl border border-[#e8e2d7] bg-white ${className}`}>{children}</section>;
}

export function PanelTitle({ title, action }: { title: string; action?: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-3 border-b border-[#edf0ee] px-5 py-4 sm:px-6"><h2 className="text-[15px] font-semibold text-[#35413c]">{title}</h2>{action}</div>;
}

export function Evidence({ source, quote, page }: { source: string; quote: string; page?: number }) {
  return <div className="rounded-xl border border-[#e7e1d6] bg-[#faf9f5] p-4"><div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#74603a]"><FileText size={15}/>{source}{page ? ` · p. ${page}` : ""}<ArrowUpRight size={13} className="ml-auto"/></div><blockquote className="border-l-2 border-[#c6a25c] pl-3 text-sm leading-relaxed text-[#59554d]">{quote}</blockquote></div>;
}

export function StateIcon({ kind }: { kind: "approved" | "pending" | "alert" }) {
  const Icon = kind === "approved" ? Check : kind === "pending" ? Clock3 : ShieldAlert;
  return <Icon size={16} className={kind === "approved" ? "text-[#4d8a70]" : kind === "pending" ? "text-[#ad8341]" : "text-[#af6555]"}/>;
}
