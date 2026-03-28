import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { apiEndpointCatalog, buildOpenApiSpec } from "../../src/docs/openapi.js";

describe("openapi quality", () => {
  it("documents every endpoint with test reference and concrete schemas", () => {
    const spec = buildOpenApiSpec() as {
      paths: Record<string, Record<string, {
        requestBody?: {
          content?: {
            [contentType: string]: {
              schema?: unknown;
            };
          };
        };
        responses?: Record<string, {
          content?: {
            [contentType: string]: {
              schema?: unknown;
            };
          };
        }>;
      }>>;
    };

    for (const endpoint of apiEndpointCatalog) {
      const op = spec.paths[endpoint.path]?.[endpoint.method];
      expect(op, `${endpoint.method.toUpperCase()} ${endpoint.path} missing from spec`).toBeDefined();

      const hasSuccessSchema = Object.entries(op?.responses ?? {}).some(([status, response]) => (
        status.startsWith("2") && Boolean(response.content?.["application/json"]?.schema)
      ));
      expect(hasSuccessSchema, `${endpoint.method.toUpperCase()} ${endpoint.path} must have 2xx JSON schema`).toBe(true);

      const hasErrorSchema = Object.entries(op?.responses ?? {}).some(([status, response]) => (
        !status.startsWith("2") && Boolean(response.content?.["application/json"]?.schema)
      ));
      expect(hasErrorSchema, `${endpoint.method.toUpperCase()} ${endpoint.path} must have non-2xx JSON schema`).toBe(true);

      if (endpoint.method === "post" || endpoint.method === "patch") {
        const hasRequestSchema = Boolean(op?.requestBody?.content?.["application/json"]?.schema);
        expect(hasRequestSchema, `${endpoint.method.toUpperCase()} ${endpoint.path} must have request JSON schema`).toBe(true);
      }

      const testFile = resolve(process.cwd(), endpoint.testSuite);
      expect(existsSync(testFile), `missing test suite file: ${endpoint.testSuite}`).toBe(true);
    }
  });
});
