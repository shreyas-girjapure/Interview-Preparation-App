import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import process from "node:process";

const originalArgs = process.argv.slice(2);

if (originalArgs.length === 0) {
  console.error(
    [
      "Usage: node scripts/run-local-supabase-cli.mjs <supabase args...>",
      "Example: node scripts/run-local-supabase-cli.mjs db push --local --include-seed --yes",
    ].join("\n"),
  );
  process.exit(1);
}

if (originalArgs.length === 1 && originalArgs[0] === "status") {
  const hasFailure = await printLocalStatus();
  process.exit(hasFailure ? 1 : 0);
}

const args = normalizeArgs(originalArgs);

const cliPath = resolveSupabaseCliPath();

if (!cliPath) {
  console.error(
    [
      "Unable to locate a Supabase CLI binary.",
      "Set SUPABASE_CLI_PATH to a valid executable path, or install/cache the CLI first.",
      "Expected locations checked:",
      "  - global npm install",
      "  - npm npx cache",
    ].join("\n"),
  );
  process.exit(1);
}

const usesShell =
  process.platform === "win32" && /\.(cmd|bat)$/i.test(path.basename(cliPath));

const result = spawnSync(cliPath, args, {
  shell: usesShell,
  stdio: "inherit",
  windowsHide: true,
});

if (result.error) {
  console.error(
    `Failed to execute Supabase CLI at ${cliPath}: ${result.error.message}`,
  );
  process.exit(1);
}

process.exit(result.status ?? 1);

function resolveSupabaseCliPath() {
  const envOverride = process.env.SUPABASE_CLI_PATH;

  if (envOverride && existsSync(envOverride)) {
    return envOverride;
  }

  const binaryName = getBinaryName();
  const installedBinary = getInstalledBinary(binaryName);
  if (installedBinary) {
    return installedBinary;
  }

  return findLatestCachedBinary(getNpxCacheRoot(), binaryName);
}

function getBinaryName() {
  return process.platform === "win32" ? "supabase.exe" : "supabase";
}

function normalizeArgs(argsToNormalize) {
  if (argsToNormalize[0] !== "db" || !argsToNormalize.includes("--local")) {
    return argsToNormalize;
  }

  const args = [...argsToNormalize];
  const localFlagIndex = args.indexOf("--local");
  args.splice(localFlagIndex, 1);
  args.push("--db-url", getLocalDbUrl());

  return args;
}

function getInstalledBinary(binaryName) {
  const candidate =
    process.platform === "win32"
      ? path.join(
          process.env.APPDATA ?? "",
          "npm",
          "node_modules",
          "supabase",
          "bin",
          binaryName,
        )
      : path.join(
          process.env.HOME ?? "",
          ".npm-global",
          "lib",
          "node_modules",
          "supabase",
          "bin",
          binaryName,
        );

  return candidate && existsSync(candidate) ? candidate : null;
}

function getNpxCacheRoot() {
  return process.platform === "win32"
    ? path.join(process.env.LOCALAPPDATA ?? "", "npm-cache", "_npx")
    : path.join(process.env.HOME ?? "", ".npm", "_npx");
}

function findLatestCachedBinary(cacheRoot, binaryName) {
  if (!cacheRoot || !existsSync(cacheRoot)) {
    return null;
  }

  const candidates = readdirSync(cacheRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const entryPath = path.join(cacheRoot, entry.name);
      return {
        cliPath: path.join(
          entryPath,
          "node_modules",
          "supabase",
          "bin",
          binaryName,
        ),
        mtimeMs: statSync(entryPath).mtimeMs,
      };
    })
    .filter((entry) => existsSync(entry.cliPath))
    .sort((left, right) => right.mtimeMs - left.mtimeMs);

  return candidates[0]?.cliPath ?? null;
}

function getLocalDbUrl() {
  const env = readEnvFile(path.join(process.cwd(), ".env.local"));
  const ports = readSupabasePorts(
    path.join(process.cwd(), "supabase", "config.toml"),
  );
  const password = env.SUPABASE_DB_PASSWORD ?? "postgres";

  return `postgresql://postgres:${encodeURIComponent(password)}@127.0.0.1:${ports.db}/postgres`;
}

function readEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return {};
  }

  return Object.fromEntries(
    readFileSync(filePath, "utf8")
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"))
      .map((line) => {
        const separatorIndex = line.indexOf("=");
        return [line.slice(0, separatorIndex), line.slice(separatorIndex + 1)];
      }),
  );
}

function readSupabasePorts(filePath) {
  const defaults = {
    api: 54321,
    db: 54322,
    studio: 54323,
  };

  if (!existsSync(filePath)) {
    return defaults;
  }

  let section = "";
  const parsedPorts = { ...defaults };

  for (const rawLine of readFileSync(filePath, "utf8").split(/\r?\n/u)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    if (line.startsWith("[") && line.endsWith("]")) {
      section = line.slice(1, -1);
      continue;
    }

    if (!line.startsWith("port =")) {
      continue;
    }

    const [, value] = line.split("=", 2);
    const port = Number.parseInt(value.trim(), 10);

    if (!Number.isFinite(port)) {
      continue;
    }

    if (section === "api") {
      parsedPorts.api = port;
    } else if (section === "db") {
      parsedPorts.db = port;
    } else if (section === "studio") {
      parsedPorts.studio = port;
    }
  }

  return parsedPorts;
}

async function printLocalStatus() {
  const ports = readSupabasePorts(
    path.join(process.cwd(), "supabase", "config.toml"),
  );
  const checks = [
    { label: "API", port: ports.api },
    { label: "DB", port: ports.db },
    { label: "Studio", port: ports.studio },
  ];

  let hasFailure = false;

  for (const check of checks) {
    const available = await canConnectToPort(check.port);
    console.log(
      `${check.label} 127.0.0.1:${check.port} ${available ? "up" : "down"}`,
    );
    hasFailure ||= !available;
  }

  return hasFailure;
}

function canConnectToPort(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();

    socket.setTimeout(2000);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => {
      socket.destroy();
      resolve(false);
    });

    socket.connect(port, "127.0.0.1");
  });
}
