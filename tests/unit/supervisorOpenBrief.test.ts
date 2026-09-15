import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("supervisor Open the job brief", () => {
  const page = readFileSync("src/app/admin/supervisor/page.tsx", "utf8");
  const sw = readFileSync("public/sw.js", "utf8");
  const briefPage = readFileSync("src/app/briefs/[id]/page.tsx", "utf8");

  it("uses a same-origin relative brief route instead of an App Router Link", () => {
    expect(page).toContain('href={`/briefs/${j.id}`}');
    expect(page).toMatch(/<a href=\{`\/briefs\/\$\{j\.id\}`\}/);
    expect(page).not.toMatch(/<Link href=\{`\/briefs\/\$\{j\.id\}`\}/);
    expect(page).not.toMatch(/jbub28-production\.up\.railway\.app\/briefs/);
    expect(page).not.toMatch(/localhost|127\.0\.0\.1|trycloudflare/);
  });

  it("keeps Assess briefing on its working supervisor route", () => {
    expect(page).toContain('href={`/admin/supervisor/assess/${j.id}`}');
  });

  it("loads /briefs/[id] as a client page so WKWebView does not need an RSC flight", () => {
    expect(briefPage).toContain('"use client"');
    expect(briefPage).toContain("useParams");
    expect(briefPage).toContain("<BriefWizard id={id} />");
  });

  it("does not let the service worker intercept Next.js RSC or API fetches", () => {
    expect(sw).toContain('url.searchParams.has("_rsc")');
    expect(sw).toContain('request.headers.get("RSC") === "1"');
    expect(sw).toContain('url.pathname.startsWith("/api/")');
    expect(sw).toContain('url.pathname.startsWith("/_next/")');
    expect(sw).not.toContain('caches.match("/")');
  });
});
