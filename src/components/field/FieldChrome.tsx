"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ConnectionStatus } from "./ConnectionStatus";
import { BrandMark } from "@/components/ui/AppHeader";

export const STEPS = [
  { key: "talk", label: "Talk Through the Job", question: "Tell us what we're doing, what can seriously hurt or kill us, and how we're going to control it." },
  { key: "exposures", label: "What Can Kill Us", question: "What can seriously hurt us, and how are we controlling it?" },
  { key: "ready", label: "Ready for Work", question: "Do we understand the job, the serious exposures, and the controls?" },
];

export function usePeekOpen(force = false, options?: { trackFocus?: boolean; hoverDelayMs?: number }) {
  const [hover, setHover] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [focus, setFocus] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const hoverTimer = useRef<number | undefined>(undefined);
  return {
    open: force || pinned || (options?.trackFocus ? focus : false) || (hover && !dismissed),
    pinned,
    setPinned,
    expand: () => {
      setPinned(true);
      setDismissed(false);
    },
    collapse: () => {
      setPinned(false);
      setDismissed(true);
    },
    bind: {
      onMouseEnter: () => {
        window.clearTimeout(hoverTimer.current);
        if (options?.hoverDelayMs) {
          hoverTimer.current = window.setTimeout(() => setHover(true), options.hoverDelayMs);
        } else {
          setHover(true);
        }
      },
      onMouseLeave: () => {
        window.clearTimeout(hoverTimer.current);
        setHover(false);
        setDismissed(false);
      },
      onFocusCapture: options?.trackFocus ? () => setFocus(true) : undefined,
      onBlurCapture: options?.trackFocus
        ? (event: React.FocusEvent<HTMLElement>) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocus(false);
          }
        : undefined,
    },
  };
}

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
  onDiscard?: () => void;
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
  const dock = usePeekOpen(false, { hoverDelayMs: 250 });
  const help = props.helpText ?? STEPS[props.stepIndex]?.question;

  return (
    <div className="mx-auto flex h-[100dvh] max-h-[100dvh] w-full max-w-xl flex-col overflow-hidden bg-[var(--bg)] md:max-w-3xl">
      <header className="shrink-0 bg-[var(--bg-navy)] px-4 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
        <div className="flex items-start justify-between gap-3 pb-3">
          <div className="flex items-start gap-3">
            <BrandMark compact />
            <div>
              <p className="eg-kicker text-[#f0c43a]">Electric Delivery · Step {props.stepIndex + 1} of {total}</p>
              <h1 className="text-2xl font-bold">{props.title}</h1>
            </div>
          </div>
          <div className="text-right text-sm">
            <ConnectionStatus />
            <p role="status" aria-live="polite">
              {props.saveState}
            </p>
            <Link href="/briefs" className="font-bold underline">
              My briefs
            </Link>
          </div>
        </div>
        <ol className="grid grid-cols-3 gap-1 pb-3" aria-label="Briefing steps">
          {STEPS.map((step, index) => {
            const current = index === props.stepIndex;
            const done = index < props.stepIndex;
            const short = ["Talk", "Exposures", "Ready"][index];
            return (
              <li
                key={step.key}
                className={`rounded-md px-2 py-1 text-center text-[11px] font-bold uppercase tracking-wide ${
                  current ? "bg-[#f0c43a] text-[#0a3161]" : done ? "bg-white/20 text-white" : "bg-white/10 text-white/70"
                }`}
                aria-current={current ? "step" : undefined}
              >
                {index + 1}. {short}
              </li>
            );
          })}
        </ol>
        <div className="-mx-4 h-1 bg-[#f0c43a]" aria-hidden />
      </header>
      {props.errorSummary && props.errorSummary.length > 0 ? (
        <div className="eg-alert mx-4 mt-3 shrink-0 p-4" role="alert">
          <h2 className="text-lg font-bold">Needs attention</h2>
          <ul className="list-disc pl-5">
            {props.errorSummary.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 [-webkit-overflow-scrolling:touch]">
        {props.children}
      </div>
      {keyboardOpen ? (
        <p className="eg-muted shrink-0 px-4 py-2 text-center text-sm" role="status">
          Keyboard open — scroll the form. Close the keyboard for Save, Next, and Stop Work.
        </p>
      ) : (
        <nav
          className="relative shrink-0 border-t border-[var(--border)] bg-white px-2 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))]"
          aria-label="Job brief actions"
          data-expanded={dock.open ? "true" : "false"}
        >
          {dock.open ? (
            <div
              id="brief-more-actions"
              className="absolute inset-x-2 bottom-full z-20 mb-1 grid grid-cols-2 gap-1 rounded-xl border border-[var(--border)] bg-white p-2 shadow-lg md:grid-cols-3"
            >
              <button type="button" className="eg-dock-btn border border-[var(--border)] bg-white font-bold md:hidden" onClick={props.onSave}>
                Save Draft
              </button>
              <button
                type="button"
                className="eg-dock-btn border border-[var(--border)] bg-white font-bold"
                onClick={() => {
                  props.onHelp();
                  setHelpOpen(true);
                  dock.collapse();
                }}
              >
                Help
              </button>
              <button
                type="button"
                className="eg-dock-btn bg-[var(--warn-bg)] font-bold text-[var(--warn)]"
                aria-label="Conditions Changed / Rebrief"
                onClick={props.onRebrief}
              >
                Rebrief
              </button>
              {props.briefId ? (
                <Link href={`/briefs/${props.briefId}/closeout`} className="eg-dock-btn inline-flex items-center justify-center font-bold text-[var(--navy)] underline">
                  Post-job review
                </Link>
              ) : null}
              {props.onDiscard ? (
                <button type="button" className="eg-dock-btn border border-[var(--border)] bg-white font-bold" onClick={props.onDiscard}>
                  Discard
                </button>
              ) : null}
              <Link href="/briefs" className="eg-dock-btn inline-flex items-center justify-center font-bold text-[var(--navy)] underline md:hidden">
                My briefs
              </Link>
            </div>
          ) : null}
          <div className="flex items-center gap-1">
            <button type="button" className="eg-dock-btn flex-1 border border-[var(--border)] bg-[var(--surface-2)] font-bold" onClick={props.onBack}>
              {props.backLabel ?? "Back"}
            </button>
            <button type="button" className="eg-dock-btn min-w-0 flex-[1.2] truncate bg-[var(--navy)] font-bold text-white" onClick={props.onNext}>
              {props.nextLabel ?? "Next"}
            </button>
            <button type="button" className="eg-dock-btn hidden flex-1 border border-[var(--border)] bg-white font-bold md:block" onClick={props.onSave}>
              Save Draft
            </button>
            <button type="button" className="eg-dock-btn bg-[var(--danger)] font-bold text-white" onClick={props.onStop}>
              Stop Work
            </button>
            <button
              type="button"
              className="eg-dock-btn border border-[var(--border)] bg-white px-3 font-bold"
              aria-expanded={dock.open}
              aria-controls="brief-more-actions"
              onClick={() => (dock.open ? dock.collapse() : dock.expand())}
            >
              {dock.open ? "Less" : "More"}
            </button>
          </div>
        </nav>
      )}
      {helpOpen ? (
        <div className="fixed inset-0 z-30 flex items-end bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="help-title">
          <div className="eg-card w-full space-y-3 p-5">
            <h2 id="help-title" className="text-2xl font-bold">Help</h2>
            <p className="text-lg">{help}</p>
            <p className="eg-muted text-sm">Talk through the job, then scroll the fields to check what was captured. EnergyGuard does not decide that work is safe. Back returns to your briefs on the first screen.</p>
            <button type="button" className="w-full rounded-xl bg-[var(--navy)] py-3 text-xl font-bold text-white" onClick={() => setHelpOpen(false)}>
              Close help
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function BigButton(props: { children: React.ReactNode; onClick?: () => void; selected?: boolean; type?: "button" | "submit"; primary?: boolean; }) {
  const tone = props.selected || props.primary
    ? "border-[var(--navy)] bg-[var(--navy)] text-white"
    : "border-[var(--border)] bg-white text-[var(--text)]";
  return (
    <button
      type={props.type ?? "button"}
      onClick={props.onClick}
      className={`w-full rounded-2xl border px-4 py-4 text-left text-xl font-bold ${tone}`}
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
    props.highlight ? "border-[var(--accent)] bg-[var(--warn-bg)]" : "border-[var(--border)] bg-white"
  }`;
  return (
    <div className="block space-y-1">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <label className="text-lg font-bold" htmlFor={props.id}>
          {props.label}
        </label>
        {props.highlight ? <span className="text-sm font-semibold text-[var(--navy)]">Filled from talk</span> : null}
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
      {props.help ? <span className="eg-muted block text-sm">{props.help}</span> : null}
    </div>
  );
}

export function voiceMark(keys: string[], key: string): boolean {
  return keys.includes(key);
}
