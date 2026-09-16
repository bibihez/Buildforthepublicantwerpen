import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bronwijzer · Schoten",
  description: "Onderbouwde antwoorden uit gecontroleerde officiële bronnen.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="nl">
      <body>
        <header className="app-header">
          <Link href="/" className="brand" aria-label="Bronwijzer startpagina">
            <span className="brand-mark" aria-hidden="true">B</span>
            <span>
              <strong>Bronwijzer</strong>
              <small>Lokale economie · Schoten</small>
            </span>
          </Link>
          <nav aria-label="Hoofdnavigatie">
            <Link href="/">Nieuw antwoord</Link>
            <Link href="/bronnen">Bronnen</Link>
            <Link href="/notities">Notities</Link>
            <Link href="/historiek">Historiek</Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
