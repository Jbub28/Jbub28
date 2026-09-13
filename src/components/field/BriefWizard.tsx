"use client";

import { useCallback, useEffect, useState } from "react";
import { Field, FieldChrome, BigButton, STEPS, voiceMark } from "./FieldChrome";
import { PageVoiceAssistant } from "./PageVoiceAssistant";
import { DIRECT_CONTROL_NOT_USED_REASONS, REBRIEF_REASONS, VERIFICATION_METHODS, WORK_CLASSIFICATIONS } from "@/lib/domain/controls";
import { evaluateAlternativeControls } from "@/lib/domain/alternativeControls";
import { PLANNING_NOTICE, READY_NOTICE } from "@/lib/domain/readiness";
import { saveDraftLocal } from "@/lib/offline/store";
import { schemaForStep } from "@/lib/voice/pageSchemas";
import type { VoiceSuggestion } from "@/lib/voice/types";

const PREDEPARTURE = [
  ["job_packet", "Job Packet Review"],
  ["route_travel", "Route/Travel Plan Discussion"],
  ["ppe_needs", "PPE Needs"],
  ["boom", "Boom Inspection/Operation Verified"],
  ["circle", "Circle of Safety/Spotter Required?"],
  ["traffic", "Traffic Control Needs"],
  ["tools_insp", "Tools & Equipment Inspection"],
  ["route_back", "Route/Backing Discussion"],
  ["tools_sec", "Tools & Equipment Secured"],
  ["no_load", "No Substantial Material Loading Required"],
];
const WALKDOWN = [
  ["walking", "Walking/Working Surfaces"],
  ["truck", "Truck/Equipment Positioning"],
  ["contractor", "Contractor Activity"],
  ["plants", "Plants/Animals/Insects"],
  ["spotters", "Use of Spotters"],
  ["ug", "U/G Utilities Marked"],
  ["public", "Public Safety Concerns"],
  ["ttc", "Temporary Traffic Control/Flagger"],
  ["night", "Night Time Work"],
  ["security", "Security Concerns"],
  ["chock", "Wheels Chocked"],
  ["health", "Health Concerns"],
  ["outrigger", "Outrigger Cribbing/Pads"],
];
const ENV = ["Heat", "Cold", "Wind", "Rain", "Snow", "Ice", "Fog", "Other"];

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
  const [help, setHelp] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"stop" | "rebrief" | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [matches, setMatches] = useState<any>(null);
  const [voiceKeys, setVoiceKeys] = useState<string[]>([]);

  const version = data?.jrb?.versions?.[0];
  const jrb = data?.jrb;

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
    } catch (e) {
      setSaveState("Sync Error");
      setErrors([e instanceof Error ? e.message : "Save failed"]);
    }
  };

  useEffect(() => {
    const t = setInterval(() => {
      if (form && Object.keys(form).length) saveDraftLocal(id, { form }).catch(() => undefined);
    }, 5000);
    return () => clearInterval(t);
  }, [form, id]);

  const helpFor = (term: string) => catalog?.help?.find((h: any) => h.term === term);

  const presentExposures = version?.exposures?.filter((e: any) => e.presence === "present") ?? [];
  const climb = version?.taskSelections?.some((t: any) => /climb pole/i.test(t.task?.exactName ?? ""));
  const stepKey = STEPS[step]?.key ?? "start";
  const voiceContext = {
    workTypes: catalog?.workTypes ?? [],
    exposures: (catalog?.exposures ?? []).map((e: any) => ({
      id: e.id,
      label: e.formLabelExact ?? e.dcInventoryLabelExact ?? e.energyFamily,
    })),
    presentExposureFields: presentExposures.map((e: any) => ({
      src: `${e.exposureId}-src`,
      who: `${e.exposureId}-who`,
      out: `${e.exposureId}-out`,
      label: e.exposure?.formLabelExact ?? e.exposure?.dcInventoryLabelExact ?? "High Energy",
    })),
    ppe: catalog?.ppe ?? [],
    extraFields: presentExposures.flatMap((e: any) => [
      { key: `${e.id}_residual`, label: "Remaining exposure", type: "textarea" as const, safety: "prefill" as const, aliases: ["remaining exposure"] },
      { key: `${e.id}_stop`, label: "Stop-work trigger", type: "textarea" as const, safety: "prefill" as const, aliases: ["stop-work trigger", "stop work"] },
      { key: `${e.id}_why`, label: "Explain", type: "textarea" as const, safety: "prefill" as const, aliases: ["explain"] },
      ...(e.directControlSelections ?? []).map((sel: any) => ({
        key: `${sel.id}_owner`,
        label: "Person responsible",
        type: "text" as const,
        safety: "prefill" as const,
        aliases: ["person responsible", "responsible"],
      })),
    ]),
  };
  const voiceSchema = catalog ? schemaForStep(stepKey, voiceContext) : null;
  const voiceCurrent: Record<string, unknown> = {
    ...form,
    workOrderNumber: form.workOrderNumber ?? jrb?.workOrderNumber ?? "",
    addressOrCoordinates: form.addressOrCoordinates ?? jrb?.addressOrCoordinates ?? "",
    workLocation: form.workLocation ?? jrb?.workLocation ?? "",
    supervisorName: form.supervisorName ?? jrb?.supervisor?.displayName ?? "",
    crewText: form.crewText ?? version?.crewMembers?.map((m: any) => m.name).join("\n") ?? "",
    contractorInvolved: form.contractorInvolved ?? jrb?.contractorInvolved,
    contractorCompany: form.contractorCompany ?? jrb?.contractorCompany ?? "",
    emergencyAccess: form.emergencyAccess ?? jrb?.emergencyAccess ?? "",
    communicationMethod: form.communicationMethod ?? jrb?.communicationMethod ?? "",
    edited: form.edited ?? version?.workDescriptionEdited ?? "",
  };

  const applyVoice = (updates: Record<string, unknown>, meta: { transcript: string; appliedKeys: string[]; preservedKeys: string[] }) => {
    setForm((f) => ({
      ...f,
      ...updates,
      original: typeof updates.edited === "string" ? f.original || meta.transcript : f.original,
      speechProvider: typeof updates.edited === "string" ? "browser" : f.speechProvider,
      voiceTranscripts: { ...(f.voiceTranscripts ?? {}), [stepKey]: meta.transcript },
    }));
    setVoiceKeys(meta.appliedKeys);
    window.setTimeout(() => setVoiceKeys((keys) => keys.filter((k) => !meta.appliedKeys.includes(k))), 12_000);
  };

  const confirmVoiceSuggestion = (suggestion: VoiceSuggestion) => {
    if (!catalog) return;
    if (suggestion.key === "exposurePresence") {
      void patch("setExposure", { exposureId: suggestion.value, presence: "present" });
      return;
    }
    if (suggestion.key === "workTypeId") {
      const wt = catalog.workTypes.find((w: any) => w.id === suggestion.value);
      setForm((f) => ({ ...f, workTypeId: suggestion.value, workTypeCode: wt?.code }));
      return;
    }
    if (suggestion.key === "workClassification") {
      setForm((f) => ({ ...f, workClassification: suggestion.value }));
      return;
    }
    setForm((f) => ({ ...f, [suggestion.key]: suggestion.value }));
  };

  if (!jrb || !catalog) {
    return <p className="p-6 text-xl">Loading the job brief…</p>;
  }

  return (
    <>
      <FieldChrome
        stepIndex={step}
        title={STEPS[step].label}
        saveState={saveState}
        errorSummary={errors}
        onBack={() => setStep((s) => Math.max(0, s - 1))}
        onNext={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
        onSave={() => patch("saveStart", form)}
        onHelp={() => setHelp("eei")}
        onStop={() => setDialog("stop")}
        onRebrief={() => setDialog("rebrief")}
        nextLabel={step === STEPS.length - 1 ? "Stay here" : "Next"}
      >
        <p className="text-xl">{STEPS[step].question}</p>
        {voiceSchema ? (
          <PageVoiceAssistant
            schema={voiceSchema}
            context={voiceContext}
            currentValues={voiceCurrent}
            onApply={applyVoice}
            onConfirmSuggestion={confirmVoiceSuggestion}
          />
        ) : (
          <p className="text-sm">This page is review and confirmation. Talk does not fill or approve it.</p>
        )}

        {step === 0 && (
          <div className="space-y-4">
            <p className="text-lg">JRB {jrb.jrbNumber} · {jrb.status.replaceAll("_", " ")}</p>
            <Field id="wo" label="Work order number" highlight={voiceMark(voiceKeys, "workOrderNumber")} value={form.workOrderNumber ?? jrb.workOrderNumber ?? ""} onChange={(v) => setForm({ ...form, workOrderNumber: v })} />
            <Field id="loc" label="911 address or coordinates" highlight={voiceMark(voiceKeys, "addressOrCoordinates")} value={form.addressOrCoordinates ?? jrb.addressOrCoordinates ?? ""} onChange={(v) => setForm({ ...form, addressOrCoordinates: v })} />
            <Field id="wl" label="Work location" highlight={voiceMark(voiceKeys, "workLocation")} value={form.workLocation ?? jrb.workLocation ?? ""} onChange={(v) => setForm({ ...form, workLocation: v })} />
            <fieldset className="space-y-2">
              <legend className="text-lg font-bold">Work Type</legend>
              {catalog.workTypes.map((wt: any) => (
                <BigButton key={wt.id} selected={(form.workTypeId ?? jrb.workTypeId) === wt.id} onClick={() => setForm({ ...form, workTypeId: wt.id, workTypeCode: wt.code })}>
                  {wt.exactName}
                </BigButton>
              ))}
            </fieldset>
            <fieldset className="space-y-2">
              <legend className="text-lg font-bold">Work Classification — you must confirm this</legend>
              {WORK_CLASSIFICATIONS.map((c) => (
                <BigButton key={c.value} selected={(form.workClassification ?? jrb.workClassification) === c.value} onClick={() => setForm({ ...form, workClassification: c.value, workClassificationConfirmed: true })}>
                  {c.label}
                </BigButton>
              ))}
              <p className="text-sm">Suggested for Crew Review — the app does not make a legal determination.</p>
            </fieldset>
            <Field id="eic" label="Employee in Charge" value={jrb.employeeInCharge?.displayName ?? ""} />
            <Field id="sup" label="Supervisor" highlight={voiceMark(voiceKeys, "supervisorName")} value={form.supervisorName ?? jrb.supervisor?.displayName ?? ""} onChange={(v) => setForm({ ...form, supervisorName: v })} />
            <Field id="crew" label="Crew members (one per line)" textarea highlight={voiceMark(voiceKeys, "crewText")} value={form.crewText ?? version.crewMembers?.map((m: any) => m.name).join("\n") ?? ""} onChange={(v) => setForm({ ...form, crewText: v })} />
            <label className="flex items-center gap-3 text-lg">
              <input type="checkbox" className="size-8" checked={Boolean(form.contractorInvolved ?? jrb.contractorInvolved)} onChange={(e) => setForm({ ...form, contractorInvolved: e.target.checked })} />
              Contractor involvement
            </label>
            {(form.contractorInvolved ?? jrb.contractorInvolved) ? (
              <Field id="co" label="Contractor company" highlight={voiceMark(voiceKeys, "contractorCompany")} value={form.contractorCompany ?? jrb.contractorCompany ?? ""} onChange={(v) => setForm({ ...form, contractorCompany: v })} />
            ) : null}
            <Field id="em" label="Emergency access information" textarea highlight={voiceMark(voiceKeys, "emergencyAccess")} value={form.emergencyAccess ?? jrb.emergencyAccess ?? ""} onChange={(v) => setForm({ ...form, emergencyAccess: v })} />
            <Field id="comm" label="Communication method" highlight={voiceMark(voiceKeys, "communicationMethod")} value={form.communicationMethod ?? jrb.communicationMethod ?? ""} onChange={(v) => setForm({ ...form, communicationMethod: v })} />
            <BigButton onClick={async () => {
              const names = String(form.crewText ?? "").split("\n").map((n) => n.trim()).filter(Boolean);
              await patch("saveCrew", { crewMembers: names.map((name: string) => ({ name, employer: "Electric Delivery" })) });
              await patch("saveStart", form);
              setStep(1);
            }}>Save and continue</BigButton>
          </div>
        )}

        {step === 1 && (
          <WorkStep
            jrb={jrb}
            version={version}
            catalog={catalog}
            form={form}
            setForm={setForm}
            matches={matches}
            setMatches={setMatches}
            patch={patch}
            voiceKeys={voiceKeys}
          />
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Before You Leave</h2>
            {PREDEPARTURE.map(([key, label]) => (
              <label key={key} className={`flex items-center gap-3 rounded-xl bg-[#121a2b] p-3 text-lg ${voiceMark(voiceKeys, `pd_${key}`) ? "ring-2 ring-yellow-300" : ""}`}>
                <input type="checkbox" className="size-8" checked={Boolean(form[`pd_${key}`])} onChange={(e) => setForm({ ...form, [`pd_${key}`]: e.target.checked })} />
                {label}
              </label>
            ))}
            <h2 className="text-xl font-bold">Environment</h2>
            {ENV.map((c) => (
              <label key={c} className={`flex items-center gap-3 text-lg ${voiceMark(voiceKeys, "env") ? "ring-2 ring-yellow-300" : ""}`}>
                <input type="checkbox" className="size-8" checked={(form.env ?? []).includes(c)} onChange={(e) => {
                  const cur = new Set(form.env ?? []);
                  e.target.checked ? cur.add(c) : cur.delete(c);
                  setForm({ ...form, env: [...cur] });
                }} />
                {c}
              </label>
            ))}
            <h2 className="text-xl font-bold">Jobsite walkdown</h2>
            {WALKDOWN.map(([key, label]) => (
              <label key={key} className={`flex items-center gap-3 rounded-xl bg-[#121a2b] p-3 text-lg ${voiceMark(voiceKeys, `wd_${key}`) ? "ring-2 ring-yellow-300" : ""}`}>
                <input type="checkbox" className="size-8" checked={Boolean(form[`wd_${key}`])} onChange={(e) => setForm({ ...form, [`wd_${key}`]: e.target.checked })} />
                {label}
              </label>
            ))}
            <p className="text-lg font-bold">Does the plan from before we left still match what we see?</p>
            <BigButton selected={form.planMatchesField === true} onClick={() => setForm({ ...form, planMatchesField: true })}>Yes, it matches</BigButton>
            <BigButton selected={form.planMatchesField === false} onClick={() => setForm({ ...form, planMatchesField: false })}>No — we need to reassess</BigButton>
            {form.planMatchesField === false ? (
              <Field id="diff" label="What changed?" textarea highlight={voiceMark(voiceKeys, "materialDifferenceNotes")} value={form.materialDifferenceNotes ?? ""} onChange={(v) => setForm({ ...form, materialDifferenceNotes: v })} />
            ) : null}
            <BigButton onClick={() => patch("saveConditions", {
              planMatchesField: form.planMatchesField,
              materialDifferenceNotes: form.materialDifferenceNotes,
              environmental: (form.env ?? []).map((choice: string) => ({ choice })),
              predeparture: PREDEPARTURE.map(([itemKey, labelExact]) => ({ itemKey, labelExact, discussed: Boolean(form[`pd_${itemKey}`]) })),
              walkdown: WALKDOWN.map(([itemKey, labelExact]) => ({ itemKey, labelExact, observed: Boolean(form[`wd_${itemKey}`]) })),
            })}>Save conditions</BigButton>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <button type="button" className="text-lg underline" onClick={() => setHelp("high-energy")}>What is High Energy?</button>
            <p className="text-sm">Suggested High Energy appears only when an approved task mapping exists. None is published. Add what you see.</p>
            {catalog.exposures.map((exp: any) => {
              const current = version.exposures?.find((e: any) => e.exposureId === exp.id);
              return (
                <article key={exp.id} className="rounded-2xl bg-[#121a2b] p-4">
                  <div className="flex gap-3">
                    {exp.icon ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={exp.icon.storagePath} alt="" width={72} height={88} />
                    ) : null}
                    <div>
                      <h2 className="text-xl font-bold">{exp.formLabelExact ?? exp.dcInventoryLabelExact}</h2>
                      <p className="text-sm">{exp.energyFamily}</p>
                      {exp.icon?.isPlaceholder ? <p className="text-sm">Placeholder icon — no source art extracted.</p> : null}
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {(["present", "not_present", "not_applicable", "need_help"] as const).map((p) => (
                      <BigButton key={p} selected={current?.presence === p} onClick={() => patch("setExposure", { exposureId: exp.id, presence: p })}>
                        {p.replaceAll("_", " ")}
                      </BigButton>
                    ))}
                  </div>
                  {current?.presence === "present" ? (
                    <div className="mt-3 space-y-2">
                      <Field id={`${exp.id}-src`} label="What energy could reach someone?" highlight={voiceMark(voiceKeys, `${exp.id}-src`)} value={form[`${exp.id}-src`] ?? current.energySource ?? ""} onChange={(v) => setForm({ ...form, [`${exp.id}-src`]: v })} />
                      <Field id={`${exp.id}-who`} label="Who could be in the path?" highlight={voiceMark(voiceKeys, `${exp.id}-who`)} value={form[`${exp.id}-who`] ?? current.personsExposed ?? ""} onChange={(v) => setForm({ ...form, [`${exp.id}-who`]: v })} />
                      <Field id={`${exp.id}-out`} label="What serious outcome could occur?" highlight={voiceMark(voiceKeys, `${exp.id}-out`)} value={form[`${exp.id}-out`] ?? current.sifOutcome ?? ""} onChange={(v) => setForm({ ...form, [`${exp.id}-out`]: v })} />
                      <button type="button" className="underline" onClick={() => setHelp("sclm")}>Help: Serious Injury or Fatality Potential (SCLM)</button>
                      <BigButton onClick={() => patch("setExposure", {
                        exposureId: exp.id,
                        presence: "present",
                        energySource: form[`${exp.id}-src`],
                        personsExposed: form[`${exp.id}-who`],
                        sifOutcome: form[`${exp.id}-out`],
                        crewConfirmed: true,
                      })}>Crew confirms this exposure</BigButton>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}

        {step === 4 && (
          <ControlsStep
            presentExposures={presentExposures}
            catalog={catalog}
            form={form}
            setForm={setForm}
            patch={patch}
            setHelp={setHelp}
            voiceKeys={voiceKeys}
          />
        )}

        {step === 5 && (
          <div className="space-y-4">
            {["Setup", "Tasks", "Cleanup"].map((phase) => (
              <Field key={phase} id={`step-${phase}`} label={`${phase} steps`} textarea highlight={voiceMark(voiceKeys, `step_${phase}`)} value={form[`step_${phase}`] ?? ""} onChange={(v) => setForm({ ...form, [`step_${phase}`]: v })} />
            ))}
            <Field id="proc" label="Work procedures" textarea highlight={voiceMark(voiceKeys, "workProcedure")} value={form.workProcedure ?? ""} onChange={(v) => setForm({ ...form, workProcedure: v })} />
            <Field id="prec" label="Special precautions" textarea highlight={voiceMark(voiceKeys, "specialPrecaution")} value={form.specialPrecaution ?? ""} onChange={(v) => setForm({ ...form, specialPrecaution: v })} />
            <Field id="energy" label="Energy-source control" textarea highlight={voiceMark(voiceKeys, "energySourceControl")} value={form.energySourceControl ?? ""} onChange={(v) => setForm({ ...form, energySourceControl: v })} />
            <h2 className="text-xl font-bold">PPE — confirm what applies</h2>
            {catalog.ppe.map((p: any) => (
              <label key={p.id} className={`flex items-center gap-3 text-lg ${voiceMark(voiceKeys, p.exactName) ? "ring-2 ring-yellow-300" : ""}`}>
                <input type="checkbox" className="size-8" checked={(form.ppe ?? []).includes(p.exactName)} onChange={(e) => {
                  const cur = new Set(form.ppe ?? []);
                  e.target.checked ? cur.add(p.exactName) : cur.delete(p.exactName);
                  setForm({ ...form, ppe: [...cur] });
                }} />
                {p.exactName}
              </label>
            ))}
            {climb ? (
              <div className="rounded-xl border-2 border-yellow-300 p-4">
                <h2 className="text-xl font-bold">Pole climbing</h2>
                <p className="font-bold">{catalog.questions.find((q: any) => q.key === "pole_warning")?.promptExact}</p>
                {["pole_visual", "pole_hammer", "pole_screwdriver", "pole_rocking", "pole_passed", "pole_can_test"].map((k) => (
                  <label key={k} className="mt-2 flex items-center gap-3">
                    <input type="checkbox" className="size-8" checked={Boolean(form[k])} onChange={(e) => setForm({ ...form, [k]: e.target.checked })} />
                    {catalog.questions.find((q: any) => q.key === k)?.promptExact}
                  </label>
                ))}
              </div>
            ) : null}
            <BigButton onClick={() => patch("saveJobSteps", {
              steps: ["Setup", "Tasks", "Cleanup"].map((phase, i) => ({
                sequence: i + 1,
                phase,
                description: form[`step_${phase}`] ?? phase,
                workProcedure: form.workProcedure,
                specialPrecaution: form.specialPrecaution,
                energySourceControl: form.energySourceControl,
                ppeNotes: (form.ppe ?? []).join(", "),
                stopWorkTrigger: "Any worker may stop the work.",
              })),
            })}>Save job steps</BigButton>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-3">
            <p>{PLANNING_NOTICE}</p>
            {[
              ["Hazards Covered", presentExposures.length > 0 || version.exposures?.length],
              ["Work Procedures Covered", version.jobSteps?.some((s: any) => s.workProcedure)],
              ["Special Precautions Covered", version.jobSteps?.some((s: any) => s.specialPrecaution)],
              ["Energy Controls Covered", version.jobSteps?.some((s: any) => s.energySourceControl) || presentExposures.some((e: any) => e.directControlSelections?.length)],
              ["PPE Covered", version.jobSteps?.some((s: any) => s.ppeNotes)],
              ["Employee in Charge Identified", Boolean(jrb.employeeInChargeId)],
              ["Crew Identified", version.crewMembers?.length > 0],
              ["Conditions Reviewed", version.conditions?.length > 0],
            ].map(([label, ok]) => (
              <p key={String(label)} className="rounded-xl bg-[#121a2b] p-3 text-lg">
                <span className="font-bold">{ok ? "Complete" : "Needs Attention"} — </span>
                {label}
                {!ok ? (
                  <button type="button" className="ml-2 underline" onClick={() => setStep(ok ? step : 3)}>
                    Edit
                  </button>
                ) : null}
              </p>
            ))}
            <p className="font-bold">Ready for Crew Briefing: {data.readiness?.status}</p>
          </div>
        )}

        {step === 7 && (
          <div className="space-y-3">
            <Section title="Work description" onEdit={() => setStep(1)}>{version.workDescriptionEdited || "Needs Attention"}</Section>
            <Section title="Confirmed EEI tasks" onEdit={() => setStep(1)}>
              {version.taskSelections?.filter((t: any) => t.confirmed).map((t: any) => t.task.exactName).join("; ") || "Needs Attention"}
            </Section>
            <Section title="High Energy" onEdit={() => setStep(3)}>
              {presentExposures.map((e: any) => e.exposure.formLabelExact ?? e.exposure.dcInventoryLabelExact).join("; ") || "None marked Present"}
            </Section>
            <Section title="Controls" onEdit={() => setStep(4)}>
              {presentExposures.map((e: any) => e.directControlSelections?.map((s: any) => s.directControl.exactName).join(", ")).join("; ") || "Review Required"}
            </Section>
            <p className="text-lg">Status: {data.readiness?.status}</p>
          </div>
        )}

        {step === 8 && (
          <div className="space-y-4">
            {["The Work", "What Can Seriously Hurt or Kill Us", "Direct Controls", "Work Steps", "PPE", "Emergency Plan", "Stop-Work Triggers"].map((card) => (
              <article key={card} className="rounded-2xl bg-[#121a2b] p-4 text-xl font-bold">{card}</article>
            ))}
            <Field id="q" label="Question or concern" textarea highlight={voiceMark(voiceKeys, "question")} value={form.question ?? ""} onChange={(v) => setForm({ ...form, question: v })} />
            <BigButton onClick={() => form.question && patch("addQuestion", { question: form.question, raisedBy: form.raisedBy, resolved: false })}>Save question</BigButton>
            <h2 className="text-xl font-bold">Crew acknowledgment</h2>
            <p>I participated in the briefing, had a chance to ask questions, and understand my part of the job.</p>
            <Field id="ackname" label="Name" highlight={voiceMark(voiceKeys, "ackName")} value={form.ackName ?? ""} onChange={(v) => setForm({ ...form, ackName: v })} />
            <BigButton onClick={() => patch("acknowledge", { name: form.ackName, employer: "Electric Delivery" })}>Acknowledge this version</BigButton>
            {(version.crewMembers ?? []).map((m: any) => (
              <p key={m.id}>{m.name} {m.lateArrival ? "(arrived later)" : ""} — {version.acknowledgments?.some((a: any) => a.name === m.name) ? "Acknowledged" : "Needs Attention"}</p>
            ))}
          </div>
        )}

        {step === 9 && (
          <ReadyStep data={data} onRelease={async () => {
            try {
              const res = await api(`/api/jrbs/${id}/release`, { method: "POST", body: "{}" });
              setErrors([]);
              alert(res.notice ?? READY_NOTICE);
              await refresh();
            } catch (e) {
              setErrors([e instanceof Error ? e.message : "Cannot release"]);
              await refresh();
            }
          }} />
        )}
      </FieldChrome>

      {help && (
        <div className="fixed inset-0 z-30 flex items-end bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="help-title">
          <div className="w-full rounded-2xl bg-[#121a2b] p-5">
            <h2 id="help-title" className="text-2xl font-bold">{helpFor(help)?.exactTerm ?? "Help"}</h2>
            <p className="mt-2 text-lg">{helpFor(help)?.plainHelp}</p>
            <p className="mt-2 text-sm">{helpFor(help)?.sourceNote}</p>
            <button type="button" className="mt-4 w-full rounded-xl bg-[#ffd000] py-3 text-xl font-bold text-black" onClick={() => setHelp(null)}>Close</button>
          </div>
        </div>
      )}

      {dialog && (
        <div className="fixed inset-0 z-30 flex items-end bg-black/70 p-4" role="dialog" aria-modal="true">
          <form
            className="w-full space-y-3 rounded-2xl bg-[#121a2b] p-5"
            onSubmit={async (e) => {
              e.preventDefault();
              const path = dialog === "stop" ? "stop-work" : "rebrief";
              await api(`/api/jrbs/${id}/${path}`, { method: "POST", body: JSON.stringify({ reason: form.eventReason, explanation: form.eventExplain }) });
              setDialog(null);
              await refresh();
            }}
          >
            <h2 className="text-2xl font-bold">{dialog === "stop" ? "Stop Work" : "Conditions Changed / Rebrief"}</h2>
            <p>This does not need supervisor permission to start.</p>
            <label className="block text-lg font-bold" htmlFor="reason">Reason</label>
            <select id="reason" className="w-full rounded-xl bg-[#070b14] p-3" value={form.eventReason ?? ""} onChange={(e) => setForm({ ...form, eventReason: e.target.value })}>
              <option value="">Choose</option>
              {(dialog === "rebrief" ? REBRIEF_REASONS : ["Immediate danger", "Control failed", "New hazard", "Other"]).map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
            <Field id="ex" label="Explain" textarea value={form.eventExplain ?? ""} onChange={(v) => setForm({ ...form, eventExplain: v })} />
            <button type="submit" className="w-full rounded-xl bg-[#ffd000] py-3 text-xl font-bold text-black">Confirm</button>
            <button type="button" className="w-full rounded-xl bg-[#1b2740] py-3 text-xl font-bold" onClick={() => setDialog(null)}>Cancel</button>
          </form>
        </div>
      )}
    </>
  );
}

function Section({ title, children, onEdit }: { title: string; children: React.ReactNode; onEdit: () => void }) {
  return (
    <article className="rounded-xl bg-[#121a2b] p-4">
      <div className="flex justify-between gap-2">
        <h2 className="text-lg font-bold">{title}</h2>
        <button type="button" className="underline" onClick={onEdit}>Edit</button>
      </div>
      <p>{children}</p>
    </article>
  );
}

function WorkStep(props: any) {
  const { jrb, version, form, setForm, matches, setMatches, patch, voiceKeys } = props;
  const workTypeCode = jrb.workType?.code;
  const match = async (text: string, followUpOption?: string) => {
    const res = await api("/api/ai/match-tasks", {
      method: "POST",
      body: JSON.stringify({ workTypeCode, text, originalTranscript: form.original, versionId: version.id, followUpOption }),
    });
    setMatches(res);
  };
  return (
    <div className="space-y-4">
      <BigButton selected={form.mode !== "library"} onClick={() => setForm({ ...form, mode: "voice" })}>Speak or Type the Work</BigButton>
      <BigButton selected={form.mode === "library"} onClick={() => setForm({ ...form, mode: "library" })}>Select from the EEI Task Library</BigButton>
      {form.mode !== "library" ? (
        <>
          <Field id="desc" label="Work description" textarea highlight={voiceMark(voiceKeys ?? [], "edited")} value={form.edited ?? version.workDescriptionEdited ?? ""} onChange={(v) => setForm({ ...form, edited: v })} />
          <p className="text-sm">Talk fills this page from what you said. You can edit anything. Matching a task still needs Confirm.</p>
          <div className="grid grid-cols-1 gap-2">
            <BigButton onClick={() => patch("saveWork", { workDescriptionOriginal: form.original, workDescriptionEdited: form.edited, transcriptStatus: form.edited ? "ok" : "failed", speechProvider: form.speechProvider ?? "browser" }).then(() => match(form.edited))}>Use This Description</BigButton>
            <BigButton onClick={() => setForm({ ...form, mode: "type" })}>Type Instead</BigButton>
          </div>
        </>
      ) : (
        <LibrarySearch workTypeCode={workTypeCode} onConfirm={(task: any) => patch("confirmTask", { taskId: task.id })} />
      )}
      {matches?.label ? <p className="font-bold text-yellow-300">{matches.label}</p> : null}
      {matches?.result?.followUpQuestion ? (
        <div className="space-y-2">
          <p className="text-lg">{matches.result.followUpQuestion}</p>
          {matches.result.followUpOptions.map((opt: string) => (
            <BigButton key={opt} onClick={() => match(form.edited, opt)}>{opt}</BigButton>
          ))}
        </div>
      ) : null}
      {matches?.result?.message ? <p>{matches.result.message}</p> : null}
      {matches?.result?.suggestions?.map((s: any) => (
        <article key={s.taskId} className="rounded-xl bg-[#121a2b] p-4">
          <p className="text-sm">{s.workTypeExactName} · {s.activityExactName}</p>
          <h3 className="text-xl font-bold">{s.exactTaskName}</h3>
          <p>{s.explanation}</p>
          <p className="font-bold">{s.confidence}</p>
          <BigButton onClick={() => patch("confirmTask", { taskId: s.taskId })}>Confirm</BigButton>
          <BigButton onClick={() => setForm({ ...form, mode: "library" })}>Choose Another Task</BigButton>
        </article>
      ))}
      <BigButton onClick={() => setForm({ ...form, mode: "library" })}>Add Additional Task</BigButton>
      <h3 className="font-bold">Confirmed tasks</h3>
      {version.taskSelections?.filter((t: any) => t.confirmed).map((t: any) => (
        <p key={t.id}>{t.task.activity.workType.exactName}: {t.task.exactName}</p>
      ))}
    </div>
  );
}

function LibrarySearch({ workTypeCode, onConfirm }: { workTypeCode: string; onConfirm: (t: any) => void }) {
  const [q, setQ] = useState("");
  const [tasks, setTasks] = useState<any[]>([]);
  useEffect(() => {
    const t = setTimeout(() => {
      fetch(`/api/reference/tasks?workType=${workTypeCode}&q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((d) => setTasks(d.tasks ?? []));
    }, 200);
    return () => clearTimeout(t);
  }, [q, workTypeCode]);
  return (
    <div className="space-y-2">
      <Field id="search" label="Search the approved task library" value={q} onChange={setQ} />
      {tasks.map((t) => (
        <article key={t.id} className="rounded-xl bg-[#121a2b] p-3">
          <p className="text-sm">{t.workType} · {t.activity}</p>
          <p className="font-bold">{t.exactName}</p>
          <BigButton onClick={() => onConfirm(t)}>Confirm</BigButton>
        </article>
      ))}
    </div>
  );
}

function ControlsStep({ presentExposures, catalog, form, setForm, patch, setHelp, voiceKeys = [] }: any) {
  const [mapped, setMapped] = useState<Record<string, any[]>>({});
  useEffect(() => {
    presentExposures.forEach((exp: any) => {
      fetch(`/api/reference/catalog?exposureId=${exp.exposureId}`)
        .then((r) => r.json())
        .then((d) => setMapped((m) => ({ ...m, [exp.id]: d.mappedDirectControls })));
    });
  }, [presentExposures]);
  if (!presentExposures.length) return <p>No High Energy is marked Present. You can continue.</p>;
  return (
    <div className="space-y-6">
      <button type="button" className="underline" onClick={() => setHelp("direct-control")}>What is a Direct Control?</button>
      {presentExposures.map((exp: any) => {
        const alt = evaluateAlternativeControls({
          controls: (form[`${exp.id}_alts`] ?? []).map((c: any) => ({
            category: catalog.categories.find((x: any) => x.id === c.categoryId)?.exactName,
            owner: c.owner,
            verificationMethod: c.verificationMethod,
            isOther: c.isOther,
            description: c.description,
            howReducesExposure: c.howReducesExposure,
            howComplements: c.howComplements,
          })),
          residualExposure: form[`${exp.id}_residual`],
          stopWorkTrigger: form[`${exp.id}_stop`],
          supervisorReviewed: Boolean(form[`${exp.id}_sup`]),
          notUsedReasonRecorded: exp.notUsed?.length > 0,
        });
        return (
          <article key={exp.id} className="rounded-2xl bg-[#121a2b] p-4">
            <h2 className="text-xl font-bold">{exp.exposure.formLabelExact ?? exp.exposure.dcInventoryLabelExact}</h2>
            <p className="text-sm">Showing Direct Controls mapped to this High Energy in the Logic View.</p>
            {(mapped[exp.id] ?? []).map((dc: any) => (
              <div key={dc.id} className="mt-3 rounded-xl bg-[#070b14] p-3">
                <p className="font-bold">{dc.exactName}</p>
                <p className="text-sm">{dc.notes}</p>
                <p className="text-sm">Why: mapped to this High Energy in DC Inventory v1.</p>
                <BigButton onClick={() => patch("selectDirectControl", { jrbExposureId: exp.id, directControlId: dc.id, personResponsible: form.owner })}>Select</BigButton>
              </div>
            ))}
            {exp.directControlSelections?.map((sel: any) => (
              <div key={sel.id} className="mt-3 border border-slate-500 p-3">
                <p>Selected: {sel.directControl.exactName}</p>
                <p>{sel.verifications?.some((v: any) => v.status === "verified") ? "Direct Control Verified" : "Control Plan Incomplete"}</p>
                <label className="block">Verification method
                  <select className="mt-1 w-full rounded-xl bg-[#070b14] p-3" value={form[`${sel.id}_vm`] ?? ""} onChange={(e) => setForm({ ...form, [`${sel.id}_vm`]: e.target.value })}>
                    <option value="">Choose</option>
                    {VERIFICATION_METHODS.map((m) => <option key={m}>{m}</option>)}
                  </select>
                </label>
                <Field id={`${sel.id}-owner`} label="Person responsible" highlight={voiceMark(voiceKeys, `${sel.id}_owner`)} value={form[`${sel.id}_owner`] ?? ""} onChange={(v) => setForm({ ...form, [`${sel.id}_owner`]: v })} />
                <BigButton onClick={() => patch("verifyDirectControl", { selectionId: sel.id, method: form[`${sel.id}_vm`], personResponsible: form[`${sel.id}_owner`] })}>Mark verified</BigButton>
              </div>
            ))}
            <BigButton onClick={() => setForm({ ...form, [`${exp.id}_nouse`]: true })}>No Approved Direct Control Is Being Used</BigButton>
            {form[`${exp.id}_nouse`] ? (
              <div className="mt-2 space-y-2">
                <p>Why is a Direct Control not being used?</p>
                {DIRECT_CONTROL_NOT_USED_REASONS.map((r) => (
                  <BigButton key={r} selected={form[`${exp.id}_reason`] === r} onClick={() => setForm({ ...form, [`${exp.id}_reason`]: r })}>{r}</BigButton>
                ))}
                <Field id={`${exp.id}-why`} label="Explain" textarea highlight={voiceMark(voiceKeys, `${exp.id}_why`)} value={form[`${exp.id}_why`] ?? ""} onChange={(v) => setForm({ ...form, [`${exp.id}_why`]: v })} />
                <BigButton onClick={() => patch("notUseDirectControl", { jrbExposureId: exp.id, reason: form[`${exp.id}_reason`], explanation: form[`${exp.id}_why`] })}>Save reason and open Alternative Controls</BigButton>
              </div>
            ) : null}
            {(form[`${exp.id}_nouse`] || exp.notUsed?.length > 0) && (
              <div className="mt-4 space-y-2">
                <h3 className="text-lg font-bold">Alternative Control Framework</h3>
                <p>{alt.liveStatus}</p>
                {catalog.categories.map((cat: any) => (
                  <div key={cat.id} className="rounded-xl bg-[#070b14] p-3">
                    <p className="font-bold">{cat.exactName}</p>
                    <p className="text-sm">{cat.definitionExact}</p>
                    {cat.controls.map((c: any) => (
                      <BigButton key={c.id} onClick={() => {
                        const list = form[`${exp.id}_alts`] ?? [];
                        setForm({ ...form, [`${exp.id}_alts`]: [...list, { categoryId: cat.id, description: c.exactName, catalogControlId: c.id }] });
                      }}>{c.exactName}</BigButton>
                    ))}
                    <BigButton onClick={() => {
                      const list = form[`${exp.id}_alts`] ?? [];
                      setForm({ ...form, [`${exp.id}_alts`]: [...list, { categoryId: cat.id, isOther: true, description: "Other" }] });
                    }}>Other in {cat.exactName}</BigButton>
                  </div>
                ))}
                {(form[`${exp.id}_alts`] ?? []).map((c: any, i: number) => (
                  <div key={i} className="border border-slate-600 p-2">
                    <p>{c.description}</p>
                    <Field id={`${exp.id}-o${i}`} label="Responsible owner" value={c.owner ?? ""} onChange={(v) => {
                      const list = [...(form[`${exp.id}_alts`] ?? [])];
                      list[i] = { ...list[i], owner: v };
                      setForm({ ...form, [`${exp.id}_alts`]: list });
                    }} />
                    <Field id={`${exp.id}-v${i}`} label="Verification method" value={c.verificationMethod ?? ""} onChange={(v) => {
                      const list = [...(form[`${exp.id}_alts`] ?? [])];
                      list[i] = { ...list[i], verificationMethod: v };
                      setForm({ ...form, [`${exp.id}_alts`]: list });
                    }} />
                  </div>
                ))}
                <Field id={`${exp.id}-res`} label="Remaining exposure" textarea highlight={voiceMark(voiceKeys, `${exp.id}_residual`)} value={form[`${exp.id}_residual`] ?? ""} onChange={(v) => setForm({ ...form, [`${exp.id}_residual`]: v })} />
                <Field id={`${exp.id}-sw`} label="Stop-work trigger" textarea highlight={voiceMark(voiceKeys, `${exp.id}_stop`)} value={form[`${exp.id}_stop`] ?? ""} onChange={(v) => setForm({ ...form, [`${exp.id}_stop`]: v })} />
                <label className="flex items-center gap-3">
                  <input type="checkbox" className="size-8" checked={Boolean(form[`${exp.id}_sup`])} onChange={(e) => setForm({ ...form, [`${exp.id}_sup`]: e.target.checked })} />
                  Supervisor review complete
                </label>
                <p>{alt.complete ? "Alternative Control Strategy Complete" : "Control Plan Incomplete"}</p>
                <BigButton onClick={() => patch("saveAlternativeControls", {
                  jrbExposureId: exp.id,
                  controls: form[`${exp.id}_alts`],
                  residualExposure: form[`${exp.id}_residual`],
                  stopWorkTrigger: form[`${exp.id}_stop`],
                  supervisorReviewed: form[`${exp.id}_sup`],
                })}>Save Alternative Controls</BigButton>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

function ReadyStep({ data, onRelease }: { data: any; onRelease: () => void }) {
  const items = [
    "Work Identified",
    "EEI Tasks Confirmed",
    "Conditions Reviewed",
    "High Energy Reviewed",
    "Serious Injury or Fatality Potential Reviewed",
    "Direct Controls Verified",
    "Alternative Control Strategy Complete when applicable",
    "Minimum Briefing Subjects Addressed",
    "Crew Briefing Complete",
    "Questions Addressed",
    "Required Approvals Complete",
    "Data Synchronized",
  ];
  return (
    <div className="space-y-3">
      <p className="text-2xl font-bold">{data.readiness?.status}</p>
      {data.readiness?.banner ? <p className="rounded-xl border-2 border-yellow-300 p-3">{data.readiness.banner}</p> : null}
      {data.readiness?.gaps?.map((g: any) => (
        <p key={g.code + g.message} className="rounded-xl bg-[#2a1d00] p-3">
          {g.message} Next: {g.nextAction}
        </p>
      ))}
      <ul className="space-y-2">
        {items.map((i) => <li key={i} className="rounded-xl bg-[#121a2b] p-3">{i}</li>)}
      </ul>
      <BigButton onClick={onRelease}>Release JRB for Work</BigButton>
      {data.jrb.status === "released_for_work" ? <p>{READY_NOTICE}</p> : null}
    </div>
  );
}
