import listEndpoints from "express-list-endpoints";
import { createApp } from "../app.js";
import { apiEndpointCatalog, buildOpenApiSpec } from "./openapi.js";

function ensureValidationEnv(): void {
  const defaults: Record<string, string> = {
    CORE_PLATFORM_ENV: "local",
    NODE_ENV: "test",
    PORT: "3001",
    LOG_LEVEL: "silent",
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "x".repeat(32),
    IDENTITY_INTERNAL_URL: "http://identity:4001",
    INTERNAL_SECRET: "y".repeat(32),
    CORS_ORIGINS: "http://localhost:3000",
    SKIP_BACKGROUND_WORKERS: "true",
    RATE_LIMIT_WINDOW_MS: "60000",
    RATE_LIMIT_MAX_READ: "100",
    RATE_LIMIT_MAX_WRITE: "20",
    RATE_LIMIT_MAX_ADMIN: "10",
    RATE_LIMIT_MAX_AUTH_BURST: "50",
    CHANGE_FEE_WINDOW_HOURS: "48",
    TRUST_PROXY_HOPS: "0",
  };

  for (const [key, value] of Object.entries(defaults)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function normalizeDocumentedPath(path: string): string {
  return path.replace(/\{([^}]+)\}/g, ":$1");
}

function keyFor(method: string, path: string): string {
  return `${method.toUpperCase()} ${path}`;
}

async function main(): Promise<void> {
  ensureValidationEnv();

  const { app } = await createApp({ startWorkers: false });

  const runtimeKeys = new Set<string>();
  const endpoints = listEndpoints(app as never);

  for (const endpoint of endpoints) {
    const includePath = endpoint.path.startsWith("/api/v1/") || endpoint.path.startsWith("/health");
    if (!includePath) {
      continue;
    }

    for (const method of endpoint.methods) {
      if (method === "HEAD" || method === "OPTIONS") {
        continue;
      }
      runtimeKeys.add(keyFor(method, endpoint.path));
    }
  }

  const documentedKeys = new Set<string>();
  for (const endpoint of apiEndpointCatalog) {
    documentedKeys.add(keyFor(endpoint.method, normalizeDocumentedPath(endpoint.path)));
  }

  const undocumentedRuntime = [...runtimeKeys].filter((key) => !documentedKeys.has(key));
  const missingRuntime = [...documentedKeys].filter((key) => !runtimeKeys.has(key));

  const metadataErrors = apiEndpointCatalog
    .filter((endpoint) => !endpoint.summary || !endpoint.description || !endpoint.testSuite)
    .map((endpoint) => keyFor(endpoint.method, normalizeDocumentedPath(endpoint.path)));

  const spec = buildOpenApiSpec() as {
    paths: Record<string, Record<string, {
      summary?: string;
      description?: string;
      requestBody?: {
        content?: {
          [contentType: string]: {
            schema?: unknown;
          };
        };
      };
      responses?: Record<string, {
        description?: string;
        content?: {
          [contentType: string]: {
            schema?: unknown;
          };
        };
      }>;
    }>>;
  };

  const operationErrors: string[] = [];
  for (const endpoint of apiEndpointCatalog) {
    const operation = spec.paths[endpoint.path]?.[endpoint.method];
    const key = keyFor(endpoint.method, normalizeDocumentedPath(endpoint.path));
    if (!operation) {
      operationErrors.push(`${key}: missing operation in generated spec`);
      continue;
    }

    if (!operation.summary || !operation.description) {
      operationErrors.push(`${key}: summary/description missing in generated operation`);
    }

    const hasSuccessSchema = Object.entries(operation.responses ?? {}).some(([status, response]) => {
      if (!status.startsWith("2")) {
        return false;
      }
      return Boolean(response.content?.["application/json"]?.schema);
    });
    if (!hasSuccessSchema) {
      operationErrors.push(`${key}: missing JSON schema for 2xx response`);
    }

    const hasErrorSchema = Object.entries(operation.responses ?? {}).some(([status, response]) => {
      if (status.startsWith("2")) {
        return false;
      }
      return Boolean(response.content?.["application/json"]?.schema);
    });
    if (!hasErrorSchema) {
      operationErrors.push(`${key}: missing JSON schema for non-2xx response`);
    }

    if ((endpoint.method === "post" || endpoint.method === "patch") && endpoint.path !== "/health") {
      const hasRequestSchema = Boolean(operation.requestBody?.content?.["application/json"]?.schema);
      if (!hasRequestSchema) {
        operationErrors.push(`${key}: missing JSON request schema`);
      }
    }
  }

  if (
    undocumentedRuntime.length === 0
    && missingRuntime.length === 0
    && metadataErrors.length === 0
    && operationErrors.length === 0
  ) {
    console.log("OpenAPI validation passed.");
    return;
  }

  if (undocumentedRuntime.length > 0) {
    console.error("Undocumented runtime endpoints:");
    for (const endpoint of undocumentedRuntime) {
      console.error(`- ${endpoint}`);
    }
  }

  if (missingRuntime.length > 0) {
    console.error("Documented endpoints not found at runtime:");
    for (const endpoint of missingRuntime) {
      console.error(`- ${endpoint}`);
    }
  }

  if (metadataErrors.length > 0) {
    console.error("Endpoints missing summary/description/testSuite metadata:");
    for (const endpoint of metadataErrors) {
      console.error(`- ${endpoint}`);
    }
  }

  if (operationErrors.length > 0) {
    console.error("Generated operation quality issues:");
    for (const endpoint of operationErrors) {
      console.error(`- ${endpoint}`);
    }
  }

  process.exit(1);
}

void main();
