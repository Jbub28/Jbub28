"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatJobLocation } from "@/lib/domain/jobLocation";
import { AppHeader, PageShell, StatusChip } from "@/components/ui/AppHeader";

export default function SupervisorLogPage() {
  const [jrbs, setJrbs] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/supervisor-log")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Not allowed.");
        setJrbs(d.jrbs ?? []);
      })
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div className="min-h-dvh">
      <AppHeader
        title="Supervisor log"
        subtitle="Hidden from field crews. Review of submitted JRBs is planned for a later version."
      />
      <PageShell wide>
        <div className="eg-alert p-4">
          <p className="font-bold">Not active in this version</p>
          <p>Supervisors will review released and closed job briefs here later. No review, comment, or approval actions are available yet.</p>
        </div>
        {error ? <p className="eg-danger mt-4 p-3" role="alert">{error}</p> : null}
        <p className="mt-4">
          <Link href="/briefs" className="font-bold text-[var(--navy)] underline">My briefs</Link>
          {" · "}
          <Link href="/admin" className="font-bold text-[var(--navy)] underline">Libraries</Link>
        </p>
        <ul className="mt-6 space-y-3">
          {(jrbs ?? []).map((j) => (
            <li key={j.id} className="eg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-xl font-bold">{j.jrbNumber}</p>
                <StatusChip tone={j.status === "released_for_work" || j.status === "closed" ? "ok" : "neutral"}>
                  {j.status.replaceAll("_", " ")}
                </StatusChip>
              </div>
              <p>{j.workType?.exactName}</p>
              <p className="eg-muted text-sm">{formatJobLocation(j) || "Location not entered"}</p>
              <p className="eg-muted text-sm">Worker in Charge: {j.employeeInCharge?.displayName ?? "Not identified"}</p>
            </li>
          ))}
        </ul>
        {jrbs && jrbs.length === 0 ? <p className="eg-muted mt-6">No job briefs are in this log yet.</p> : null}
      </PageShell>
    </div>
  );
}
