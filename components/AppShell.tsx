"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChatCircleDots,
  ClockCounterClockwise,
  Files,
  MagnifyingGlass,
  NotePencil,
  ShieldCheck,
  Sparkle,
} from "@phosphor-icons/react";
import type { ReactNode } from "react";

const navigation = [
  { href: "/", label: "Ask", icon: ChatCircleDots },
  { href: "/bronnen", label: "Sources", icon: Files },
  { href: "/notities", label: "Notes", icon: NotePencil },
  { href: "/historiek", label: "Previous answers", icon: ClockCounterClockwise },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <Link href="/" className="sidebar-brand" aria-label="Bronwijzer home page">
          <span className="sidebar-brand-mark" aria-hidden="true"><Sparkle weight="fill" /></span>
          <span>
            <strong>Bronwijzer</strong>
            <small>Your evidence assistant</small>
          </span>
        </Link>

        <nav className="sidebar-nav" aria-label="Main navigation">
          {navigation.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link href={href} className={active ? "active" : ""} aria-current={active ? "page" : undefined} key={href}>
                <Icon aria-hidden="true" weight={active ? "fill" : "regular"} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="control-card">
          <ShieldCheck aria-hidden="true" weight="duotone" />
          <div>
            <strong>You remain in control</strong>
            <p>Bronwijzer never sends an answer. You review, edit and approve every version.</p>
          </div>
        </div>
      </aside>

      <div className="app-frame">
        <header className="app-topbar">
          <div className="municipality-context">
            <strong>Municipality of Schoten</strong>
            <span>Local economy</span>
          </div>
          <Link className="topbar-search" href="/historiek">
            <MagnifyingGlass aria-hidden="true" />
            <span>Search previous answers</span>
          </Link>
          <div className="officer-context">
            <span className="officer-avatar" aria-hidden="true">LO</span>
            <span>
              <strong>Local economy</strong>
              <small>Municipal officer</small>
            </span>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
