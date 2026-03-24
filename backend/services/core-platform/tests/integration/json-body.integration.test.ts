import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";

describe("JSON body parsing", () => {
  it("returns unified error shape for invalid JSON on API routes", async () => {
    const app = await createApp();
    const res = await request(app)
      .post("/api/v1/jobs")
      .set("Content-Type", "application/json")
      .send("{ not valid json");

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: {
        code: "INVALID_JSON",
        message: "Request body is not valid JSON.",
      },
    });
  });
});
