import { extractPageFields } from "@/lib/voice/extractPageFields";
import { schemaForStep } from "@/lib/voice/pageSchemas";
import {
  BriefingExtractionSchema,
  type BriefingCatalog,
  type BriefingExtraction,
  type ConversationFact,
  type FollowUpQuestion,
} from "./types";

const UNCERTAIN = /\b(maybe|might|not sure|i think|possibly|kind of)\b/i;

const HE_ALIASES: Record<string, string[]> = {
  electrical_contact_50v: [
    "energized primary",
    "energized overhead",
    "overhead primary",
    "energized",
    "electrical contact",
    "kv primary",
    "kilovolt",
  ],
  arc_flash: ["arc flash"],
  suspended_load: ["suspended load", "suspended-load", "during the lift"],
  swinging_load: ["swinging load"],
  fall_from_elevation_4ft: ["fall from", "fall exposure", "from the bucket", "aerial lift"],
  mobile_equipment_workers_on_foot: ["traffic", "mobile equipment", "workers on foot"],
  motor_vehicle_over_30mph: ["over 30", "highway speed"],
  excavation_trench_5ft: ["excavation", "trench"],
  high_temperature_150f: ["high temperature", "150"],
  steam: ["steam"],
  fire_sustained_fuel: ["fire with", "sustained fuel"],
  explosion: ["explosion"],
  heavy_rotating_equipment: ["rotating equipment"],
  toxic_chemical_radiation: ["toxic chemical", "radiation"],
};

const SPOKEN_CONTROLS: { phrase: string; catalogHints: string[]; extracted: string; energy?: boolean; precaution?: boolean }[] = [
  { phrase: "cover-up", catalogHints: ["Electrical insulation barriers"], extracted: "Cover-up", energy: true, precaution: true },
  { phrase: "cover up", catalogHints: ["Electrical insulation barriers"], extracted: "Cover-up", energy: true, precaution: true },
  { phrase: "mad", catalogHints: ["Insulated or voltage-rated equipment and tools"], extracted: "MAD", energy: true, precaution: true },
  { phrase: "minimum approach", catalogHints: ["Insulated or voltage-rated equipment and tools"], extracted: "MAD", energy: true, precaution: true },
  { phrase: "isolate", catalogHints: ["De-energization w/ zero voltage check and grounding"], extracted: "Isolate", energy: true },
  { phrase: "test it dead", catalogHints: ["De-energization w/ zero voltage check and grounding"], extracted: "Test dead", energy: true },
  { phrase: "test dead", catalogHints: ["De-energization w/ zero voltage check and grounding"], extracted: "Test dead", energy: true },
  { phrase: "grounds", catalogHints: ["De-energization w/ zero voltage check and grounding", "Bonding and grounding"], extracted: "Grounds", energy: true },
  { phrase: "grounding", catalogHints: ["De-energization w/ zero voltage check and grounding", "Bonding and grounding"], extracted: "Grounding", energy: true },
  { phrase: "exclusion zone", catalogHints: ["Standard hard barrier exclusion zone - to stop people"], extracted: "Exclusion zone", precaution: true },
  { phrase: "designated observer", catalogHints: [], extracted: "Designated observer", precaution: true },
  { phrase: "traffic control", catalogHints: ["Hard physical barrier - to stop equipment/vehicles"], extracted: "Traffic control", precaution: true },
  { phrase: "fall arrest", catalogHints: ["Fall arrest system*"], extracted: "Fall arrest", precaution: true },
  { phrase: "fall restraint", catalogHints: ["Fall restraint system*"], extracted: "Fall restraint", precaution: true },
  { phrase: "harness", catalogHints: ["Fall arrest system*"], extracted: "Fall protection harness", precaution: true },
];

function wordBoundary(phrase: string): RegExp {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return new RegExp(`\\b${escaped}\\b`, "i");
}

function segmentAround(text: string, match: string): string {
  const idx = text.toLowerCase().indexOf(match.toLowerCase());
  if (idx < 0) return match;
  const start = Math.max(0, idx - 40);
  const end = Math.min(text.length, idx + match.length + 40);
  return text.slice(start, end).trim();
}

function fillValue(fills: { key: string; value: unknown }[], key: string): string | undefined {
  const hit = fills.find((f) => f.key === key);
  if (typeof hit?.value === "string" && hit.value.trim()) return hit.value.trim();
  if (Array.isArray(hit?.value)) return hit.value.map(String).join("\n");
  return undefined;
}

function fact(partial: ConversationFact): ConversationFact {
  return partial;
}

