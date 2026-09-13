"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Field, FieldChrome, BigButton, STEPS } from "./FieldChrome";
import { JobLocationFields, JobLocationSummary, useOptionalGps } from "./JobLocation";
import { REBRIEF_REASONS } from "@/lib/domain/controls";
import { READY_NOTICE } from "@/lib/domain/readiness";
import { formatGps, formatJobLocation, locationFromRecord, persistableLocation } from "@/lib/domain/jobLocation";
import { saveDraftLocal } from "@/lib/offline/store";
import { useSpeechToText } from "@/hooks/useSpeechToText";
import { joinSpokenText } from "@/lib/speech/browserSpeech";
import { extractBriefing, analyzeRebriefDelta, extractStopWorkTalk } from "@/lib/conversation/extractBriefing";
import type { BriefingCatalog, BriefingExtraction, FollowUpQuestion } from "@/lib/conversation/types";
import { applyVoicePrefill } from "@/lib/voice/applyPrefill";
import { schemaForStep } from "@/lib/voice/pageSchemas";
import type { ProposedChange } from "@/lib/voice/types";

async function api(url: string, init?: RequestInit) {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
  return data;
}

export function BriefWizard({ id }: { id: string }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<any>(null);
  const [catalog, setCatalog] = useState<any>(null);
  const [saveState, setSaveState] = useState("Saved on Device");
  const [dialog, setDialog] = useState<"stop" | "rebrief" | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [extraction, setExtraction] = useState<BriefingExtraction | null>(null);
  const [proposed, setProposed] = useState<ProposedChange[]>([]);
  const [followAnswer, setFollowAnswer] = useState("");
  const [matches, setMatches] = useState<any>(null);
  const [voiceKeys, setVoiceKeys] = useState<string[]>([]);
  const version = data?.jrb?.versions?.[0];
  const jrb = data?.jrb;
  const loc = locationFromRecord(jrb ?? {});
  const { gpsStatus, capture } = useOptionalGps((lat, lng) => {
    setForm((f) => ({ ...f, gpsCoordinates: formatGps(lat, lng), gpsLatitude: lat, gpsLongitude: lng, gpsPermissionGranted: true }));
  });

  const refresh = useCallback(async () => {
    const [j, c] = await Promise.all([api(`/api/jrbs/${id}`), api("/api/reference/catalog")]);
    setData(j);
    setCatalog(c);
    return j;
  }, [id]);

  useEffect(() => {
    refresh().catch((e) => setErrors([e.message]));
  }, [refresh]);

  const patch = async (action: string, payload: object = {}) => {
    setSaveState("Waiting to Sync");
    try {
      if (!navigator.onLine) {
        await saveDraftLocal(id, { action, payload, at: Date.now() });
        setSaveState("Saved on Device");
        return;
      }
      const next = await api(`/api/jrbs/${id}`, { method: "PATCH", body: JSON.stringify({ action, ...payload }) });
      setData(next);
      await saveDraftLocal(id, next);
      setSaveState("Synchronized");
      return next;
    } catch (e) {
      setSaveState("Sync Error");
      setErrors([e instanceof Error ? e.message : "Save failed"]);
    }
  };

  const briefingCatalog: BriefingCatalog = (() => {
    const byControl = new Map<string, { id: string; exactName: string; exposureIds: string[] }>();
    for (const e of catalog?.exposures ?? []) {
      for (const m of e.mappings ?? []) {
        const dc = m.directControl;
        if (!dc) continue;
        const cur = byControl.get(dc.id) ?? { id: String(dc.id), exactName: String(dc.exactName), exposureIds: [] as string[] };
        cur.exposureIds.push(String(e.id));
        byControl.set(dc.id, cur);
      }
    }
    return {
      exposures: (catalog?.exposures ?? []).map((e: any) => ({
        id: e.id,
        key: e.key,
        label: e.formLabelExact ?? e.dcInventoryLabelExact ?? e.key,
        energyFamily: e.energyFamily,
      })),
      directControls: [...byControl.values()],
      ppe: catalog?.ppe ?? [],
    };
  })();

  const applyExtraction = async (result: BriefingExtraction, current: Record<string, unknown>) => {
    setExtraction(result);
    const startSchema = schemaForStep("start")!;
    const fills = Object.entries(result.location)
      .filter(([, v]) => v)
      .map(([key, value]) => ({ key, label: key, value: String(value), confidence: "high" as const, evidence: String(value) }));
    if (result.crewNames.length) {
      fills.push({ key: "crewText", label: "Crew members", value: result.crewNames.join("\n"), confidence: "high", evidence: "crew" });
    }
    const applied = applyVoicePrefill({
      schema: startSchema,
      current,
      extraction: { transcript: result.transcript, fills, suggestions: [], skipped: [], provider: result.provider, model: result.model },
    });
    setProposed(applied.proposedChanges);
    setVoiceKeys(Object.keys(applied.updates));
    setForm((f) => ({
      ...f,
      ...applied.updates,
      edited: result.workDescription ?? f.edited,
      original: result.transcript,
      circuitNumber: result.location.circuitNumber ?? f.circuitNumber,
    }));
    await patch("saveBriefing", { extraction: result });
    if (result.workDescription) {
      try {
        const workTypeCode = catalog?.workTypes?.find((w: any) => w.id === (form.workTypeId ?? jrb?.workTypeId))?.code ?? jrb?.workType?.code;
        if (workTypeCode) {
          const res = await api("/api/ai/match-tasks", {
            method: "POST",
            body: JSON.stringify({ workTypeCode, text: result.workDescription, originalTranscript: result.transcript, versionId: version?.id }),
          });
          setMatches(res);
        }
      } catch {
        /* library still available */
      }
    }
  };

  const saveStart = () => patch("saveStart", { ...form, ...persistableLocation({ ...jrb, ...loc, ...form }) });

  if (!jrb || !catalog) {
    return (
      <div className="space-y-4 p-6">
        <p className="text-xl">{errors.length ? "Could not load this job brief." : "Loading the job brief…"}</p>
        {errors.map((e) => (
          <p key={e} role="alert">{e}</p>
        ))}
      </div>
    );
  }

  const followUps: FollowUpQuestion[] = extraction?.followUps ?? [];
  const eicName = jrb.employeeInCharge?.displayName ?? "Employee in Charge";

  return (
    <>
      <FieldChrome
        stepIndex={step}
        title={STEPS[step].label}
        saveState={saveState}
        errorSummary={errors}
        onBack={() => setStep((s) => Math.max(0, s - 1))}
        onNext={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
        onSave={() => saveStart()}
        onHelp={() => undefined}
        onStop={() => setDialog("stop")}
        onRebrief={() => setDialog("rebrief")}
        nextLabel={step === STEPS.length - 1 ? "Stay here" : "Next"}
        briefId={id}
      >
        <p className="text-xl">{STEPS[step].question}</p>

        {step === 0 && (
          <div className="space-y-4">
            <p className="text-lg">JRB {jrb.jrbNumber} · {jrb.status.replaceAll("_", " ")}</p>
            {jrb.status === "stop_work_active" ? <ResumeStopWork id={id} onDone={refresh} /> : null}
            <JobLocationFields
              values={{
                jobLocation: form.jobLocation ?? loc.jobLocation,
                streetAddress: form.streetAddress ?? loc.streetAddress,
                gpsCoordinates: form.gpsCoordinates ?? loc.gpsCoordinates,
                locationIdentifier: form.locationIdentifier ?? loc.locationIdentifier,
              }}
              highlights={voiceKeys}
              gpsStatus={gpsStatus}
              onChange={(key, value) => setForm({ ...form, [key]: value })}
              onOptionalGps={capture}
            />
            <JobTalk
              catalog={briefingCatalog}
              currentValues={{
                jobLocation: form.jobLocation ?? loc.jobLocation,
                streetAddress: form.streetAddress ?? loc.streetAddress,
                gpsCoordinates: form.gpsCoordinates ?? loc.gpsCoordinates,
                locationIdentifier: form.locationIdentifier ?? loc.locationIdentifier,
                crewText: form.crewText ?? version?.crewMembers?.map((m: any) => m.name).join("\n") ?? "",
              }}
              proposed={proposed}
              onProposedUsed={(change) => {
                setForm((f) => ({ ...f, [change.key]: change.proposed }));
                setProposed((list) => list.filter((item) => item.key !== change.key));
              }}
              onExtracted={(result, current) => applyExtraction(result, current)}
              extraction={extraction}
            />
            {extraction?.workDescription ? <p className="text-lg"><span className="font-bold">The work: </span>{extraction.workDescription}</p> : null}
            {followUps.length ? (
              <div className="space-y-2 rounded-2xl border-2 border-yellow-300 bg-[#2a1d00] p-4">
                <p className="text-lg font-bold">{followUps[0].question}</p>
                <p className="text-sm">{followUps[0].reason}</p>
                <Field id="follow" label="Answer" textarea value={followAnswer} onChange={setFollowAnswer} />
                <BigButton
                  onClick={async () => {
                    const combined = `${extraction?.transcript ?? ""} ${followAnswer}`.trim();
                    const next = extractBriefing({ transcript: combined, catalog: briefingCatalog });
                    setFollowAnswer("");
                    await applyExtraction(next, {
                      jobLocation: form.jobLocation ?? loc.jobLocation,
                      streetAddress: form.streetAddress ?? loc.streetAddress,
                      locationIdentifier: form.locationIdentifier ?? loc.locationIdentifier,
                      gpsCoordinates: form.gpsCoordinates ?? loc.gpsCoordinates,
                    });
                  }}
                >
                  Use this answer
                </BigButton>
              </div>
            ) : null}
            {matches?.result?.suggestions?.length ? (
              <div className="space-y-2">
                <p className="font-bold text-yellow-300">Suggested EEI task — confirm it yourself</p>
                {matches.result.suggestions.map((s: any) => (
                  <article key={s.taskId} className="rounded-xl bg-[#121a2b] p-3">
                    <p className="font-bold">{s.exactTaskName}</p>
                    <p className="text-sm">{s.explanation}</p>
                    <BigButton onClick={() => patch("confirmTask", { taskId: s.taskId })}>Confirm this task</BigButton>
                  </article>
                ))}
              </div>
            ) : null}
            <Field id="wo" label="Work order number" value={form.workOrderNumber ?? jrb.workOrderNumber ?? ""} onChange={(v) => setForm({ ...form, workOrderNumber: v })} />
            <Field id="ckt" label="Circuit" value={form.circuitNumber ?? extraction?.location.circuitNumber ?? jrb.circuitNumber ?? ""} onChange={(v) => setForm({ ...form, circuitNumber: v })} />
            <Field id="eic" label="Worker in Charge" value={eicName} />
            <Field id="crew" label="Crew members (one per line)" textarea value={form.crewText ?? version?.crewMembers?.map((m: any) => m.name).join("\n") ?? ""} onChange={(v) => setForm({ ...form, crewText: v })} />
            <BigButton
              onClick={async () => {
                const names = String(form.crewText ?? version?.crewMembers?.map((m: any) => m.name).join("\n") ?? "").split("\n").map((n) => n.trim()).filter(Boolean);
                await patch("saveCrew", { crewMembers: names.map((name: string) => ({ name, employer: "Electric Delivery" })) });
                await saveStart();
                if (extraction) await patch("saveBriefing", { extraction, markStartComplete: true });
                setStep(1);
              }}
            >
              Continue
            </BigButton>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            {jrb.status === "stop_work_active" ? (
              <ResumeStopWork id={id} onDone={refresh} />
            ) : null}
            {followUps.length ? (
              <div className="space-y-2 rounded-2xl border-2 border-yellow-300 bg-[#2a1d00] p-4">
                <p className="text-lg font-bold">{followUps[0].question}</p>
                <p className="text-sm">{followUps[0].reason}</p>
                <Field id="follow-2" label="Answer" textarea value={followAnswer} onChange={setFollowAnswer} />
                <BigButton
                  onClick={async () => {
                    const combined = `${extraction?.transcript ?? ""} ${followAnswer}`.trim();
                    const next = extractBriefing({ transcript: combined, catalog: briefingCatalog });
                    setFollowAnswer("");
                    await applyExtraction(next, {
                      jobLocation: form.jobLocation ?? loc.jobLocation,
                      streetAddress: form.streetAddress ?? loc.streetAddress,
                      locationIdentifier: form.locationIdentifier ?? loc.locationIdentifier,
                      gpsCoordinates: form.gpsCoordinates ?? loc.gpsCoordinates,
                    });
                  }}
                >
                  Use this answer
                </BigButton>
              </div>
            ) : null}
            <h2 className="text-xl font-bold">What can seriously hurt or kill us?</h2>
            {(extraction?.highEnergy ?? []).length === 0 ? (
              <p>Nothing from the talk was clear enough to show as High Energy. Add what you see, or go back and talk through the job.</p>
            ) : (
              extraction!.highEnergy.map((he) => (
                <article key={he.exposureId} className="rounded-2xl bg-[#121a2b] p-4">
                  <p className="text-xl font-bold">{he.label}</p>
                  <p className="text-sm">Identified from talk — not confirmed until you say it can hurt us.</p>
                  <p className="text-sm">Heard: {he.evidence}</p>
                </article>
              ))
            )}
            <h2 className="text-xl font-bold">How are we controlling it?</h2>
            {(extraction?.controls ?? []).map((c, i) => (
              <article key={`${c.text}-${i}`} className="rounded-xl bg-[#121a2b] p-3">
                <p className="font-bold">{c.text}</p>
                <p className="text-sm">{c.origin === "ai_suggested" ? "Suggested from the Direct Control Inventory" : "Identified from the conversation"}</p>
                {c.catalogName && c.catalogName !== c.text ? <p className="text-sm">Inventory name: {c.catalogName}</p> : null}
              </article>
            ))}
            {extraction?.ppe?.length ? <p><span className="font-bold">PPE heard: </span>{extraction.ppe.join(", ")}</p> : null}
            <p className="text-sm">EnergyGuard does not decide that work is safe. You confirm what the crew will actually use. Suggested inventory items are not confirmed until you say so.</p>
            {followUps.length ? (
              <p className="rounded-xl bg-[#2a1d00] p-3">Answer the follow-up before confirming controls. EnergyGuard will not mark a control confirmed for you.</p>
            ) : (
              <BigButton
                onClick={async () => {
                  if (extraction?.highEnergy.length) {
                    await patch("crewConfirmBriefing", {
                      exposures: extraction.highEnergy.map((he) => ({ exposureId: he.exposureId, energySource: he.evidence })),
                      controls: extraction.controls
                        .filter((c) => c.catalogId && c.origin === "ai_suggested")
                        .map((c) => ({ exposureId: c.exposureId, directControlId: c.catalogId, personResponsible: eicName })),
                    });
                  } else {
                    await patch("saveBriefing", { extraction, markHighEnergyReviewed: true });
                  }
                  setStep(2);
                }}
              >
                This is what we briefed
              </BigButton>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            {jrb.status === "stop_work_active" ? (
              <ResumeStopWork id={id} onDone={refresh} />
            ) : null}
            <article className="rounded-2xl bg-[#121a2b] p-4">
              <h2 className="text-lg font-bold">Job</h2>
              <p>{extraction?.workDescription || version?.workDescriptionEdited || "Needs attention"}</p>
              <h2 className="mt-3 text-lg font-bold">Location</h2>
              <p>{formatJobLocation({ ...loc, ...form, ...jrb })}</p>
              <h2 className="mt-3 text-lg font-bold">What can seriously hurt or kill us</h2>
              <p>{(extraction?.highEnergy ?? []).map((h) => h.label).join("; ") || "None confirmed from talk"}</p>
              <h2 className="mt-3 text-lg font-bold">Critical / Direct Controls</h2>
              <p>{(extraction?.controls ?? []).map((c) => c.text).join("; ") || "Review required"}</p>
              {extraction?.ppe?.length ? <p className="mt-2"><span className="font-bold">PPE: </span>{extraction.ppe.join(", ")}</p> : null}
            </article>
            <h2 className="text-lg font-bold">OSHA briefing subjects</h2>
            {[
              ["Hazards associated with the job", extraction?.osha.hazardsAddressed || version?.briefingAssessment?.hazardsAddressed],
              ["Work procedures involved", extraction?.osha.proceduresAddressed || version?.briefingAssessment?.proceduresAddressed],
              ["Special precautions", extraction?.osha.precautionsAddressed || version?.briefingAssessment?.precautionsAddressed],
              ["Energy-source controls", extraction?.osha.energyControlsAddressed || version?.briefingAssessment?.energyControlsAddressed],
              ["PPE requirements", extraction?.osha.ppeAddressed || version?.briefingAssessment?.ppeAddressed],
            ].map(([label, ok]) => (
              <p key={String(label)} className="rounded-xl bg-[#121a2b] p-3">{ok ? "Addressed in the briefing" : "Needs attention"} — {label}</p>
            ))}
            {data.readiness?.gaps?.length ? (
              <div className="space-y-2">
                {data.readiness.gaps.map((g: any) => (
                  <p key={g.code + g.message} className="rounded-xl bg-[#2a1d00] p-3">{g.message} Next: {g.nextAction}</p>
                ))}
              </div>
            ) : (
              <p className="text-lg font-bold">{data.readiness?.status}</p>
            )}
            <h2 className="text-xl font-bold">Crew acknowledgment</h2>
            <p>I participated in the briefing, understand Stop Work and that significant changes require a rebrief, and understand my part of the job.</p>
            <Field id="ackname" label="Name" value={form.ackName ?? ""} onChange={(v) => setForm({ ...form, ackName: v })} />
            <BigButton onClick={() => patch("acknowledge", { name: form.ackName, employer: "Electric Delivery" })}>Acknowledge this version</BigButton>
            {(version?.crewMembers ?? []).map((m: any) => (
              <p key={m.id}>{m.name} — {version.acknowledgments?.some((a: any) => a.name === m.name) ? "Acknowledged" : "Needs Attention"}</p>
            ))}
            <BigButton
              onClick={async () => {
                try {
                  const res = await api(`/api/jrbs/${id}/release`, { method: "POST", body: "{}" });
                  setErrors([]);
                  alert(res.notice ?? READY_NOTICE);
                  await refresh();
                } catch (e) {
                  setErrors([e instanceof Error ? e.message : "Cannot release"]);
                  await refresh();
                }
              }}
            >
              Release JRB for Work
            </BigButton>
            {jrb.status === "released_for_work" ? <p>{READY_NOTICE}</p> : null}
          </div>
        )}
      </FieldChrome>

      {dialog && (
        <EventDialog
          kind={dialog}
          id={id}
          form={form}
          setForm={setForm}
          jrb={{ ...jrb, ...loc, ...form }}
          catalog={briefingCatalog}
          originalTranscript={extraction?.transcript || version?.briefingTranscript || ""}
          onClose={() => setDialog(null)}
          onDone={async (delta) => {
            setDialog(null);
            if (delta?.newExposures?.length) {
              setExtraction((prev) => {
                if (!prev) return prev;
                const extra = (delta.newExposures ?? []).filter(
                  (he) => !prev.highEnergy.some((p) => p.exposureId === he.exposureId),
                );
                return { ...prev, highEnergy: [...prev.highEnergy, ...extra], followUps: delta.followUps ?? prev.followUps };
              });
            } else if (delta?.followUps?.length) {
              setExtraction((prev) => (prev ? { ...prev, followUps: delta.followUps ?? prev.followUps } : prev));
            }
            await refresh();
          }}
        />
      )}
    </>
  );
}

function JobTalk(props: {
  catalog: BriefingCatalog;
  currentValues: Record<string, unknown>;
  proposed: ProposedChange[];
  onProposedUsed: (change: ProposedChange) => void;
  onExtracted: (result: BriefingExtraction, current: Record<string, unknown>) => void;
  extraction: BriefingExtraction | null;
}) {
  const sessionRef = useRef("");
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [busy, setBusy] = useState(false);
  const [typed, setTyped] = useState("");
  const propsRef = useRef(props);
  useEffect(() => {
    propsRef.current = props;
  });
  const { listening, error, toggle, stop } = useSpeechToText({
    onFinal: (spoken) => {
      sessionRef.current = joinSpokenText(sessionRef.current, spoken);
      setTranscript(sessionRef.current);
      setInterim("");
    },
    onInterim: (spoken) => setInterim(spoken),
    onSessionEnd: (spoken) => {
      setTranscript(spoken);
      sessionRef.current = spoken;
      setBusy(true);
      void runExtract(spoken).finally(() => setBusy(false));
    },
  });

  async function runExtract(spoken: string) {
    const current = propsRef.current;
    if (typeof navigator !== "undefined" && navigator.onLine) {
      try {
        const res = await fetch("/api/ai/extract-briefing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript: spoken }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.result) {
            current.onExtracted(data.result, current.currentValues);
            return;
          }
        }
      } catch {
        /* local fallback */
      }
    }
    current.onExtracted(extractBriefing({ transcript: spoken, catalog: current.catalog }), current.currentValues);
  }

  const visible = [transcript, interim].filter(Boolean).join(" ").trim();
  return (
    <section className="space-y-3 rounded-2xl border-2 border-yellow-300 bg-[#121a2b] p-4">
      <button
        type="button"
        className={`min-h-20 w-full rounded-2xl px-4 py-5 text-2xl font-bold ${listening ? "bg-[#ffd000] text-black" : "bg-[#1b2740]"}`}
        aria-pressed={listening}
        aria-label={listening ? "Stop talking" : "Talk through the job"}
        onClick={() => {
          if (listening) {
            stop();
            return;
          }
          sessionRef.current = "";
          setTranscript("");
          setInterim("");
          toggle();
        }}
      >
        {listening ? "Listening… Stop" : "Talk through the job"}
      </button>
      <p className="text-lg" role="status">{error ?? (listening ? "Listening..." : busy ? "Matching the discussion to the job…" : "Talk naturally. You can still type.")}</p>
      {visible ? <p className="text-lg">{visible}</p> : null}
      <Field id="type-job" label="Or type the job" textarea value={typed} onChange={setTyped} />
      <BigButton
        onClick={() => {
          const spoken = typed.trim();
          if (!spoken) return;
          setTranscript(spoken);
          setBusy(true);
          void runExtract(spoken).finally(() => setBusy(false));
        }}
      >
        Use typed briefing
      </BigButton>
      {props.proposed.length ? (
        <div className="space-y-2">
          <p className="font-bold text-yellow-300">Location already entered</p>
          {props.proposed.map((change) => (
            <div key={change.key} className="rounded-xl bg-[#3b2a00] p-3">
              <p>Current: {change.current}</p>
              <p>Heard: {change.proposed}</p>
              <button type="button" className="mt-2 w-full rounded-xl bg-[#ffd000] py-2 text-lg font-bold text-black" onClick={() => props.onProposedUsed(change)}>
                Use spoken {change.label}
              </button>
            </div>
          ))}
        </div>
      ) : null}
      {props.extraction && !listening ? (
        <p className="text-sm">Filled from talk where it was clear. Nothing is confirmed until you say so.</p>
      ) : null}
    </section>
  );
}

function EventDialog(props: {
  kind: "stop" | "rebrief";
  id: string;
  form: Record<string, any>;
  setForm: (f: Record<string, any>) => void;
  jrb: any;
  catalog: BriefingCatalog;
  originalTranscript: string;
  onClose: () => void;
  onDone: (delta?: { newExposures?: BriefingExtraction["highEnergy"]; followUps?: FollowUpQuestion[] }) => void;
}) {
  const [talk, setTalk] = useState("");
  return (
    <div className="fixed inset-0 z-30 flex items-end bg-black/70 p-4" role="dialog" aria-modal="true">
      <form
        className="w-full space-y-3 rounded-2xl bg-[#121a2b] p-5"
        onSubmit={async (e) => {
          e.preventDefault();
          const path = props.kind === "stop" ? "stop-work" : "rebrief";
          const spoken = talk || props.form.eventExplain;
          if (props.kind === "stop") {
            const extracted = extractStopWorkTalk(String(spoken ?? ""));
            await api(`/api/jrbs/${props.id}/${path}`, {
              method: "POST",
              body: JSON.stringify({
                reason: props.form.eventReason || extracted.reason,
                explanation: extracted.explanation,
                transcript: spoken,
                affectedHazard: extracted.affectedHazard,
              }),
            });
            props.onDone();
          } else {
            const delta = analyzeRebriefDelta(props.originalTranscript, String(spoken ?? ""), props.catalog);
            await api(`/api/jrbs/${props.id}/${path}`, {
              method: "POST",
              body: JSON.stringify({
                reason: props.form.eventReason || "Other",
                explanation: spoken,
                transcript: spoken,
                delta,
              }),
            });
            props.onDone(delta);
          }
        }}
      >
        <h2 className="text-2xl font-bold">{props.kind === "stop" ? "Stop Work" : "Conditions Changed / Rebrief"}</h2>
        <JobLocationSummary jrb={props.jrb} />
        <p>{props.kind === "rebrief" ? "What changed?" : "Talk through what happened. EnergyGuard cannot close Stop Work for you."}</p>
        <EventTalk value={talk} onChange={setTalk} kind={props.kind} />
        <label className="block text-lg font-bold" htmlFor="reason">Reason</label>
        <select id="reason" className="w-full rounded-xl bg-[#070b14] p-3" value={props.form.eventReason ?? ""} onChange={(e) => props.setForm({ ...props.form, eventReason: e.target.value })}>
          <option value="">Choose</option>
          {(props.kind === "rebrief" ? REBRIEF_REASONS : ["Immediate danger", "Control failed", "New hazard", "Other"]).map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <button type="submit" className="w-full rounded-xl bg-[#ffd000] py-3 text-xl font-bold text-black">Confirm</button>
        <button type="button" className="w-full rounded-xl bg-[#1b2740] py-3 text-xl font-bold" onClick={props.onClose}>Cancel</button>
      </form>
    </div>
  );
}

function EventTalk(props: { value: string; onChange: (v: string) => void; kind: "stop" | "rebrief" }) {
  const sessionRef = useRef("");
  const { listening, error, toggle, stop } = useSpeechToText({
    onFinal: (spoken) => {
      sessionRef.current = joinSpokenText(sessionRef.current, spoken);
      props.onChange(sessionRef.current);
    },
    onSessionEnd: (spoken) => {
      sessionRef.current = spoken;
      props.onChange(spoken);
    },
  });
  return (
    <div className="space-y-2">
      <button
        type="button"
        className={`min-h-16 w-full rounded-2xl px-4 py-4 text-xl font-bold ${listening ? "bg-[#ffd000] text-black" : "bg-[#1b2740]"}`}
        aria-label={listening ? "Stop talking" : props.kind === "stop" ? "Talk through Stop Work" : "Talk through what changed"}
        onClick={() => {
          if (listening) {
            stop();
            return;
          }
          sessionRef.current = props.value;
          toggle();
        }}
      >
        {listening ? "Listening… Stop" : props.kind === "stop" ? "Talk through Stop Work" : "Talk through what changed"}
      </button>
      {error ? <p className="text-sm">{error}</p> : null}
      <Field
        id="event-talk"
        label={props.kind === "stop" ? "What happened?" : "What changed?"}
        textarea
        value={props.value}
        onChange={props.onChange}
      />
    </div>
  );
}

function ResumeStopWork(props: { id: string; onDone: () => Promise<unknown> | unknown }) {
  const [corrective, setCorrective] = useState("");
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-2 rounded-2xl border-2 border-red-400 bg-[#2a0d0d] p-4">
      <p className="text-lg font-bold">Stop Work is active</p>
      <p className="text-sm">EnergyGuard cannot close this. The Worker in Charge decides when work may resume.</p>
      <Field id="corrective" label="Corrective action" textarea value={corrective} onChange={setCorrective} />
      {error ? <p role="alert">{error}</p> : null}
      <BigButton
        onClick={async () => {
          try {
            await api(`/api/jrbs/${props.id}`, {
              method: "PATCH",
              body: JSON.stringify({ action: "resumeStopWork", correctiveAction: corrective }),
            });
            setError(null);
            await props.onDone();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Could not resume.");
          }
        }}
      >
        Work may resume
      </BigButton>
    </div>
  );
}
