import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { Router, type Request, type Response } from "express";
import type { NextFunction } from "express";
import { ForbiddenError } from "@infra/shared-errors";
import { apiEndpointCatalog, buildOpenApiSpec } from "./openapi.js";
import { authenticate } from "../middleware/authenticate.js";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function prettyJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function methodTone(method: string): string {
  const lower = method.toLowerCase();
  if (lower === "get") return "method-get";
  if (lower === "post") return "method-post";
  if (lower === "patch") return "method-patch";
  if (lower === "delete") return "method-delete";
  return "method-default";
}

function docsShell(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      :root {
        --bg-0: #f6efe4;
        --bg-1: #fdf9f1;
        --ink: #1c1917;
        --muted: #57534e;
        --line: #e7dcc7;
        --accent: #0f766e;
        --accent-soft: #ccfbf1;
        --method-get: #0f766e;
        --method-post: #065f46;
        --method-patch: #7c2d12;
        --method-delete: #991b1b;
      }

      * { box-sizing: border-box; }

      body {
        margin: 0;
        color: var(--ink);
        background:
          radial-gradient(circle at 15% -10%, #e6f6f1 0%, transparent 44%),
          radial-gradient(circle at 80% -10%, #ffe8d6 0%, transparent 40%),
          linear-gradient(160deg, var(--bg-1) 0%, var(--bg-0) 100%);
        font-family: "ui-sans-serif", "Avenir Next", "Segoe UI", sans-serif;
      }

      .page {
        max-width: 1200px;
        margin: 0 auto;
        padding: 24px 20px 80px;
      }

      .hero {
        border: 1px solid var(--line);
        border-radius: 20px;
        background: rgba(255, 255, 255, 0.88);
        backdrop-filter: blur(3px);
        padding: 24px;
        box-shadow: 0 18px 36px -28px rgba(28, 25, 23, 0.6);
      }

      .hero h1 {
        margin: 0;
        font-size: clamp(30px, 5vw, 46px);
        line-height: 1.1;
        letter-spacing: -0.03em;
      }

      .hero p {
        margin: 12px 0 0;
        color: var(--muted);
        max-width: 800px;
      }

      .quicklinks {
        margin-top: 16px;
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }

      .quicklinks a {
        text-decoration: none;
        color: #134e4a;
        font-weight: 600;
        border: 1px solid #99f6e4;
        background: #ecfdf5;
        border-radius: 999px;
        padding: 8px 14px;
      }

      .stats {
        margin-top: 16px;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 10px;
      }

      .stat {
        border: 1px dashed var(--line);
        border-radius: 14px;
        background: #fff;
        padding: 12px;
      }

      .stat .label {
        color: var(--muted);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }

      .stat .value {
        margin-top: 4px;
        font-size: 22px;
        font-weight: 700;
      }

      .section-title {
        margin: 32px 0 12px;
        font-size: 22px;
      }

      .endpoint {
        border: 1px solid var(--line);
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.94);
        box-shadow: 0 12px 30px -28px rgba(28, 25, 23, 0.65);
        overflow: hidden;
        margin-top: 14px;
      }

      .endpoint-head {
        padding: 14px 16px;
        border-bottom: 1px solid var(--line);
        display: flex;
        gap: 10px;
        align-items: center;
        flex-wrap: wrap;
      }

      .method-badge {
        border-radius: 999px;
        color: #fff;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        min-width: 76px;
        text-align: center;
        padding: 6px 10px;
      }

      .method-get { background: var(--method-get); }
      .method-post { background: var(--method-post); }
      .method-patch { background: var(--method-patch); }
      .method-delete { background: var(--method-delete); }
      .method-default { background: #44403c; }

      .path {
        font-family: "ui-monospace", "SFMono-Regular", Menlo, monospace;
        font-size: 14px;
        color: #292524;
      }

      .title {
        font-size: 15px;
        font-weight: 700;
      }

      .chips {
        margin-left: auto;
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .chip {
        border-radius: 999px;
        padding: 4px 9px;
        font-size: 12px;
        border: 1px solid var(--line);
        background: #fffcf6;
      }

      .chip.good {
        background: #ecfdf5;
        border-color: #6ee7b7;
        color: #065f46;
      }

      .chip.warn {
        background: #fffbeb;
        border-color: #fcd34d;
        color: #92400e;
      }

      .endpoint-body {
        padding: 14px 16px 18px;
        display: grid;
        gap: 12px;
      }

      .endpoint-body p {
        margin: 0;
        color: var(--muted);
      }

      .group {
        border: 1px solid #efe7d8;
        border-radius: 12px;
        background: #fffdfa;
        padding: 12px;
      }

      .group h4 {
        margin: 0 0 8px;
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 0.07em;
        color: #6b5f4f;
      }

      table {
        width: 100%;
        border-collapse: collapse;
      }

      th,
      td {
        text-align: left;
        border-bottom: 1px solid #f0e8da;
        padding: 6px 4px;
        font-size: 13px;
        vertical-align: top;
      }

      th {
        color: #57534e;
      }

      pre {
        margin: 0;
        white-space: pre-wrap;
        word-break: break-word;
        font-size: 12px;
        border-radius: 10px;
        padding: 10px;
        background: #161412;
        color: #fdf4e8;
        border: 1px solid #2f2a26;
        max-height: 320px;
        overflow: auto;
      }

      .meta-note {
        color: #6b5f4f;
        font-size: 13px;
      }
    </style>
  </head>
  <body>
    ${body}
  </body>
</html>`;
}

function resolveSchemaFromRef(spec: Record<string, unknown>, ref: string): unknown {
  const marker = "#/components/schemas/";
  if (!ref.startsWith(marker)) {
    return { ref };
  }

  const schemaName = ref.slice(marker.length);
  const components = (spec.components ?? {}) as Record<string, unknown>;
  const schemas = (components.schemas ?? {}) as Record<string, unknown>;
  const schema = schemas[schemaName];
  if (!schema) {
    return { missingSchemaRef: ref };
  }

  return schema;
}

function customDocsHtml(spec: Record<string, unknown>): string {
  const endpointCount = apiEndpointCatalog.length;
  const testedCount = apiEndpointCatalog.filter((endpoint) => {
    const suitePath = resolve(process.cwd(), endpoint.testSuite);
    return existsSync(suitePath);
  }).length;
  const authCount = apiEndpointCatalog.filter((endpoint) => endpoint.requiresAuth).length;
  const publicCount = endpointCount - authCount;

  const endpointCards = apiEndpointCatalog
    .map((endpoint) => {
      const suitePath = resolve(process.cwd(), endpoint.testSuite);
      const hasTestFile = existsSync(suitePath);

      const parametersRows = (endpoint.parameters ?? []).map((parameter) => `
        <tr>
          <td>${escapeHtml(parameter.name)}</td>
          <td>${escapeHtml(parameter.in)}</td>
          <td>${parameter.required ? "yes" : "no"}</td>
          <td>${escapeHtml(parameter.description)}</td>
          <td><pre>${escapeHtml(prettyJson(parameter.schema))}</pre></td>
        </tr>
      `).join("");

      const requestSchema = endpoint.requestBody
        ? resolveSchemaFromRef(spec, endpoint.requestBody.schemaRef)
        : null;

      const responseRows = Object.entries(endpoint.responses)
        .map(([statusCode, response]) => {
          const typedResponse = response as { description: string; schemaRef?: string };
          const schema = typedResponse.schemaRef
            ? resolveSchemaFromRef(spec, typedResponse.schemaRef)
            : { note: "No JSON schema (usually empty response)." };

          return `
            <tr>
              <td>${escapeHtml(statusCode)}</td>
              <td>${escapeHtml(typedResponse.description)}</td>
              <td><pre>${escapeHtml(prettyJson(schema))}</pre></td>
            </tr>
          `;
        })
        .join("");

      return `
        <article class="endpoint">
          <header class="endpoint-head">
            <span class="method-badge ${methodTone(endpoint.method)}">${escapeHtml(endpoint.method.toUpperCase())}</span>
            <span class="path">${escapeHtml(endpoint.path)}</span>
            <span class="title">${escapeHtml(endpoint.summary)}</span>
            <div class="chips">
              <span class="chip">tag: ${escapeHtml(endpoint.tags.join(", "))}</span>
              <span class="chip ${endpoint.requiresAuth ? "warn" : "good"}">${endpoint.requiresAuth ? "auth required" : "public"}</span>
              <span class="chip ${hasTestFile ? "good" : "warn"}">${hasTestFile ? "test file linked" : "test file missing"}</span>
            </div>
          </header>

          <div class="endpoint-body">
            <p><strong>Purpose:</strong> ${escapeHtml(endpoint.description)}</p>
            <p class="meta-note"><strong>Testability:</strong> ${escapeHtml(endpoint.testSuite)} (${hasTestFile ? "exists" : "not found"})</p>

            ${(endpoint.parameters && endpoint.parameters.length > 0)
              ? `<section class="group">
                  <h4>Input Parameters</h4>
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>In</th>
                        <th>Required</th>
                        <th>Usage</th>
                        <th>Format</th>
                      </tr>
                    </thead>
                    <tbody>${parametersRows}</tbody>
                  </table>
                </section>`
              : ""
            }

            ${endpoint.requestBody
              ? `<section class="group">
                  <h4>Request Body</h4>
                  <p class="meta-note">${escapeHtml(endpoint.requestBody.description)} • required: ${endpoint.requestBody.required ? "yes" : "no"}</p>
                  <pre>${escapeHtml(prettyJson(requestSchema))}</pre>
                </section>`
              : ""
            }

            <section class="group">
              <h4>Response Formats</h4>
              <table>
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>When this returns</th>
                    <th>JSON shape</th>
                  </tr>
                </thead>
                <tbody>${responseRows}</tbody>
              </table>
            </section>
          </div>
        </article>
      `;
    })
    .join("\n");

  const body = `
    <main class="page">
      <section class="hero">
        <h1>Core Platform API Documentation</h1>
        <p>
          Human-first API docs with endpoint purpose, request and response contracts, and testability indicators.
          This page is generated from the same endpoint catalog used for OpenAPI validation.
        </p>
        <div class="quicklinks">
          <a href="/docs/redoc">Open in Redoc</a>
          <a href="/docs/scalar">Open in Scalar</a>
          <a href="/openapi.json">OpenAPI JSON</a>
        </div>
        <div class="stats">
          <div class="stat">
            <div class="label">Total Endpoints</div>
            <div class="value">${endpointCount}</div>
          </div>
          <div class="stat">
            <div class="label">Endpoints With Linked Tests</div>
            <div class="value">${testedCount}</div>
          </div>
          <div class="stat">
            <div class="label">Protected Endpoints</div>
            <div class="value">${authCount}</div>
          </div>
          <div class="stat">
            <div class="label">Public Endpoints</div>
            <div class="value">${publicCount}</div>
          </div>
        </div>
      </section>

      <h2 class="section-title">Endpoint Reference</h2>
      ${endpointCards}
    </main>
  `;

  return docsShell("Core Platform API Docs", body);
}

function scriptPoweredDocsShell(title: string, body: string): string {
  return docsShell(
    title,
    `<main class="page"><section class="hero">${body}</section></main>`,
  );
}

function redocHtml(): string {
  return scriptPoweredDocsShell(
    "Core Platform API Docs (Redoc)",
    `<redoc spec-url="/openapi.json"></redoc>
<script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>`,
  );
}

function scalarHtml(): string {
  return scriptPoweredDocsShell(
    "Core Platform API Docs (Scalar)",
    `<script id="api-reference" data-url="/openapi.json"></script>
<script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>`,
  );
}

function setDocsScriptCsp(res: Response): void {
  res.setHeader(
    "content-security-policy",
    "default-src 'self'; script-src 'self' https://cdn.redoc.ly https://cdn.jsdelivr.net 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https: data:; connect-src 'self'; frame-ancestors 'none';",
  );
}

function requireDeveloperRole(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== "developer") {
    next(new ForbiddenError("Developer role is required to access API documentation."));
    return;
  }
  next();
}

export function createDocsRouter(): Router {
  const router = Router();

  router.get("/openapi.json", authenticate, requireDeveloperRole, (_req: Request, res: Response) => {
    const spec = buildOpenApiSpec();
    res.setHeader("cache-control", "no-store");
    res.status(200).json(spec);
  });

  router.get("/docs", authenticate, requireDeveloperRole, (_req: Request, res: Response) => {
    const spec = buildOpenApiSpec() as Record<string, unknown>;
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.status(200).send(customDocsHtml(spec));
  });

  router.get("/docs/redoc", authenticate, requireDeveloperRole, (_req: Request, res: Response) => {
    setDocsScriptCsp(res);
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.status(200).send(redocHtml());
  });

  router.get("/docs/scalar", authenticate, requireDeveloperRole, (_req: Request, res: Response) => {
    setDocsScriptCsp(res);
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.status(200).send(scalarHtml());
  });

  return router;
}
