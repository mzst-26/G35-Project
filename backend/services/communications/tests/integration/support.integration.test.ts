import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";

describe("support route", () => {
  it("returns not implemented for ticket create", async () => {
    const app = createApp();
    const response = await request(app).post("/api/support/tickets").send({ title: "help" });

    expect(response.status).toBe(501);
  });
});
