import request from "supertest";
import app from "../src/app.js";
import { createTestRecord } from "./helpers/dbHelper.js";
import { createUserWithAuth } from "./helpers/authHelper.js";

const buildIdempotencyKey = () => {
  return `rbac-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

describe("RBAC matrix", () => {
  it("rejects unknown query params on stats endpoints", async () => {
    const viewer = await createUserWithAuth({ role: "Viewer" });

    const response = await request(app)
      .get("/stats/summary?unexpected=1")
      .set("Authorization", viewer.authHeader);

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain("is not allowed");
  });

  it("denies Viewer for create, update, and delete", async () => {
    const viewer = await createUserWithAuth({ role: "Viewer" });
    const analyst = await createUserWithAuth({ role: "Analyst" });
    const existingRecord = await createTestRecord({
      createdBy: analyst.user._id,
      amount: 10,
    });

    const createResponse = await request(app)
      .post("/records")
      .set("Authorization", viewer.authHeader)
      .set("Idempotency-Key", buildIdempotencyKey())
      .send({
        amount: 1,
        type: "expense",
      });

    const updateResponse = await request(app)
      .put(`/records/${existingRecord._id}`)
      .set("Authorization", viewer.authHeader)
      .send({
        amount: 20,
      });

    const deleteResponse = await request(app)
      .delete(`/records/${existingRecord._id}`)
      .set("Authorization", viewer.authHeader);

    expect(createResponse.status).toBe(403);
    expect(updateResponse.status).toBe(403);
    expect(deleteResponse.status).toBe(403);
  });

  it("allows Analyst to create and update own record, but denies delete", async () => {
    const analyst = await createUserWithAuth({ role: "Analyst" });

    const createResponse = await request(app)
      .post("/records")
      .set("Authorization", analyst.authHeader)
      .set("Idempotency-Key", buildIdempotencyKey())
      .send({
        amount: 30,
        type: "expense",
        category: "Food",
      });

    const ownRecordId = createResponse.body.data.record.id;

    const updateResponse = await request(app)
      .put(`/records/${ownRecordId}`)
      .set("Authorization", analyst.authHeader)
      .send({
        amount: 45,
      });

    const deleteResponse = await request(app)
      .delete(`/records/${ownRecordId}`)
      .set("Authorization", analyst.authHeader);

    expect(createResponse.status).toBe(201);
    expect(updateResponse.status).toBe(200);
    expect(deleteResponse.status).toBe(403);
  });

  it("denies Analyst when updating another analyst record", async () => {
    const analystA = await createUserWithAuth({ role: "Analyst" });
    const analystB = await createUserWithAuth({ role: "Analyst" });
    const analystARecord = await createTestRecord({
      createdBy: analystA.user._id,
      amount: 50,
    });

    const response = await request(app)
      .put(`/records/${analystARecord._id}`)
      .set("Authorization", analystB.authHeader)
      .send({
        amount: 51,
      });

    expect(response.status).toBe(403);
    expect(response.body.error).toBe("Insufficient permissions");
  });

  it("allows Admin to create, update, and delete across users", async () => {
    const admin = await createUserWithAuth({ role: "Admin" });
    const analyst = await createUserWithAuth({ role: "Analyst" });
    const analystRecord = await createTestRecord({
      createdBy: analyst.user._id,
      amount: 70,
    });

    const createResponse = await request(app)
      .post("/records")
      .set("Authorization", admin.authHeader)
      .set("Idempotency-Key", buildIdempotencyKey())
      .send({
        amount: 80,
        type: "income",
        category: "Salary",
      });

    const updateResponse = await request(app)
      .put(`/records/${analystRecord._id}`)
      .set("Authorization", admin.authHeader)
      .send({
        amount: 95,
      });

    const deleteResponse = await request(app)
      .delete(`/records/${analystRecord._id}`)
      .set("Authorization", admin.authHeader);

    expect(createResponse.status).toBe(201);
    expect(updateResponse.status).toBe(200);
    expect(deleteResponse.status).toBe(200);
  });
});
