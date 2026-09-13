"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { BigButton, Field, voiceMark } from "@/components/field/FieldChrome";
import { JobLocationSummary } from "@/components/field/JobLocation";
import { PageVoiceAssistant } from "@/components/field/PageVoiceAssistant";
import { schemaForStep } from "@/lib/voice/pageSchemas";

export default function CloseoutPage() {
  const params = useParams<{ id: string }>();
  const [form, setForm] = useState<Record<string, any>>({});
  const [voiceKeys, setVoiceKeys] = useState<string[]>([]);
  const [jrb, setJrb] = useState<any>(null);
  const schema = schemaForStep("closeout")!;
  useEffect(() => {
    fetch(`/api/jrbs/${params.id}`)
      .then((r) => r.json())
      .then((d) => setJrb(d.jrb ?? null))
      .catch(() => setJrb(null));
  }, [params.id]);
  return (
    <main className="mx-auto max-w-xl space-y-4 px-4 py-8">
      <h1 className="text-3xl font-bold">Post-job review</h1>
      <p>This is not used to score people.</p>
      {jrb ? <JobLocationSummary jrb={jrb} /> : null}
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
      <BigButton
        onClick={async () => {
          await fetch(`/api/jrbs/${params.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "saveCloseout", review: form }),
          });
        }}
      >
        Save closeout
      </BigButton>
    </main>
  );
}
