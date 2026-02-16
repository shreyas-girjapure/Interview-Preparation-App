import { spawnSync } from "node:child_process";
import { chmodSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptsDir, "..");
const gitMetadataPath = resolve(repoRoot, ".git");
const prePushHookPath = resolve(repoRoot, ".githooks", "pre-push");
const preCommitHookPath = resolve(repoRoot, ".githooks", "pre-commit");

if (!existsSync(gitMetadataPath)) {
  console.log("[hooks] .git metadata not found. Skipping Git hook setup.");
  process.exit(0);
}

if (existsSync(prePushHookPath) && process.platform !== "win32") {
  chmodSync(prePushHookPath, 0o755);
}

if (existsSync(preCommitHookPath) && process.platform !== "win32") {
  chmodSync(preCommitHookPath, 0o755);
}

const configureHooksPath = spawnSync(
  "git",
  ["config", "--local", "core.hooksPath", ".githooks"],
  {
    cwd: repoRoot,
    stdio: "inherit",
  },
);

if (configureHooksPath.error) {
  console.error(
    `[hooks] Failed to configure core.hooksPath: ${configureHooksPath.error.message}`,
  );
  process.exit(1);
}

if (configureHooksPath.status !== 0) {
  process.exit(configureHooksPath.status ?? 1);
}

console.log(
  "[hooks] Configured Git hooks at .githooks/ (pre-commit, pre-push)",
);
