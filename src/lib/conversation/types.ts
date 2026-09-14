import { z } from "zod";

export const FACT_ORIGINS = [
  "employee_entered",
  "ai_extracted",
  "ai_suggested",
  "employee_confirmed",
  "modified",
] as const;

export type FactOrigin = (typeof FACT_ORIGINS)[number];

export const FACT_CATEGORIES = [
  "location",
  "work",
  "crew",
  "circuit",
  "work_order",
  "job_step",
  "hazard",
  "high_energy",
  "direct_control",
  "other_control",
  "ppe",
  "procedure",
  "precaution",
  "energy_control",
  "condition",
  "environment",
  "equipment",
  "vehicle",
  "voltage",
  "system",
  "osha",
  "stop_work",
  "rebrief",
  "other",
] as const;

export const ConversationFactSchema = z.object({
  category: z.enum(FACT_CATEGORIES),
  key: z.string(),
  label: z.string(),
  value: z.union([z.string(), z.boolean(), z.array(z.string())]),
  sourceSegment: z.string().optional(),
  confidence: z.enum(["high", "medium", "low"]),
  origin: z.enum(FACT_ORIGINS),
  displayOnJrb: z.boolean(),
  catalogId: z.string().nullable().optional(),
});

export type ConversationFact = z.infer<typeof ConversationFactSchema>;

export const FollowUpSchema = z.object({
  key: z.string(),
  question: z.string(),
  reason: z.string(),
  relatedExposureId: z.string().nullable().optional(),
  oshaSubject: z.string().nullable().optional(),
});

export type FollowUpQuestion = z.infer<typeof FollowUpSchema>;

export const OshaAssessmentSchema = z.object({
  hazardsAddressed: z.boolean(),
  proceduresAddressed: z.boolean(),
  precautionsAddressed: z.boolean(),
  energyControlsAddressed: z.boolean(),
  ppeAddressed: z.boolean(),
  evidence: z.record(z.string(), z.string()),
});

export type OshaAssessment = z.infer<typeof OshaAssessmentSchema>;

export const CatalogExposureSchema = z.object({
  id: z.string(),
  key: z.string(),
  label: z.string(),
  energyFamily: z.string().nullable().optional(),
});

export const CatalogControlSchema = z.object({
  id: z.string(),
  exactName: z.string(),
  exposureIds: z.array(z.string()).optional(),
});

export const BriefingCatalogSchema = z.object({
  exposures: z.array(CatalogExposureSchema),
  directControls: z.array(CatalogControlSchema),
  ppe: z.array(z.object({ exactName: z.string() })),
});

export type BriefingCatalog = z.infer<typeof BriefingCatalogSchema>;

export const BriefingExtractionSchema = z.object({
  transcript: z.string(),
  location: z.object({
    jobLocation: z.string().optional(),
    streetAddress: z.string().optional(),
    gpsCoordinates: z.string().optional(),
    locationIdentifier: z.string().optional(),
    circuitNumber: z.string().optional(),
    workOrderNumber: z.string().optional(),
  }),
  workDescription: z.string().optional(),
  crewNames: z.array(z.string()),
  highEnergy: z.array(
    z.object({
      exposureId: z.string(),
      key: z.string(),
      label: z.string(),
      evidence: z.string(),
      confidence: z.enum(["high", "medium", "low"]),
      origin: z.literal("ai_suggested"),
    }),
  ),
  controls: z.array(
    z.object({
      text: z.string(),
      catalogId: z.string().nullable(),
      catalogName: z.string().nullable(),
      exposureId: z.string().nullable(),
      evidence: z.string(),
      origin: z.enum(["ai_extracted", "ai_suggested"]),
    }),
  ),
  ppe: z.array(z.string()),
  facts: z.array(ConversationFactSchema),
  osha: OshaAssessmentSchema,
  followUps: z.array(FollowUpSchema),
  provider: z.string(),
  model: z.string(),
});

export type BriefingExtraction = z.infer<typeof BriefingExtractionSchema>;
