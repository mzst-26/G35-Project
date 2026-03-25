import { describe, it, expect } from "vitest";
import {
  BaseApiError,
  ValidationError,
  InvalidStatusTransitionError,
  StaleVersionError,
  ServiceUnavailableError,
  NotFoundError,
  ForbiddenError,
  UnauthorisedError,
  InternalError,
} from "../src/index.js";

class ConcreteError extends BaseApiError {
  constructor() {
    super("TEST_CODE", "Test message.", 400, new Error("the cause"));
  }
}

describe("BaseApiError", () => {
  it("sets code, message, statusCode from constructor", () => {
    const err = new ConcreteError();
    expect(err.code).toBe("TEST_CODE");
    expect(err.message).toBe("Test message.");
    expect(err.statusCode).toBe(400);
  });

  it("preserves cause for internal context", () => {
    const err = new ConcreteError();
    expect(err.cause).toBeInstanceOf(Error);
    expect((err.cause as Error).message).toBe("the cause");
  });

  it("toJSON never exposes cause or stack", () => {
    const err = new ConcreteError();
    const json = err.toJSON();
    expect(json).toStrictEqual({ code: "TEST_CODE", message: "Test message." });
    expect(Object.keys(json)).not.toContain("cause");
    expect(Object.keys(json)).not.toContain("stack");
  });

  it("instanceof BaseApiError is true", () => {
    const err = new ConcreteError();
    expect(err).toBeInstanceOf(BaseApiError);
    expect(err).toBeInstanceOf(Error);
  });

  it("name is set to the constructor name", () => {
    const err = new ConcreteError();
    expect(err.name).toBe("ConcreteError");
  });
});

describe("ValidationError", () => {
  it("statusCode is 400 and code is VALIDATION_ERROR", () => {
    const err = new ValidationError();
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe("VALIDATION_ERROR");
  });

  it("toJSON includes field-level issues", () => {
    const err = new ValidationError("Validation failed.", [
      { field: "email", message: "Invalid email." },
      { field: "phone", message: "Invalid phone." },
    ]);
    const json = err.toJSON();
    expect(json.issues).toHaveLength(2);
    expect(json.issues[0]).toEqual({ field: "email", message: "Invalid email." });
  });

  it("defaults to empty issues array", () => {
    const err = new ValidationError();
    expect(err.issues).toEqual([]);
    expect(err.toJSON().issues).toEqual([]);
  });

  it("toJSON does not expose cause or stack even with issues", () => {
    const err = new ValidationError("fail", [{ field: "x", message: "y" }]);
    const json = err.toJSON();
    expect(Object.keys(json)).not.toContain("cause");
    expect(Object.keys(json)).not.toContain("stack");
  });
});

describe("InvalidStatusTransitionError", () => {
  it("formats message with from and to status", () => {
    const err = new InvalidStatusTransitionError("draft", "completed");
    expect(err.message).toContain("draft");
    expect(err.message).toContain("completed");
    expect(err.statusCode).toBe(422);
    expect(err.code).toBe("INVALID_STATUS_TRANSITION");
  });

  it("exposes from and to properties", () => {
    const err = new InvalidStatusTransitionError("open", "cancelled");
    expect(err.from).toBe("open");
    expect(err.to).toBe("cancelled");
  });
});

describe("StaleVersionError", () => {
  it("has statusCode 409 and STALE_VERSION code", () => {
    const err = new StaleVersionError();
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe("STALE_VERSION");
  });
});

describe("Error subclasses — HTTP codes", () => {
  const cases: [new (...args: never[]) => BaseApiError, number, string][] = [
    [UnauthorisedError, 401, "UNAUTHORISED"],
    [ForbiddenError, 403, "FORBIDDEN"],
    [NotFoundError, 404, "NOT_FOUND"],
    [InternalError, 500, "INTERNAL_ERROR"],
    [ServiceUnavailableError, 503, "SERVICE_UNAVAILABLE"],
  ];

  for (const [Ctor, status, code] of cases) {
    it(`${Ctor.name} has statusCode ${status} and code ${code}`, () => {
      const err = new (Ctor as new () => BaseApiError)();
      expect(err.statusCode).toBe(status);
      expect(err.code).toBe(code);
    });
  }
});
