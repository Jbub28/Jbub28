import { WORK_CLASSIFICATIONS } from "@/lib/domain/controls";
import type { PageFieldDef, PageVoiceSchema, VoiceOption } from "./types";

const PREDEPARTURE: VoiceOption[] = [
  { key: "pd_job_packet", label: "Job Packet Review", aliases: ["job packet"] },
  { key: "pd_route_travel", label: "Route/Travel Plan Discussion", aliases: ["route plan", "travel plan"] },
  { key: "pd_ppe_needs", label: "PPE Needs", aliases: ["ppe needs"] },
  { key: "pd_boom", label: "Boom Inspection/Operation Verified", aliases: ["boom inspection"] },
  { key: "pd_circle", label: "Circle of Safety/Spotter Required?", aliases: ["circle of safety"] },
  { key: "pd_traffic", label: "Traffic Control Needs", aliases: ["traffic control"] },
  { key: "pd_tools_insp", label: "Tools & Equipment Inspection", aliases: ["tools inspection", "equipment inspection"] },
  { key: "pd_route_back", label: "Route/Backing Discussion", aliases: ["backing"] },
  { key: "pd_tools_sec", label: "Tools & Equipment Secured", aliases: ["tools secured", "equipment secured"] },
  { key: "pd_no_load", label: "No Substantial Material Loading Required", aliases: ["no substantial material loading"] },
];

const WALKDOWN: VoiceOption[] = [
  { key: "wd_walking", label: "Walking/Working Surfaces", aliases: ["walking surfaces", "working surfaces"] },
  { key: "wd_truck", label: "Truck/Equipment Positioning", aliases: ["truck positioning", "equipment positioning"] },
  { key: "wd_contractor", label: "Contractor Activity", aliases: ["contractor activity"] },
  { key: "wd_plants", label: "Plants/Animals/Insects", aliases: ["plants", "insects"] },
  { key: "wd_spotters", label: "Use of Spotters", aliases: ["spotters"] },
  { key: "wd_ug", label: "U/G Utilities Marked", aliases: ["utilities marked", "underground utilities"] },
  { key: "wd_public", label: "Public Safety Concerns", aliases: ["public safety"] },
  { key: "wd_ttc", label: "Temporary Traffic Control/Flagger", aliases: ["flagger", "temporary traffic"] },
  { key: "wd_night", label: "Night Time Work", aliases: ["night work", "night time"] },
  { key: "wd_security", label: "Security Concerns", aliases: ["security concerns"] },
  { key: "wd_chock", label: "Wheels Chocked", aliases: ["wheels chocked", "chocked"] },
  { key: "wd_health", label: "Health Concerns", aliases: ["health concerns"] },
  { key: "wd_outrigger", label: "Outrigger Cribbing/Pads", aliases: ["outrigger", "cribbing"] },
];

const ENV: VoiceOption[] = ["Heat", "Cold", "Wind", "Rain", "Snow", "Ice", "Fog", "Other"].map((c) => ({
  key: c,
  label: c,
  aliases: [c.toLowerCase()],
}));

export type VoiceSchemaContext = {
  workTypes?: { id: string; code: string; exactName: string }[];
  exposures?: { id: string; label: string }[];
  presentExposureFields?: { src: string; who: string; out: string; label: string }[];
  ppe?: { exactName: string }[];
  extraFields?: PageFieldDef[];
};

export function isVoiceStep(stepKey: string): boolean {
  return ["start", "work", "conditions", "high-energy", "controls", "job-steps", "crew", "closeout"].includes(stepKey);
}

