import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, "../..");
const packagesDir = path.join(backendDir, "packages");

function fail(message) {
  console.error("\n[ci-guard:shared-builds] " + message + "\n");
  process.exit(1);
}

if (!fs.existsSync(packagesDir)) {
  fail("Missing backend/packages directory.");
}

const packageFolders = fs
  .readdirSync(packagesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const problems = [];

for (const folder of packageFolders) {
  const pkgPath = path.join(packagesDir, folder, "package.json");
  const tsconfigPath = path.join(packagesDir, folder, "tsconfig.json");

  if (!fs.existsSync(pkgPath)) {
    continue;
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  const buildScript = pkg?.scripts?.build;

  if (typeof buildScript !== "string" || buildScript.trim() === "") {
    problems.push(`${folder}: missing scripts.build`);
    continue;
  }

  if (/dist-only package|no-op|^echo\b/i.test(buildScript.trim())) {
    problems.push(`${folder}: scripts.build is a no-op (${buildScript})`);
  }

  if (!/tsc\s+-p\s+tsconfig\.json/.test(buildScript)) {
    problems.push(`${folder}: scripts.build should compile TypeScript via 'tsc -p tsconfig.json' (found: ${buildScript})`);
  }

  if (!fs.existsSync(tsconfigPath)) {
    problems.push(`${folder}: missing tsconfig.json`);
  }
}

if (problems.length > 0) {
  fail(
    "Shared package build guard failed. These conditions can cause downstream service compile errors in CI.\n" +
      problems.map((p) => ` - ${p}`).join("\n"),
  );
}

console.log("[ci-guard:shared-builds] Passed: shared package build scripts are valid.");
