import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CaseLens AI | Evidence in context",
  description: "Organize case records, search source evidence, and keep human review visible.",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><body><script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('caselens-theme');document.documentElement.dataset.theme=t==='dark'||t==='light'?t:(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')}catch(e){}` }}/>{children}</body></html>;
}
