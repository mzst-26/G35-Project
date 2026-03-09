import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";

describe("identity auth routes", () => {
  it("returns not implemented for login", async () => {
    const app = createApp();
    const response = await request(app).post("/api/auth/login").send({ email: "a@b.com" });

    expect(response.status).toBe(501);
  });
});
