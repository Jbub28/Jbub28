"use client";

import Link from "next/link";
import { ConnectionStatus } from "./ConnectionStatus";

export const STEPS = [
  { key: "start", label: "Start the Job Brief", question: "Who is working, and where?" },
  { key: "work", label: "What Work Are We Doing?", question: "Tell us the work in your own words, or pick a task." },
  { key: "conditions", label: "Jobsite Conditions", question: "Did we cover leaving and walking the job?" },
  { key: "high-energy", label: "What Can Seriously Hurt or Kill Us?", question: "Which High Energy is present?" },
  { key: "controls", label: "How Will We Control the Energy?", question: "How will we control each Present energy?" },
  { key: "job-steps", label: "Job Steps and PPE", question: "What are the steps, precautions, and PPE?" },
  { key: "completeness", label: "Briefing Subjects", question: "Did we cover the required subjects?" },
  { key: "review", label: "Review the Job Plan", question: "Does this plan look right?" },
  { key: "crew", label: "Brief the Crew", question: "Does anyone have a question or see something we missed?" },
  { key: "ready", label: "Are We Ready to Start?", question: "Can we release this brief for work?" },
];

export function FieldChrome(props: {
  stepIndex: number;
  title: string;
  saveState: string;
  onBack: () => void;
  onNext: () => void;
  onSave: () => void;
  onHelp: () => void;
  onStop: () => void;
  onRebrief: () => void;
  nextLabel?: string;
  children: React.ReactNode;
  errorSummary?: string[];
}) {
  const total = STEPS.length;
  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col px-4 pb-[22rem] pt-4">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-yellow-300">
            Step {props.stepIndex + 1} of {total}
          </p>
          <h1 className="text-2xl font-bold">{props.title}</h1>
        </div>
        <div className="text-right">
          <ConnectionStatus />
          <p className="text-sm" role="status" aria-live="polite">
            {props.saveState}
          </p>
        </div>
      </header>
      {props.errorSummary && props.errorSummary.length > 0 ? (
        <div className="mb-4 rounded-xl border-2 border-yellow-300 bg-[#2a1d00] p-4" role="alert">
          <h2 className="text-lg font-bold">Needs attention</h2>
          <ul className="list-disc pl-5">
            {props.errorSummary.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="flex-1 space-y-4">{props.children}</div>
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-600 bg-[#070b14] p-3">
        <div className="mx-auto grid max-w-xl grid-cols-2 gap-2">
          <button type="button" className="rounded-xl bg-[#1b2740] px-4 text-lg font-bold" onClick={props.onBack}>
            Back
          </button>
          <button type="button" className="rounded-xl bg-[#ffd000] px-4 text-lg font-bold text-black" onClick={props.onNext}>
            {props.nextLabel ?? "Next"}
          </button>
          <button type="button" className="rounded-xl bg-[#1b2740] px-4 text-lg font-bold" onClick={props.onSave}>
            Save Draft
          </button>
          <button type="button" className="rounded-xl bg-[#1b2740] px-4 text-lg font-bold" onClick={props.onHelp}>
            Help
          </button>
          <button type="button" className="col-span-1 rounded-xl bg-[#5b1b1b] px-4 text-lg font-bold" onClick={props.onStop}>
            Stop Work
          </button>
          <button type="button" className="col-span-1 rounded-xl bg-[#3b2a00] px-4 text-lg font-bold" onClick={props.onRebrief}>
            Conditions Changed / Rebrief
          </button>
        </div>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm">
          <Link href="/briefs" className="underline">
            My briefs
          </Link>
        </p>
      </div>
    </div>
  );
}

export function BigButton(props: { children: React.ReactNode; onClick?: () => void; selected?: boolean; type?: "button" | "submit"; }) {
  return (
    <button
      type={props.type ?? "button"}
      onClick={props.onClick}
      className={`w-full rounded-2xl px-4 py-4 text-left text-xl font-bold ${props.selected ? "bg-[#ffd000] text-black" : "bg-[#1b2740]"}`}
    >
      {props.children}
    </button>
  );
}

export function Field(props: {
  id: string;
  label: string;
  value?: string;
  onChange?: (v: string) => void;
  textarea?: boolean;
  help?: string;
  highlight?: boolean;
}) {
  const fieldClass = `min-h-14 w-full rounded-xl border-2 px-3 py-3 text-lg ${
    props.highlight ? "border-yellow-300 bg-[#2a1d00]" : "border-slate-500 bg-[#121a2b]"
  }`;
  return (
    <div className="block space-y-1">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <label className="text-lg font-bold" htmlFor={props.id}>
          {props.label}
        </label>
        {props.highlight ? <span className="text-sm font-semibold text-yellow-300">Filled from talk</span> : null}
      </div>
      {props.textarea ? (
        <textarea
          id={props.id}
          rows={4}
          className={fieldClass}
          value={props.value ?? ""}
          onChange={(e) => props.onChange?.(e.target.value)}
        />
      ) : (
        <input
          id={props.id}
          className={fieldClass}
          value={props.value ?? ""}
          onChange={(e) => props.onChange?.(e.target.value)}
        />
      )}
      {props.help ? <span className="block text-sm text-slate-200">{props.help}</span> : null}
    </div>
  );
}

export function voiceMark(keys: string[], key: string): boolean {
  return keys.includes(key);
}
