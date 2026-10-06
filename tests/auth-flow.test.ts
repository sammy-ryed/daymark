import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import { createApp } from "../apps/api/src/app";

// Exercise the real Supabase SDK against an isolated Auth protocol fixture.
// No email is sent, and no account or credential exists outside this test.
const userId = "11111111-1111-4111-8111-111111111111";
const token = `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ sub: userId, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.Zml4dHVyZS1zaWduYXR1cmU`;
const user = {
  id: userId,
  email: "fixture@example.test",
  aud: "authenticated",
  role: "authenticated",
  user_metadata: { full_name: "Fixture User" },
};
let upstream: Server;
let server: Server;
let base: string;
let refreshRequests = 0;
let lastUpdate: unknown;
const headers = {
  Origin: "https://daymark.example",
  "X-Project-Client": "web",
  "Content-Type": "application/json",
};
async function listen(server: Server) {
  server.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  return `http://127.0.0.1:${(server.address() as { port: number }).port}`;
}
beforeAll(async () => {
  upstream = createServer(async (req, res) => {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    const body = raw ? JSON.parse(raw) : {};
    res.setHeader("Content-Type", "application/json");
    if (req.url?.startsWith("/auth/v1/token")) {
      if (req.url.includes("refresh_token")) {
        refreshRequests++;
        expect(body.refresh_token).toBe("fixture-refresh-token");
      }
      res.end(
        JSON.stringify({
          access_token: token,
          refresh_token: "fixture-refresh-token",
          expires_in: 3600,
          token_type: "bearer",
          user,
        }),
      );
      return;
    }
    if (req.url?.startsWith("/auth/v1/user")) {
      if (req.headers.authorization !== `Bearer ${token}`) {
        res.statusCode = 401;
        res.end(JSON.stringify({ message: "Invalid token" }));
        return;
      }
      if (req.method === "PUT") {
        lastUpdate = body;
        res.end(
          JSON.stringify({
            ...user,
            user_metadata: body.data ?? user.user_metadata,
          }),
        );
        return;
      }
      res.end(JSON.stringify(user));
      return;
    }
    if (req.url?.startsWith("/auth/v1/logout")) {
      res.statusCode = 204;
      res.end();
      return;
    }
    res.statusCode = 404;
    res.end("{}");
  });
  const url = await listen(upstream);
  server = createApp({
    url,
    key: "fixture-publishable-key",
    webOrigin: "https://daymark.example",
    production: true,
  }).listen();
  await new Promise<void>((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}/api`;
});
afterAll(() => {
  server.close();
  upstream.close();
});
describe("web account session flow", () => {
  it("issues secure HttpOnly access and refresh cookies without exposing tokens in JSON", async () => {
    const response = await fetch(`${base}/auth/login`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        email: user.email,
        password: "test-only-password",
      }),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      user: { id: userId, email: user.email, fullName: "Fixture User" },
    });
    const cookies = response.headers.getSetCookie();
    expect(cookies).toHaveLength(2);
    for (const cookie of cookies) {
      expect(cookie).toContain("HttpOnly");
      expect(cookie).toContain("Secure");
      expect(cookie).toContain("SameSite=Lax");
    }
  });
  it("refreshes a missing access cookie and returns the verified user", async () => {
    const response = await fetch(`${base}/auth/me`, {
      headers: { Cookie: "project_refresh=fixture-refresh-token" },
    });
    expect(response.status).toBe(200);
    expect((await response.json()).id).toBe(userId);
    expect(refreshRequests).toBe(1);
    expect(response.headers.getSetCookie()).toHaveLength(2);
  });
  it("updates display metadata using only the authenticated user's token", async () => {
    const response = await fetch(`${base}/auth/profile`, {
      method: "PATCH",
      headers: { ...headers, Cookie: `project_session=${token}` },
      body: JSON.stringify({ fullName: "Updated Name" }),
    });
    expect(response.status).toBe(200);
    expect((await response.json()).fullName).toBe("Updated Name");
    expect(lastUpdate).toEqual({ data: { full_name: "Updated Name" } });
  });
  it("validates recovery tokens through Auth before changing the password", async () => {
    const response = await fetch(`${base}/auth/reset-password`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        accessToken: token,
        refreshToken: "fixture-refresh-token",
        password: "another-test-password",
      }),
    });
    expect(response.status, JSON.stringify(await response.json())).toBe(200);
    expect(lastUpdate).toEqual({
      password: "another-test-password",
      code_challenge: null,
      code_challenge_method: null,
    });
    expect(
      response.headers
        .getSetCookie()
        .every((c) => c.includes("Expires=Thu, 01 Jan 1970")),
    ).toBe(true);
  });
});
