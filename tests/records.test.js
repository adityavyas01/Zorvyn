import request from "supertest";
import mongoose from "mongoose";
import { jest } from "@jest/globals";
import app from "../src/app.js";
import FinancialRecord from "../src/models/FinancialRecord.js";
import { createTestRecord } from "./helpers/dbHelper.js";
import { createUserWithAuth } from "./helpers/authHelper.js";

const buildIdempotencyKey = () => {
  return `key-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const validRecordPayload = {
  amount: 120,
  type: "expense",
  category: "Utilities",
  note: "Electricity bill",
};

describe("Financial records routes", () => {
  it("creates a record successfully for Analyst", async () => {
    const analyst = await createUserWithAuth({ role: "Analyst" });

    const response = await request(app)
      .post("/records")
      .set("Authorization", analyst.authHeader)
      .set("Idempotency-Key", buildIdempotencyKey())
      .send(validRecordPayload);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.record.createdBy).toBe(analyst.user._id.toString());
    expect(response.body.data.record.type).toBe("expense");
  });

  it("returns 401 when token is missing", async () => {
    const response = await request(app)
      .post("/records")
      .set("Idempotency-Key", buildIdempotencyKey())
      .send(validRecordPayload);

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe("Missing token");
  });

  it("returns 403 when Viewer tries to create a record", async () => {
    const viewer = await createUserWithAuth({ role: "Viewer" });

    const response = await request(app)
      .post("/records")
      .set("Authorization", viewer.authHeader)
      .set("Idempotency-Key", buildIdempotencyKey())
      .send(validRecordPayload);

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe("Insufficient permissions");
  });

  it("returns 400 for invalid create payload", async () => {
    const analyst = await createUserWithAuth({ role: "Analyst" });

    const response = await request(app)
      .post("/records")
      .set("Authorization", analyst.authHeader)
      .set("Idempotency-Key", buildIdempotencyKey())
      .send({
        amount: -1,
        type: "expense",
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain("amount must be a positive number");
  });

  it("replays same idempotency request and blocks conflicting payload", async () => {
    const analyst = await createUserWithAuth({ role: "Analyst" });
    const idempotencyKey = buildIdempotencyKey();
    const payload = {
      amount: 99,
      type: "expense",
      category: "Idempotent",
      note: "one-time",
    };

    const firstResponse = await request(app)
      .post("/records")
      .set("Authorization", analyst.authHeader)
      .set("Idempotency-Key", idempotencyKey)
      .send(payload);

    const replayResponse = await request(app)
      .post("/records")
      .set("Authorization", analyst.authHeader)
      .set("Idempotency-Key", idempotencyKey)
      .send(payload);

    const conflictResponse = await request(app)
      .post("/records")
      .set("Authorization", analyst.authHeader)
      .set("Idempotency-Key", idempotencyKey)
      .send({
        ...payload,
        amount: 100,
      });

    const matchingRecordCount = await FinancialRecord.countDocuments({
      createdBy: new mongoose.Types.ObjectId(analyst.user._id),
      note: "one-time",
      deleted: false,
    });

    expect(firstResponse.status).toBe(201);
    expect(replayResponse.status).toBe(201);
    expect(replayResponse.headers["idempotency-replayed"]).toBe("true");
    expect(replayResponse.body.data.record.id).toBe(firstResponse.body.data.record.id);
    expect(conflictResponse.status).toBe(409);
    expect(matchingRecordCount).toBe(1);
  });

  it("lists records with pagination shape", async () => {
    const analyst = await createUserWithAuth({ role: "Analyst" });

    await createTestRecord({
      createdBy: analyst.user._id,
      amount: 20,
      note: "first",
    });
    await createTestRecord({
      createdBy: analyst.user._id,
      amount: 40,
      note: "second",
    });

    const response = await request(app)
      .get("/records?page=1&limit=20")
      .set("Authorization", analyst.authHeader);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(typeof response.body.data.total).toBe("number");
    expect(response.body.data.page).toBe(1);
    expect(response.body.data.limit).toBe(20);
    expect(Array.isArray(response.body.data.data)).toBe(true);
  });

  it("returns 400 for invalid pagination query and skips DB listing queries", async () => {
    const analyst = await createUserWithAuth({ role: "Analyst" });
    const findSpy = jest.spyOn(FinancialRecord, "find");
    const countDocumentsSpy = jest.spyOn(FinancialRecord, "countDocuments");

    const response = await request(app)
      .get("/records?page=0&limit=20")
      .set("Authorization", analyst.authHeader);

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain("page");
    expect(findSpy).not.toHaveBeenCalled();
    expect(countDocumentsSpy).not.toHaveBeenCalled();

    findSpy.mockRestore();
    countDocumentsSpy.mockRestore();
  });

  it("updates owner record successfully", async () => {
    const analyst = await createUserWithAuth({ role: "Analyst" });
    const record = await createTestRecord({
      createdBy: analyst.user._id,
      amount: 15,
    });

    const response = await request(app)
      .put(`/records/${record._id}`)
      .set("Authorization", analyst.authHeader)
      .send({
        amount: 250,
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Number.parseFloat(response.body.data.record.amount)).toBe(250);
  });

  it("returns 403 when non-owner Analyst updates another user record", async () => {
    const analystOne = await createUserWithAuth({ role: "Analyst" });
    const analystTwo = await createUserWithAuth({ role: "Analyst" });
    const record = await createTestRecord({
      createdBy: analystOne.user._id,
      amount: 75,
    });

    const response = await request(app)
      .put(`/records/${record._id}`)
      .set("Authorization", analystTwo.authHeader)
      .send({
        amount: 90,
      });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe("Insufficient permissions");
  });

  it("allows Admin to delete a record", async () => {
    const analyst = await createUserWithAuth({ role: "Analyst" });
    const admin = await createUserWithAuth({ role: "Admin" });
    const record = await createTestRecord({
      createdBy: analyst.user._id,
      amount: 60,
    });

    const response = await request(app)
      .delete(`/records/${record._id}`)
      .set("Authorization", admin.authHeader);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.record.deleted).toBe(true);
  });

  it("returns 403 when Analyst tries to delete", async () => {
    const analystOne = await createUserWithAuth({ role: "Analyst" });
    const analystTwo = await createUserWithAuth({ role: "Analyst" });
    const record = await createTestRecord({
      createdBy: analystOne.user._id,
      amount: 33,
    });

    const response = await request(app)
      .delete(`/records/${record._id}`)
      .set("Authorization", analystTwo.authHeader);

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe("Insufficient permissions");
  });

  it("returns 400 for invalid record id", async () => {
    const analyst = await createUserWithAuth({ role: "Analyst" });
    const findOneSpy = jest.spyOn(FinancialRecord, "findOne");

    const response = await request(app)
      .get("/records/not-a-valid-id")
      .set("Authorization", analyst.authHeader);

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe("Invalid record id");
    expect(findOneSpy).not.toHaveBeenCalled();

    findOneSpy.mockRestore();
  });

  it("returns 404 when non-owner viewer gets another user record", async () => {
    const analyst = await createUserWithAuth({ role: "Analyst" });
    const viewer = await createUserWithAuth({ role: "Viewer" });
    const record = await createTestRecord({
      createdBy: analyst.user._id,
      amount: 44,
    });

    const response = await request(app)
      .get(`/records/${record._id}`)
      .set("Authorization", viewer.authHeader);

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe("Financial record not found");
  });
});
