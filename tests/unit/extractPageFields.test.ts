import { describe, expect, it } from "vitest";
import { extractPageFields } from "@/lib/voice/extractPageFields";
import { applyVoicePrefill } from "@/lib/voice/applyPrefill";
import { schemaForStep } from "@/lib/voice/pageSchemas";

const EXAMPLE =
  "We are replacing a transformer at pole 1847. John, Mike, and Steve are working. We'll use a bucket truck and there is energized overhead primary.";

describe("page field extraction", () => {
  it("prefills only start-step fields from a natural briefing", () => {
    const schema = schemaForStep("start");
    expect(schema).not.toBeNull();
    const result = extractPageFields({ transcript: EXAMPLE, schema: schema! });
    const jobLocation = result.fills.find((f) => f.key === "jobLocation");
    const identifier = result.fills.find((f) => f.key === "locationIdentifier");
    const crew = result.fills.find((f) => f.key === "crewText");
    expect(identifier?.value).toBe("Pole 1847");
    expect(jobLocation?.value).toBe("Pole 1847");
    expect(crew?.value).toEqual(["John", "Mike", "Steve"]);
    expect(result.fills.some((f) => f.key === "edited")).toBe(false);
    expect(result.fills.some((f) => f.key === "workOrderNumber")).toBe(false);
  });

  it("extracts work description on the work step without dumping crew names", () => {
    const schema = schemaForStep("work");
    const result = extractPageFields({ transcript: EXAMPLE, schema: schema! });
    expect(result.fills).toHaveLength(1);
    expect(String(result.fills[0].value)).toMatch(/replacing a transformer/i);
    expect(String(result.fills[0].value)).not.toMatch(/John/);
  });

  it("extracts a street address, GPS pair, and substation as Job Location fields", () => {
    const schema = schemaForStep("start")!;
    const result = extractPageFields({
      transcript: "Job location is Lincoln substation. Address is 500 Main Street. Coordinates 41.87810, -87.62980.",
      schema,
    });
    expect(result.fills.find((f) => f.key === "jobLocation")?.value).toMatch(/Lincoln substation/i);
    expect(result.fills.find((f) => f.key === "streetAddress")?.value).toMatch(/500 Main Street/i);
    expect(String(result.fills.find((f) => f.key === "gpsCoordinates")?.value)).toMatch(/41\.8781/);
  });

  it("does not invent facts that were not said", () => {
    const schema = schemaForStep("start");
    const result = extractPageFields({ transcript: EXAMPLE, schema: schema! });
    expect(result.fills.find((f) => f.key === "supervisorName")).toBeUndefined();
    expect(result.fills.find((f) => f.key === "workOrderNumber")).toBeUndefined();
    expect(result.fills.find((f) => f.key === "communicationMethod")).toBeUndefined();
  });

  it("suggests High Energy instead of marking it present", () => {
    const schema = schemaForStep("high-energy", {
      exposures: [{ id: "exp-1", label: "Contact with Energized Equipment / Overhead Primary" }],
    });
    const result = extractPageFields({ transcript: EXAMPLE, schema: schema! });
    expect(result.fills).toEqual([]);
    expect(result.suggestions.some((s) => s.key === "exposurePresence")).toBe(true);
    expect(result.suggestions[0]?.requiresConfirmation).toBe(true);
  });

  it("never returns acknowledgment or ready actions", () => {
    const schema = schemaForStep("crew");
    const result = extractPageFields({
      transcript: "I acknowledge this brief and we are ready for work. My name is Jordan Miles.",
      schema: schema!,
    });
    expect(result.fills.some((f) => f.key === "acknowledge")).toBe(false);
    expect(result.fills.find((f) => f.key === "ackName")?.value).toMatch(/Jordan Miles/);
    expect(result.skipped.some((s) => s.key === "acknowledge")).toBe(true);
  });
});

describe("voice prefill merge", () => {
  it("does not silently overwrite typed values", () => {
    const schema = schemaForStep("start")!;
    const extraction = extractPageFields({ transcript: EXAMPLE, schema });
    const applied = applyVoicePrefill({
      schema,
      current: { jobLocation: "Substation gate", crewText: "" },
      extraction,
    });
    expect(applied.updates.jobLocation).toBeUndefined();
    expect(applied.preservedKeys).toContain("jobLocation");
    expect(applied.proposedChanges.some((c) => c.key === "jobLocation" && c.proposed === "Pole 1847")).toBe(true);
    expect(applied.updates.crewText).toBe("John\nMike\nSteve");
  });

  it("merges new crew names into an existing list", () => {
    const schema = schemaForStep("start")!;
    const extraction = extractPageFields({ transcript: "John, Mike, and Steve are working.", schema });
    const applied = applyVoicePrefill({
      schema,
      current: { crewText: "John" },
      extraction,
    });
    expect(String(applied.updates.crewText).split("\n")).toEqual(["John", "Mike", "Steve"]);
  });
});
