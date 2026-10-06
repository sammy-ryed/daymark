import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../apps/api/src/app";
import type { Server } from "node:http";
let server: Server;
let base = "";
beforeAll(async () => {
  server = createApp({
    url: "https://example.supabase.co",
    key: "test-publishable-key",
    webOrigin: "http://localhost:3000",
  }).listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.on("listening", resolve));
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}/api`;
});
afterAll(() => server.close());
describe("API boundary security", () => {
  it("rejects unauthenticated data access", async () => {
    for (const path of ["/projects", "/tasks", "/dashboard"])
      expect((await fetch(base + path)).status).toBe(401);
  });
  it("rejects cross-site web writes before auth", async () => {
    const r = await fetch(base + "/projects", {
      method: "POST",
      headers: {
        Origin: "https://untrusted.example",
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    expect(r.status).toBe(403);
  });
  it("validates native login without requiring browser Origin", async () => {
    const r = await fetch(base + "/auth/login", {
      method: "POST",
      headers: {
        "X-Project-Client": "mobile",
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    expect(r.status).toBe(400);
  });
  it("returns safe malformed JSON errors", async () => {
    const r = await fetch(base + "/auth/login", {
      method: "POST",
      headers: {
        "X-Project-Client": "mobile",
        "Content-Type": "application/json",
      },
      body: "{broken",
    });
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual({ message: "Invalid JSON request." });
  });
});
