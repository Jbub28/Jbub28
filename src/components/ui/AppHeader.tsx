"use client";

export function AppHeader(props: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <header className="bg-[var(--bg-navy)] text-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#f0c43a]">Electric Delivery</p>
          <p className="text-lg font-bold leading-tight">EnergyGuard JRB</p>
        </div>
        {props.right}
      </div>
      <div className="border-t border-white/15 bg-[#134074]">
        <div className="mx-auto max-w-5xl px-4 py-3">
          <h1 className="text-2xl font-bold">{props.title}</h1>
          {props.subtitle ? <p className="mt-1 text-sm text-white/85">{props.subtitle}</p> : null}
        </div>
      </div>
    </header>
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
