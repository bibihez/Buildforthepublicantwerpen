import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bronwijzer · Schoten",
  description: "Evidence-based answers from verified official sources.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <header className="app-header">
          <Link href="/" className="brand" aria-label="Bronwijzer home page">
            <span className="brand-mark" aria-hidden="true">B</span>
            <span>
              <strong>Bronwijzer</strong>
              <small>Local economy · Schoten</small>
            </span>
          </Link>
          <nav aria-label="Main navigation">
            <Link href="/">New answer</Link>
            <Link href="/bronnen">Sources</Link>
            <Link href="/notities">Notes</Link>
            <Link href="/historiek">History</Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
