import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../app";

// Mock the DB module
vi.mock("../db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock the email service
vi.mock("../services/email", () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}));

import { db } from "../db";
import { sendPasswordResetEmail } from "../services/email";

const mockSelect = vi.mocked(db.select);
const mockInsert = vi.mocked(db.insert);
const mockSendPasswordResetEmail = vi.mocked(sendPasswordResetEmail);

function setupSelectMock(rows: unknown[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(rows),
  };
  mockSelect.mockReturnValue(chain as any);
  return chain;
}

function setupInsertMock() {
  const chain = {
    values: vi.fn().mockResolvedValue(undefined),
    returning: vi.fn().mockResolvedValue([]),
  };
  mockInsert.mockReturnValue(chain as any);
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/auth/forgot-password", () => {
  it("returns 200 with generic message for valid email that exists", async () => {
    setupSelectMock([
      { id: "user-id-123", deletedAt: null },
    ]);
    setupInsertMock();

    const res = await request(app).post("/api/auth/forgot-password").send({
      email: "test@example.com",
    });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe(
      "If that email exists, a reset link has been sent.",
    );
  });

  it("returns 200 with same message for non-existent email", async () => {
    setupSelectMock([]);

    const res = await request(app).post("/api/auth/forgot-password").send({
      email: "unknown@example.com",
    });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe(
      "If that email exists, a reset link has been sent.",
    );
  });

  it("returns 200 for invalid email format (no enumeration)", async () => {
    const res = await request(app).post("/api/auth/forgot-password").send({
      email: "not-an-email",
    });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe(
      "If that email exists, a reset link has been sent.",
    );
  });

  it("returns 200 for empty body", async () => {
    const res = await request(app).post("/api/auth/forgot-password").send({});

    expect(res.status).toBe(200);
    expect(res.body.message).toBe(
      "If that email exists, a reset link has been sent.",
    );
  });

  it("sends reset email when user exists", async () => {
    setupSelectMock([
      { id: "user-id-123", deletedAt: null },
    ]);
    setupInsertMock();

    await request(app).post("/api/auth/forgot-password").send({
      email: "test@example.com",
    });

    expect(mockSendPasswordResetEmail).toHaveBeenCalledTimes(1);
    expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(
      "test@example.com",
      expect.any(String),
    );
    // Token should be 64 hex chars (32 bytes)
    const token = mockSendPasswordResetEmail.mock.calls[0][1];
    expect(token).toMatch(/^[a-f0-9]{64}$/);
  });

  it("does not send email when user does not exist", async () => {
    setupSelectMock([]);

    await request(app).post("/api/auth/forgot-password").send({
      email: "unknown@example.com",
    });

    expect(mockSendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("does not send email for soft-deleted user", async () => {
    setupSelectMock([
      { id: "user-id-123", deletedAt: new Date() },
    ]);

    await request(app).post("/api/auth/forgot-password").send({
      email: "deleted@example.com",
    });

    expect(mockSendPasswordResetEmail).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("stores hashed token in DB when user exists", async () => {
    setupSelectMock([
      { id: "user-id-123", deletedAt: null },
    ]);
    const insertChain = setupInsertMock();

    await request(app).post("/api/auth/forgot-password").send({
      email: "test@example.com",
    });

    expect(mockInsert).toHaveBeenCalled();
    expect(insertChain.values).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-id-123",
        tokenHash: expect.any(String),
        expiresAt: expect.any(Date),
      }),
    );

    // Verify expiry is approximately 1 hour from now
    const expiresAt = insertChain.values.mock.calls[0][0].expiresAt as Date;
    const diffMs = expiresAt.getTime() - Date.now();
    expect(diffMs).toBeGreaterThan(59 * 60 * 1000);
    expect(diffMs).toBeLessThanOrEqual(60 * 60 * 1000);
  });

  it("returns 200 even if email service fails", async () => {
    setupSelectMock([
      { id: "user-id-123", deletedAt: null },
    ]);
    setupInsertMock();
    mockSendPasswordResetEmail.mockRejectedValueOnce(
      new Error("Resend API error"),
    );

    const res = await request(app).post("/api/auth/forgot-password").send({
      email: "test@example.com",
    });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe(
      "If that email exists, a reset link has been sent.",
    );
  });
});
