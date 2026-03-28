type HttpMethod = "get" | "post" | "patch" | "delete";

type JsonSchema = Record<string, unknown>;

type ParameterDoc = {
  name: string;
  in: "path" | "query";
  required: boolean;
  description: string;
  schema: JsonSchema;
};

type RequestBodyDoc = {
  description: string;
  required: boolean;
  schemaRef: string;
};

type ResponseDoc = {
  description: string;
  schemaRef?: string;
};

type EndpointDoc = {
  method: HttpMethod;
  path: string;
  operationId: string;
  summary: string;
  description: string;
  tags: string[];
  testSuite: string;
  requiresAuth: boolean;
  parameters?: ParameterDoc[];
  requestBody?: RequestBodyDoc;
  responses: Record<string, ResponseDoc>;
};

const defaultErrorResponses: Record<string, ResponseDoc> = {
  "400": { description: "Validation failed or request payload is malformed.", schemaRef: "#/components/schemas/ErrorEnvelope" },
  "401": { description: "Authentication required or token is invalid.", schemaRef: "#/components/schemas/ErrorEnvelope" },
  "403": { description: "Authenticated user is not allowed to perform this operation.", schemaRef: "#/components/schemas/ErrorEnvelope" },
  "404": { description: "Resource not found.", schemaRef: "#/components/schemas/ErrorEnvelope" },
  "409": { description: "Version conflict or invalid state transition.", schemaRef: "#/components/schemas/ErrorEnvelope" },
  "500": { description: "Unexpected server error.", schemaRef: "#/components/schemas/ErrorEnvelope" },
};

const uuidSchema: JsonSchema = {
  type: "string",
  format: "uuid",
};

const isoDateTimeSchema: JsonSchema = {
  type: "string",
  format: "date-time",
};

const isoDateSchema: JsonSchema = {
  type: "string",
  format: "date",
};

