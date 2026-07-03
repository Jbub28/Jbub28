import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto("http://localhost:3000?demo=1", { waitUntil: "networkidle" });
await page.getByText(/\d+ trips loaded/).waitFor({ timeout: 15000 });
const tripCount = await page.getByText(/\d+ trips loaded/).textContent();
console.log("DASHBOARD:", tripCount?.trim());
await browser.close();
