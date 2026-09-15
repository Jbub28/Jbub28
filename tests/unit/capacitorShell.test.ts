import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const RAILWAY_HOST = "jbub28-production.up.railway.app";
const DEFAULT_SERVER_URL = `https://${RAILWAY_HOST}`;

function allowNavigationHosts(source: string): string[] {
  const match = source.match(/allowNavigation:\s*\[([\s\S]*?)\]/);
  expect(match, "allowNavigation array").toBeTruthy();
  return [...match![1].matchAll(/"([^"]+)"/g)].map((item) => item[1]);
}

describe("Capacitor iPhone shell", () => {
  const capacitorConfig = readFileSync("capacitor.config.ts", "utf8");
  const connectHtml = readFileSync("native-web/index.html", "utf8");
  const serverDefault = JSON.parse(readFileSync("native-web/server-default.json", "utf8")) as { url: string };
  const prepareIos = readFileSync("scripts/prepare-ios.mjs", "utf8");
  const pbxproj = readFileSync("ios/App/App.xcodeproj/project.pbxproj", "utf8");
  const appJson = JSON.parse(readFileSync("app.json", "utf8")) as {
    expo: { ios: { bundleIdentifier: string; supportsTablet: boolean }; extra: { eas: { projectId: string } } };
  };
  const easJson = JSON.parse(readFileSync("eas.json", "utf8")) as {
    submit: { production: { ios: { ascAppId: string; appleTeamId: string; bundleIdentifier: string } } };
  };

  it("keeps the Railway hostname inside the WebView allow list", () => {
    const hosts = allowNavigationHosts(capacitorConfig);
    expect(hosts).toContain(RAILWAY_HOST);
    expect(hosts).toContain("*.trycloudflare.com");
    expect(hosts).toContain("localhost");
    expect(hosts).toContain("127.0.0.1");
    expect(hosts).not.toContain("*");
    expect(hosts.some((host) => host === "*" || host === "https://*")).toBe(false);
  });

  it("defaults field devices to the permanent Railway backend", () => {
    expect(serverDefault.url).toBe(DEFAULT_SERVER_URL);
    expect(prepareIos).toContain(`const DEFAULT_SERVER_URL = "${DEFAULT_SERVER_URL}"`);
    expect(connectHtml).toContain(`const DEFAULT_SERVER_URL = "${DEFAULT_SERVER_URL}"`);
    expect(connectHtml).toContain("window.location.replace");
    expect(connectHtml).toMatch(/autoConnectTimer = window\.setTimeout/);
  });

  it("ignores stale pasted URLs unless support sets an override", () => {
    expect(connectHtml).toContain('const OVERRIDE_KEY = "energyguard.serverUrlOverride"');
    expect(connectHtml).toContain("localStorage.removeItem(LEGACY_KEY)");
    expect(connectHtml).toContain("Change server");
    expect(connectHtml).not.toMatch(/localStorage\.getItem\(KEY\)/);
  });

  it("preserves native identity while bumping only the iOS build number", () => {
    expect(pbxproj.match(/CURRENT_PROJECT_VERSION = 7;/g)).toHaveLength(2);
    expect(pbxproj).not.toMatch(/CURRENT_PROJECT_VERSION = 6;/);
    expect(pbxproj.match(/MARKETING_VERSION = 1\.0\.1;/g)).toHaveLength(2);
    expect(pbxproj.match(/PRODUCT_BUNDLE_IDENTIFIER = com\.jbub28\.energyguardjrb;/g)?.length).toBeGreaterThanOrEqual(2);
    expect(pbxproj.match(/TARGETED_DEVICE_FAMILY = 1;/g)?.length).toBeGreaterThanOrEqual(2);
    expect(pbxproj).toContain("DEVELOPMENT_TEAM = L7ZVZDDF3G");
    expect(appJson.expo.ios.bundleIdentifier).toBe("com.jbub28.energyguardjrb");
    expect(appJson.expo.ios.supportsTablet).toBe(false);
    expect(appJson.expo.extra.eas.projectId).toBe("c1132d9c-5228-4a2f-9d8a-d4050fc06ea5");
    expect(easJson.submit.production.ios).toMatchObject({
      ascAppId: "6811939293",
      appleTeamId: "L7ZVZDDF3G",
      bundleIdentifier: "com.jbub28.energyguardjrb",
    });
  });
});