export function extractCircuit(text: string): { value: string; evidence: string } | null {
  const m = text.match(/\bcircuit\s+(?:#|number\s+)?([A-Za-z0-9-]{1,12})\b/i);
  if (!m) return null;
  return { value: m[1], evidence: m[0] };
}

export function extractVoltage(text: string): { value: string; evidence: string } | null {
  const m = text.match(/\b(\d+(?:\.\d+)?)\s*kV\b/i);
  if (!m) return null;
  return { value: `${m[1]} kV`, evidence: m[0] };
}

function hedgeBlocks(text: string, evidence: string): boolean {
  const window = segmentAround(text, evidence);
  return UNCERTAIN.test(window);
}

export function extractBriefing(input: {
  transcript: string;
  catalog: BriefingCatalog;
  provider?: string;
  model?: string;
}): BriefingExtraction {
  const transcript = input.transcript.trim();
  const catalog = input.catalog;
  const facts: ConversationFact[] = [];
  const startSchema = schemaForStep("start")!;
  const workSchema = schemaForStep("work")!;
  const start = extractPageFields({ transcript, schema: startSchema });
  const work = extractPageFields({ transcript, schema: workSchema });

  const location = {
    jobLocation: fillValue(start.fills, "jobLocation"),
    streetAddress: fillValue(start.fills, "streetAddress"),
    gpsCoordinates: fillValue(start.fills, "gpsCoordinates"),
    locationIdentifier: fillValue(start.fills, "locationIdentifier"),
    circuitNumber: extractCircuit(transcript)?.value,
    workOrderNumber: fillValue(start.fills, "workOrderNumber"),
  };
  const crewRaw = start.fills.find((f) => f.key === "crewText")?.value;
  const crewNames = Array.isArray(crewRaw) ? crewRaw.map(String) : String(crewRaw ?? "").split("\n").filter(Boolean);
  const workDescription = fillValue(work.fills, "edited") ?? (/\breplac|\binstall|\bset |\btransfer|\brepair/i.test(transcript) ? transcript.split(/[.!?]/)[0]?.trim() : undefined);

  for (const [key, value] of Object.entries(location)) {
    if (!value) continue;
    facts.push(
      fact({
        category: key === "circuitNumber" ? "circuit" : key === "workOrderNumber" ? "work_order" : "location",
        key,
        label: key,
        value,
        sourceSegment: value,
        confidence: "high",
        origin: "ai_extracted",
        displayOnJrb: true,
      }),
    );
  }
  if (workDescription) {
    facts.push(
      fact({
        category: "work",
        key: "workDescription",
        label: "Work description",
        value: workDescription,
        sourceSegment: workDescription,
        confidence: "high",
        origin: "ai_extracted",
        displayOnJrb: true,
      }),
    );
  }

  const voltage = extractVoltage(transcript);
  if (voltage) {
    facts.push({
      category: "voltage",
      key: "voltage",
      label: "Voltage",
      value: voltage.value,
      sourceSegment: voltage.evidence,
      confidence: "high",
      origin: "ai_extracted",
      displayOnJrb: false,
      catalogId: null,
    });
  }

  const highEnergy: BriefingExtraction["highEnergy"] = [];
  for (const exp of catalog.exposures) {
    const aliases = [exp.label, ...(HE_ALIASES[exp.key] ?? [])].filter((p) => p.length > 3);
    const hit = aliases.find((p) => wordBoundary(p).test(transcript));
    if (!hit) continue;
    if (hedgeBlocks(transcript, hit)) {
      facts.push({
        category: "high_energy",
        key: exp.key,
        label: exp.label,
        value: hit,
        sourceSegment: segmentAround(transcript, hit),
        confidence: "low",
        origin: "ai_extracted",
        displayOnJrb: false,
        catalogId: exp.id,
      });
      continue;
    }
    highEnergy.push({
      exposureId: exp.id,
      key: exp.key,
      label: exp.label,
      evidence: hit,
      confidence: "high",
      origin: "ai_suggested",
    });
    facts.push({
      category: "high_energy",
      key: exp.key,
      label: exp.label,
      value: exp.label,
      sourceSegment: segmentAround(transcript, hit),
      confidence: "high",
      origin: "ai_suggested",
      displayOnJrb: true,
      catalogId: exp.id,
    });
  }

  const controls: BriefingExtraction["controls"] = [];
  const seenControl = new Set<string>();
  let energyControlSpoken = false;
  let precautionSpoken = false;
  for (const spoken of SPOKEN_CONTROLS) {
    if (!wordBoundary(spoken.phrase).test(transcript)) continue;
    if (spoken.energy) energyControlSpoken = true;
    if (spoken.precaution) precautionSpoken = true;
    const extractedKey = `spoken:${spoken.extracted}`;
    if (!seenControl.has(extractedKey)) {
      seenControl.add(extractedKey);
      controls.push({
        text: spoken.extracted,
        catalogId: null,
        catalogName: null,
        exposureId: null,
        evidence: spoken.phrase,
        origin: "ai_extracted",
      });
      facts.push({
        category: "other_control",
        key: extractedKey,
        label: spoken.extracted,
        value: spoken.extracted,
        sourceSegment: segmentAround(transcript, spoken.phrase),
        confidence: "high",
        origin: "ai_extracted",
        displayOnJrb: true,
        catalogId: null,
      });
    }
    for (const hint of spoken.catalogHints) {
      const dc = catalog.directControls.find((c) => c.exactName === hint);
      if (!dc) continue;
      const related = highEnergy.find((he) => (dc.exposureIds ?? []).includes(he.exposureId)) ?? highEnergy[0];
      const key = `dc:${dc.id}`;
      if (seenControl.has(key)) continue;
      seenControl.add(key);
      controls.push({
        text: dc.exactName,
        catalogId: dc.id,
        catalogName: dc.exactName,
        exposureId: related?.exposureId ?? null,
        evidence: spoken.phrase,
        origin: "ai_suggested",
      });
      facts.push({
        category: "direct_control",
        key: dc.id,
        label: dc.exactName,
        value: dc.exactName,
        sourceSegment: segmentAround(transcript, spoken.phrase),
        confidence: "medium",
        origin: "ai_suggested",
        displayOnJrb: true,
        catalogId: dc.id,
      });
    }
  }

  const ppe: string[] = [];
  for (const item of catalog.ppe) {
    if (wordBoundary(item.exactName).test(transcript)) ppe.push(item.exactName);
  }
  if (/\barc[- ]rated\b|\barc flash apparel\b|\bfr\b/i.test(transcript) && !ppe.some((p) => /arc/i.test(p))) {
    const arc = catalog.ppe.find((p) => /arc/i.test(p.exactName));
    if (arc) ppe.push(arc.exactName);
    else ppe.push("Arc-rated PPE");
  }
  for (const name of ppe) {
    facts.push({
      category: "ppe",
      key: name,
      label: name,
      value: name,
      sourceSegment: name,
      confidence: "high",
      origin: "ai_extracted",
      displayOnJrb: true,
      catalogId: null,
    });
  }

  const procedureSpoken = /\bisolat|\btest(?:ing)? it dead|\binstall grounds|\bremove it|\bset the new|\bprocedure|\breplac|\binstall/i.test(transcript);
  if (procedureSpoken && workDescription) {
    facts.push({
      category: "procedure",
      key: "workProcedure",
      label: "Work procedures",
      value: workDescription,
      sourceSegment: workDescription,
      confidence: "high",
      origin: "ai_extracted",
      displayOnJrb: false,
      catalogId: null,
    });
  }

  const envHits = ["heat", "cold", "windy", "wind", "rain", "snow", "ice", "fog", "weather"].filter((w) => wordBoundary(w).test(transcript));
  for (const env of envHits) {
    facts.push({
      category: "environment",
      key: env,
      label: env,
      value: env,
      sourceSegment: env,
      confidence: "high",
      origin: "ai_extracted",
      displayOnJrb: false,
      catalogId: null,
    });
  }
  const vehicleHits = ["line truck", "bucket", "bucket truck", "digger", "trailer"].filter((w) => wordBoundary(w).test(transcript));
  for (const v of vehicleHits) {
    facts.push({
      category: "vehicle",
      key: v,
      label: v,
      value: v,
      sourceSegment: v,
      confidence: "high",
      origin: "ai_extracted",
      displayOnJrb: false,
      catalogId: null,
    });
  }
  if (/\bstaging\b|\bstage the\b/i.test(transcript)) {
    facts.push({
      category: "other",
      key: "staging",
      label: "Staging",
      value: "staging",
      sourceSegment: "staging",
      confidence: "medium",
      origin: "ai_extracted",
      displayOnJrb: false,
      catalogId: null,
    });
  }

  const osha = {
    hazardsAddressed: highEnergy.length > 0 || /\bhazard|\bhurt|\bkill|\benergized|\bexposure\b/i.test(transcript),
    proceduresAddressed: Boolean(workDescription) && procedureSpoken,
    precautionsAddressed: precautionSpoken,
    energyControlsAddressed: energyControlSpoken,
    ppeAddressed: ppe.length > 0,
    evidence: {
      hazards: highEnergy.map((h) => h.label).join("; ") || "",
      procedures: workDescription ?? "",
      precautions: controls.filter((c) => c.origin === "ai_extracted").map((c) => c.text).join("; "),
      energyControls: energyControlSpoken ? "energy-source controls discussed" : "",
      ppe: ppe.join("; "),
    },
  };

  const followUps: FollowUpQuestion[] = [];
  const electrical = highEnergy.find((h) => h.key === "electrical_contact_50v" || h.key === "arc_flash");
  const electricalControl = controls.some(
    (c) =>
      /cover-up|mad|isolate|test dead|grounds|grounding|de-energization|insulation|insulated/i.test(c.text) ||
      (electrical && c.exposureId === electrical.exposureId),
  );
  if (electrical && !electricalControl) {
    followUps.push({
      key: "electrical_control",
      question: "You identified energized primary. How will the crew prevent exposure to that energy?",
      reason: "A high-energy electrical exposure was discussed without a control.",
      relatedExposureId: electrical.exposureId,
      oshaSubject: "energy-source controls",
    });
  } else {
    for (const he of highEnergy) {
      const hasControl = controls.some((c) => c.exposureId === he.exposureId) || energyControlSpoken || precautionSpoken;
      if (!hasControl) {
        followUps.push({
          key: `control_${he.key}`,
          question: `You identified ${he.label}. How will the crew prevent exposure to that energy?`,
          reason: "A high-energy exposure was discussed without a control.",
          relatedExposureId: he.exposureId,
          oshaSubject: "energy-source controls",
        });
        break;
      }
    }
  }
  if (followUps.length === 0 && osha.hazardsAddressed && osha.energyControlsAddressed && !osha.ppeAddressed && (electrical || /\benergized\b/i.test(transcript))) {
    followUps.push({
      key: "ppe",
      question: "What PPE will the crew wear for this work?",
      reason: "PPE was not discussed and is material to this job.",
      oshaSubject: "ppe",
    });
  }
  if (followUps.length === 0 && workDescription && highEnergy.length === 0 && !osha.hazardsAddressed) {
    followUps.push({
      key: "hazards",
      question: "What can seriously hurt or kill us on this job?",
      reason: "The work was described without hazards.",
      oshaSubject: "hazards",
    });
  }

  const raw: BriefingExtraction = {
    transcript,
    location,
    workDescription,
    crewNames,
    highEnergy,
    controls,
    ppe,
    facts,
    osha,
    followUps,
    provider: input.provider ?? "local-briefing-extractor",
    model: input.model ?? "deterministic-v1",
  };
  return BriefingExtractionSchema.parse(raw);
}

export function analyzeRebriefDelta(originalTranscript: string, changedTranscript: string, catalog: BriefingCatalog) {
  const before = extractBriefing({ transcript: originalTranscript, catalog });
  const after = extractBriefing({ transcript: `${originalTranscript} ${changedTranscript}`, catalog });
  const newExposures = after.highEnergy.filter((he) => !before.highEnergy.some((b) => b.exposureId === he.exposureId));
  const backfeed = /\bbackfeed|customer generation|distributed generation|solar\b/i.test(changedTranscript);
  if (backfeed && !newExposures.some((e) => e.key === "electrical_contact_50v")) {
    const electrical = catalog.exposures.find((e) => e.key === "electrical_contact_50v");
    if (electrical) {
      newExposures.push({
        exposureId: electrical.id,
        key: electrical.key,
        label: electrical.label,
        evidence: "backfeed / customer generation",
        confidence: "high",
        origin: "ai_suggested",
      });
    }
  }
  return {
    changedTranscript,
    newExposures,
    followUps: backfeed
      ? [
          {
            key: "backfeed_control",
            question: "Customer generation or backfeed was identified. How will the crew control that electrical energy?",
            reason: "Conditions changed: possible backfeed.",
            relatedExposureId: catalog.exposures.find((e) => e.key === "electrical_contact_50v")?.id ?? null,
            oshaSubject: "energy-source controls",
          },
        ]
      : after.followUps,
    originalPreserved: true,
  };
}

export function extractStopWorkTalk(transcript: string) {
  const coverUpFailed = /\bcover-up\b.*\b(could not|couldn't|cannot|can't|unable)\b|\b(could not|couldn't|cannot|can't|unable)\b.*\bcover-up\b/i.test(
    transcript,
  );
  return {
    reason: coverUpFailed ? "Control failed" : "Other",
    explanation: transcript.trim(),
    affectedHazard: coverUpFailed ? "Electrical Contact with Source ≥ 50 Volts" : undefined,
    cannotAutoClose: true,
  };
}
