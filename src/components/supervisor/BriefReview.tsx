"use client";

import { HighEnergyIcon } from "@/components/ui/HighEnergyIcon";
import { JobLocationSummary } from "@/components/field/JobLocation";
import { briefTitle, jobTiming, plainStatus } from "@/lib/domain/briefPresentation";

type SupervisorBriefReviewProps = {
  jrb: any;
  readiness: { status?: string; gaps?: { message: string; nextAction: string }[] } | null;
};

const OSHA_SUBJECTS: { label: string; key: string }[] = [
  { label: "Hazards associated with the job", key: "hazardsAddressed" },
  { label: "Work procedures involved", key: "proceduresAddressed" },
  { label: "Special precautions", key: "precautionsAddressed" },
  { label: "Energy-source controls", key: "energyControlsAddressed" },
  { label: "PPE requirements", key: "ppeAddressed" },
];

export function SupervisorBriefReview({ jrb, readiness }: SupervisorBriefReviewProps) {
  const version = jrb.versions?.[0];
  const timing = jobTiming(jrb);
  const work =
    version?.workDescriptionEdited ||
    version?.workDescriptionOriginal ||
    version?.briefingTranscript ||
    "No briefing text captured yet.";
  const tasks = (version?.taskSelections ?? []).filter((t: any) => t.confirmed);
  const exposures = version?.exposures ?? [];
  const crew = version?.crewMembers ?? [];
  const steps = version?.jobSteps ?? [];
  const conditions = version?.conditions ?? [];
  const questions = version?.questions ?? [];
  const assessment = version?.briefingAssessment;
  const stopEvents = jrb.stopWorkEvents ?? [];
  const rebriefEvents = jrb.rebriefEvents ?? [];

  return (
    <div className="space-y-4">
      <p className="eg-card p-3" role="status">
        Review only. Supervisors cannot change the crew briefing. Use the CSRA scorecard from the Supervisor desk.
      </p>
      <article className="eg-card p-4">
        <p className="text-xl font-bold">{briefTitle(jrb)}</p>
        <p className="text-sm">
          {jrb.jrbNumber} · {plainStatus(jrb.status, jrb.discardedAt)}
          {jrb.workType?.exactName ? ` · ${jrb.workType.exactName}` : ""}
        </p>
        <p className="text-sm">Created by {jrb.createdBy?.displayName ?? "Crew member"}</p>
        <p className="text-sm">Worker in Charge: {jrb.employeeInCharge?.displayName ?? "Not identified"}</p>
        {timing.line ? <p className="eg-muted text-sm">{timing.line}</p> : null}
        {jrb.workOrderNumber ? <p className="text-sm">Work order: {jrb.workOrderNumber}</p> : null}
        {jrb.circuitNumber ? <p className="text-sm">Circuit: {jrb.circuitNumber}</p> : null}
      </article>
      <JobLocationSummary jrb={jrb} />
      <article className="eg-card p-4">
        <h2 className="text-lg font-bold">Briefing</h2>
        <p className="whitespace-pre-wrap">{work}</p>
      </article>
      <article className="eg-card p-4">
        <h2 className="text-lg font-bold">EEI task</h2>
        {tasks.length ? (
          <ul className="list-disc pl-5">
            {tasks.map((t: any) => (
              <li key={t.id}>{t.task?.exactName ?? "EEI task"}</li>
            ))}
          </ul>
        ) : (
          <p>No EEI task confirmed yet.</p>
        )}
      </article>
      <section className="space-y-3">
        <h2 className="text-xl font-bold">What can seriously hurt or kill us?</h2>
        <p className="eg-muted text-sm">Official High Energy icons from the Electric Delivery briefing form.</p>
        {exposures.length === 0 ? (
          <p>No High Energy hazards were recorded on this brief.</p>
        ) : (
          exposures.map((row: any) => {
            const label =
              row.exposure?.formLabelExact ?? row.exposure?.dcInventoryLabelExact ?? row.exposure?.key ?? "High Energy";
            const controls = row.directControlSelections ?? [];
            const notUsed = row.notUsed ?? [];
            const alternatives = row.alternativeControls ?? [];
            return (
              <article key={row.id} className="eg-card p-4">
                <HighEnergyIcon energyKey={String(row.exposure?.key ?? "")} label={String(label)} />
                {row.energySource ? <p className="mt-2 text-sm">Energy source: {row.energySource}</p> : null}
                {row.presence ? <p className="text-sm">Presence: {String(row.presence).replaceAll("_", " ")}</p> : null}
                {controls.length ? (
                  <ul className="mt-2 list-disc pl-5 text-sm">
                    {controls.map((sel: any) => (
                      <li key={sel.id}>
                        Direct Control: {sel.directControl?.exactName ?? "Inventory control"}
                        {sel.personResponsible ? ` · ${sel.personResponsible}` : ""}
                        {sel.verifications?.length ? " · Verified" : ""}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm">No inventory Direct Control recorded for this High Energy.</p>
                )}
                {notUsed.map((item: any) => (
                  <p key={item.id} className="mt-2 text-sm">
                    Direct Control not used: {item.reason}
                    {item.explanation ? ` — ${item.explanation}` : ""}
                  </p>
                ))}
                {alternatives.map((item: any) => (
                  <p key={item.id} className="mt-2 text-sm">
                    Alternative control ({item.category?.exactName ?? "category"}): {item.description || item.howReducesExposure || "Recorded"}
                  </p>
                ))}
              </article>
            );
          })
        )}
      </section>
      <article className="eg-card p-4">
        <h2 className="text-lg font-bold">Participants</h2>
        {crew.length ? (
          <ul className="list-disc pl-5">
            {crew.map((m: any) => {
              const acked = version?.acknowledgments?.some((a: any) => a.name === m.name);
              return (
                <li key={m.id}>
                  {m.name}
                  {m.employer ? ` · ${m.employer}` : ""} — {acked ? "Acknowledged" : "Listed"}
                </li>
              );
            })}
          </ul>
        ) : (
          <p>No crew members listed.</p>
        )}
      </article>
      {steps.length ? (
        <article className="eg-card p-4">
          <h2 className="text-lg font-bold">Work procedures and PPE</h2>
          <ul className="space-y-2">
            {steps.map((step: any) => (
              <li key={step.id}>
                {step.workProcedure ? <p>{step.workProcedure}</p> : null}
                {step.specialPrecaution ? <p className="text-sm">Special precaution: {step.specialPrecaution}</p> : null}
                {step.ppeNotes ? <p className="text-sm">PPE: {step.ppeNotes}</p> : null}
              </li>
            ))}
          </ul>
        </article>
      ) : null}
      {conditions.length || (version?.environmental ?? []).length ? (
        <article className="eg-card p-4">
          <h2 className="text-lg font-bold">Conditions</h2>
          <ul className="list-disc pl-5">
            {conditions.map((c: any) => (
              <li key={c.id}>
                {c.planMatchesField == null
                  ? "Conditions not yet compared to the plan"
                  : c.planMatchesField
                    ? "Plan matches field conditions"
                    : "Material difference from the plan"}
                {c.materialDifferenceNotes ? ` — ${c.materialDifferenceNotes}` : ""}
              </li>
            ))}
            {(version?.environmental ?? []).map((c: any) => (
              <li key={c.id}>{c.choice}{c.otherText ? ` — ${c.otherText}` : ""}</li>
            ))}
          </ul>
        </article>
      ) : null}
      <article className="eg-card p-4">
        <h2 className="text-lg font-bold">OSHA briefing subjects</h2>
        <ul className="mt-2 space-y-2">
          {OSHA_SUBJECTS.map((item) => (
            <li key={item.key}>
              {assessment?.[item.key] ? "Addressed in the briefing" : "Needs attention"} — {item.label}
            </li>
          ))}
        </ul>
      </article>
      {questions.length ? (
        <article className="eg-card p-4">
          <h2 className="text-lg font-bold">Questions from the briefing</h2>
          <ul className="list-disc pl-5">
            {questions.map((q: any) => (
              <li key={q.id}>
                {q.question ?? "Question"}
                {q.eicResponse ? ` — ${q.eicResponse}` : ""}
              </li>
            ))}
          </ul>
        </article>
      ) : null}
      {stopEvents.length || rebriefEvents.length ? (
        <article className="eg-card p-4">
          <h2 className="text-lg font-bold">Stop work and rebriefs</h2>
          <ul className="list-disc pl-5">
            {stopEvents.map((event: any) => (
              <li key={event.id}>
                Stop work: {event.reason}
                {event.explanation ? ` — ${event.explanation}` : ""}
              </li>
            ))}
            {rebriefEvents.map((event: any) => (
              <li key={event.id}>
                Rebrief: {event.reason}
                {event.explanation ? ` — ${event.explanation}` : ""}
              </li>
            ))}
          </ul>
        </article>
      ) : null}
      {readiness?.status || readiness?.gaps?.length ? (
        <article className="eg-card p-4">
          <h2 className="text-lg font-bold">Readiness</h2>
          {readiness?.status ? <p>{readiness.status}</p> : null}
          {readiness?.gaps?.length ? (
            <ul className="mt-2 list-disc pl-5">
              {readiness.gaps.map((gap) => (
                <li key={`${gap.message}-${gap.nextAction}`}>
                  {gap.message} Next: {gap.nextAction}
                </li>
              ))}
            </ul>
          ) : null}
        </article>
      ) : null}
    </div>
  );
}
