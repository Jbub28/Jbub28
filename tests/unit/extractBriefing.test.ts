import { describe, expect, it } from "vitest";
import { analyzeRebriefDelta, extractBriefing, extractStopWorkTalk } from "@/lib/conversation/extractBriefing";
import { queryConversationFacts } from "@/lib/conversation/analytics";
import type { BriefingCatalog } from "@/lib/conversation/types";

const catalog: BriefingCatalog = {
  exposures: [
    { id: "he-elec", key: "electrical_contact_50v", label: "Electrical Contact with Source ≥ 50 Volts", energyFamily: "Electrical" },
    { id: "he-load", key: "suspended_load", label: "Suspended Load", energyFamily: "Gravity" },
    { id: "he-fall", key: "fall_from_elevation_4ft", label: "Fall from Elevation ≥ 4'", energyFamily: "Gravity" },
    { id: "he-traffic", key: "mobile_equipment_workers_on_foot", label: "Mobile Equipment/Traffic with Workers on Foot", energyFamily: "Motion" },
  ],
  directControls: [
    { id: "dc-deenergize", exactName: "De-energization w/ zero voltage check and grounding", exposureIds: ["he-elec"] },
    { id: "dc-insul", exactName: "Electrical insulation barriers", exposureIds: ["he-elec"] },
    { id: "dc-tools", exactName: "Insulated or voltage-rated equipment and tools", exposureIds: ["he-elec"] },
    { id: "dc-zone", exactName: "Standard hard barrier exclusion zone - to stop people", exposureIds: ["he-elec"] },
    { id: "dc-barrier", exactName: "Hard physical barrier - to stop equipment/vehicles", exposureIds: ["he-traffic"] },
  ],
  ppe: [{ exactName: "Arc Flash Apparel" }, { exactName: "Hard Hats" }],
};

const COMPLETE =
  "We're replacing the transformer at pole 6742 on circuit 412. We'll isolate the transformer, test it dead, install grounds, remove it with the line truck and set the new one. We've got 13.2 kV primary energized overhead, suspended-load exposure during the lift, traffic on the west side and fall exposure from the bucket. We'll maintain MAD, install the required cover-up, establish an exclusion zone, use the designated observer during the lift, set traffic control and wear the required arc-rated PPE. Weather is windy and we'll stage the trailer on the south side.";

describe("conversation briefing extraction", () => {
  it("routine complete briefing asks no follow-up and maps OSHA subjects", () => {
    const result = extractBriefing({ transcript: COMPLETE, catalog });
    expect(result.location.locationIdentifier).toBe("Pole 6742");
    expect(result.location.circuitNumber).toBe("412");
    expect(result.highEnergy.map((h) => h.key).sort()).toEqual(
      ["electrical_contact_50v", "fall_from_elevation_4ft", "mobile_equipment_workers_on_foot", "suspended_load"].sort(),
    );
    expect(result.controls.some((c) => /cover-up/i.test(c.text))).toBe(true);
    expect(result.controls.some((c) => c.origin === "ai_suggested")).toBe(true);
    expect(result.ppe.length).toBeGreaterThan(0);
    expect(result.osha.hazardsAddressed).toBe(true);
    expect(result.osha.proceduresAddressed).toBe(true);
    expect(result.osha.energyControlsAddressed).toBe(true);
    expect(result.osha.ppeAddressed).toBe(true);
    expect(result.followUps).toEqual([]);
    expect(result.facts.some((f) => f.category === "environment" && f.displayOnJrb === false)).toBe(true);
    expect(result.facts.some((f) => f.key === "staging" && f.displayOnJrb === false)).toBe(true);
  });

  it("asks one control question when energized work has no control", () => {
    const result = extractBriefing({
      transcript: "We're replacing a transformer from the bucket with energized primary overhead.",
      catalog,
    });
    expect(result.highEnergy.some((h) => h.key === "electrical_contact_50v")).toBe(true);
    expect(result.followUps).toHaveLength(1);
    expect(result.followUps[0]?.question).toMatch(/prevent exposure/i);
    expect(result.controls).toEqual([]);
  });

  it("identifies multiple high-energy sources without inventing extra categories", () => {
    const result = extractBriefing({
      transcript: COMPLETE,
      catalog,
    });
    const keys = result.highEnergy.map((h) => h.key);
    expect(keys).toContain("electrical_contact_50v");
    expect(keys).toContain("suspended_load");
    expect(keys).toContain("mobile_equipment_workers_on_foot");
    expect(keys.some((k) => k === "explosion")).toBe(false);
  });

  it("asks a targeted PPE question when PPE was never addressed", () => {
    const result = extractBriefing({
      transcript:
        "We're replacing the transformer at pole 12. We'll isolate it, test it dead, install grounds and cover-up on energized primary.",
      catalog,
    });
    expect(result.osha.ppeAddressed).toBe(false);
    expect(result.followUps.some((f) => f.key === "ppe")).toBe(true);
  });

  it("prefills location, pole, and circuit from speech", () => {
    const result = extractBriefing({
      transcript: "Job is at 500 Main Street at pole 6742 on circuit 412.",
      catalog,
    });
    expect(result.location.streetAddress).toMatch(/500 Main Street/i);
    expect(result.location.locationIdentifier).toBe("Pole 6742");
    expect(result.location.circuitNumber).toBe("412");
  });

  it("does not guess when a safety-critical statement is uncertain", () => {
    const result = extractBriefing({
      transcript: "I'm not sure if we have energized primary. We're replacing a transformer.",
      catalog,
    });
    expect(result.highEnergy.some((h) => h.key === "electrical_contact_50v")).toBe(false);
    expect(result.facts.some((f) => f.catalogId === "he-elec" && f.confidence === "low")).toBe(true);
  });

  it("rebrief for customer generation keeps the original briefing and flags electrical energy", () => {
    const delta = analyzeRebriefDelta(COMPLETE, "Unexpected customer generation and backfeed on the transformer.", catalog);
    expect(delta.originalPreserved).toBe(true);
    expect(delta.newExposures.some((e) => e.key === "electrical_contact_50v") || delta.followUps[0]?.key === "backfeed_control").toBe(true);
  });

  it("stop work talk cannot be auto-closed", () => {
    const event = extractStopWorkTalk("We stopped because the required cover-up could not be installed.");
    expect(event.reason).toBe("Control failed");
    expect(event.cannotAutoClose).toBe(true);
    expect(event.affectedHazard).toMatch(/Electrical/i);
  });

  it("keeps unused jobsite information queryable without putting it on the JRB", () => {
    const result = extractBriefing({ transcript: COMPLETE, catalog });
    const backend = queryConversationFacts(result.facts, { backendOnly: true });
    expect(backend.some((f) => f.category === "environment")).toBe(true);
    expect(backend.some((f) => f.key === "staging")).toBe(true);
    expect(backend.every((f) => f.displayOnJrb === false)).toBe(true);
    expect(queryConversationFacts(result.facts, { valueIncludes: "weather" }).length).toBeGreaterThan(0);
  });
});
