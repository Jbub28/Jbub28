"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatJobLocation } from "@/lib/domain/jobLocation";
import { jobTiming, type SupervisorDeskFolder } from "@/lib/domain/briefPresentation";
import { AppHeader, PageFooter, PageShell, StatusChip } from "@/components/ui/AppHeader";

const FOLDERS: { id: SupervisorDeskFolder; label: string }[] = [
  { id: "in_progress", label: "In progress" },
  { id: "submitted", label: "Submitted / completed" },
];

export default function SupervisorDeskPage() {
  const [jrbs, setJrbs] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [folder, setFolder] = useState<SupervisorDeskFolder>("in_progress");

  useEffect(() => {
    fetch("/api/admin/supervisor")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Not allowed.");
        setJrbs(d.jrbs ?? []);
      })
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(tick);
  }, []);

  const grouped = useMemo(() => {
    const list = jrbs ?? [];
    return {
      in_progress: list.filter((j) => j.deskFolder !== "submitted"),
      submitted: list.filter((j) => j.deskFolder === "submitted"),
    };
  }, [jrbs]);
  const shown = grouped[folder];

  return (
    <div className="min-h-dvh">
      <AppHeader
        title="Supervisor desk"
        subtitle="Active crews, ordered by what needs a look first. This order is not a safety score and does not approve work."
      />
      <PageShell wide>
        {error ? (
          <p className="eg-danger p-3" role="alert">{error}</p>
        ) : (
          <p className="eg-card p-4">
            Line Crew 14 briefs you supervise. In progress means the crew is still writing. Submitted / completed means the brief was released for work or closed after post-job review.
            Open a job to review the briefing. Use the CSRA pre-job meeting scorecard to record the quality of that conversation. You cannot change the crew form.
          </p>
        )}
        <div className="mt-6 grid grid-cols-2 gap-2" role="tablist" aria-label="Supervisor brief folders">
          {FOLDERS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={folder === item.id}
              className={`rounded-xl px-2 py-3 text-sm font-bold ${folder === item.id ? "bg-[var(--navy)] text-white" : "border border-[var(--border)] bg-white"}`}
              onClick={() => setFolder(item.id)}
            >
              {item.label} ({grouped[item.id].length})
            </button>
          ))}
        </div>
        <ul className="mt-6 space-y-3">
          {shown.map((j) => {
            const timing = jobTiming(j, new Date(now));
            return (
            <li key={j.id} className="eg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-xl font-bold">{j.title}</p>
                <div className="flex flex-wrap gap-2">
                  <StatusChip tone={j.attention.band === "urgent" ? "warn" : j.attention.band === "watch" ? "warn" : "ok"}>
                    {j.attentionLabel}
                  </StatusChip>
                  <StatusChip tone={j.status === "stop_work_active" || j.status === "rebrief_required" ? "warn" : "neutral"}>
                    {j.plainStatus}
                  </StatusChip>
                </div>
              </div>
              <p className="mt-1 text-sm">{j.jrbNumber} · {j.createdByName ?? j.employeeInCharge?.displayName ?? "Crew member"} · Worker in Charge: {j.employeeInCharge?.displayName ?? "Not identified"}</p>
              {timing.line ? <p className="text-sm">{timing.line}</p> : null}
              <p className="eg-muted text-sm">{formatJobLocation(j) || "Location not entered"}</p>
              <ul className="mt-2 list-disc pl-5 text-sm">
                {(j.attention.reasons ?? []).slice(0, 3).map((reason: string) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
              {j.qualityScore ? <p className="mt-2 text-sm">Last CSRA scorecard: {j.qualityScore}</p> : <p className="mt-2 text-sm">No CSRA scorecard yet.</p>}
              <div className="mt-3 flex flex-wrap gap-3">
                <Link href={`/admin/supervisor/assess/${j.id}`} className="rounded-xl bg-[var(--navy)] px-4 py-3 font-bold text-white">
                  Assess this briefing
                </Link>
                <Link href={`/admin/supervisor/brief/${j.id}`} className="rounded-xl border border-[var(--border)] px-4 py-3 font-bold">
                  Open the job brief
                </Link>
              </div>
            </li>
            );
          })}
        </ul>
        {jrbs && shown.length === 0 && !error ? (
          <p className="eg-muted mt-6">
            {folder === "in_progress" ? "No in-progress briefs from crews you supervise." : "No submitted or completed briefs from crews you supervise."}
          </p>
        ) : null}
      </PageShell>
      <PageFooter />
    </div>
  );
}
