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

test("one Talk button prefills the current page from natural speech", async ({ page }) => {
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
            results: [{
              isFinal: true,
              0: { transcript: "We are replacing a transformer at pole 1847. John, Mike, and Steve are working. We'll use a bucket truck and there is energized overhead primary." },
            }],
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
  await expect(page.getByRole("button", { name: "Talk to fill this page" })).toHaveCount(1);
  await expect(page.getByRole("button", { name: /Talk to fill Work order/ })).toHaveCount(0);

  await page.getByRole("button", { name: "Talk to fill this page" }).click();
  await expect(page.getByRole("textbox", { name: "Job Location" })).toHaveValue(/Pole 1847/, { timeout: 10_000 });
  await expect(page.getByRole("textbox", { name: /Pole, structure, equipment/ })).toHaveValue(/Pole 1847/);
  await expect(page.getByRole("textbox", { name: "Crew members (one per line)" })).toHaveValue(/John/);
  await expect(page.getByRole("textbox", { name: "Crew members (one per line)" })).toHaveValue(/Steve/);
  await expect(page.getByRole("textbox", { name: "Work order number" })).toHaveValue("");
  await expect(page.getByText(/Step 1 of 10/)).toBeVisible();
  await expect(page.getByText(/Filled from talk:/)).toBeVisible();
});

test("Job Location is first, GPS is optional, and typed location persists", async ({ page }) => {
  await signInAsEic(page);
  await page.getByRole("link", { name: "Start a Job Brief" }).click();
  await page.getByRole("button", { name: "Electric Distribution" }).click();
  await page.getByRole("button", { name: "Create draft" }).click();
  await expect(page.getByText(/Step 1 of 10/)).toBeVisible();

  const jobHeading = page.getByRole("heading", { name: "Job Location" }).first();
  const workOrder = page.getByRole("textbox", { name: "Work order number" });
  await expect(jobHeading).toBeVisible();
  const jobBox = await jobHeading.boundingBox();
  const workOrderBox = await workOrder.boundingBox();
  expect(jobBox?.y ?? 0).toBeLessThan(workOrderBox?.y ?? 0);

  await expect(page.getByText("Where is the work? GPS is optional")).toBeVisible();
  await page.getByRole("textbox", { name: "Job Location" }).fill("Lincoln substation");
  await page.getByRole("textbox", { name: "911/street address" }).fill("500 Main Street");
  await page.getByRole("textbox", { name: /Pole, structure, equipment/ }).fill("Pole 12");
  await expect(page.getByRole("textbox", { name: "GPS coordinates" })).toHaveValue("");
  await page.getByRole("button", { name: "Save Draft" }).click();
  await expect(page.getByText(/Synchronized|Saved on Device/)).toBeVisible();
  const briefUrl = page.url();
  const briefId = briefUrl.match(/\/briefs\/([^/?#]+)/)?.[1];
  expect(briefId).toBeTruthy();
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Job Location" })).toHaveValue("Lincoln substation");
  await expect(page.getByRole("textbox", { name: "911/street address" })).toHaveValue("500 Main Street");
  await expect(page.getByRole("textbox", { name: /Pole, structure, equipment/ })).toHaveValue("Pole 12");
  await expect(page.getByRole("textbox", { name: "GPS coordinates" })).toHaveValue("");

  await page.getByRole("link", { name: "Post-job review" }).click();
  await expect(page.getByRole("heading", { name: "Post-job review" })).toBeVisible();
  await expect(page.getByText(/Lincoln substation/)).toBeVisible();

  await page.goto(briefUrl);
  await expect(page.getByRole("textbox", { name: "Job Location" })).toHaveValue("Lincoln substation");
  await page.getByRole("button", { name: "Stop Work" }).click();
  await expect(page.getByRole("heading", { name: "Stop Work" })).toBeVisible();
  await expect(page.getByText(/Lincoln substation/)).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();

  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page.getByText(/Step 2 of 10/)).toBeVisible();
});

test("Talk does not overwrite an existing Job Location without confirmation", async ({ page }) => {
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
            results: [{
              isFinal: true,
              0: { transcript: "We are replacing a transformer at pole 1847. John, Mike, and Steve are working." },
            }],
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
  await page.getByRole("textbox", { name: "Job Location" }).fill("Substation gate");
  await page.getByRole("button", { name: "Talk to fill this page" }).click();
  await expect(page.getByText("Location already entered")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole("textbox", { name: "Job Location" })).toHaveValue("Substation gate");
  await expect(page.getByRole("textbox", { name: /Pole, structure, equipment/ })).toHaveValue(/Pole 1847/);
  await page.getByRole("button", { name: /Use spoken Job Location/ }).click();
  await expect(page.getByRole("textbox", { name: "Job Location" })).toHaveValue(/Pole 1847/);
});
