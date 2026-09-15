import { test, expect } from "@playwright/test";

const WORKER_EMAIL = "worker.test@energyguardjrb.com";
const SUPERVISOR_EMAIL = "supervisor.test@energyguardjrb.com";
const UNIQUE_LOCATION = "Oak Street yard Line Crew 14";
const OUTSIDER_LOCATION = "Avery-only substation 99";

async function signIn(page: import("@playwright/test").Page, email: string, heading: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Sign in as").selectOption(email);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: heading })).toBeVisible({ timeout: 15_000 });
}

test("Mike Torres and Sarah Collins cover the TestFlight worker/supervisor briefing path", async ({ page, request }) => {
  await page.goto("/sign-in");
  await expect(page.getByLabel("Sign in as")).toBeVisible();
  await expect(page.getByLabel("Password")).toHaveCount(0);
  await expect(page.getByLabel("Sign in as")).toContainText("Mike Torres");
  await expect(page.getByLabel("Sign in as")).toContainText("Sarah Collins");
  await expect(page.getByLabel("Sign in as")).not.toContainText("Avery Cole");
  await expect(page.getByLabel("Sign in as").locator("option")).toHaveCount(3);

  await signIn(page, WORKER_EMAIL, "My job briefs");
  const mikeSession = await page.request.get("/api/auth/session");
  const mikeBody = await mikeSession.json();
  expect(mikeBody.user.displayName).toBe("Mike Torres");
  expect(mikeBody.user.roles).toEqual(["field_team_member"]);
  expect(mikeBody.user.roles).not.toContain("supervisor");
  await expect(page.getByRole("link", { name: "Start a Job Brief" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Supervisor", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Libraries" })).toHaveCount(0);

  const supervisorDenied = await page.request.get("/api/admin/supervisor");
  expect(supervisorDenied.status()).toBe(403);

  const forged = await page.request.post("/api/auth/login", {
    data: { email: WORKER_EMAIL, roles: ["supervisor", "application_administrator"] },
  });
  expect(forged.ok()).toBeTruthy();
  const forgedBody = await forged.json();
  expect(forgedBody.user.roles).toEqual(["field_team_member"]);

  await page.getByRole("link", { name: "Start a Job Brief" }).click();
  await page.getByRole("button", { name: "Electric Distribution" }).click();
  await page.getByRole("button", { name: "Create draft" }).click();
  await expect(page.getByText(/Step 1 of 3/)).toBeVisible();
  await page.getByRole("textbox", { name: "Job Location" }).fill(UNIQUE_LOCATION);
  await page.getByRole("textbox", { name: /Pole, structure, equipment/ }).fill("Pole 14");
  await page.getByRole("button", { name: "More" }).click();
  await page.getByRole("button", { name: "Save Draft" }).click();
  await expect(page.getByText("Synchronized")).toBeVisible();
  const briefUrl = page.url();
  const briefId = briefUrl.match(/\/briefs\/([^/?#]+)/)?.[1];
  expect(briefId).toBeTruthy();

  const created = await page.request.get(`/api/jrbs/${briefId}`);
  const createdJson = await created.json();
  expect(createdJson.canEdit).toBe(true);
  expect(createdJson.jrb.createdBy.displayName).toBe("Mike Torres");
  expect(createdJson.jrb.supervisor.displayName).toBe("Sarah Collins");

  await page.getByRole("button", { name: "My briefs" }).click();
  await expect(page.getByRole("heading", { name: "My job briefs" })).toBeVisible();
  await expect(page.getByText(UNIQUE_LOCATION)).toBeVisible();
  await page.getByText(UNIQUE_LOCATION).first().click();
  await expect(page.getByRole("textbox", { name: "Job Location" })).toHaveValue(UNIQUE_LOCATION);

  await page.getByRole("button", { name: "My briefs" }).click();
  await expect(page.getByRole("heading", { name: "My job briefs" })).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByLabel("Sign in as")).toBeVisible();

  await signIn(page, SUPERVISOR_EMAIL, "Supervisor desk");
  const sarahSession = await page.request.get("/api/auth/session");
  const sarahBody = await sarahSession.json();
  expect(sarahBody.user.displayName).toBe("Sarah Collins");
  expect(sarahBody.user.roles).toEqual(["supervisor"]);

  const createDenied = await page.request.post("/api/jrbs", {
    data: { workTypeCode: "ELECTRIC_DISTRIBUTION" },
  });
  expect(createDenied.status()).toBe(403);
  const patchDenied = await page.request.patch(`/api/jrbs/${briefId}`, {
    data: { action: "saveStart", jobLocation: "Sarah should not persist this" },
  });
  expect(patchDenied.status()).toBe(403);
  const releaseDenied = await page.request.post(`/api/jrbs/${briefId}/release`, { data: {} });
  expect(releaseDenied.status()).toBe(403);

  await expect(page.getByRole("tab", { name: /In progress/ })).toBeVisible();
  await expect(page.getByRole("tab", { name: /Submitted \/ completed/ })).toBeVisible();
  const card = page.locator("li").filter({ hasText: UNIQUE_LOCATION });
  await expect(card).toBeVisible();
  await expect(card.getByText("Mike Torres")).toBeVisible();
  const openBrief = card.getByRole("link", { name: "Open the job brief" });
  await expect(openBrief).toHaveAttribute("href", `/briefs/${briefId}`);
  await expect(openBrief).not.toHaveAttribute("href", /https?:\/\/|localhost|trycloudflare/);
  await openBrief.click();
  await expect(page.getByText("Review only")).toBeVisible();
  await expect(page.getByText(UNIQUE_LOCATION)).toBeVisible();
  await expect(page.getByText("Mike Torres")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save Draft" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Submit brief — job in progress" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Stop Work" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Talk through the job" })).toHaveCount(0);

  const sarahRead = await page.request.get(`/api/jrbs/${briefId}`);
  const sarahReadJson = await sarahRead.json();
  expect(sarahRead.ok()).toBeTruthy();
  expect(sarahReadJson.canEdit).toBe(false);
  expect(sarahReadJson.jrb.jobLocation).toBe(UNIQUE_LOCATION);

  const outsiderLogin = await request.post("/api/auth/login", {
    data: { email: "eic@energyguard.local", password: "ChangeMe!LocalOnly" },
  });
  expect(outsiderLogin.ok()).toBeTruthy();
  const outsiderCreate = await request.post("/api/jrbs", {
    data: {
      workTypeCode: "ELECTRIC_DISTRIBUTION",
      jobLocation: OUTSIDER_LOCATION,
      crewMembers: [{ name: "Avery Cole", employer: "Electric Delivery" }],
    },
  });
  expect(outsiderCreate.ok()).toBeTruthy();
  const outsiderId = (await outsiderCreate.json()).id as string;
  await request.patch(`/api/jrbs/${outsiderId}`, {
    data: { action: "saveStart", jobLocation: OUTSIDER_LOCATION },
  });

  const desk = await page.request.get("/api/admin/supervisor");
  const deskJson = await desk.json();
  expect(desk.ok()).toBeTruthy();
  const locations = (deskJson.jrbs ?? []).map((row: { jobLocation?: string }) => row.jobLocation);
  expect(locations).toContain(UNIQUE_LOCATION);
  expect(locations).not.toContain(OUTSIDER_LOCATION);

  const outsiderGet = await page.request.get(`/api/jrbs/${outsiderId}`);
  expect(outsiderGet.status()).toBe(404);
});
