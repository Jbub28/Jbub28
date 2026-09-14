import type {
  ExtractedFill,
  ExtractionResult,
  PageFieldDef,
  PageVoiceSchema,
  VoiceConfidence,
  VoiceOption,
  VoiceSuggestion,
} from "./types";

const NAME_STOPWORDS = new Set(
  [
    "we", "we'll", "i", "i'm", "im", "the", "a", "an", "at", "to", "and", "or", "of", "for", "with", "using", "use",
    "there", "is", "are", "was", "working", "work", "crew", "members", "member", "replacing", "replace",
    "transformer", "pole", "bucket", "truck", "energized", "overhead", "primary", "location", "order",
    "today", "this", "that", "will", "would", "our", "their", "then", "from", "onto", "into", "on", "in",
    "have", "has", "had", "job", "guys", "let", "go", "over", "charge", "worker", "damaged", "associated",
    "associate", "cutout", "setup", "area", "position", "line", "verify", "complete", "required", "testing",
    "grounding", "remove", "install", "make", "connections", "inspect", "restore", "equipment", "when",
    "authorized", "biggest", "thing", "hurt", "kill", "maintain", "minimal", "approach", "distance",
  ].map((w) => w.toLowerCase()),
);

const CREW_CUTOFF =
  /\b(?:our job|the job is|we(?:'re| are) going|we'll |the biggest|hazard|what can|work is to|i slay|will set up|we'll set)\b/i;

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|(?=\bwe(?:'ll)?\s)|(?=\bthere is\b)/i)
    .map((s) => s.trim().replace(/^[,.]+/, "").trim())
    .filter((s) => s.length > 1);
}

function wordBoundary(phrase: string): RegExp {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return new RegExp(`\\b${escaped}\\b`, "i");
}

function titleCaseName(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function extractWorkOrder(text: string): { value: string; confidence: VoiceConfidence; evidence: string } | null {
  const labeled = text.match(/\b(?:work\s*order(?:\s+number)?|WO)\b[:\s#-]*([A-Za-z0-9][A-Za-z0-9-]{1,20})\b/i);
  if (labeled) {
    return { value: labeled[1], confidence: "high", evidence: labeled[0] };
  }
  return null;
}

function extractPole(text: string): { value: string; confidence: VoiceConfidence; evidence: string } | null {
  const m = text.match(/\b(?:pole(?:\s+(?:number|t))?|poteet|port\s+t)\s+(\d+[A-Za-z]?)\b/i);
  if (!m) return null;
  return { value: `Pole ${m[1]}`, confidence: "high", evidence: m[0] };
}

function extractLocationIdentifier(text: string): { value: string; confidence: VoiceConfidence; evidence: string } | null {
  const pole = extractPole(text);
  if (pole) return pole;
  const labeled = text.match(/\b(structure|tower|equipment|pad[- ]?mount|switchgear|riser)\s+([A-Za-z0-9-]{1,20})\b/i);
  if (labeled) {
    const kind = labeled[1].replace(/\s+/g, " ").replace(/^./, (c) => c.toUpperCase());
    return { value: `${kind} ${labeled[2]}`, confidence: "high", evidence: labeled[0] };
  }
  return extractLabeled(text, ["structure number", "equipment number", "location identifier"]);
}

function extractGps(text: string): { value: string; confidence: VoiceConfidence; evidence: string } | null {
  const m = text.match(/\b(-?\d{1,3}\.\d{2,})\s*[, ]\s*(-?\d{1,3}\.\d{2,})\b/);
  if (!m) return null;
  const latitude = Number(m[1]);
  const longitude = Number(m[2]);
  if (Number.isNaN(latitude) || Number.isNaN(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    return null;
  }
  return { value: `${latitude}, ${longitude}`, confidence: "high", evidence: m[0] };
}

function extractSubstation(text: string): { value: string; confidence: VoiceConfidence; evidence: string } | null {
  const m = text.match(/\b((?:[A-Za-z][A-Za-z0-9.'-]*\s+){0,4}substation)\b/i);
  if (!m) return null;
  const value = m[1].trim().replace(/\s+/g, " ").replace(/^(the)\s+/i, "");
  if (/^substation$/i.test(value)) return { value: "Substation", confidence: "medium", evidence: m[0] };
  return { value, confidence: "high", evidence: m[0] };
}

function extractJobLocation(text: string): { value: string; confidence: VoiceConfidence; evidence: string } | null {
  const labeled = extractLabeled(text, ["job location", "work location"]);
  if (labeled) return labeled;
  return extractSubstation(text);
}

const US_STATES: Record<string, string> = {
  alabama: "AL",
  alaska: "AK",
  arizona: "AZ",
  arkansas: "AR",
  california: "CA",
  colorado: "CO",
  connecticut: "CT",
  delaware: "DE",
  florida: "FL",
  georgia: "GA",
  hawaii: "HI",
  idaho: "ID",
  illinois: "IL",
  indiana: "IN",
  iowa: "IA",
  kansas: "KS",
  kentucky: "KY",
  louisiana: "LA",
  maine: "ME",
  maryland: "MD",
  massachusetts: "MA",
  michigan: "MI",
  minnesota: "MN",
  mississippi: "MS",
  missouri: "MO",
  montana: "MT",
  nebraska: "NE",
  nevada: "NV",
  "new hampshire": "NH",
  "new jersey": "NJ",
  "new mexico": "NM",
  "new york": "NY",
  "north carolina": "NC",
  "north dakota": "ND",
  ohio: "OH",
  oklahoma: "OK",
  oregon: "OR",
  pennsylvania: "PA",
  "rhode island": "RI",
  "south carolina": "SC",
  "south dakota": "SD",
  tennessee: "TN",
  texas: "TX",
  utah: "UT",
  vermont: "VT",
  virginia: "VA",
  washington: "WA",
  "west virginia": "WV",
  wisconsin: "WI",
  wyoming: "WY",
};

function looksLikePoleOrStructure(value: string): boolean {
  return /^(pole|poteet|port\s+t|structure|tower|equipment)\b/i.test(value.trim());
}

function extractAddress(text: string): { value: string; confidence: VoiceConfidence; evidence: string } | null {
  const labeled = extractLabeled(text, ["911 address", "street address", "address"]);
  if (
    labeled &&
    /\d/.test(labeled.value) &&
    /\b(street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd|way|circle|court|ct)\b/i.test(labeled.value) &&
    !looksLikePoleOrStructure(labeled.value)
  ) {
    return { ...labeled, value: normalizeSpokenAddress(labeled.value, "") };
  }
  const m = text.match(
    /\b(\d{1,6}\s+(?:[NSEW]\.?\s+)?(?:[A-Za-z][A-Za-z0-9']*\.?)(?:\s+[A-Za-z][A-Za-z0-9']*\.?){0,4}\s+(?:street|st\.?|avenue|ave\.?|road|rd\.?|drive|dr\.?|lane|ln\.?|boulevard|blvd\.?|way|circle|court|ct\.?))\b/i,
  );
  if (!m || m.index == null) return null;
  const rest = text.slice(m.index + m[0].length);
  return {
    value: normalizeSpokenAddress(m[1], rest),
    confidence: "high",
    evidence: m[0],
  };
}

function normalizeSpokenAddress(streetRaw: string, restRaw: string): string {
  const street = streetRaw.replace(/\./g, "").replace(/\s+/g, " ").trim();
  const rest = restRaw.replace(/^[.,\s]+/, "");
  const cityState = rest.match(
    /^(?:in\s+)?([A-Za-z][A-Za-z .']{1,40}?)(?:\s+(Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming|AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY))?(?=\s+at\b|\s+this\b|\s+work\b|[.,;]|$)/i,
  );
  if (!cityState) return street;
  const city = cityState[1].replace(/\s+/g, " ").trim().replace(/\s+in$/i, "");
  const stateRaw = (cityState[2] ?? "").trim();
  const state = US_STATES[stateRaw.toLowerCase()] ?? (stateRaw.length === 2 ? stateRaw.toUpperCase() : stateRaw);
  return [street, city, state].filter(Boolean).join(", ");
}

function extractLabeled(text: string, labels: string[]): { value: string; confidence: VoiceConfidence; evidence: string } | null {
  for (const label of labels) {
    const re = new RegExp(`${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*(?:is|:)?\\s+([^.;]+)`, "i");
    const m = text.match(re);
    if (m?.[1]) {
      const value = m[1].trim();
      if (value.length > 1) return { value, confidence: "high", evidence: m[0].trim() };
    }
  }
  return null;
}

function boundCrewChunk(chunk: string): string {
  const cut = chunk.search(CREW_CUTOFF);
  const bounded = cut >= 0 ? chunk.slice(0, cut) : chunk;
  const firstStop = bounded.split(/[.!?]/)[0] ?? bounded;
  return firstStop.replace(/\s+/g, " ").trim().slice(0, 160);
}

function fullNamesFromChunk(chunk: string): string[] {
  const names: string[] = [];
  const re = /\b([A-Za-z]{2,15})\s+([A-Za-z]{2,20})\b/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(chunk)) !== null) {
    const first = match[1];
    const last = match[2];
    if (NAME_STOPWORDS.has(first.toLowerCase()) || NAME_STOPWORDS.has(last.toLowerCase())) {
      re.lastIndex = match.index + first.length;
      continue;
    }
    if (!/^[A-Za-z]+$/.test(first) || !/^[A-Za-z]+$/.test(last)) continue;
    names.push(`${titleCaseName(first)} ${titleCaseName(last)}`);
  }
  return [...new Set(names)].slice(0, 8);
}

function firstNamesFromChunk(chunk: string): string[] {
  const tokens = chunk
    .split(/,|\band\b|\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
  return [...new Set(
    tokens
      .filter((t) => /^[A-Za-z]{2,20}$/.test(t) && !NAME_STOPWORDS.has(t.toLowerCase()))
      .map(titleCaseName),
  )].slice(0, 8);
}

function extractCrew(text: string): { value: string[]; confidence: VoiceConfidence; evidence: string } | null {
  const working = text.match(/([A-Za-z][A-Za-z'',\s]{2,80}?)\s+are working\b/i);
  const listed = text.match(
    /\b(?:on the\s+)?crew(?:\s+today)?(?:\s+we have|\s+members?(?:\s+(?:is|are|:))?|\s+(?:is|are|:))\s+([^.]+)/i,
  );
  const chunk = working?.[1] ?? listed?.[1];
  if (!chunk) return null;
  const bounded = boundCrewChunk(chunk);
  const fullNames = fullNamesFromChunk(bounded);
  const names = fullNames.length >= 2 ? fullNames : firstNamesFromChunk(bounded);
  if (names.length < 1) return null;
  return {
    value: names,
    confidence: working || fullNames.length >= 2 ? "high" : "medium",
    evidence: (working?.[0] ?? listed?.[0] ?? bounded).trim().slice(0, 180),
  };
}

function extractCommunication(text: string): { value: string; confidence: VoiceConfidence; evidence: string } | null {
  if (wordBoundary("radio").test(text)) return { value: "Radio", confidence: "high", evidence: "radio" };
  if (wordBoundary("cell phone").test(text) || wordBoundary("cellphone").test(text)) {
    return { value: "Cell phone", confidence: "high", evidence: "cell phone" };
  }
  if (wordBoundary("in person").test(text)) return { value: "In person", confidence: "high", evidence: "in person" };
  if (/\bphones?\b/i.test(text)) return { value: "Phone", confidence: "medium", evidence: "phone" };
  return null;
}

function extractWorkDescription(text: string): { value: string; confidence: VoiceConfidence; evidence: string } | null {
  const intent = text.match(
    /\b(?:our job is to|the job is to|we(?:'re| are) going to)\s+((?:replace|install|set|repair|remove|change)[\s\S]{8,160}?)(?=\b(?:will set|we'll |the biggest|hazard|what can)\b|[.!]|$)/i,
  );
  if (intent?.[1]) {
    const value = intent[1].replace(/\s+/g, " ").trim().replace(/[,;]+$/, "");
    return { value, confidence: "high", evidence: intent[0].trim() };
  }
  const sentences = splitSentences(text);
  const workish = sentences.find((s) =>
    /\b(replac\w*|install\w*|set(?:ting)?(?:\s+a)?\s+pole|transfer\w*|repair\w*|remov\w*|chang\w*|switch\w*|transformer|conductor|primary wire)\b/i.test(
      s,
    ) && !/\bare working\b/i.test(s),
  );
  if (!workish) return null;
  const cleaned = workish.replace(/\bwe'll use\b[\s\S]*$/i, "").trim().replace(/\s+/g, " ").slice(0, 220);
  return { value: cleaned.replace(/\.$/, ""), confidence: "high", evidence: workish };
}

function extractCheckboxGroup(text: string, options: VoiceOption[]): string[] {
  const hits: string[] = [];
  for (const option of options) {
    const phrases = [option.label, ...(option.aliases ?? [])].filter((p) => p.length > 2);
    if (phrases.some((p) => wordBoundary(p).test(text))) hits.push(option.key);
  }
  return hits;
}

function extractChoice(text: string, options: VoiceOption[]): { key: string; label: string; evidence: string } | null {
  for (const option of options) {
    const phrases = [option.label, ...(option.aliases ?? [])].filter((p) => p.length > 3);
    const hit = phrases.find((p) => wordBoundary(p).test(text));
    if (hit) return { key: option.key, label: option.label, evidence: hit };
  }
  return null;
}

function fillFor(field: PageFieldDef, text: string): ExtractedFill | VoiceSuggestion | { skip: string } | null {
  if (field.safety === "never") {
    return { skip: `${field.label} must be confirmed by the employee, not by voice.` };
  }

  if (field.type === "checkboxGroup") {
    const keys = extractCheckboxGroup(text, field.options ?? []);
    if (!keys.length) return null;
    const item: ExtractedFill = {
      key: field.key,
      label: field.label,
      value: keys,
      confidence: "high",
      evidence: keys.join(", "),
    };
    return field.safety === "suggest" ? toSuggestion(item, field) : item;
  }

  if (field.type === "choice") {
    const hit = extractChoice(text, field.options ?? []);
    if (!hit) return null;
    const item: ExtractedFill = {
      key: field.key,
      label: field.label,
      value: hit.key,
      confidence: "medium",
      evidence: hit.evidence,
    };
    return field.safety === "suggest" ? toSuggestion(item, field, hit.label) : item;
  }

  if (field.type === "boolean") {
    if (field.key === "contractorInvolved" && /\bcontractor\b/i.test(text)) {
      const item: ExtractedFill = { key: field.key, label: field.label, value: true, confidence: "high", evidence: "contractor" };
      return field.safety === "suggest" ? toSuggestion(item, field) : item;
    }
    if (field.key === "planMatchesField") {
      if (/\b(does not match|doesn't match|no longer matches|need to reassess)\b/i.test(text)) {
        return toSuggestion(
          { key: field.key, label: field.label, value: false, confidence: "medium", evidence: "does not match" },
          field,
        );
      }
      if (/\b(still matches|plan matches|it matches)\b/i.test(text)) {
        return toSuggestion(
          { key: field.key, label: field.label, value: true, confidence: "medium", evidence: "matches" },
          field,
        );
      }
    }
    return null;
  }

  if (field.key === "workOrderNumber") {
    const hit = extractWorkOrder(text);
    return hit ? { key: field.key, label: field.label, ...hit } : null;
  }
  if (field.key === "locationIdentifier") {
    const hit = extractLocationIdentifier(text);
    return hit ? { key: field.key, label: field.label, ...hit } : null;
  }
  if (field.key === "streetAddress" || field.key === "addressOrCoordinates") {
    const hospital = extractLabeled(text, ["911 hospital", "trauma hospital", "nearest hospital", "trauma center"]);
    return hospital ? { key: field.key, label: field.label, ...hospital } : null;
  }
  if (field.key === "gpsCoordinates") {
    const hit = extractGps(text);
    return hit ? { key: field.key, label: field.label, ...hit } : null;
  }
  if (field.key === "jobLocation" || field.key === "workLocation") {
    const addr = extractAddress(text);
    const named = extractJobLocation(text);
    if (addr) return { key: field.key, label: field.label, ...addr };
    if (named && !looksLikePoleOrStructure(named.value)) {
      return { key: field.key, label: field.label, ...named };
    }
    return null;
  }
  if (field.key === "crewText") {
    const hit = extractCrew(text);
    return hit ? { key: field.key, label: field.label, value: hit.value, confidence: hit.confidence, evidence: hit.evidence } : null;
  }
  if (field.key === "communicationMethod") {
    const hit = extractCommunication(text);
    return hit ? { key: field.key, label: field.label, ...hit } : null;
  }
  if (field.key === "edited") {
    const hit = extractWorkDescription(text);
    return hit ? { key: field.key, label: field.label, ...hit } : null;
  }
  if (field.key === "supervisorName") {
    const hit = extractLabeled(text, ["supervisor"]);
    return hit ? { key: field.key, label: field.label, ...hit } : null;
  }
  if (field.key === "contractorCompany") {
    const hit = extractLabeled(text, ["contractor company", "contractor is", "contractor from"]);
    return hit ? { key: field.key, label: field.label, ...hit } : null;
  }
  if (field.key === "emergencyAccess") {
    const hit = extractLabeled(text, ["emergency access"]);
    return hit ? { key: field.key, label: field.label, ...hit } : null;
  }
  if (field.key === "ackName") {
    const named = text.match(/\b(?:my name is|i am|i'm)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)/i);
    if (named) return { key: field.key, label: field.label, value: named[1], confidence: "high", evidence: named[0] };
    return null;
  }

  const labeled = extractLabeled(text, [field.label, ...(field.aliases ?? [])]);
  if (!labeled) return null;
  const item: ExtractedFill = { key: field.key, label: field.label, ...labeled };
  return field.safety === "suggest" ? toSuggestion(item, field) : item;
}

function toSuggestion(item: ExtractedFill, field: PageFieldDef, optionLabel?: string): VoiceSuggestion {
  return {
    key: item.key,
    label: optionLabel ? `${field.label}: ${optionLabel}` : field.label,
    value: item.value,
    reason: `Heard “${item.evidence}”. Confirm this yourself — voice does not decide safety.`,
    requiresConfirmation: true,
  };
}

export function extractPageFields(input: { transcript: string; schema: PageVoiceSchema; provider?: string; model?: string }): ExtractionResult {
  const transcript = input.transcript.trim();
  const fills: ExtractedFill[] = [];
  const suggestions: VoiceSuggestion[] = [];
  const skipped: { key?: string; reason: string }[] = [];

  if (!transcript) {
    return {
      transcript,
      fills,
      suggestions,
      skipped: [{ reason: "No words were captured." }],
      provider: input.provider ?? "local-page-extractor",
      model: input.model ?? "deterministic-v1",
    };
  }

  for (const field of input.schema.fields) {
    const result = fillFor(field, transcript);
    if (!result) continue;
    if ("skip" in result) {
      skipped.push({ key: field.key, reason: result.skip });
      continue;
    }
    if ("requiresConfirmation" in result) {
      suggestions.push(result);
      continue;
    }
    if (result.confidence === "low") {
      skipped.push({ key: field.key, reason: `Not sure about ${field.label}. Left blank for review.` });
      continue;
    }
    fills.push(result);
  }

  const hasJobLocationField = input.schema.fields.some((f) => f.key === "jobLocation");
  if (hasJobLocationField && !fills.some((f) => f.key === "jobLocation")) {
    const addr = extractAddress(transcript);
    if (addr) {
      fills.push({
        key: "jobLocation",
        label: "Job Location",
        value: addr.value,
        confidence: addr.confidence,
        evidence: addr.evidence,
      });
    }
  }

  return {
    transcript,
    fills,
    suggestions,
    skipped,
    provider: input.provider ?? "local-page-extractor",
    model: input.model ?? "deterministic-v1",
  };
}
