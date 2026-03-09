import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";

describe("core jobs route", () => {
  it("returns not implemented for create job", async () => {
    const app = createApp();
    const response = await request(app).post("/api/jobs").send({ title: "test" });

    expect(response.status).toBe(501);
  });
});
