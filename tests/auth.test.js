import request from "supertest";
import app from "../src/app.js";
import config from "../src/config/index.js";
import logger from "../src/utils/logger.js";

describe("Auth routes", () => {
  it("keeps logger silent in test environment", () => {
    expect(logger.silent).toBe(true);
  });

  describe("GET /health", () => {
    it("returns deployment health details without authentication", async () => {
      const response = await request(app).get("/health");

      expect(response.body.success).toBe(true);
      expect(response.body.data.server.status).toBe("running");
      expect(typeof response.body.data.server.uptimeSeconds).toBe("number");
      expect(response.body.data.database).toEqual(
        expect.objectContaining({
          status: expect.any(String),
          readyState: expect.any(Number),
        })
      );
      expect(response.body.data.redis).toEqual(
        expect.objectContaining({
          status: expect.any(String),
          available: expect.any(Boolean),
          degradedMode: config.redisDegradedMode,
        })
      );

      if (response.body.data.database.readyState !== 1) {
        expect(response.status).toBe(503);
        expect(response.body.data.status).toBe("unhealthy");
        return;
      }

      if (!response.body.data.redis.available && config.redisDegradedMode) {
        expect(response.status).toBe(200);
        expect(response.body.data.status).toBe("degraded");
        return;
      }

      if (!response.body.data.redis.available && !config.redisDegradedMode) {
        expect(response.status).toBe(503);
        expect(response.body.data.status).toBe("unhealthy");
        return;
      }

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe("healthy");
    });

    it("bypasses global rate limiting for deployment probes", async () => {
      const probeRequests = Array.from({ length: 105 }, () => request(app).get("/health"));
      const responses = await Promise.all(probeRequests);
      const hasRateLimitedResponse = responses.some((response) => response.status === 429);

      expect(hasRateLimitedResponse).toBe(false);
    });
  });

  describe("POST /auth/register", () => {
    it("registers a user successfully", async () => {
      const response = await request(app).post("/auth/register").send({
        name: "  Alice  ",
        email: "  ALICE@EXAMPLE.COM  ",
        password: "Passw0rd!",
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("User registered successfully");
      expect(response.body.data.user.name).toBe("Alice");
      expect(response.body.data.user.email).toBe("alice@example.com");
      expect(response.body.data.user.role).toBe("Viewer");
      expect(response.body.data.user.password).toBeUndefined();
    });

    it("returns 409 for duplicate email", async () => {
      await request(app).post("/auth/register").send({
        name: "Alice",
        email: "alice@example.com",
        password: "Passw0rd!",
      });

      const response = await request(app).post("/auth/register").send({
        name: "Alice Two",
        email: "ALICE@EXAMPLE.COM",
        password: "Passw0rd!",
      });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Email already registered");
    });

    it("returns 400 for invalid payload", async () => {
      const response = await request(app).post("/auth/register").send({
        name: "Alice",
        email: "alice@example.com",
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("password is required");
    });
  });

  describe("POST /auth/login", () => {
    it("logs in successfully with valid credentials", async () => {
      await request(app).post("/auth/register").send({
        name: "Bob",
        email: "bob@example.com",
        password: "Passw0rd!",
      });

      const response = await request(app).post("/auth/login").send({
        email: "bob@example.com",
        password: "Passw0rd!",
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Login successful");
      expect(typeof response.body.data.token).toBe("string");
      expect(response.body.data.user.email).toBe("bob@example.com");
    });

    it("returns 401 for invalid credentials", async () => {
      await request(app).post("/auth/register").send({
        name: "Charlie",
        email: "charlie@example.com",
        password: "Passw0rd!",
      });

      const response = await request(app).post("/auth/login").send({
        email: "charlie@example.com",
        password: "WrongPassword",
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe("Invalid email or password");
    });

    it("returns 400 for missing fields", async () => {
      const response = await request(app).post("/auth/login").send({
        password: "Passw0rd!",
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("email is required");
    });
  });
});
