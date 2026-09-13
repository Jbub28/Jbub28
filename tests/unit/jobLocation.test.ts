import { describe, expect, it } from "vitest";
import { formatJobLocation, locationFromRecord, parseGps, persistableLocation } from "@/lib/domain/jobLocation";

describe("job location helpers", () => {
  it("parses and formats GPS without requiring a device permission", () => {
    expect(parseGps("41.87810, -87.62980")).toEqual({ latitude: 41.8781, longitude: -87.6298 });
    expect(parseGps("not coordinates")).toBeNull();
  });

  it("reads modern fields and falls back to the paper 911/coordinates value", () => {
    const loc = locationFromRecord({
      workLocation: "North gate",
      addressOrCoordinates: "500 Main Street · 41.87810, -87.62980",
    });
    expect(loc.jobLocation).toBe("North gate");
    expect(loc.streetAddress).toBe("500 Main Street");
    expect(loc.gpsCoordinates).toMatch(/41\.87810/);
  });

  it("does not treat a GPS-only legacy value as a street address", () => {
    const loc = locationFromRecord({ streetAddress: "41.87810, -87.62980" });
    expect(loc.streetAddress).toBe("");
    expect(loc.gpsCoordinates).toMatch(/41\.87810/);
  });

  it("keeps workLocation and addressOrCoordinates in sync for older readers", () => {
    const saved = persistableLocation({
      jobLocation: "Pole 1847",
      streetAddress: "500 Main Street",
      locationIdentifier: "Pole 1847",
      gpsCoordinates: "41.87810, -87.62980",
    });
    expect(saved.workLocation).toBe("Pole 1847");
    expect(saved.addressOrCoordinates).toContain("500 Main Street");
    expect(saved.gpsLatitude).toBeCloseTo(41.8781);
    expect(saved.gpsPermissionGranted).toBe(false);
  });

  it("formats an empty record without implying GPS is required", () => {
    expect(formatJobLocation({})).toBe("Location not entered");
  });
});
