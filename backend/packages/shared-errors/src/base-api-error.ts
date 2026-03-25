// Base error class for all API errors in the platform.
//
// Rules:
//  - All domain errors extend BaseApiError, never raw Error.
//  - toJSON() is the only shape that must ever reach a client — no stack, no cause.
//  - statusCode is HTTP status; code is a machine-readable string for clients.

export class BaseApiError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly cause?: unknown;

  constructor(code: string, message: string, statusCode: number, cause?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.cause = cause;
    // Restore prototype chain broken by TypeScript Error subclassing.
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toJSON(): { code: string; message: string } {
    return { code: this.code, message: this.message };
  }
}
