import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, "../..");
const repoRoot = path.resolve(backendDir, "..");

function fail(message) {
  console.error("\n[ci-guard:lockfile] " + message + "\n");
  process.exit(1);
}

function warn(message) {
  console.warn("[ci-guard:lockfile] " + message);
}

try {
  const lsOutput = execSync("git ls-files -v", {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  const hidden = lsOutput
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const flag = line.slice(0, 1);
      const filePath = line.slice(2);
      return { flag, filePath };
    })
    .filter(({ flag, filePath }) => {
      const isSkipped = flag === "S" || flag === "h";
      const isCritical = /^backend\/(package-lock\.json|(packages|services)\/[^/]+\/package\.json)$/.test(filePath);
      return isSkipped && isCritical;
    });

  if (hidden.length > 0) {
    const files = hidden.map(({ filePath }) => ` - ${filePath}`).join("\n");
    fail(
      "Found hidden critical files in Git index (skip-worktree/assume-unchanged).\n" +
        "These files can cause lockfile drift and CI-only failures.\n" +
        "Run: git update-index --no-skip-worktree <file> and/or git update-index --no-assume-unchanged <file>\n" +
        "Affected files:\n" +
        files,
    );
  }
} catch (error) {
  warn("Could not inspect Git index flags. Continuing to npm ci dry-run check.");
}

try {
  execSync("npm ci --dry-run --ignore-scripts", {
    cwd: backendDir,
    stdio: "pipe",
    encoding: "utf8",
  });
} catch (error) {
  const details = typeof error?.stdout === "string" ? error.stdout : "";
  fail(
    "npm ci dry-run failed: package-lock.json is out of sync with one or more workspace package.json files.\n" +
      "Regenerate lockfile from a clean state: npm install (inside backend), then commit package-lock.json with manifest changes.\n" +
      (details ? "\nCaptured npm output:\n" + details.slice(-4000) : ""),
  );
}

console.log("[ci-guard:lockfile] Passed: no hidden critical files and npm ci dry-run is in sync.");
