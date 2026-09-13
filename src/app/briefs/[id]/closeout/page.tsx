"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { BigButton, Field, voiceMark } from "@/components/field/FieldChrome";
import { JobLocationSummary } from "@/components/field/JobLocation";
import { PageVoiceAssistant } from "@/components/field/PageVoiceAssistant";
import { schemaForStep } from "@/lib/voice/pageSchemas";
import { AppHeader, PageFooter, PageShell } from "@/components/ui/AppHeader";

export default function CloseoutPage() {
  const params = useParams<{ id: string }>();
  const [form, setForm] = useState<Record<string, any>>({});
  const [voiceKeys, setVoiceKeys] = useState<string[]>([]);
  const [jrb, setJrb] = useState<any>(null);
  const [locationStatus, setLocationStatus] = useState<"loading" | "ready" | "missing">("loading");
  const schema = schemaForStep("closeout")!;
  useEffect(() => {
    setLocationStatus("loading");
    fetch(`/api/jrbs/${params.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.jrb) {
          setJrb(d.jrb);
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
  return (
    <div className="min-h-dvh">
      <AppHeader title="Post-job review" subtitle="This is not used to score people." />
      <PageShell>
      <div className="space-y-4">
      {locationStatus === "loading" ? <p>Loading job location…</p> : null}
      {locationStatus === "missing" ? <p>Job Location is not available for this brief.</p> : null}
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
      </div>
      </PageShell>
      <PageFooter />
    </div>
  );
}
