import { describe, expect, it } from "vitest";
import { applyPoleFollowUp, matchTasks, type ApprovedTask } from "@/lib/domain/taskMatching";

const distPole: ApprovedTask = {
  id: "d-pole",
  exactName: "Install or remove pole, crossarm, or brackets",
  activityExactName: "Pole work",
  workTypeCode: "ELECTRIC_DISTRIBUTION",
  workTypeExactName: "Electric Distribution",
  status: "active",
};
const transPole: ApprovedTask = {
  id: "t-pole",
  exactName: "Install or remove transmission structure (e.g. tower, pole)",
  activityExactName: "Structure work",
  workTypeCode: "ELECTRIC_TRANSMISSION",
  workTypeExactName: "Electric Transmission",
  status: "active",
};
const rack: ApprovedTask = {
  id: "s-rack",
  exactName: "Rack-in or rack-out circuit breaker",
  activityExactName: "Operate equipment",
  workTypeCode: "ELECTRIC_SUBSTATION",
  workTypeExactName: "Electric Substation",
  status: "active",
};
const climb: ApprovedTask = {
  id: "d-climb",
  exactName: "Climb pole",
  activityExactName: "Pole work",
  workTypeCode: "ELECTRIC_DISTRIBUTION",
  workTypeExactName: "Electric Distribution",
  status: "active",
};

const all = [distPole, transPole, rack, climb];

describe("task matching", () => {
  it("suggests the Distribution pole task for setting a pole", () => {
    const result = matchTasks({
      workTypeCode: "ELECTRIC_DISTRIBUTION",
      text: "Today we are setting a pole",
      approvedTasks: all,
      approvedSynonyms: [],
    });
    expect(result.unmatched).toBe(false);
    expect(result.suggestions[0]?.exactTaskName).toBe(distPole.exactName);
    expect(result.suggestions[0]?.confidence).toBe("Strong Match");
  });

  it("does not auto-confirm and keeps Transmission distinct", () => {
    const result = matchTasks({
      workTypeCode: "ELECTRIC_TRANSMISSION",
      text: "installing a transmission pole",
      approvedTasks: all,
      approvedSynonyms: [],
    });
    expect(result.suggestions[0]?.exactTaskName).toBe(transPole.exactName);
    expect(result.suggestions.some((s) => s.exactTaskName === distPole.exactName)).toBe(false);
  });

  it("matches rack-in to the exact Substation task", () => {
    const result = matchTasks({
      workTypeCode: "ELECTRIC_SUBSTATION",
      text: "rack-in or rack-out circuit breaker",
      approvedTasks: all,
      approvedSynonyms: [],
    });
    expect(result.suggestions[0]?.exactTaskName).toBe(rack.exactName);
  });

  it("asks a follow-up when pole work is vague", () => {
    const result = matchTasks({
      workTypeCode: "ELECTRIC_DISTRIBUTION",
      text: "working on a pole",
      approvedTasks: all,
      approvedSynonyms: [],
    });
    expect(result.followUpQuestion).toContain("pole");
    expect(applyPoleFollowUp("Climbing a pole", "ELECTRIC_DISTRIBUTION", all).suggestions[0]?.exactTaskName).toBe("Climb pole");
  });

  it("never invents a task when unmatched", () => {
    const result = matchTasks({
      workTypeCode: "ELECTRIC_DISTRIBUTION",
      text: "xyzzy unknown work",
      approvedTasks: all,
      approvedSynonyms: [],
    });
    expect(result.unmatched).toBe(true);
    expect(result.suggestions).toHaveLength(0);
  });

  it("ignores unapproved synonyms", () => {
    const result = matchTasks({
      workTypeCode: "ELECTRIC_DISTRIBUTION",
      text: "hang a widget",
      approvedTasks: all,
      approvedSynonyms: [
        {
          phrase: "hang a widget",
          workTypeCode: "ELECTRIC_DISTRIBUTION",
          proposedTaskExactName: distPole.exactName,
          status: "proposed_pending_admin_approval",
        },
      ],
    });
    expect(result.unmatched).toBe(true);
  });
});