export const apiEndpointCatalog: EndpointDoc[] = [
  {
    method: "get",
    path: "/health/live",
    operationId: "getHealthLive",
    summary: "Liveness probe",
    description: "Checks whether the process is running.",
    tags: ["Health"],
    testSuite: "tests/unit/health.test.ts",
    requiresAuth: false,
    responses: {
      "200": { description: "Service process is live.", schemaRef: "#/components/schemas/LiveHealthResponse" },
      "500": { description: "Unexpected server error.", schemaRef: "#/components/schemas/ErrorEnvelope" },
    },
  },
  {
    method: "get",
    path: "/health/ready",
    operationId: "getHealthReady",
    summary: "Readiness probe",
    description: "Checks whether the service and database are ready to accept traffic.",
    tags: ["Health"],
    testSuite: "tests/unit/health.test.ts",
    requiresAuth: false,
    responses: {
      "200": { description: "Service is ready.", schemaRef: "#/components/schemas/ReadyHealthResponse" },
      "503": { description: "Service is degraded and not ready.", schemaRef: "#/components/schemas/ReadyHealthResponse" },
    },
  },
  {
    method: "get",
    path: "/health",
    operationId: "getHealthAlias",
    summary: "Readiness alias",
    description: "Backwards-compatible alias for the readiness endpoint.",
    tags: ["Health"],
    testSuite: "tests/unit/health.test.ts",
    requiresAuth: false,
    responses: {
      "200": { description: "Service is ready.", schemaRef: "#/components/schemas/ReadyHealthResponse" },
      "503": { description: "Service is degraded and not ready.", schemaRef: "#/components/schemas/ReadyHealthResponse" },
    },
  },
  {
    method: "get",
    path: "/api/v1/jobs",
    operationId: "listJobs",
    summary: "List jobs",
    description: "Returns jobs filtered by role, status, and assignment context.",
    tags: ["Jobs"],
    testSuite: "tests/integration/jobs.integration.test.ts",
    requiresAuth: true,
    parameters: [
      { name: "limit", in: "query", required: false, description: "Page size.", schema: { type: "integer", minimum: 1, maximum: 100 } },
      { name: "offset", in: "query", required: false, description: "Page offset.", schema: { type: "integer", minimum: 0 } },
      { name: "companyId", in: "query", required: false, description: "Filter by company.", schema: uuidSchema },
      {
        name: "status",
        in: "query",
        required: false,
        description: "Filter by job status.",
        schema: { type: "string", enum: ["draft", "open", "filled", "in_progress", "completed", "cancelled", "disputed", "resolved"] },
      },
    ],
    responses: {
      "200": { description: "Paginated jobs list.", schemaRef: "#/components/schemas/JobsListResponse" },
      ...defaultErrorResponses,
    },
  },
  {
    method: "post",
    path: "/api/v1/jobs",
    operationId: "createJob",
    summary: "Create job",
    description: "Creates a new job posting and records initial workflow state.",
    tags: ["Jobs"],
    testSuite: "tests/integration/jobs.integration.test.ts",
    requiresAuth: true,
    requestBody: {
      description: "Job creation payload.",
      required: true,
      schemaRef: "#/components/schemas/CreateJobRequest",
    },
    responses: {
      "201": { description: "Job created.", schemaRef: "#/components/schemas/JobSingleResponse" },
      ...defaultErrorResponses,
    },
  },
  {
    method: "get",
    path: "/api/v1/jobs/{id}",
    operationId: "getJob",
    summary: "Get job",
    description: "Returns details for a single job.",
    tags: ["Jobs"],
    testSuite: "tests/integration/jobs.integration.test.ts",
    requiresAuth: true,
    parameters: [
      { name: "id", in: "path", required: true, description: "Job identifier.", schema: uuidSchema },
    ],
    responses: {
      "200": { description: "Job details.", schemaRef: "#/components/schemas/JobSingleResponse" },
      ...defaultErrorResponses,
    },
  },
  {
    method: "patch",
    path: "/api/v1/jobs/{id}",
    operationId: "updateJob",
    summary: "Update job",
    description: "Updates editable fields for an existing job.",
    tags: ["Jobs"],
    testSuite: "tests/integration/jobs.integration.test.ts",
    requiresAuth: true,
    parameters: [
      { name: "id", in: "path", required: true, description: "Job identifier.", schema: uuidSchema },
    ],
    requestBody: {
      description: "Patch payload for a job.",
      required: true,
      schemaRef: "#/components/schemas/UpdateJobRequest",
    },
    responses: {
      "200": { description: "Updated job.", schemaRef: "#/components/schemas/JobSingleResponse" },
      ...defaultErrorResponses,
    },
  },
  {
    method: "post",
    path: "/api/v1/jobs/{id}/status",
    operationId: "transitionJobStatus",
    summary: "Transition job status",
    description: "Transitions a job through allowed lifecycle statuses.",
    tags: ["Jobs"],
    testSuite: "tests/integration/jobs.integration.test.ts",
    requiresAuth: true,
    parameters: [
      { name: "id", in: "path", required: true, description: "Job identifier.", schema: uuidSchema },
    ],
    requestBody: {
      description: "Status transition payload.",
      required: true,
      schemaRef: "#/components/schemas/TransitionJobStatusRequest",
    },
    responses: {
      "200": { description: "Updated job after transition.", schemaRef: "#/components/schemas/JobSingleResponse" },
      ...defaultErrorResponses,
    },
  },
  {
    method: "get",
    path: "/api/v1/calendar/{workerId}",
    operationId: "listWorkerAvailability",
    summary: "List worker availability",
    description: "Returns availability entries for a worker.",
    tags: ["Calendar"],
    testSuite: "tests/integration/jobs.integration.test.ts",
    requiresAuth: true,
    parameters: [
      { name: "workerId", in: "path", required: true, description: "Worker identifier.", schema: uuidSchema },
      { name: "from", in: "query", required: false, description: "Start date filter.", schema: isoDateSchema },
      { name: "to", in: "query", required: false, description: "End date filter.", schema: isoDateSchema },
    ],
    responses: {
      "200": { description: "Availability entries.", schemaRef: "#/components/schemas/AvailabilityListResponse" },
      ...defaultErrorResponses,
    },
  },
  {
    method: "post",
    path: "/api/v1/calendar/{workerId}/availability",
    operationId: "createWorkerAvailability",
    summary: "Create availability",
    description: "Adds a new worker availability window.",
    tags: ["Calendar"],
    testSuite: "tests/integration/jobs.integration.test.ts",
    requiresAuth: true,
    parameters: [
      { name: "workerId", in: "path", required: true, description: "Worker identifier.", schema: uuidSchema },
    ],
    requestBody: {
      description: "Availability creation payload.",
      required: true,
      schemaRef: "#/components/schemas/CreateAvailabilityRequest",
    },
    responses: {
      "201": { description: "Created availability.", schemaRef: "#/components/schemas/AvailabilitySingleResponse" },
      ...defaultErrorResponses,
    },
  },
  {
    method: "patch",
    path: "/api/v1/calendar/{workerId}/availability/{id}",
    operationId: "updateWorkerAvailability",
    summary: "Update availability",
    description: "Updates an existing worker availability entry.",
    tags: ["Calendar"],
    testSuite: "tests/integration/jobs.integration.test.ts",
    requiresAuth: true,
    parameters: [
      { name: "workerId", in: "path", required: true, description: "Worker identifier.", schema: uuidSchema },
      { name: "id", in: "path", required: true, description: "Availability identifier.", schema: uuidSchema },
    ],
    requestBody: {
      description: "Availability update payload.",
      required: true,
      schemaRef: "#/components/schemas/UpdateAvailabilityRequest",
    },
    responses: {
      "200": { description: "Updated availability.", schemaRef: "#/components/schemas/AvailabilitySingleResponse" },
      ...defaultErrorResponses,
    },
  },
  {
    method: "delete",
    path: "/api/v1/calendar/{workerId}/availability/{id}",
    operationId: "deleteWorkerAvailability",
    summary: "Delete availability",
    description: "Deletes an existing worker availability entry.",
    tags: ["Calendar"],
    testSuite: "tests/integration/jobs.integration.test.ts",
    requiresAuth: true,
    parameters: [
      { name: "workerId", in: "path", required: true, description: "Worker identifier.", schema: uuidSchema },
      { name: "id", in: "path", required: true, description: "Availability identifier.", schema: uuidSchema },
      { name: "version", in: "query", required: true, description: "Expected row version.", schema: { type: "integer", minimum: 1 } },
    ],
    responses: {
      "200": { description: "Deletion status.", schemaRef: "#/components/schemas/DeleteAvailabilityResponse" },
      ...defaultErrorResponses,
    },
  },
  {
    method: "get",
    path: "/api/v1/companies/{companyId}",
    operationId: "getCompany",
    summary: "Get company",
    description: "Returns company profile and operational state.",
    tags: ["Companies"],
    testSuite: "tests/integration/jobs.integration.test.ts",
    requiresAuth: true,
    parameters: [
      { name: "companyId", in: "path", required: true, description: "Company identifier.", schema: uuidSchema },
    ],
    responses: {
      "200": { description: "Company details.", schemaRef: "#/components/schemas/CompanySingleResponse" },
      ...defaultErrorResponses,
    },
  },
  {
    method: "patch",
    path: "/api/v1/companies/{companyId}",
    operationId: "updateCompany",
    summary: "Update company",
    description: "Updates editable company profile fields.",
    tags: ["Companies"],
    testSuite: "tests/integration/jobs.integration.test.ts",
    requiresAuth: true,
    parameters: [
      { name: "companyId", in: "path", required: true, description: "Company identifier.", schema: uuidSchema },
    ],
    requestBody: {
      description: "Company profile update payload.",
      required: true,
      schemaRef: "#/components/schemas/UpdateCompanyRequest",
    },
    responses: {
      "200": { description: "Updated company.", schemaRef: "#/components/schemas/CompanySingleResponse" },
      ...defaultErrorResponses,
    },
  },
  {
    method: "get",
    path: "/api/v1/workers/{workerId}",
    operationId: "getWorker",
    summary: "Get worker",
    description: "Returns worker profile and verification context.",
    tags: ["Workers"],
    testSuite: "tests/integration/jobs.integration.test.ts",
    requiresAuth: true,
    parameters: [
      { name: "workerId", in: "path", required: true, description: "Worker identifier.", schema: uuidSchema },
    ],
    responses: {
      "200": { description: "Worker details.", schemaRef: "#/components/schemas/WorkerSingleResponse" },
      ...defaultErrorResponses,
    },
  },
  {
    method: "patch",
    path: "/api/v1/workers/{workerId}",
    operationId: "updateWorker",
    summary: "Update worker",
    description: "Updates editable worker profile and compliance fields.",
    tags: ["Workers"],
    testSuite: "tests/integration/jobs.integration.test.ts",
    requiresAuth: true,
    parameters: [
      { name: "workerId", in: "path", required: true, description: "Worker identifier.", schema: uuidSchema },
    ],
    requestBody: {
      description: "Worker profile update payload.",
      required: true,
      schemaRef: "#/components/schemas/UpdateWorkerRequest",
    },
    responses: {
      "200": { description: "Updated worker.", schemaRef: "#/components/schemas/WorkerSingleResponse" },
      ...defaultErrorResponses,
    },
  },
  {
    method: "get",
    path: "/api/v1/admin/companies",
    operationId: "adminListCompanies",
    summary: "Admin list companies",
    description: "Returns companies for review and moderation actions.",
    tags: ["Admin"],
    testSuite: "tests/integration/jobs.integration.test.ts",
    requiresAuth: true,
    parameters: [
      { name: "status", in: "query", required: false, description: "Filter by company account status.", schema: { type: "string", enum: ["pending", "approved", "rejected", "suspended"] } },
      { name: "limit", in: "query", required: false, description: "Page size.", schema: { type: "integer", minimum: 1, maximum: 100 } },
      { name: "offset", in: "query", required: false, description: "Page offset.", schema: { type: "integer", minimum: 0 } },
    ],
    responses: {
      "200": { description: "Paginated companies list.", schemaRef: "#/components/schemas/CompaniesListResponse" },
      ...defaultErrorResponses,
    },
  },
  {
    method: "patch",
    path: "/api/v1/admin/companies/{companyId}/status",
    operationId: "adminUpdateCompanyStatus",
    summary: "Admin update company status",
    description: "Approves, rejects, or changes company lifecycle status.",
    tags: ["Admin"],
    testSuite: "tests/integration/jobs.integration.test.ts",
    requiresAuth: true,
    parameters: [
      { name: "companyId", in: "path", required: true, description: "Company identifier.", schema: uuidSchema },
    ],
    requestBody: {
      description: "Company status update payload.",
      required: true,
      schemaRef: "#/components/schemas/AdminCompanyStatusUpdateRequest",
    },
    responses: {
      "200": { description: "Updated company.", schemaRef: "#/components/schemas/CompanySingleResponse" },
      ...defaultErrorResponses,
    },
  },
  {
    method: "get",
    path: "/api/v1/admin/workers",
    operationId: "adminListWorkers",
    summary: "Admin list workers",
    description: "Returns workers for compliance review and moderation.",
    tags: ["Admin"],
    testSuite: "tests/integration/jobs.integration.test.ts",
    requiresAuth: true,
    parameters: [
      { name: "verifiedStatus", in: "query", required: false, description: "Filter by worker verification status.", schema: { type: "string", enum: ["pending", "verified", "rejected", "suspended"] } },
      { name: "limit", in: "query", required: false, description: "Page size.", schema: { type: "integer", minimum: 1, maximum: 100 } },
      { name: "offset", in: "query", required: false, description: "Page offset.", schema: { type: "integer", minimum: 0 } },
    ],
    responses: {
      "200": { description: "Paginated workers list.", schemaRef: "#/components/schemas/WorkersListResponse" },
      ...defaultErrorResponses,
    },
  },
  {
    method: "patch",
    path: "/api/v1/admin/workers/{workerId}/verification",
    operationId: "adminUpdateWorkerVerification",
    summary: "Admin update worker verification",
    description: "Updates worker verification outcomes and notes.",
    tags: ["Admin"],
    testSuite: "tests/integration/jobs.integration.test.ts",
    requiresAuth: true,
    parameters: [
      { name: "workerId", in: "path", required: true, description: "Worker identifier.", schema: uuidSchema },
    ],
    requestBody: {
      description: "Worker verification update payload.",
      required: true,
      schemaRef: "#/components/schemas/AdminWorkerVerificationUpdateRequest",
    },
    responses: {
      "200": { description: "Updated worker.", schemaRef: "#/components/schemas/WorkerSingleResponse" },
      ...defaultErrorResponses,
    },
  },
  {
    method: "post",
    path: "/api/v1/admin/outbox/relay",
    operationId: "adminRelayOutbox",
    summary: "Admin relay outbox",
    description: "Triggers outbox replay for operational recovery.",
    tags: ["Admin"],
    testSuite: "tests/integration/jobs.integration.test.ts",
    requiresAuth: true,
    requestBody: {
      description: "Outbox relay command.",
      required: true,
      schemaRef: "#/components/schemas/AdminRelayOutboxRequest",
    },
    responses: {
      "200": { description: "Outbox relay execution summary.", schemaRef: "#/components/schemas/AdminRelayOutboxResponse" },
      ...defaultErrorResponses,
    },
  },
  {
    method: "post",
    path: "/api/v1/admin/idempotency/cleanup",
    operationId: "adminCleanupIdempotency",
    summary: "Admin cleanup idempotency",
    description: "Deletes expired idempotency records for maintenance.",
    tags: ["Admin"],
    testSuite: "tests/integration/jobs.integration.test.ts",
    requiresAuth: true,
    requestBody: {
      description: "Idempotency cleanup command.",
      required: true,
      schemaRef: "#/components/schemas/AdminCleanupIdempotencyRequest",
    },
    responses: {
      "200": { description: "Cleanup execution summary.", schemaRef: "#/components/schemas/AdminCleanupIdempotencyResponse" },
      ...defaultErrorResponses,
    },
  },
];

