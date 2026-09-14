"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatJobLocation } from "@/lib/domain/jobLocation";
import { jobTiming } from "@/lib/domain/briefPresentation";
import { AppHeader, PageFooter, PageShell, StatusChip } from "@/components/ui/AppHeader";

export default function SupervisorDeskPage() {
  const [jrbs, setJrbs] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

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
            Use this list to see who is working and which briefs need a supervisor or safety professional in person.
            Open a job to watch the briefing, then use the CSRA pre-job meeting scorecard to record the quality of that conversation.
          </p>
        )}
        <ul className="mt-6 space-y-3">
          {(jrbs ?? []).map((j) => {
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
              <p className="mt-1 text-sm">{j.jrbNumber} · Worker in Charge: {j.employeeInCharge?.displayName ?? "Not identified"}</p>
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
                <Link href={`/briefs/${j.id}`} className="rounded-xl border border-[var(--border)] px-4 py-3 font-bold">
                  Open the job brief
                </Link>
              </div>
            </li>
            );
          })}
        </ul>
        {jrbs && jrbs.length === 0 && !error ? <p className="eg-muted mt-6">No active job briefs right now.</p> : null}
      </PageShell>
      <PageFooter />
    </div>
  );
}
