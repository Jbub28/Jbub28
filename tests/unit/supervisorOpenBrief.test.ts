import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("supervisor Open the job brief", () => {
  const page = readFileSync("src/app/admin/supervisor/page.tsx", "utf8");
  const briefPage = readFileSync("src/app/admin/supervisor/brief/[id]/page.tsx", "utf8");
  const briefApi = readFileSync("src/app/api/admin/supervisor/brief/[id]/route.ts", "utf8");
  const assessPage = readFileSync("src/app/admin/supervisor/assess/[id]/page.tsx", "utf8");

  it("opens a dedicated supervisor-tree route instead of /briefs/{id}", () => {
    expect(page).toContain('href={`/admin/supervisor/brief/${j.id}`}');
    expect(page).toContain("<Link href={`/admin/supervisor/brief/${j.id}`}");
    expect(page).not.toMatch(/href=\{`\/briefs\/\$\{j\.id\}`\}/);
    expect(page).not.toMatch(/localhost|127\.0\.0\.1|trycloudflare|jbub28-production/);
  });

  it("keeps Assess briefing on its working supervisor route", () => {
    expect(page).toContain('href={`/admin/supervisor/assess/${j.id}`}');
    expect(assessPage).toContain("/api/admin/supervisor/assess/");
  });

  it("loads the supervisor brief as a client page in the supervisor tree", () => {
    expect(briefPage).toContain('"use client"');
    expect(briefPage).toContain("useParams");
    expect(briefPage).toContain("/api/admin/supervisor/brief/");
    expect(briefPage).toContain("SupervisorBriefReview");
    expect(briefPage).not.toContain("/briefs/");
    expect(briefPage).not.toContain("BriefWizard");
    expect(briefPage).not.toContain("window.open");
    expect(briefPage).not.toContain("target=\"_blank\"");
  });

  it("reuses supervisor auth and canReadJrb without worker mutations", () => {
    expect(briefApi).toContain("canSupervisorReview");
    expect(briefApi).toContain("canReadJrb");
    expect(briefApi).toContain("loadJrb");
    expect(briefApi).toContain("canEdit: false");
    expect(briefApi).not.toMatch(/export async function (POST|PATCH|PUT|DELETE)/);
  });

  it("renders the submitted briefing as review-only, including OSHA subjects", () => {
    const review = readFileSync("src/components/supervisor/BriefReview.tsx", "utf8");
    expect(review).toContain("OSHA briefing subjects");
    expect(review).toContain("JobLocationSummary");
    expect(review).toContain("HighEnergyIcon");
    expect(review).not.toContain("Save Draft");
    expect(review).not.toContain("Submit brief");
    expect(review).not.toContain("Stop Work");
    expect(review).not.toContain("fetch(");
    expect(review).not.toMatch(/PATCH|patch\(/);
  });
});
