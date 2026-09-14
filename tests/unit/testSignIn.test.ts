import { describe, expect, it } from "vitest";
import { RoleName } from "@prisma/client";
import { isSupervisorOnly, isTestSignInEmail } from "@/lib/auth/testSignIn";
import { supervisorDeskFolder } from "@/lib/domain/briefPresentation";

describe("TestFlight sign-in allowlist", () => {
  it("accepts only the two TestFlight accounts", () => {
    expect(isTestSignInEmail("worker.test@energyguardjrb.com")).toBe(true);
    expect(isTestSignInEmail("supervisor.test@energyguardjrb.com")).toBe(true);
    expect(isTestSignInEmail("eic@energyguard.local")).toBe(false);
    expect(isTestSignInEmail("admin@energyguard.local")).toBe(false);
  });

  it("treats Sarah as supervisor-only", () => {
    expect(isSupervisorOnly([RoleName.supervisor])).toBe(true);
    expect(isSupervisorOnly([RoleName.field_team_member])).toBe(false);
    expect(isSupervisorOnly([RoleName.supervisor, RoleName.field_team_member])).toBe(false);
  });
});

describe("supervisor desk folders", () => {
  it("splits in-progress writing from submitted or completed jobs", () => {
    expect(supervisorDeskFolder("draft")).toBe("in_progress");
    expect(supervisorDeskFolder("in_progress")).toBe("in_progress");
    expect(supervisorDeskFolder("released_for_work")).toBe("submitted");
    expect(supervisorDeskFolder("closed")).toBe("submitted");
    expect(supervisorDeskFolder("stop_work_active")).toBe("submitted");
  });
});
