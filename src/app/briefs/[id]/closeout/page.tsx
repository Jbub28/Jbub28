"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { BigButton, Field, voiceMark } from "@/components/field/FieldChrome";
import { JobLocationSummary } from "@/components/field/JobLocation";
import { PageVoiceAssistant } from "@/components/field/PageVoiceAssistant";
import { schemaForStep } from "@/lib/voice/pageSchemas";
import { AppHeader, PageFooter, PageShell } from "@/components/ui/AppHeader";
import { canMarkCompleted, plainStatus } from "@/lib/domain/briefPresentation";

export default function CloseoutPage() {
  const params = useParams<{ id: string }>();
  const [form, setForm] = useState<Record<string, any>>({});
  const [voiceKeys, setVoiceKeys] = useState<string[]>([]);
  const [jrb, setJrb] = useState<any>(null);
  const [locationStatus, setLocationStatus] = useState<"loading" | "ready" | "missing">("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const schema = schemaForStep("closeout")!;
  useEffect(() => {
    setLocationStatus("loading");
    fetch(`/api/jrbs/${params.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.jrb) {
          setJrb(d.jrb);
          const existing = d.jrb.versions?.[0]?.postJobReviews?.[0];
          if (existing) setForm(existing);
          setLocationStatus("ready");
        } else {
          setJrb(null);
          setLocationStatus("missing");
        }
      })
      .catch(() => {
        setJrb(null);
        setLocationStatus("missing");
      });
  }, [params.id]);

  const save = async (markDone: boolean) => {
    setError(null);
    setMessage(null);
    const res = await fetch(`/api/jrbs/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "saveCloseout", review: { ...form, completed: markDone } }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Could not save the post-job review.");
      return;
    }
    setJrb(data.jrb);
    setMessage(markDone ? "This job is Completed." : "Post-job review saved. The job is still in progress.");
  };

  const allowComplete = canMarkCompleted(jrb?.status);
  return (
    <div className="min-h-dvh">
      <AppHeader
        title="Post-job review"
        subtitle={`Status: ${plainStatus(jrb?.status)}. This is not used to score people.`}
      />
      <PageShell>
      <div className="space-y-4">
      <p>
        <Link href="/briefs" className="font-bold text-[var(--navy)] underline">Home / My briefs</Link>
        {" · "}
        <Link href={`/briefs/${params.id}`} className="font-bold text-[var(--navy)] underline">Back to this job brief</Link>
      </p>
      {locationStatus === "loading" ? <p>Loading job location…</p> : null}
      {locationStatus === "missing" ? <p>Job Location is not available for this brief.</p> : null}
      {jrb ? <JobLocationSummary jrb={jrb} /> : null}
      {!allowComplete && jrb ? (
        <p className="eg-alert p-3">
          Submit the job brief first so the status is <span className="font-bold">Job in progress</span>. You can save notes now, but Completed is only available after the job has started.
        </p>
      ) : (
        <p className="eg-card p-3">
          The job stays <span className="font-bold">Job in progress</span> until this review is finished. Then it becomes <span className="font-bold">Completed</span>.
        </p>
      )}
      <PageVoiceAssistant
        schema={schema}
        currentValues={form}
        onApply={(updates, meta) => {
          setForm((f) => ({ ...f, ...updates }));
          setVoiceKeys(meta.appliedKeys);
        }}
      />
      {[
        ["completed", "Post-job review completed"],
        ["holdOrdersReleased", "Hold orders or WPA released when applicable"],
        ["travelPlanReviewed", "Travel plan reviewed"],
        ["finalCircleOfSafety", "Final Circle of Safety or spotter review"],
        ["groundsRemoved", "Grounds removed when applicable"],
        ["cargoSecured", "Cargo secured"],
        ["spotterUseCompleted", "Spotter use completed when applicable"],
        ["noIssues", "No issues during job"],
        ["rebriefWasNecessary", "Rebrief was necessary"],
        ["stopWorkUsed", "Stop-work authority was used"],
      ].map(([k, label]) => (
        <label key={k} className="flex items-center gap-3 text-lg">
          <input type="checkbox" className="size-8" checked={Boolean(form[k])} onChange={(e) => setForm({ ...form, [k]: e.target.checked })} />
          {label}
        </label>
      ))}
      <Field id="well" label="What went well?" textarea highlight={voiceMark(voiceKeys, "whatWentWell")} value={form.whatWentWell ?? ""} onChange={(v) => setForm({ ...form, whatWentWell: v })} />
      <Field id="imp" label="What needs improvement?" textarea highlight={voiceMark(voiceKeys, "whatNeedsImprovement")} value={form.whatNeedsImprovement ?? ""} onChange={(v) => setForm({ ...form, whatNeedsImprovement: v })} />
      <Field id="best" label="Best practices" textarea highlight={voiceMark(voiceKeys, "bestPractices")} value={form.bestPractices ?? ""} onChange={(v) => setForm({ ...form, bestPractices: v })} />
      {error ? <p className="eg-danger p-3" role="alert">{error}</p> : null}
      {message ? <p className="eg-card p-3" role="status">{message}</p> : null}
      <BigButton onClick={() => void save(false)}>Save review — keep job in progress</BigButton>
      <BigButton
        primary
        onClick={() => {
          if (!form.completed) {
            setError("Check “Post-job review completed” before marking the job Completed.");
            return;
          }
          void save(true);
        }}
      >
        Finish job — mark Completed
      </BigButton>
      </div>
      </PageShell>
      <PageFooter />
    </div>
  );
}
