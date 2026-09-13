"use client";

import { useEffect, useMemo, useState } from "react";
import { BigButton, Field } from "./FieldChrome";

type Suggestion = {
  taskId: string;
  exactTaskName: string;
  explanation?: string;
  activityExactName?: string;
  confidence?: string;
};

type LibraryTask = {
  id: string;
  exactName: string;
  activity: string;
  workType: string;
};

export function TaskConfirm(props: {
  workTypeCode?: string;
  workDescription?: string;
  suggestions: Suggestion[];
  unmatchedMessage?: string | null;
  confirmed: { id: string; name: string }[];
  onConfirm: (taskId: string) => Promise<unknown> | unknown;
}) {
  const seed = useMemo(() => {
    const text = props.workDescription ?? "";
    if (/\btransformer\b/i.test(text)) return "transformer";
    if (/\bcut[- ]?out\b/i.test(text)) return "cutout";
    const words = text.toLowerCase().match(/\b[a-z]{4,}\b/g) ?? [];
    return words.find((w) => !["replace", "install", "remove", "damaged", "overhead"].includes(w)) ?? "";
  }, [props.workDescription]);
  const [query, setQuery] = useState(seed);
  const [library, setLibrary] = useState<LibraryTask[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    setQuery(seed);
  }, [seed]);

  useEffect(() => {
    if (!props.workTypeCode) return;
    const q = query.trim();
    if (q.length < 2) {
      setLibrary([]);
      return;
    }
    const url = `/api/reference/tasks?workType=${encodeURIComponent(props.workTypeCode)}&q=${encodeURIComponent(q)}`;
    const handle = window.setTimeout(() => {
      void fetch(url)
        .then((res) => (res.ok ? res.json() : { tasks: [] }))
        .then((data) => setLibrary(Array.isArray(data.tasks) ? data.tasks : []))
        .catch(() => setLibrary([]));
    }, 200);
    return () => window.clearTimeout(handle);
  }, [props.workTypeCode, query]);

  const confirm = async (taskId: string) => {
    setBusyId(taskId);
    try {
      await props.onConfirm(taskId);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="eg-card space-y-3 p-4">
      <h2 className="text-lg font-bold">EEI task — confirm it yourself</h2>
      {props.confirmed.length ? (
        <div className="space-y-1">
          {props.confirmed.map((task) => (
            <p key={task.id} className="rounded-xl bg-[var(--ok-bg)] p-3 font-bold text-[var(--ok)]">
              Confirmed: {task.name}
            </p>
          ))}
        </div>
      ) : (
        <p className="text-sm">EnergyGuard will not confirm a task for you. Pick the approved EEI task for this job.</p>
      )}
      {props.unmatchedMessage && !props.suggestions.length ? <p className="text-sm">{props.unmatchedMessage}</p> : null}
      {props.suggestions.map((s) => (
        <article key={s.taskId} className="rounded-xl bg-[var(--surface-2)] p-3">
          <p className="font-bold">{s.exactTaskName}</p>
          {s.activityExactName ? <p className="text-sm">{s.activityExactName}</p> : null}
          {s.explanation ? <p className="text-sm">{s.explanation}</p> : null}
          {s.confidence ? <p className="text-sm">{s.confidence} — still needs your confirmation</p> : null}
          <BigButton selected={props.confirmed.some((c) => c.id === s.taskId)} onClick={() => void confirm(s.taskId)}>
            {busyId === s.taskId ? "Saving…" : props.confirmed.some((c) => c.id === s.taskId) ? "Confirmed" : "Confirm this task"}
          </BigButton>
        </article>
      ))}
      <Field id="task-search" label="Search the EEI library" value={query} onChange={setQuery} />
      {library
        .filter((t) => !props.suggestions.some((s) => s.taskId === t.id))
        .slice(0, 6)
        .map((t) => (
          <article key={t.id} className="rounded-xl bg-[var(--surface-2)] p-3">
            <p className="font-bold">{t.exactName}</p>
            <p className="text-sm">{t.activity} · {t.workType}</p>
            <BigButton selected={props.confirmed.some((c) => c.id === t.id)} onClick={() => void confirm(t.id)}>
              {busyId === t.id ? "Saving…" : props.confirmed.some((c) => c.id === t.id) ? "Confirmed" : "Confirm this task"}
            </BigButton>
          </article>
        ))}
    </section>
  );
}
