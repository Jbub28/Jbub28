"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ConnectionStatus } from "./ConnectionStatus";

export const STEPS = [
  { key: "talk", label: "Talk Through the Job", question: "Tell us what we're doing, what can seriously hurt or kill us, and how we're going to control it." },
  { key: "exposures", label: "What Can Kill Us", question: "What can seriously hurt us, and how are we controlling it?" },
  { key: "ready", label: "Ready for Work", question: "Do we understand the job, the serious exposures, and the controls?" },
];

function useKeyboardOpen() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () => {
      const covered = window.innerHeight - viewport.height;
      setOpen(covered > 120);
    };
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, []);
  return open;
}

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
  backLabel?: string;
  helpText?: string;
  briefId?: string;
  children: React.ReactNode;
  errorSummary?: string[];
}) {
  const total = STEPS.length;
  const keyboardOpen = useKeyboardOpen();
  const [helpOpen, setHelpOpen] = useState(false);
  const help = props.helpText ?? STEPS[props.stepIndex]?.question;

  return (
    <div className="mx-auto flex h-[100dvh] max-h-[100dvh] w-full max-w-xl flex-col overflow-hidden px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <header className="shrink-0 pb-3">
        <div className="flex items-start justify-between gap-3">
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
            <Link href="/briefs" className="text-sm font-bold underline">
              My briefs
            </Link>
          </div>
        </div>
      </header>
      {props.errorSummary && props.errorSummary.length > 0 ? (
        <div className="mb-3 shrink-0 rounded-xl border-2 border-yellow-300 bg-[#2a1d00] p-4" role="alert">
          <h2 className="text-lg font-bold">Needs attention</h2>
          <ul className="list-disc pl-5">
            {props.errorSummary.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-4 [-webkit-overflow-scrolling:touch]">
        {props.children}
      </div>
      {keyboardOpen ? (
        <p className="shrink-0 py-2 text-center text-sm text-slate-200" role="status">
          Keyboard open — scroll the form. Close the keyboard for Save, Next, and Stop Work.
        </p>
      ) : (
        <nav
          className="shrink-0 border-t border-slate-600 bg-[#070b14] pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          aria-label="Job brief actions"
        >
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="rounded-xl bg-[#1b2740] px-4 text-lg font-bold" onClick={props.onBack}>
              {props.backLabel ?? "Back"}
            </button>
            <button type="button" className="rounded-xl bg-[#ffd000] px-4 text-lg font-bold text-black" onClick={props.onNext}>
              {props.nextLabel ?? "Next"}
            </button>
            <button type="button" className="rounded-xl bg-[#1b2740] px-4 text-lg font-bold" onClick={props.onSave}>
              Save Draft
            </button>
            <button
              type="button"
              className="rounded-xl bg-[#1b2740] px-4 text-lg font-bold"
              onClick={() => {
                props.onHelp();
                setHelpOpen(true);
              }}
            >
              Help
            </button>
            <button type="button" className="rounded-xl bg-[#5b1b1b] px-4 text-lg font-bold" onClick={props.onStop}>
              Stop Work
            </button>
            <button type="button" className="rounded-xl bg-[#3b2a00] px-4 text-lg font-bold" onClick={props.onRebrief}>
              Conditions Changed / Rebrief
            </button>
          </div>
          <p className="mt-2 text-center text-sm">
            <Link href="/briefs" className="underline">
              My briefs
            </Link>
            {props.briefId ? (
              <>
                {" · "}
                <Link href={`/briefs/${props.briefId}/closeout`} className="underline">
                  Post-job review
                </Link>
              </>
            ) : null}
          </p>
        </nav>
      )}
      {helpOpen ? (
        <div className="fixed inset-0 z-30 flex items-end bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="help-title">
          <div className="w-full space-y-3 rounded-2xl bg-[#121a2b] p-5">
            <h2 id="help-title" className="text-2xl font-bold">Help</h2>
            <p className="text-lg">{help}</p>
            <p className="text-sm">Talk through the job, then scroll the fields to check what was captured. EnergyGuard does not decide that work is safe. Back returns to your briefs on the first screen.</p>
            <button type="button" className="w-full rounded-xl bg-[#ffd000] py-3 text-xl font-bold text-black" onClick={() => setHelpOpen(false)}>
              Close help
            </button>
          </div>
        </div>
      ) : null}
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
