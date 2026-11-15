import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CaseLens AI | Legal case intelligence",
  description: "Evidence-led case intelligence for legal-aid teams.",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
