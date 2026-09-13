import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("sign-in is usable on a mobile viewport and has no critical axe violations", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page.getByRole("heading", { name: "EnergyGuard JRB" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  const critical = results.violations.filter((v) => v.impact === "critical");
  expect(critical).toEqual([]);
});

test("Employee in Charge can create a draft JRB", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("eic@energyguard.local");
  await page.getByLabel("Password").fill("ChangeMe!LocalOnly");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "My job briefs" })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("link", { name: "Start a Job Brief" }).click();
  await page.getByRole("button", { name: "Electric Distribution" }).click();
  await page.getByRole("button", { name: "Create draft" }).click();
  await expect(page.getByText(/Step 1 of 10/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Stop Work" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Conditions Changed / Rebrief" })).toBeVisible();
});
