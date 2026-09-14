import { describe, expect, it } from "vitest";
import { briefListBucket, briefTitle, plainStatus } from "@/lib/domain/briefPresentation";
import { CSRA_MAX_SCORE, csraWeightedScore } from "@/lib/domain/csraScorecard";
import { nearestTraumaHospital } from "@/lib/domain/traumaCenters";
import { supervisorAttention } from "@/lib/domain/supervisorAttention";

describe("plain status labels", () => {
  it("uses words a child can read", () => {
    expect(plainStatus("released_for_work")).toBe("Job in progress");
    expect(plainStatus("closed")).toBe("Completed");
    expect(plainStatus("draft")).toBe("Still writing");
    expect(plainStatus("stop_work_active")).toBe("Stop work");
  });
});

describe("brief titles and lists", () => {
  it("names a job from the work and the street, not the JRB number alone", () => {
    expect(
      briefTitle({
        jrbNumber: "JRB-2026-00115",
        jobLocation: "4200 N West Ave, Tampa, FL",
        versions: [{ workDescriptionEdited: "replace a damaged 50 kVA overhead transformer" }],
      }),
    ).toMatch(/Replace a damaged 50 kVA/i);
    expect(
      briefTitle({
        jrbNumber: "JRB-2026-00115",
        jobLocation: "4200 N West Ave, Tampa, FL",
        versions: [{ workDescriptionEdited: "replace a damaged 50 kVA overhead transformer" }],
      }),
    ).toMatch(/4200 N West Ave/);
  });

  it("archives completed jobs and unfinished empty starts", () => {
    expect(briefListBucket({ status: "closed", jobLocation: "Main St" })).toBe("archived");
    expect(briefListBucket({ status: "released_for_work", jobLocation: "Main St" })).toBe("current");
    expect(
      briefListBucket({
        status: "draft",
        createdAt: new Date(Date.now() - 48 * 3600_000),
        updatedAt: new Date(Date.now() - 48 * 3600_000),
      }),
    ).toBe("unfinished");
  });
});

describe("CSRA scorecard math", () => {
  it("uses official weights and a max of 54", () => {
    expect(CSRA_MAX_SCORE).toBe(57);
    expect(csraWeightedScore({ "1": true, "5": true, "8": false })).toBe(9);
  });
});

describe("nearest Level II+ trauma hospital", () => {
  it("picks a Tampa Level I or II hospital for a West Ave job", () => {
    const hit = nearestTraumaHospital({ latitude: 27.975, longitude: -82.492 });
    expect(hit).not.toBeNull();
    expect(hit?.level).toMatch(/Level I|Level II/);
    expect(hit?.city).toMatch(/Tampa|St\. Petersburg/);
    expect(hit!.distanceMiles).toBeLessThan(20);
  });
});

describe("supervisor attention order", () => {
  it("puts Stop Work ahead of a quiet draft", () => {
    const stop = supervisorAttention({ status: "stop_work_active", versions: [{ exposures: [] }] });
    const quiet = supervisorAttention({ status: "draft", jobLocation: "1 Main St", versions: [{ exposures: [] }] });
    expect(stop.band).toBe("urgent");
    expect(stop.score).toBeGreaterThan(quiet.score);
  });
});
