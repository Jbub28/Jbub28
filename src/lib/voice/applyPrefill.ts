import type { ExtractionResult, PageVoiceSchema, PrefillApplyResult } from "./types";

function isFilled(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "boolean") return value === true;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

export function applyVoicePrefill(input: {
  schema: PageVoiceSchema;
  current: Record<string, unknown>;
  extraction: ExtractionResult;
}): PrefillApplyResult {
  const updates: Record<string, unknown> = {};
  const appliedKeys: string[] = [];
  const preservedKeys: string[] = [];
  const byKey = new Map(input.schema.fields.map((f) => [f.key, f]));

  for (const fill of input.extraction.fills) {
    const def = byKey.get(fill.key);
    if (!def || def.safety === "never") continue;

    if (def.type === "checkboxGroup") {
      const incoming = Array.isArray(fill.value) ? fill.value.map(String) : [];
      if (def.key === "env") {
        const existing = Array.isArray(input.current.env) ? (input.current.env as string[]) : [];
        const merged = [...new Set([...existing, ...incoming])];
        if (merged.length === existing.length) {
          preservedKeys.push(fill.key);
          continue;
        }
        updates.env = merged;
        appliedKeys.push("env");
        continue;
      }
      if (def.key === "ppe") {
        const existing = Array.isArray(input.current.ppe) ? (input.current.ppe as string[]) : [];
        const merged = [...new Set([...existing, ...incoming])];
        if (merged.length === existing.length) {
          preservedKeys.push(fill.key);
          continue;
        }
        updates.ppe = merged;
        appliedKeys.push("ppe", ...incoming.filter((name) => !existing.includes(name)));
        continue;
      }
      for (const optionKey of incoming) {
        if (input.current[optionKey]) {
          preservedKeys.push(optionKey);
          continue;
        }
        updates[optionKey] = true;
        appliedKeys.push(optionKey);
      }
      continue;
    }

    if (def.type === "stringList") {
      const incoming = Array.isArray(fill.value) ? fill.value.map(String) : String(fill.value).split(/\n+/);
      const existingRaw = String(input.current[fill.key] ?? "");
      const existing = existingRaw.split(/\n+/).map((s) => s.trim()).filter(Boolean);
      const merged = [...existing];
      for (const name of incoming) {
        if (!merged.some((e) => e.toLowerCase() === name.toLowerCase())) merged.push(name);
      }
      if (existing.length && merged.length === existing.length) {
        preservedKeys.push(fill.key);
        continue;
      }
      if (!existing.length && !merged.length) continue;
      updates[fill.key] = merged.join("\n");
      appliedKeys.push(fill.key);
      continue;
    }

    if (isFilled(input.current[fill.key])) {
      preservedKeys.push(fill.key);
      continue;
    }

    updates[fill.key] = fill.value;
    appliedKeys.push(fill.key);
  }

  return { updates, appliedKeys, preservedKeys };
}

export const FORBIDDEN_VOICE_ACTIONS = [
  "acknowledge",
  "release",
  "ready",
  "verifyDirectControl",
  "crewConfirmed",
  "workClassificationConfirmed",
  "supervisorReviewed",
  "stop-work",
  "rebrief",
  "saveCloseout",
] as const;