function ensurePath(paths: Record<string, Record<string, unknown>>, path: string): Record<string, unknown> {
  if (!paths[path]) {
    paths[path] = {};
  }
  return paths[path];
}

export function buildOpenApiSpec() {
  const paths: Record<string, Record<string, unknown>> = {};

  for (const endpoint of apiEndpointCatalog) {
    const methodContainer = ensurePath(paths, endpoint.path);
    const responses: Record<string, unknown> = {};

    for (const [statusCode, response] of Object.entries(endpoint.responses)) {
      responses[statusCode] = {
        description: response.description,
        ...(response.schemaRef
          ? {
              content: {
                "application/json": {
                  schema: { $ref: response.schemaRef },
                },
              },
            }
          : {}),
      };
    }

    methodContainer[endpoint.method] = {
      operationId: endpoint.operationId,
      summary: endpoint.summary,
      description: endpoint.description,
      tags: endpoint.tags,
      security: endpoint.requiresAuth ? [{ bearerAuth: [] }] : [],
      ...(endpoint.parameters ? { parameters: endpoint.parameters } : {}),
      ...(endpoint.requestBody
        ? {
            requestBody: {
              description: endpoint.requestBody.description,
              required: endpoint.requestBody.required,
              content: {
                "application/json": {
                  schema: {
                    $ref: endpoint.requestBody.schemaRef,
                  },
                },
              },
            },
          }
        : {}),
      responses,
      "x-test-suite": endpoint.testSuite,
    };
  }

  return {
    openapi: "3.1.0",
    info: {
      title: "Core Platform Service API",
      version: "1.0.0",
      description: "Core platform endpoints for jobs, worker management, calendar, and admin workflows.",
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT ?? "3001"}`,
        description: "Local development",
      },
    ],
    tags: [
      { name: "Health", description: "Service liveness and readiness checks." },
      { name: "Jobs", description: "Job listing, creation, updates, and lifecycle transitions." },
      { name: "Calendar", description: "Worker availability management." },
      { name: "Companies", description: "Company profile and operations data." },
      { name: "Workers", description: "Worker profile and verification data." },
      { name: "Admin", description: "Admin review and operational maintenance actions." },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        ErrorEnvelope: {
          type: "object",
          properties: {
            error: {
              type: "object",
              properties: {
                code: { type: "string" },
                message: { type: "string" },
                issues: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      field: { type: "string" },
                      message: { type: "string" },
                    },
                  },
                },
              },
              required: ["code", "message"],
            },
          },
          required: ["error"],
        },
        MetaPagination: {
          type: "object",
          properties: {
            total: { type: "integer", minimum: 0 },
            limit: { type: "integer", minimum: 1 },
            offset: { type: "integer", minimum: 0 },
          },
          required: ["total", "limit", "offset"],
        },
        LiveHealthResponse: {
          type: "object",
          properties: {
            status: { type: "string", enum: ["ok"] },
            kind: { type: "string", enum: ["live"] },
            service: { type: "string", enum: ["core-platform"] },
            timestamp: isoDateTimeSchema,
          },
          required: ["status", "kind", "service", "timestamp"],
        },
        ReadyHealthResponse: {
          type: "object",
          properties: {
            status: { type: "string", enum: ["ok", "degraded"] },
            kind: { type: "string", enum: ["ready"] },
            service: { type: "string", enum: ["core-platform"] },
            timestamp: isoDateTimeSchema,
            checks: {
              type: "object",
              properties: {
                db: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                    latencyMs: { type: "number" },
                  },
                  required: ["ok"],
                },
              },
              required: ["db"],
            },
          },
          required: ["status", "kind", "service", "timestamp", "checks"],
        },
        Job: {
          type: "object",
          properties: {
            id: uuidSchema,
            companyId: uuidSchema,
            title: { type: "string" },
            description: { type: ["string", "null"] },
            startAt: isoDateTimeSchema,
            endAt: isoDateTimeSchema,
            salary: { type: "number" },
            currency: { type: "string", enum: ["GBP", "USD", "EUR"] },
            status: { type: "string", enum: ["draft", "open", "filled", "in_progress", "completed", "cancelled", "disputed", "resolved"] },
            assignedWorkerId: { anyOf: [uuidSchema, { type: "null" }] },
            version: { type: "integer", minimum: 1 },
            createdAt: isoDateTimeSchema,
            updatedAt: isoDateTimeSchema,
          },
          required: ["id", "companyId", "title", "startAt", "endAt", "salary", "currency", "status", "version", "createdAt", "updatedAt"],
        },
        JobSingleResponse: {
          type: "object",
          properties: {
            data: { $ref: "#/components/schemas/Job" },
          },
          required: ["data"],
        },
        JobsListResponse: {
          type: "object",
          properties: {
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/Job" },
            },
            meta: { $ref: "#/components/schemas/MetaPagination" },
          },
          required: ["data", "meta"],
        },
        CreateJobRequest: {
          type: "object",
          properties: {
            title: { type: "string", minLength: 3, maxLength: 100 },
            description: { type: "string", maxLength: 2000 },
            startAt: isoDateTimeSchema,
            endAt: isoDateTimeSchema,
            salary: { type: "number", exclusiveMinimum: 0 },
            currency: { type: "string", enum: ["GBP", "USD", "EUR"] },
            companyId: uuidSchema,
          },
          required: ["title", "startAt", "endAt", "salary", "currency", "companyId"],
        },
        UpdateJobRequest: {
          type: "object",
          properties: {
            title: { type: "string", minLength: 3, maxLength: 100 },
            description: { type: ["string", "null"], maxLength: 2000 },
            startAt: isoDateTimeSchema,
            endAt: isoDateTimeSchema,
            salary: { type: "number", exclusiveMinimum: 0 },
            currency: { type: "string", enum: ["GBP", "USD", "EUR"] },
            version: { type: "integer", minimum: 1 },
          },
          required: ["version"],
        },
        TransitionJobStatusRequest: {
          type: "object",
          properties: {
            status: { type: "string", enum: ["draft", "open", "filled", "in_progress", "completed", "cancelled", "disputed", "resolved"] },
            reason: { type: "string", maxLength: 500 },
            version: { type: "integer", minimum: 1 },
          },
          required: ["status", "version"],
        },
        Availability: {
          type: "object",
          properties: {
            id: uuidSchema,
            workerId: uuidSchema,
            date: isoDateSchema,
            startTime: { type: "string", pattern: "^\\\\d{2}:\\\\d{2}$" },
            endTime: { type: "string", pattern: "^\\\\d{2}:\\\\d{2}$" },
            recurring: { type: "boolean" },
            available: { type: "boolean" },
            locked: { type: "boolean" },
            version: { type: "integer", minimum: 1 },
            createdAt: isoDateTimeSchema,
            updatedAt: isoDateTimeSchema,
          },
          required: ["id", "workerId", "date", "startTime", "endTime", "recurring", "available", "locked", "version", "createdAt", "updatedAt"],
        },
        CreateAvailabilityRequest: {
          type: "object",
          properties: {
            date: isoDateSchema,
            startTime: { type: "string", pattern: "^\\\\d{2}:\\\\d{2}$" },
            endTime: { type: "string", pattern: "^\\\\d{2}:\\\\d{2}$" },
            recurring: { type: "boolean" },
          },
          required: ["date", "startTime", "endTime"],
        },
        UpdateAvailabilityRequest: {
          type: "object",
          properties: {
            date: isoDateSchema,
            startTime: { type: "string", pattern: "^\\\\d{2}:\\\\d{2}$" },
            endTime: { type: "string", pattern: "^\\\\d{2}:\\\\d{2}$" },
            recurring: { type: "boolean" },
            available: { type: "boolean" },
            version: { type: "integer", minimum: 1 },
          },
          required: ["version"],
        },
        AvailabilitySingleResponse: {
          type: "object",
          properties: {
            data: { $ref: "#/components/schemas/Availability" },
          },
          required: ["data"],
        },
        AvailabilityListResponse: {
          type: "object",
          properties: {
            data: { type: "array", items: { $ref: "#/components/schemas/Availability" } },
          },
          required: ["data"],
        },
        DeleteAvailabilityResponse: {
          type: "object",
          properties: {
            data: {
              type: "object",
              properties: {
                id: uuidSchema,
                deleted: { type: "boolean", enum: [true] },
              },
              required: ["id", "deleted"],
            },
          },
          required: ["data"],
        },
        Company: {
          type: "object",
          properties: {
            id: uuidSchema,
            userId: uuidSchema,
            companyName: { type: "string" },
            addressLine1: { type: ["string", "null"] },
            addressLine2: { type: ["string", "null"] },
            city: { type: ["string", "null"] },
            postcode: { type: ["string", "null"] },
            accountStatus: { type: "string", enum: ["pending", "approved", "rejected", "suspended"] },
            statusChangedAt: { anyOf: [isoDateTimeSchema, { type: "null" }] },
            statusChangedBy: { anyOf: [uuidSchema, { type: "null" }] },
            statusReason: { type: ["string", "null"] },
            bio: { type: ["string", "null"] },
            logoUrl: { type: ["string", "null"], format: "uri" },
            website: { type: ["string", "null"], format: "uri" },
          },
          required: ["id", "userId", "companyName", "accountStatus"],
        },
        CompanySingleResponse: {
          type: "object",
          properties: {
            data: { $ref: "#/components/schemas/Company" },
          },
          required: ["data"],
        },
        CompaniesListResponse: {
          type: "object",
          properties: {
            data: { type: "array", items: { $ref: "#/components/schemas/Company" } },
            meta: { $ref: "#/components/schemas/MetaPagination" },
          },
          required: ["data", "meta"],
        },
        UpdateCompanyRequest: {
          type: "object",
          properties: {
            companyName: { type: "string", minLength: 2, maxLength: 120 },
            addressLine1: { type: ["string", "null"], maxLength: 255 },
            addressLine2: { type: ["string", "null"], maxLength: 255 },
            city: { type: ["string", "null"], maxLength: 120 },
            postcode: { type: ["string", "null"], maxLength: 32 },
            bio: { type: ["string", "null"], maxLength: 2000 },
            logoUrl: { type: ["string", "null"], format: "uri" },
            website: { type: ["string", "null"], format: "uri" },
          },
        },
        Worker: {
          type: "object",
          properties: {
            id: uuidSchema,
            userId: uuidSchema,
            tradeId: { anyOf: [uuidSchema, { type: "null" }] },
            qualifications: { type: ["string", "null"] },
            verifiedStatus: { type: "string", enum: ["pending", "verified", "rejected", "suspended"] },
            addressLine1: { type: ["string", "null"] },
            addressLine2: { type: ["string", "null"] },
            city: { type: ["string", "null"] },
            locationLng: { type: ["number", "null"], minimum: -180, maximum: 180 },
            locationLat: { type: ["number", "null"], minimum: -90, maximum: 90 },
            bio: { type: ["string", "null"] },
            avatarUrl: { type: ["string", "null"], format: "uri" },
            hourlyRate: { type: ["number", "null"], minimum: 0 },
          },
          required: ["id", "userId", "verifiedStatus"],
        },
        WorkerSingleResponse: {
          type: "object",
          properties: {
            data: { $ref: "#/components/schemas/Worker" },
          },
          required: ["data"],
        },
        WorkersListResponse: {
          type: "object",
          properties: {
            data: { type: "array", items: { $ref: "#/components/schemas/Worker" } },
            meta: { $ref: "#/components/schemas/MetaPagination" },
          },
          required: ["data", "meta"],
        },
        UpdateWorkerRequest: {
          type: "object",
          properties: {
            qualifications: { type: ["string", "null"], maxLength: 2000 },
            addressLine1: { type: ["string", "null"], maxLength: 255 },
            addressLine2: { type: ["string", "null"], maxLength: 255 },
            city: { type: ["string", "null"], maxLength: 120 },
            locationLng: { type: ["number", "null"], minimum: -180, maximum: 180 },
            locationLat: { type: ["number", "null"], minimum: -90, maximum: 90 },
            bio: { type: ["string", "null"], maxLength: 2000 },
            avatarUrl: { type: ["string", "null"], format: "uri" },
            hourlyRate: { type: ["number", "null"], exclusiveMinimum: 0 },
            verifiedStatus: { type: "string", enum: ["pending", "verified", "rejected", "suspended"] },
          },
        },
        AdminCompanyStatusUpdateRequest: {
          type: "object",
          properties: {
            status: { type: "string", enum: ["pending", "approved", "rejected", "suspended"] },
            reason: { type: "string", maxLength: 500 },
          },
          required: ["status"],
        },
        AdminWorkerVerificationUpdateRequest: {
          type: "object",
          properties: {
            status: { type: "string", enum: ["pending", "verified", "rejected", "suspended"] },
            reason: { type: "string", maxLength: 500 },
          },
          required: ["status"],
        },
        AdminRelayOutboxRequest: {
          type: "object",
          properties: {
            limit: { type: "integer", minimum: 1, maximum: 500, default: 100 },
          },
        },
        AdminRelayOutboxResponse: {
          type: "object",
          properties: {
            data: {
              type: "object",
              properties: {
                processed: { type: "integer", minimum: 0 },
                delivered: { type: "integer", minimum: 0 },
                retried: { type: "integer", minimum: 0 },
                deadLettered: { type: "integer", minimum: 0 },
              },
              required: ["processed", "delivered", "retried", "deadLettered"],
            },
          },
          required: ["data"],
        },
        AdminCleanupIdempotencyRequest: {
          type: "object",
          properties: {
            limit: { type: "integer", minimum: 1, maximum: 1000, default: 500 },
          },
        },
        AdminCleanupIdempotencyResponse: {
          type: "object",
          properties: {
            data: {
              type: "object",
              properties: {
                deleted: { type: "integer", minimum: 0 },
              },
              required: ["deleted"],
            },
          },
          required: ["data"],
        },
      },
    },
    paths,
  };
}
