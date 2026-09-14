"use client";

import { useEffect, useRef, useState } from "react";
import { useSpeechToText } from "@/hooks/useSpeechToText";
import { joinSpokenText } from "@/lib/speech/browserSpeech";
import { applyVoicePrefill } from "@/lib/voice/applyPrefill";
import { extractPageFields } from "@/lib/voice/extractPageFields";
import type { VoiceSchemaContext } from "@/lib/voice/pageSchemas";
import type { ExtractionResult, PageVoiceSchema, ProposedChange, VoiceSuggestion } from "@/lib/voice/types";

async function extractForPage(stepKey: string, transcript: string, schema: PageVoiceSchema, context: VoiceSchemaContext): Promise<ExtractionResult> {
  if (typeof navigator !== "undefined" && navigator.onLine) {
    try {
      const res = await fetch("/api/ai/extract-page-fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stepKey, transcript, context }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.result) return data.result as ExtractionResult;
      }
    } catch {
      /* use local extractor */
    }
  }
  return extractPageFields({ transcript, schema });
}

export function PageVoiceAssistant(props: {
  schema: PageVoiceSchema;
  context?: VoiceSchemaContext;
  currentValues: Record<string, unknown>;
  onApply: (updates: Record<string, unknown>, meta: {
    transcript: string;
    appliedKeys: string[];
    preservedKeys: string[];
    suggestions: VoiceSuggestion[];
    extraction: ExtractionResult;
    proposedChanges: ProposedChange[];
  }) => void;
  onConfirmSuggestion?: (suggestion: VoiceSuggestion) => void;
}) {
  const sessionRef = useRef("");
  const propsRef = useRef(props);
  useEffect(() => {
    propsRef.current = props;
  });
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
  const [proposed, setProposed] = useState<ProposedChange[]>([]);
  const [busy, setBusy] = useState(false);
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
      const current = propsRef.current;
      void extractForPage(current.schema.stepKey, spoken, current.schema, current.context ?? {})
        .then((result) => {
          setExtraction(result);
          const applied = applyVoicePrefill({
            schema: current.schema,
            current: current.currentValues,
            extraction: result,
          });
          setProposed(applied.proposedChanges);
          current.onApply(applied.updates, {
            transcript: spoken,
            appliedKeys: applied.appliedKeys,
            preservedKeys: applied.preservedKeys,
            suggestions: result.suggestions,
            extraction: result,
            proposedChanges: applied.proposedChanges,
          });
        })
        .finally(() => setBusy(false));
    },
  });

  const visibleTranscript = [transcript, interim].filter(Boolean).join(" ").trim();

  return (
    <section className="eg-card space-y-3 p-4">
      <button
        type="button"
        className={`min-h-16 w-full rounded-2xl px-4 py-4 text-xl font-bold ${listening ? "bg-[var(--accent)] text-[var(--accent-text)]" : "bg-[var(--navy)] text-white"}`}
        aria-pressed={listening}
        aria-label={listening ? "Stop talking" : "Talk to fill this page"}
        onClick={() => {
          if (listening) {
            stop();
            return;
          }
          sessionRef.current = "";
          setTranscript("");
          setInterim("");
          setExtraction(null);
          setProposed([]);
          toggle();
        }}
      >
        {listening ? "Stop" : "Talk"}
      </button>
      <p className="text-lg font-bold" role="status" aria-live="polite">
        {error ?? (listening ? "Listening..." : busy ? "Matching what you said to this page…" : "Talk about this page, then edit anything that looks wrong.")}
      </p>
      {visibleTranscript ? (
        <div>
          <p className="eg-kicker">Heard</p>
          <p className="text-lg">{visibleTranscript}</p>
        </div>
      ) : null}
      {extraction && !listening ? (
        <div className="space-y-2 text-sm">
          {extraction.fills.length > 0 ? (
            <p>Filled from talk: {extraction.fills.map((f) => f.label).join(", ")}. You can edit the fields below.</p>
          ) : (
            <p>We heard that, but nothing on this page was clear enough to fill. Type, or say the fields that are on this page.</p>
          )}
          {extraction.skipped.length > 0 ? (
            <p>{extraction.skipped.map((s) => s.reason).join(" ")}</p>
          ) : null}
        </div>
      ) : null}
      {proposed.length ? (
        <div className="space-y-2">
          <p className="font-bold text-[var(--navy)]">Location already entered</p>
          {proposed.map((change) => (
            <div key={change.key} className="eg-alert p-3">
              <p className="font-bold">{change.label}</p>
              <p className="text-sm">Current: {change.current}</p>
              <p className="text-sm">Heard: {change.proposed}</p>
              <button
                type="button"
                className="mt-2 w-full rounded-xl bg-[var(--navy)] py-2 text-lg font-bold text-white"
                onClick={() => {
                  props.onApply({ [change.key]: change.proposed }, {
                    transcript: transcript,
                    appliedKeys: [change.key],
                    preservedKeys: [],
                    suggestions: [],
                    extraction: extraction ?? {
                      transcript,
                      fills: [],
                      suggestions: [],
                      skipped: [],
                      provider: "local-page-extractor",
                      model: "deterministic-v1",
                    },
                    proposedChanges: [],
                  });
                  setProposed((list) => list.filter((item) => item.key !== change.key));
                }}
              >
                Use spoken {change.label}
              </button>
            </div>
          ))}
          <p className="text-sm">The current value stays unless you choose the spoken one.</p>
        </div>
      ) : null}
      {extraction?.suggestions.length ? (
        <div className="space-y-2">
          <p className="font-bold text-[var(--navy)]">Suggested for Crew Review</p>
          {extraction.suggestions.map((s) => (
            <button
              key={`${s.key}-${String(s.value)}`}
              type="button"
              className="eg-alert w-full px-4 py-3 text-left text-lg font-bold"
              onClick={() => props.onConfirmSuggestion?.(s)}
            >
              {s.label}
              <span className="mt-1 block text-sm font-normal">{s.reason}</span>
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
