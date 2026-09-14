export type VoiceConfidence = "high" | "medium" | "low";

export type VoiceSafety = "prefill" | "suggest" | "never";

export type VoiceFieldType = "text" | "textarea" | "stringList" | "boolean" | "checkboxGroup" | "choice";

export type VoiceOption = {
  key: string;
  label: string;
  aliases?: string[];
};

export type PageFieldDef = {
  key: string;
  label: string;
  type: VoiceFieldType;
  safety: VoiceSafety;
  aliases?: string[];
  options?: VoiceOption[];
};

export type PageVoiceSchema = {
  stepKey: string;
  title: string;
  fields: PageFieldDef[];
};

export type ExtractedFill = {
  key: string;
  label: string;
  value: string | string[] | boolean;
  confidence: VoiceConfidence;
  evidence: string;
};

export type VoiceSuggestion = {
  key: string;
  label: string;
  value: string | string[] | boolean;
  reason: string;
  requiresConfirmation: true;
};

export type ExtractionResult = {
  transcript: string;
  fills: ExtractedFill[];
  suggestions: VoiceSuggestion[];
  skipped: { key?: string; reason: string }[];
  provider: string;
  model: string;
};

export type ProposedChange = {
  key: string;
  label: string;
  current: string;
  proposed: string;
};

export type PrefillApplyResult = {
  updates: Record<string, unknown>;
  appliedKeys: string[];
  preservedKeys: string[];
  proposedChanges: ProposedChange[];
};
