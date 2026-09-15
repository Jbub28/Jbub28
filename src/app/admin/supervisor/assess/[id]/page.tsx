"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppHeader, PageFooter, PageShell } from "@/components/ui/AppHeader";
import { CSRA_SCORECARD_SOURCE, CSRA_SCORECARD_TITLE, csraWeightedScore } from "@/lib/domain/csraScorecard";

export default function SupervisorAssessPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, boolean | null>>({});
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/supervisor/assess/${params.id}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Not allowed.");
        setData(d);
        const latest = d.latest?.answers ?? {};
        setAnswers(latest);
        setNotes(d.latest?.notes ?? "");
      })
      .catch((e) => setError(e.message));
  }, [params.id]);

  const score = csraWeightedScore(answers);
  const max = data?.maxScore ?? 57;

  return (
    <div className="min-h-dvh">
      <AppHeader
        title={CSRA_SCORECARD_TITLE}
        subtitle="Observer scorecard for the job briefing conversation. This is not part of the crew JRB form and does not release work."
      />
      <PageShell>
        <p className="mb-4">
          <Link href="/admin/supervisor" className="font-bold text-[var(--navy)] underline">Back to Supervisor desk</Link>
          {" · "}
          <Link href={`/admin/supervisor/brief/${params.id}`} className="font-bold text-[var(--navy)] underline">Open the job brief</Link>
        </p>
        {error ? <p className="eg-danger p-3" role="alert">{error}</p> : null}
        {data?.jrb ? (
          <article className="eg-card mb-4 p-4">
            <p className="text-xl font-bold">{data.jrb.title}</p>
            <p className="text-sm">{data.jrb.jrbNumber} · {data.jrb.plainStatus}</p>
            <p className="text-sm">Worker in Charge: {data.jrb.employeeInCharge?.displayName ?? "Not identified"}</p>
            <p className="eg-muted text-sm">{data.jrb.jobLocation || "Location not entered"}</p>
            <p className="mt-2 text-sm">Source: {CSRA_SCORECARD_SOURCE}. True = 1, False = 0. Weighted score = weight × (1 or 0).</p>
          </article>
        ) : null}
        <p className="text-lg font-bold">Running score: {score} / {max}</p>
        <ol className="mt-4 space-y-4">
          {(data?.items ?? []).map((item: any) => {
            const key = String(item.number);
            const value = answers[key];
            return (
              <li key={item.number} className="eg-card p-4">
                <p className="font-bold">{item.number}. {item.statement}</p>
                <p className="eg-muted mt-1 text-sm">{item.guidance}</p>
                <p className="mt-2 text-sm">Weight {item.weight} · Weighted score {value === true ? item.weight : 0}</p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    className={`min-h-12 flex-1 rounded-xl font-bold ${value === true ? "bg-[var(--navy)] text-white" : "border border-[var(--border)] bg-white"}`}
                    onClick={() => setAnswers((a) => ({ ...a, [key]: true }))}
                  >
                    True
                  </button>
                  <button
                    type="button"
                    className={`min-h-12 flex-1 rounded-xl font-bold ${value === false ? "bg-[var(--navy)] text-white" : "border border-[var(--border)] bg-white"}`}
                    onClick={() => setAnswers((a) => ({ ...a, [key]: false }))}
                  >
                    False
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
        <label className="mt-6 block space-y-1">
          <span className="text-lg font-bold">Observer notes</span>
          <textarea className="min-h-28 w-full rounded-xl border-2 border-[var(--border)] p-3 text-lg" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        {saved ? <p className="mt-3" role="status">{saved}</p> : null}
        <button
          type="button"
          className="mt-4 min-h-14 w-full rounded-2xl bg-[var(--navy)] text-xl font-bold text-white"
          onClick={async () => {
            setSaved(null);
            const res = await fetch(`/api/admin/supervisor/assess/${params.id}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ answers, notes }),
            });
            const payload = await res.json().catch(() => ({}));
            if (!res.ok) {
              setSaved(payload.error ?? "Could not save the scorecard.");
              return;
            }
            setSaved(`Saved. Weighted score ${payload.assessment.totalWeightedScore} / ${payload.assessment.maxScore}.`);
          }}
        >
          Save scorecard
        </button>
      </PageShell>
      <PageFooter />
    </div>
  );
}