export function schemaForStep(stepKey: string, ctx: VoiceSchemaContext = {}): PageVoiceSchema | null {
  switch (stepKey) {
    case "start":
      return {
        stepKey,
        title: "Start the Job Brief",
        fields: [
          { key: "jobLocation", label: "Job Location", type: "text", safety: "prefill", aliases: ["job location", "substation"] },
          { key: "streetAddress", label: "911 / nearest trauma hospital", type: "text", safety: "prefill", aliases: ["911 hospital", "trauma hospital", "nearest hospital"] },
          { key: "gpsCoordinates", label: "GPS coordinates", type: "text", safety: "prefill", aliases: ["coordinates", "gps"] },
          { key: "locationIdentifier", label: "Pole, structure, or equipment", type: "text", safety: "prefill", aliases: ["pole", "pole number", "structure", "structure number", "equipment", "tower"] },
          { key: "workOrderNumber", label: "Work order number", type: "text", safety: "prefill", aliases: ["work order", "wo"] },
          { key: "supervisorName", label: "Supervisor", type: "text", safety: "prefill", aliases: ["supervisor"] },
          { key: "crewText", label: "Crew members", type: "stringList", safety: "prefill", aliases: ["crew", "working"] },
          { key: "contractorInvolved", label: "Contractor involvement", type: "boolean", safety: "prefill", aliases: ["contractor"] },
          { key: "contractorCompany", label: "Contractor company", type: "text", safety: "prefill", aliases: ["contractor company"] },
          { key: "emergencyAccess", label: "Emergency access information", type: "textarea", safety: "prefill", aliases: ["emergency access"] },
          { key: "communicationMethod", label: "Communication method", type: "text", safety: "prefill", aliases: ["radio", "phone", "communication"] },
          {
            key: "workTypeId",
            label: "Work Type",
            type: "choice",
            safety: "suggest",
            options: (ctx.workTypes ?? []).map((wt) => ({ key: wt.id, label: wt.exactName, aliases: [wt.exactName, wt.code.replaceAll("_", " ")] })),
          },
          {
            key: "workClassification",
            label: "Work Classification",
            type: "choice",
            safety: "suggest",
            options: WORK_CLASSIFICATIONS.map((c) => ({ key: c.value, label: c.label, aliases: [c.label] })),
          },
        ],
      };
    case "work":
      return {
        stepKey,
        title: "What Work Are We Doing?",
        fields: [
          { key: "edited", label: "Work description", type: "textarea", safety: "prefill", aliases: ["work", "replacing", "installing"] },
        ],
      };
    case "conditions":
      return {
        stepKey,
        title: "Jobsite Conditions",
        fields: [
          { key: "predeparture", label: "Before You Leave", type: "checkboxGroup", safety: "prefill", options: PREDEPARTURE },
          { key: "walkdown", label: "Jobsite walkdown", type: "checkboxGroup", safety: "prefill", options: WALKDOWN },
          { key: "env", label: "Environment", type: "checkboxGroup", safety: "prefill", options: ENV },
          { key: "planMatchesField", label: "Does the plan still match?", type: "boolean", safety: "suggest" },
          { key: "materialDifferenceNotes", label: "What changed?", type: "textarea", safety: "prefill", aliases: ["what changed", "changed"] },
        ],
      };
    case "high-energy":
      return {
        stepKey,
        title: "What Can Seriously Hurt or Kill Us?",
        fields: [
          {
            key: "exposurePresence",
            label: "High Energy present",
            type: "choice",
            safety: "suggest",
            options: (ctx.exposures ?? []).map((e) => {
              const parts = e.label.split(/[/,]/).map((part) => part.trim()).filter((part) => part.length > 4);
              const aliases = [e.label, ...parts];
              if (/overhead primary/i.test(e.label)) aliases.push("overhead primary");
              if (/energized/i.test(e.label)) aliases.push("energized overhead");
              return { key: e.id, label: e.label, aliases };
            }),
          },
          ...(ctx.presentExposureFields ?? []).flatMap((exp) => [
            { key: exp.src, label: `What energy could reach someone? (${exp.label})`, type: "textarea" as const, safety: "prefill" as const, aliases: ["could reach", "energy source"] },
            { key: exp.who, label: `Who could be in the path? (${exp.label})`, type: "textarea" as const, safety: "prefill" as const, aliases: ["in the path"] },
            { key: exp.out, label: `What serious outcome could occur? (${exp.label})`, type: "textarea" as const, safety: "prefill" as const, aliases: ["serious outcome", "could kill"] },
          ]),
        ],
      };
    case "controls":
      return {
        stepKey,
        title: "How Will We Control the Energy?",
        fields: [
          { key: "controlExplain", label: "Explain", type: "textarea", safety: "prefill", aliases: ["explain"] },
          ...(ctx.extraFields ?? []),
        ],
      };
    case "job-steps":
      return {
        stepKey,
        title: "Job Steps and PPE",
        fields: [
          { key: "step_Setup", label: "Setup steps", type: "textarea", safety: "prefill", aliases: ["setup"] },
          { key: "step_Tasks", label: "Tasks steps", type: "textarea", safety: "prefill", aliases: ["tasks", "then we"] },
          { key: "step_Cleanup", label: "Cleanup steps", type: "textarea", safety: "prefill", aliases: ["cleanup"] },
          { key: "workProcedure", label: "Work procedures", type: "textarea", safety: "prefill", aliases: ["procedure"] },
          { key: "specialPrecaution", label: "Special precautions", type: "textarea", safety: "prefill", aliases: ["precaution"] },
          { key: "energySourceControl", label: "Energy-source control", type: "textarea", safety: "prefill", aliases: ["energy-source control", "energy source control"] },
          {
            key: "ppe",
            label: "PPE",
            type: "checkboxGroup",
            safety: "prefill",
            options: (ctx.ppe ?? []).map((p) => ({ key: p.exactName, label: p.exactName, aliases: [p.exactName] })),
          },
        ],
      };
    case "crew":
      return {
        stepKey,
        title: "Brief the Crew",
        fields: [
          { key: "question", label: "Question or concern", type: "textarea", safety: "prefill", aliases: ["question", "concern"] },
          { key: "ackName", label: "Name", type: "text", safety: "prefill", aliases: ["my name is", "i am"] },
          { key: "acknowledge", label: "Acknowledge this version", type: "boolean", safety: "never" },
        ],
      };
    case "closeout":
      return {
        stepKey,
        title: "Post-job review",
        fields: [
          { key: "whatWentWell", label: "What went well?", type: "textarea", safety: "prefill", aliases: ["went well"] },
          { key: "whatNeedsImprovement", label: "What needs improvement?", type: "textarea", safety: "prefill", aliases: ["needs improvement", "improve"] },
          { key: "bestPractices", label: "Best practices", type: "textarea", safety: "prefill", aliases: ["best practice"] },
        ],
      };
    default:
      return null;
  }
}
