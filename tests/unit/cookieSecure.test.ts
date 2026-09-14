import { describe, expect, it } from "vitest";
import { cookieSecure } from "@/lib/auth/cookieSecure";

describe("session cookie security", () => {
  it("marks the cookie Secure on HTTPS iPhone tunnels", () => {
    const request = new Request("https://example.trycloudflare.com/api/auth/login", {
      headers: { "x-forwarded-proto": "https", origin: "https://example.trycloudflare.com" },
    });
    expect(cookieSecure(request)).toBe(true);
  });

  it("keeps local HTTP cookies usable", () => {
    const request = new Request("http://localhost:3000/api/auth/login", {
      headers: { "x-forwarded-proto": "http", origin: "http://localhost:3000" },
    });
    expect(cookieSecure(request)).toBe(false);
  });
});
