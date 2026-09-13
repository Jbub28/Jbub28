import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function signInAsEic(page: import("@playwright/test").Page) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("eic@energyguard.local");
  await page.getByLabel("Password").fill("ChangeMe!LocalOnly");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "My job briefs" })).toBeVisible({ timeout: 15_000 });
}

test("sign-in is usable on a mobile viewport and has no critical axe violations", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page.getByRole("heading", { name: "EnergyGuard JRB" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  const critical = results.violations.filter((v) => v.impact === "critical");
  expect(critical).toEqual([]);
});

test("Employee in Charge can create a draft JRB", async ({ page }) => {
  await signInAsEic(page);
  await page.getByRole("link", { name: "Start a Job Brief" }).click();
  await page.getByRole("button", { name: "Electric Distribution" }).click();
  await page.getByRole("button", { name: "Create draft" }).click();
  await expect(page.getByText(/Step 1 of 10/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Stop Work" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Conditions Changed / Rebrief" })).toBeVisible();
});

test("sign-in does not offer talk to text on credentials", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page.getByRole("button", { name: /^Talk/ })).toHaveCount(0);
});

test("briefing fields can be filled by talking", async ({ page }) => {
  await page.addInitScript(() => {
    class FakeSpeechRecognition {
      continuous = false;
      interimResults = false;
      lang = "";
      onresult: ((event: unknown) => void) | null = null;
      onerror: ((event: unknown) => void) | null = null;
      onend: (() => void) | null = null;
      start() {
        queueMicrotask(() => {
          this.onresult?.({
            resultIndex: 0,
            results: [{ isFinal: true, 0: { transcript: "WO 4411 at Maple Street" } }],
          });
          this.onend?.();
        });
      }
      stop() {
        this.onend?.();
      }
      abort() {}
    }
    Object.assign(window, {
      SpeechRecognition: FakeSpeechRecognition,
      webkitSpeechRecognition: FakeSpeechRecognition,
    });
  });

  await signInAsEic(page);
  await page.getByRole("link", { name: "Start a Job Brief" }).click();
  await page.getByRole("button", { name: "Electric Distribution" }).click();
  await page.getByRole("button", { name: "Create draft" }).click();
  await expect(page.getByText(/Step 1 of 10/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Talk to fill Work order number" })).toBeVisible();
  await page.getByRole("button", { name: "Talk to fill Work order number" }).click();
  await expect(page.getByRole("textbox", { name: "Work order number" })).toHaveValue(/WO 4411 at Maple Street/);

  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByRole("button", { name: "Start microphone" })).toBeVisible();
  await page.getByRole("button", { name: "Start microphone" }).click();
  await expect(page.getByRole("textbox", { name: "Work description" })).toHaveValue(/WO 4411 at Maple Street/);
});
