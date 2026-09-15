"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppHeader, PageFooter, PageShell } from "@/components/ui/AppHeader";
import { SupervisorBriefReview } from "@/components/supervisor/BriefReview";

export default function SupervisorBriefPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/admin/supervisor/brief/${id}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Not allowed.");
        setData(d);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  return (
    <div className="min-h-dvh">
      <AppHeader
        title="Job brief"
        subtitle="Supervisor review of the crew briefing. You cannot change this form."
      />
      <PageShell>
        <p className="mb-4">
          <Link href="/admin/supervisor" className="font-bold text-[var(--navy)] underline">
            Back to Supervisor desk
          </Link>
          {" · "}
          <Link href={`/admin/supervisor/assess/${id}`} className="font-bold text-[var(--navy)] underline">
            Assess this briefing
          </Link>
        </p>
        {error ? (
          <p className="eg-danger p-3" role="alert">
            {error}
          </p>
        ) : null}
        {!data && !error ? <p className="text-xl">Loading the job brief…</p> : null}
        {data?.jrb ? <SupervisorBriefReview jrb={data.jrb} readiness={data.readiness ?? null} /> : null}
      </PageShell>
      <PageFooter />
    </div>
  );
}
