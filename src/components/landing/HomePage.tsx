"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Activity, ArrowDown, ArrowRight, BookOpenCheck, BriefcaseBusiness, Check, ChevronDown, CircleHelp, FileSearch, FileText, Menu, Moon, Scale, ShieldCheck, Sun, X } from "lucide-react";
import { useTheme } from "@/components/theme/useTheme";

const features = [
  [BriefcaseBusiness, "Centralized case management", "Keep matter details and source files together in a single, searchable workspace."],
  [FileText, "Document analysis", "Extract text from PDFs, spreadsheets, CSVs, and notes while preserving source locations."],
  [FileSearch, "Evidence you can inspect", "Search relevant passages and see the document and page behind each answer."],
  [Scale, "Contradictions and gaps", "Surface facts that appear inconsistent and checklist items that still need follow-up."],
  [Activity, "Case activity", "Keep important case actions visible so teams can understand what changed and when."],
  [ShieldCheck, "Human review", "Review, accept, reject, or question findings before relying on them."],
  [BookOpenCheck, "Source-linked findings", "Keep excerpts and references attached to findings for quick verification."],
  [CircleHelp, "Follow-up clarity", "Separate information that was not found from facts confirmed by a source."],
] as const;

const steps = [
  ["01", "Create a case", "Add a matter and give its records a clear home."],
  ["02", "Bring records together", "Upload supported files and keep originals in your approved storage."],
  ["03", "Find evidence", "Search extracted passages and follow citations back to a document."],
  ["04", "Review what needs attention", "Check contradictions and unanswered questions against the record."],
  ["05", "Track the work", "Record review decisions and return to the case activity history."],
] as const;

const questions = [
  ["What is CaseLens AI?", "CaseLens is a casework workspace for organizing matters, searching source documents, and reviewing evidence-linked findings. It supports legal-aid work; it does not provide legal advice."],
  ["How does document analysis work?", "The current service extracts text from PDF, TXT, CSV, and XLSX files, stores passages with available page or row context, and ranks relevant passages for review. Scanned PDFs need OCR, which is not currently included."],
  ["Can I organize multiple cases?", "Yes. Cases are separate workspace records. With Supabase configured, authenticated API access and database row-level security scope records to the signed-in user."],
  ["How are findings tied to their sources?", "Evidence results include a document name, a source excerpt, and page context when extraction provides it. Always open and check the original source before acting."],
  ["Is case information private?", "The app is designed to scope case data by account using Supabase authentication and row-level security. A real organization should configure and review its own Supabase project, access policies, retention, and approved document-handling process before uploading confidential records."],
  ["Does CaseLens make legal decisions?", "No. It surfaces information for a case worker to assess. Findings can be incomplete or wrong, and high-impact outputs must be checked by a person."],
  ["Can I review an AI-generated finding?", "Yes. The review workflow records a human decision. When Gemini is not configured, Ask AI falls back to source passage retrieval and labels its answer accordingly."],
] as const;

