import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resolve workspace siblings to TypeScript source so tests run without a prior `npm run build`.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@infra/shared-errors": path.resolve(__dirname, "../shared-errors/src/index.ts"),
      "@infra/shared-permissions": path.resolve(__dirname, "../shared-permissions/src/index.ts"),
    },
  },
});
