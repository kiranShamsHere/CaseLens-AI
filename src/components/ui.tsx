import { ArrowUpRight, Check, Clock3, FileText, ShieldAlert } from "lucide-react";

export function PageHeading({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode }) {
  return <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div>{eyebrow && <div className="mb-2 text-[11px] font-semibold uppercase tracking-[.17em] text-[var(--gold)]">{eyebrow}</div>}<h1 className="text-[30px] font-semibold tracking-[-.04em] text-[var(--navy)] md:text-[34px]">{title}</h1>{description && <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-[var(--muted)]">{description}</p>}</div>{action}</div>;
}

export function Button({ children, secondary = false, onClick, type = "button" }: { children: React.ReactNode; secondary?: boolean; onClick?: () => void; type?: "button" | "submit" }) {
  return <button type={type} onClick={onClick} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition duration-200 hover:-translate-y-0.5 ${secondary ? "border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--gold-soft)]" : "bg-[var(--burgundy)] text-[#FFF7F6] shadow-md shadow-[rgba(128,62,75,.24)] hover:bg-[#6d3340]"}`}>{children}</button>;
}

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "green" | "amber" | "red" | "blue" }) {
  const styles = { neutral: "bg-[#efeae0] text-[#6b675f]", green: "bg-[#e5efe8] text-[#3c5a4a]", amber: "bg-[#f4ead4] text-[#7d6330]", red: "bg-[#f4e4e6] text-[#7f3e4a]", blue: "bg-[#e3e9ee] text-[#234057]" };
  return <span data-tone={tone} className={`inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-semibold tracking-[.01em] ${styles[tone]}`}>{children}</span>;
}

export function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`app-panel rounded-lg border border-[var(--line)] bg-[var(--surface)] ${className}`}>{children}</section>;
}

export function PanelTitle({ title, action }: { title: string; action?: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-5 py-4 sm:px-6"><h2 className="text-[15px] font-semibold text-[var(--navy)]">{title}</h2>{action}</div>;
}

export function Evidence({ source, quote, page }: { source: string; quote: string; page?: number }) {
  return <details open className="group rounded-lg border border-[var(--line)] bg-[#FBF8F1] p-4"><summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-semibold text-[var(--burgundy)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]"><FileText size={15}/><span className="min-w-0 flex-1 truncate">{source}{page ? ` · p. ${page}` : ""}</span><span className="text-[10px] font-medium text-[var(--muted)]">Evidence details</span><ArrowUpRight size={13}/></summary><blockquote className="mt-3 border-l-2 border-[var(--gold)] pl-3 text-sm leading-relaxed text-[var(--ink)]">{quote}</blockquote></details>;
}

export function StateIcon({ kind }: { kind: "approved" | "pending" | "alert" }) {
  const Icon = kind === "approved" ? Check : kind === "pending" ? Clock3 : ShieldAlert;
  return <Icon size={16} className={kind === "approved" ? "text-[var(--forest)]" : kind === "pending" ? "text-[var(--gold)]" : "text-[var(--burgundy)]"}/>;
}
