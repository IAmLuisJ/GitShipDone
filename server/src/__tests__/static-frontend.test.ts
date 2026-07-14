import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import request from "supertest";
import express from "express";
import fs from "fs";
import os from "os";
import path from "path";

import { serveFrontend } from "../middleware/staticFrontend";
import { errorHandler, AppError } from "../middleware/errorHandler";

describe("serveFrontend", () => {
  let staticDir: string;
  let app: express.Express;

  beforeAll(() => {
    staticDir = fs.mkdtempSync(path.join(os.tmpdir(), "gsd-static-"));
    fs.writeFileSync(
      path.join(staticDir, "index.html"),
      "<!doctype html><title>GitShipDone</title>",
    );
    fs.mkdirSync(path.join(staticDir, "assets"));
    fs.writeFileSync(
      path.join(staticDir, "assets", "app.js"),
      "console.log('ok');",
    );

    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("STATIC_DIR", staticDir);

    app = express();
    app.get("/api/health", (_req, res) => {
      res.json({ status: "ok" });
    });
    serveFrontend(app);
    app.use((_req, _res, next) => next(new AppError("Not found", 404)));
    app.use(errorHandler);
  });

  afterAll(() => {
    vi.unstubAllEnvs();
    fs.rmSync(staticDir, { recursive: true, force: true });
  });

  it("serves static assets with their real MIME type", async () => {
    const res = await request(app).get("/assets/app.js");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("javascript");
  });

  it("falls back to index.html for client-side routes", async () => {
    const res = await request(app).get("/dashboard");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/html");
    expect(res.text).toContain("GitShipDone");
  });

  it("404s missing assets instead of serving HTML", async () => {
    const res = await request(app).get("/assets/index-stalehash.js");

    expect(res.status).toBe(404);
    expect(res.headers["content-type"]).not.toContain("text/html");
  });

  it("leaves API routes untouched", async () => {
    const res = await request(app).get("/api/health");

    expect(res.body).toEqual({ status: "ok" });
  });
});
