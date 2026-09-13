import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";

describe("controlled import extracts", () => {
  it("loads only Electric Delivery work types into the operational extract", () => {
    const eei = JSON.parse(readFileSync(path.join("reference/extracted/eei-electric-delivery-tasks.json"), "utf8"));
    const codes = eei.operationalWorkTypesLoaded.map((w: { code: string }) => w.code);
    expect(codes).toEqual(["ELECTRIC_DISTRIBUTION", "ELECTRIC_TRANSMISSION", "ELECTRIC_SUBSTATION"]);
    expect(eei.preservedInImportHistoryNotLoadedToFieldApp.length).toBeGreaterThan(5);
    const names = eei.operationalWorkTypesLoaded.flatMap((w: { tasks: { exactName: string }[] }) => w.tasks.map((t) => t.exactName));
    expect(names).toContain("Install or remove pole, crossarm, or brackets");
    expect(names).toContain("Install or remove transmission structure (e.g. tower, pole)");
    expect(names).toContain("Rack-in or rack-out circuit breaker");
  });

  it("preserves Direct Control exact names and records unresolved mappings", () => {
    const dc = JSON.parse(readFileSync(path.join("reference/extracted/direct-control-inventory.json"), "utf8"));
    expect(dc.directControls.some((c: { exactName: string }) => c.exactName === "Lock-out tag-out applied")).toBe(true);
    const gas = dc.directControls.find((c: { exactName: string }) => c.exactName === "Gas detection monitoring");
    expect(gas.mappedHighEnergyKeys).toEqual([]);
    expect(gas.contentStatus).toBe("UNRESOLVED");
  });

  it("keeps Alternative Control source wording", () => {
    const alt = JSON.parse(readFileSync(path.join("reference/extracted/alternative-controls.json"), "utf8"));
    expect(alt.categories.map((c: { exactName: string }) => c.exactName)).toEqual([
      "Physical Obstacle",
      "Dedicated Monitoring",
      "Visual Reminder",
    ]);
    expect(alt.categoryLabelDiscrepancy.bodyTextUses).toBe("Direct Monitoring");
  });
});
