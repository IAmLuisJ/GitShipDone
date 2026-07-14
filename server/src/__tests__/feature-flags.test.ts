import { describe, it, expect, vi, afterEach } from "vitest";
import request from "supertest";

// Mock the DB module so importing app doesn't need a live database
vi.mock("../db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
  },
}));

import app from "../app";
import { isFeatureEnabled } from "../middleware/features";

describe("feature flags", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is enabled only when the env var is exactly 'true'", () => {
    vi.stubEnv("FEATURE_AI", "true");
    expect(isFeatureEnabled("ai")).toBe(true);

    vi.stubEnv("FEATURE_AI", "1");
    expect(isFeatureEnabled("ai")).toBe(false);

    vi.stubEnv("FEATURE_AI", "");
    expect(isFeatureEnabled("ai")).toBe(false);
  });

  it("404s AI routes when FEATURE_AI is off", async () => {
    vi.stubEnv("FEATURE_AI", "false");

    const res = await request(app)
      .post("/api/projects/project-uuid-1/ai/chat")
      .send({ message: "hi" });

    expect(res.status).toBe(404);
  });

  it("404s GitHub routes when FEATURE_GITHUB is off", async () => {
    vi.stubEnv("FEATURE_GITHUB", "false");

    const connect = await request(app)
      .post("/api/projects/project-uuid-1/github/connect")
      .send({});
    expect(connect.status).toBe(404);

    const repoOauth = await request(app).get("/api/auth/github/repo");
    expect(repoOauth.status).toBe(404);
  });

  it("404s OAuth login routes when FEATURE_OAUTH is off", async () => {
    vi.stubEnv("FEATURE_OAUTH", "false");

    const google = await request(app).get("/api/auth/google");
    expect(google.status).toBe(404);

    const github = await request(app).get("/api/auth/github");
    expect(github.status).toBe(404);
  });

  it("keeps core auth routes reachable regardless of flags", async () => {
    vi.stubEnv("FEATURE_OAUTH", "false");

    const res = await request(app).post("/api/auth/register").send({});
    // Validation error, not a 404 — the route is mounted
    expect(res.status).toBe(400);
  });
});
