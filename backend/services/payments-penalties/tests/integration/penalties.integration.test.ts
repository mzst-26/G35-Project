import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";

describe("penalties route", () => {
  it("returns not implemented for charge", async () => {
    const app = createApp();
    const response = await request(app).post("/api/penalties/charge").send({ amount: 50 });

    expect(response.status).toBe(501);
  });
});
