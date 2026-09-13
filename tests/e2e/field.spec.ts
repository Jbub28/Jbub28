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
  await expect(page.getByText(/Step 1 of 3/)).toBeVisible();
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
  await expect(page.getByText(/Step 1 of 3/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Talk through the job" })).toHaveCount(1);
  await expect(page.getByRole("button", { name: /Talk to fill Work order/ })).toHaveCount(0);

  await page.getByRole("button", { name: "Talk through the job" }).click();
  await expect(page.getByRole("textbox", { name: "Job Location" })).toHaveValue(/Pole 1847/, { timeout: 10_000 });
  await expect(page.getByRole("textbox", { name: /Pole, structure, equipment/ })).toHaveValue(/Pole 1847/);
  await expect(page.getByRole("textbox", { name: "Crew members (one per line)" })).toHaveValue(/John/);
  await expect(page.getByRole("textbox", { name: "Crew members (one per line)" })).toHaveValue(/Steve/);
  await expect(page.getByRole("textbox", { name: "Work order number" })).toHaveValue("");
  await expect(page.getByText(/Step 1 of 3/)).toBeVisible();
  await expect(page.getByText("Filled from talk where it was clear")).toBeVisible();
});

test("Job Location is first, GPS is optional, and typed location persists", async ({ page }) => {
  await signInAsEic(page);
  await page.getByRole("link", { name: "Start a Job Brief" }).click();
  await page.getByRole("button", { name: "Electric Distribution" }).click();
  await page.getByRole("button", { name: "Create draft" }).click();
  await expect(page.getByText(/Step 1 of 3/)).toBeVisible();

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

  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText(/Step 2 of 3/)).toBeVisible();
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
  await page.getByRole("button", { name: "Talk through the job" }).click();
  await expect(page.getByText("Location already entered")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole("textbox", { name: "Job Location" })).toHaveValue("Substation gate");
  await expect(page.getByRole("textbox", { name: /Pole, structure, equipment/ })).toHaveValue(/Pole 1847/);
  await page.getByRole("button", { name: /Use spoken Job Location/ }).click();
  await expect(page.getByRole("textbox", { name: "Job Location" })).toHaveValue(/Pole 1847/);
});

test("typed incomplete high-energy briefing asks a control question and does not advance", async ({ page }) => {
  await signInAsEic(page);
  await page.getByRole("link", { name: "Start a Job Brief" }).click();
  await page.getByRole("button", { name: "Electric Distribution" }).click();
  await page.getByRole("button", { name: "Create draft" }).click();
  await page.getByRole("textbox", { name: "Or type the job" }).fill(
    "We're replacing a transformer from the bucket with energized primary overhead.",
  );
  await page.getByRole("button", { name: "Use typed briefing" }).click();
  await expect(page.getByText(/How will the crew prevent exposure/i)).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/Step 1 of 3/)).toBeVisible();
  await expect(page.getByRole("button", { name: "This is what we briefed" })).toHaveCount(0);
});

test("microphone permission denial still allows typing", async ({ page }) => {
  await page.addInitScript(() => {
    class FakeSpeechRecognition {
      continuous = false;
      interimResults = false;
      lang = "";
      onresult: ((event: unknown) => void) | null = null;
      onerror: ((event: unknown) => void) | null = null;
      onend: (() => void) | null = null;
      start() {
        queueMicrotask(() => this.onerror?.({ error: "not-allowed" }));
      }
      stop() {}
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
  await page.getByRole("button", { name: "Talk through the job" }).click();
  await expect(page.getByText(/Microphone permission is needed to talk/)).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Or type the job" })).toBeVisible();
});

test("Stop Work talk captures cover-up failure and stays open", async ({ page }) => {
  await signInAsEic(page);
  await page.getByRole("link", { name: "Start a Job Brief" }).click();
  await page.getByRole("button", { name: "Electric Distribution" }).click();
  await page.getByRole("button", { name: "Create draft" }).click();
  await page.getByRole("button", { name: "Stop Work" }).click();
  await page.getByRole("textbox", { name: "What happened?" }).fill(
    "We stopped because the required cover-up could not be installed.",
  );
  await page.locator("#reason").selectOption("Control failed");
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByText(/Stop Work is active/)).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole("button", { name: "Work may resume" })).toBeVisible();
});

test("Back returns to My briefs, Help opens, and the action bar stays at the bottom", async ({ page }) => {
  await signInAsEic(page);
  await page.getByRole("link", { name: "Start a Job Brief" }).click();
  await page.getByRole("button", { name: "Electric Distribution" }).click();
  await page.getByRole("button", { name: "Create draft" }).click();
  await expect(page.getByText(/Step 1 of 3/)).toBeVisible();

  const stop = page.getByRole("button", { name: "Stop Work" });
  const box = await stop.boundingBox();
  expect(box?.y ?? 0).toBeGreaterThan(500);

  await page.getByRole("button", { name: "Help" }).click();
  await expect(page.getByRole("heading", { name: "Help" })).toBeVisible();
  await page.getByRole("button", { name: "Close help" }).click();

  await page.getByRole("button", { name: "My briefs" }).click();
  await expect(page.getByRole("heading", { name: "My job briefs" })).toBeVisible();
});