export function HomePage() {
  const [theme, setTheme] = useTheme();
  const toggleTheme = () => setTheme(theme === "light" ? "dark" : "light");
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setMenuOpen(false); };
    const closeOnScroll = () => setMenuOpen(false);
    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("scroll", closeOnScroll, true);
    window.addEventListener("wheel", closeOnScroll, { passive: true });
    window.addEventListener("touchmove", closeOnScroll, { passive: true });
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("scroll", closeOnScroll, true);
      window.removeEventListener("wheel", closeOnScroll);
      window.removeEventListener("touchmove", closeOnScroll);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);
  const navLinks = [["Features", "#features"], ["How it works", "#how-it-works"], ["About", "#about"], ["Contact", "#contact"]] as const;

  return <main className="site-shell">
    <header className="site-nav">
      <div className="site-nav-inner">
        <Link href="/" aria-label="CaseLens AI home" className="site-brand"><Image src="/caselens-mark.svg" alt="" width={36} height={36} priority/><span>CaseLens <b>AI</b></span></Link>
        {menuOpen && <button type="button" aria-label="Close navigation" className="site-nav-overlay" onClick={() => setMenuOpen(false)}/>}
        <nav aria-label="Main navigation" className={`site-nav-links ${menuOpen ? "is-open" : ""}`}>
          <div className="site-drawer-heading"><Link href="/" className="site-brand" onClick={() => setMenuOpen(false)}><Image src="/caselens-mark.svg" alt="" width={34} height={34}/><span>CaseLens <b>AI</b></span></Link><button type="button" className="site-icon-button" onClick={() => setMenuOpen(false)} aria-label="Close navigation"><X size={19}/></button></div>
          {navLinks.map(([label, href]) => <a key={href} href={href} onClick={() => setMenuOpen(false)}>{label}</a>)}
          <div className="site-mobile-actions"><Link href="/login" onClick={() => setMenuOpen(false)} className="site-mobile-signin">Sign in</Link><Link href="/register" onClick={() => setMenuOpen(false)} className="site-button site-button-primary">Get started <ArrowRight size={16}/></Link></div>
        </nav>
        <div className="site-nav-actions"><button className="site-icon-button" onClick={toggleTheme} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`} title="Change theme">{theme === "dark" ? <Sun size={18}/> : <Moon size={18}/>}</button><Link href="/login" className="site-signin">Sign in</Link><Link href="/register" className="site-button site-button-primary site-nav-cta">Get started <ArrowRight size={15}/></Link><button className="site-icon-button site-menu-toggle" aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} onClick={() => setMenuOpen(value => !value)}>{menuOpen ? <X size={20}/> : <Menu size={20}/>}</button></div>
      </div>
    </header>

    <section className="site-hero">
      <div className="site-hero-copy"><div className="site-kicker"><span className="site-kicker-mark"/> Casework, grounded in the record</div><h1>Turn complex case files into <em>clear, reviewable evidence.</em></h1><p>Bring documents and case information together. Find relevant details, surface inconsistencies, and keep every important finding tied to its source.</p><div className="site-hero-actions"><Link href="/register" className="site-button site-button-primary">Create your workspace <ArrowRight size={16}/></Link><a href="#features" className="site-button site-button-secondary">Explore features <ArrowDown size={15}/></a></div><div className="site-trust-row"><span><Check size={15}/> Evidence stays inspectable</span><span><Check size={15}/> People remain in control</span></div></div>
      <div className="site-preview-wrap" aria-label="Illustrative CaseLens workspace preview">
        <div className="site-preview-window"><div className="site-preview-top"><div className="site-preview-dots"><i/><i/><i/></div><div className="site-preview-title">CaseLens <b>AI</b> <span>/ Case overview</span></div><div className="site-preview-avatar">CL</div></div><div className="site-preview-layout"><aside className="site-preview-side"><div className="site-preview-side-brand"><Image src="/caselens-mark.svg" alt="" width={22} height={22}/> Workspace</div><div className="site-preview-side-active">▦　Overview</div><div>▱　Cases</div><div>▤　Documents</div><div>⌕　Evidence</div><div>◷　Activity</div></aside><div className="site-preview-main"><div className="site-preview-breadcrumb">MATTER OVERVIEW <span>·</span> CL-2048</div><div className="site-preview-heading">Rahman v. Northstar Textiles <span>Review needed</span></div><div className="site-preview-sub">Employment matter · Updated today</div><div className="site-preview-stat-grid"><div><small>DOCUMENTS</small><strong>8 <span>files</span></strong></div><div><small>REVIEW ITEMS</small><strong>3 <span>open</span></strong></div><div><small>SOURCE LINKS</small><strong>12 <span>references</span></strong></div></div><div className="site-preview-evidence"><div className="site-preview-evidence-head"><span className="site-evidence-icon"><FileSearch size={15}/></span><div><small>DATE DIFFERENCE · NEEDS REVIEW</small><strong>Employment start date</strong></div><span className="site-preview-chevron"><ChevronDown size={15}/></span></div><div className="site-preview-quote">“The intake records 12 March 2024; the employer letter records 18 March 2024.”</div><div className="site-preview-source"><FileText size={13}/> Intake form · p. 2 <span>Employer letter · p. 1</span></div></div><div className="site-preview-note"><ShieldCheck size={14}/> Check each source before relying on a finding.</div></div></div></div>
        <div className="site-preview-caption"><span className="site-caption-dot"/> Product preview · fictional case details</div>
      </div>
      <div className="site-hero-footnote">A workspace for careful, source-led casework <span>Built for legal-aid teams</span></div>
    </section>

    <section id="features" className="site-section site-feature-section"><div className="site-container"><div className="site-section-intro"><div><div className="site-kicker">One file, many sources</div><h2>More context. Fewer blind spots.</h2></div><p>CaseLens brings the pieces of a case together and keeps the path back to the record visible.</p></div><div className="site-feature-grid">{features.map(([Icon, title, description], index) => <article key={title} className={`site-feature-card site-feature-${index + 1}`}><div className="site-feature-icon"><Icon size={19}/></div><div className="site-feature-number">0{index + 1}</div><h3>{title}</h3><p>{description}</p></article>)}</div></div></section>

    <section id="how-it-works" className="site-section site-workflow-section"><div className="site-container"><div className="site-kicker">A transparent workflow</div><h2>From scattered records to a checked case file.</h2><div className="site-steps">{steps.map(([number, title, description]) => <article className="site-step" key={number}><div className="site-step-number">{number}</div><div className="site-step-copy"><h3>{title}</h3><p>{description}</p></div></article>)}</div></div></section>

    <section id="about" className="site-section site-built-section"><div className="site-container site-built-layout"><div><div className="site-kicker">Designed for careful casework</div><h2>A clearer record. A human decision.</h2><p className="site-built-lead">Small teams need a practical way to find evidence without losing context or overstating what a document says.</p><Link href="/register" className="site-inline-link">See the workspace <ArrowRight size={15}/></Link></div><div className="site-principles"><article><div>01</div><div><h3>Evidence transparency</h3><p>Trace a finding back to its file, excerpt, and location.</p></div></article><article><div>02</div><div><h3>Organized documentation</h3><p>Keep case details and supporting records together.</p></div></article><article><div>03</div><div><h3>Human oversight</h3><p>Review stays part of the workflow, not an afterthought.</p></div></article><article><div>04</div><div><h3>Account-scoped records</h3><p>Supabase authentication and row policies keep workspace access scoped.</p></div></article></div></div></section>

    <section className="site-section site-showcase-section"><div className="site-container site-showcase"><div className="site-showcase-copy"><div className="site-kicker">A workspace built around the source</div><h2>Know what was found—and where to check it.</h2><p>Move from case overview to original documents, evidence excerpts, open questions, and review activity without losing the thread.</p><ul><li><Check size={15}/> Case and document organization</li><li><Check size={15}/> Searchable source excerpts</li><li><Check size={15}/> Review decisions and audit history</li></ul><Link href="/register" className="site-inline-link">Explore CaseLens <ArrowRight size={15}/></Link></div><div className="site-showcase-board"><div className="site-board-top"><span>CASE FILE <b>CL-2048</b></span><span className="site-board-status">In review</span></div><div className="site-board-content"><div className="site-board-sidebar"><b>MATTER</b><span className="selected">Overview</span><span>Documents</span><span>Evidence</span><span>Review notes</span></div><div className="site-board-main"><div className="site-board-main-title">Evidence review <span>2 open items</span></div><div className="site-board-finding"><div className="site-board-finding-icon"><FileSearch size={16}/></div><div><b>Recorded wage differs</b><p>Payroll summary · row 18 <span>↗</span></p></div><span className="site-board-tag">CHECK</span></div><div className="site-board-finding"><div className="site-board-finding-icon muted"><CircleHelp size={16}/></div><div><b>Notice not located</b><p>Follow up with client</p></div><span className="site-board-tag neutral">OPEN</span></div><div className="site-board-review"><ShieldCheck size={15}/> Waiting for case worker review</div></div></div><div className="site-board-foot"><span><span className="site-caption-dot"/> Source-linked</span><span>Illustrative interface</span></div></div></div></section>

    <section className="site-section site-faq-section"><div className="site-container site-faq-layout"><div><div className="site-kicker">Questions and answers</div><h2>What to know before you begin.</h2><p>Understand the current prototype’s capabilities and limits.</p><Link href="/register" className="site-inline-link">Create your workspace <ArrowRight size={15}/></Link></div><div className="site-faq-list">{questions.map(([question, answer]) => <details key={question} className="site-faq-item"><summary>{question}<ChevronDown size={17}/></summary><p>{answer}</p></details>)}</div></div></section>

    <section id="contact" className="site-final-cta"><div className="site-container site-cta-inner"><div><div className="site-kicker">Make the next step clearer</div><h2>Bring your casework into focus.</h2><p>Set up a workspace and explore the evidence workflow with fictional or approved records.</p></div><div className="site-cta-actions"><Link href="/register" className="site-button site-button-light">Create your workspace <ArrowRight size={16}/></Link><Link href="/login" className="site-button site-button-quiet">Sign in</Link></div></div></section>

    <footer className="site-footer"><div className="site-container"><div className="site-footer-main"><div><Link href="/" className="site-brand"><Image src="/caselens-mark.svg" alt="" width={32} height={32}/><span>CaseLens <b>AI</b></span></Link><p>Evidence kept in context. Decisions kept with people.</p></div><div className="site-footer-links"><a href="#features">Features</a><a href="#about">About</a><a href="#contact">Contact</a><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></div><div className="site-footer-repo"><a href="https://github.com/ghulamebilal-dev/caselens-ai/issues" target="_blank" rel="noreferrer">Contact the project <ArrowRight size={14}/></a><span>Open a project issue</span></div></div><div className="site-footer-bottom"><span>© {new Date().getFullYear()} CaseLens AI</span><span>CaseLens supports case review; it does not provide legal advice.</span></div></div></footer>
  </main>;
}
