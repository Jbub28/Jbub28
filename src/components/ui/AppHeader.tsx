"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function BrandMark(props: { compact?: boolean }) {
  const size = props.compact ? 36 : 44;
  return (
    <span
      className="inline-flex items-center justify-center rounded-lg bg-[#f0c43a] text-[#0a3161] shadow-sm"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg viewBox="0 0 32 32" width={size - 10} height={size - 10}>
        <path d="M18 4 8 18h7l-2 10 12-16h-7z" fill="currentColor" />
      </svg>
    </span>
  );
}

export function AppHeader(props: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <header className="bg-[var(--bg-navy)] text-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-3">
          <BrandMark />
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#f0c43a]">Electric Delivery</p>
            <p className="text-lg font-bold leading-tight">EnergyGuard JRB</p>
          </div>
        </div>
        {props.right}
      </div>
      <SiteNav />
      <div className="h-1 bg-[#f0c43a]" aria-hidden />
      <div className="border-t border-white/10 bg-[#134074]">
        <div className="mx-auto max-w-5xl px-4 py-3">
          <h1 className="text-2xl font-bold">{props.title}</h1>
          {props.subtitle ? <p className="mt-1 text-sm text-white/85">{props.subtitle}</p> : null}
        </div>
      </div>
    </header>
  );
}

function SiteNav() {
  const [roles, setRoles] = useState<string[]>([]);
  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => setRoles(d.user?.roles ?? []))
      .catch(() => undefined);
  }, []);
  return (
    <nav className="border-t border-white/10 bg-[#0c3a6e] px-4 py-2" aria-label="Main">
      <div className="mx-auto flex max-w-5xl flex-wrap gap-x-4 gap-y-1 text-sm font-bold">
        <Link className="underline decoration-white/40 underline-offset-4" href="/briefs">
          Home
        </Link>
        {canSeeSupervisorLog(roles) ? (
          <Link className="underline decoration-white/40 underline-offset-4" href="/admin/supervisor">
            Supervisor
          </Link>
        ) : null}
        {canSeeLibraries(roles) ? (
          <Link className="underline decoration-white/40 underline-offset-4" href="/admin">
            Libraries
          </Link>
        ) : null}
      </div>
    </nav>
  );
}

export function StatusChip(props: { children: React.ReactNode; tone?: "ok" | "warn" | "neutral" }) {
  const tone =
    props.tone === "ok"
      ? "bg-[var(--ok-bg)] text-[var(--ok)]"
      : props.tone === "warn"
        ? "bg-[var(--warn-bg)] text-[var(--warn)]"
        : "bg-[var(--surface-2)] text-[var(--muted)]";
  return <span className={`inline-flex min-h-8 items-center rounded-full px-3 py-1 text-sm font-bold ${tone}`}>{props.children}</span>;
}

export function PageShell(props: { children: React.ReactNode; wide?: boolean }) {
  return <main className={`mx-auto ${props.wide ? "max-w-5xl" : "max-w-xl"} px-4 py-6`}>{props.children}</main>;
}

export function PageFooter() {
  return (
    <p className="eg-muted mx-auto max-w-5xl px-4 py-8 text-center text-sm">
      EnergyGuard JRB · Electric Delivery · Authorized crew use
    </p>
  );
}

export function canSeeLibraries(roles: string[] | undefined): boolean {
  if (!roles?.length) return false;
  return roles.some((r) =>
    [
      "application_administrator",
      "eei_task_library_administrator",
      "direct_control_library_administrator",
      "alternative_control_administrator",
      "regulatory_content_administrator",
      "safety_reviewer",
    ].includes(r),
  );
}

export function canSeeSupervisorLog(roles: string[] | undefined): boolean {
  if (!roles?.length) return false;
  return roles.some((r) => ["supervisor", "safety_reviewer", "application_administrator"].includes(r));
}
