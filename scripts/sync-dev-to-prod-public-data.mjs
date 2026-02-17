#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_SOURCE_ENV_PATH = ".env.local";
const DEFAULT_TARGET_ENV_PATH = ".env.production";

const SYNC_TABLES = [
  "users",
  "user_preferences",
  "categories",
  "subcategories",
  "topics",
  "questions",
  "answers",
  "question_topics",
  "topic_edges",
];

const VERIFY_TABLES = [
  "users",
  "user_preferences",
  "categories",
  "subcategories",
  "topics",
  "questions",
  "question_topics",
  "topic_edges",
  "answers",
  "content_revisions",
  "question_attempts",
  "user_question_progress",
  "user_topic_progress",
  "playlists",
  "playlist_items",
  "user_playlist_progress",
];

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const values = {};
  const raw = fs.readFileSync(filePath, "utf8");

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, equalsIndex).trim();
    let value = trimmed.slice(equalsIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const result = {};

  for (let index = 0; index < args.length; index += 1) {
    const current = args[index];
    if (!current.startsWith("--")) {
      continue;
    }

    const withoutPrefix = current.slice(2);
    const [name, inlineValue] = withoutPrefix.split("=", 2);

    if (inlineValue !== undefined) {
      result[name] = inlineValue;
      continue;
    }

    const next = args[index + 1];
    if (next && !next.startsWith("--")) {
      result[name] = next;
      index += 1;
      continue;
    }

    result[name] = "true";
  }

  return result;
}

function resolveProjectRef(url) {
  const match = url.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/i);
  return match ? match[1] : "";
}

function resolveRuntimeEnv({ envPath, fallbackAccessToken }) {
  const values = parseEnvFile(envPath);

  const url =
    values.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "";
  const projectRef =
    values.SUPABASE_PROJECT_REF || resolveProjectRef(url) || "";
  const dbPassword =
    values.SUPABASE_DB_PASSWORD || process.env.SUPABASE_DB_PASSWORD || "";
  const accessToken =
    values.SUPABASE_ACCESS_TOKEN ||
    process.env.SUPABASE_ACCESS_TOKEN ||
    fallbackAccessToken ||
    "";

  if (!url) {
    throw new Error(
      `Missing NEXT_PUBLIC_SUPABASE_URL in ${envPath} (or process env).`,
    );
  }

  if (!projectRef) {
    throw new Error(
      `Missing SUPABASE_PROJECT_REF in ${envPath}; unable to infer from URL.`,
    );
  }

  if (!dbPassword) {
    throw new Error(
      `Missing SUPABASE_DB_PASSWORD in ${envPath}. Required for linked db reset.`,
    );
  }

  if (!accessToken) {
    throw new Error(
      `Missing SUPABASE_ACCESS_TOKEN in ${envPath} (or process env).`,
    );
  }

  return {
    url,
    projectRef,
    dbPassword,
    accessToken,
    filePath: envPath,
  };
}

function runSupabaseCommand(args, accessToken, stdio = "inherit") {
  const commandArgs =
    process.platform === "win32"
      ? ["/d", "/s", "/c", `npx supabase ${args.join(" ")}`]
      : ["supabase", ...args];

  const command = process.platform === "win32" ? "cmd.exe" : "npx";

  return execFileSync(command, commandArgs, {
    encoding: "utf8",
    env: {
      ...process.env,
      SUPABASE_ACCESS_TOKEN: accessToken,
    },
    stdio,
  });
}

function getServiceRoleKey(projectRef, accessToken) {
  const output = runSupabaseCommand(
    ["projects", "api-keys", "--project-ref", projectRef, "--output", "json"],
    accessToken,
    "pipe",
  );

  const keys = JSON.parse(output);

  const serviceRoleEntry = Array.isArray(keys)
    ? keys.find(
        (entry) =>
          typeof entry?.name === "string" &&
          entry.name.toLowerCase().includes("service_role"),
      )
    : undefined;

  const key = serviceRoleEntry?.api_key ?? serviceRoleEntry?.apiKey ?? "";

  if (!key) {
    throw new Error(
      `Could not find service_role API key for project ${projectRef}.`,
    );
  }

  return key;
}

async function countRows(client, table) {
  const { count, error } = await client
    .from(table)
    .select("*", { count: "exact", head: true });

  if (error) {
    throw new Error(`count ${table}: ${error.message}`);
  }

  return count ?? 0;
}

async function fetchAllRows(client, table) {
  const rows = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await client
      .from(table)
      .select("*")
      .range(from, to);

    if (error) {
      throw new Error(`fetch ${table} [${from}-${to}]: ${error.message}`);
    }

    const batch = data ?? [];
    rows.push(...batch);

    if (batch.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return rows;
}

function chunk(items, size) {
  const chunks = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

async function insertRows(client, table, rows) {
  if (!rows.length) {
    return;
  }

  for (const batch of chunk(rows, 200)) {
    const { error } = await client.from(table).insert(batch);

    if (error) {
      throw new Error(`insert ${table}: ${error.message}`);
    }
  }
}

async function upsertRows(client, table, rows, onConflict) {
  if (!rows.length) {
    return;
  }

  for (const batch of chunk(rows, 200)) {
    const { error } = await client.from(table).upsert(batch, { onConflict });

    if (error) {
      throw new Error(`upsert ${table}: ${error.message}`);
    }
  }
}

async function deleteAllRows(client, table, requiredColumn) {
  const { error } = await client
    .from(table)
    .delete()
    .not(requiredColumn, "is", null);

  if (error) {
    throw new Error(`delete ${table}: ${error.message}`);
  }
}

async function listAllAuthUsers(client) {
  const users = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const { data, error } = await client.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw new Error(`listUsers page ${page}: ${error.message}`);
    }

    const batch = data?.users ?? [];
    users.push(...batch);

    if (batch.length < perPage) {
      break;
    }

    page += 1;
  }

  return users;
}

async function ensureAuthUsersExistInTarget({ sourceClient, targetClient }) {
  const sourceUsers = await listAllAuthUsers(sourceClient);
  const targetUsers = await listAllAuthUsers(targetClient);
  const targetById = new Set(targetUsers.map((user) => user.id));

  let createdCount = 0;

  for (const user of sourceUsers) {
    if (targetById.has(user.id)) {
      continue;
    }

    const email = user.email || `${user.id}@example.invalid`;
    const password = `Tmp!${crypto.randomBytes(8).toString("hex")}Aa1`;

    const { error } = await targetClient.auth.admin.createUser({
      id: user.id,
      email,
      password,
      email_confirm: true,
      app_metadata: user.app_metadata ?? {},
      user_metadata: user.user_metadata ?? {},
    });

    if (error) {
      throw new Error(`createUser ${user.id}: ${error.message}`);
    }

    createdCount += 1;
  }

  return {
    sourceUsers: sourceUsers.length,
    targetUsersBefore: targetUsers.length,
    createdUsers: createdCount,
  };
}

async function verifyCounts({ sourceClient, targetClient }) {
  const mismatches = [];

  for (const table of VERIFY_TABLES) {
    const sourceCount = await countRows(sourceClient, table);
    const targetCount = await countRows(targetClient, table);
    const isMatch = sourceCount === targetCount;

    console.log(
      `verify ${table}: source=${sourceCount} target=${targetCount} ${isMatch ? "OK" : "DIFF"}`,
    );

    if (!isMatch) {
      mismatches.push({ table, sourceCount, targetCount });
    }
  }

  return mismatches;
}

async function syncPublicData({ sourceClient, targetClient }) {
  const sourceRowsByTable = new Map();

  for (const table of SYNC_TABLES) {
    const rows = await fetchAllRows(sourceClient, table);
    sourceRowsByTable.set(table, rows);
    console.log(`fetched ${table}: ${rows.length}`);
  }

  const sourceQuestions = sourceRowsByTable.get("questions") ?? [];
  const sourceQuestionsAsDraft = sourceQuestions.map((question) => ({
    ...question,
    status: "draft",
    published_at: null,
  }));

  const { error: downgradeError } = await targetClient
    .from("questions")
    .update({ status: "draft", published_at: null })
    .not("id", "is", null);

  if (downgradeError) {
    throw new Error(
      `Unable to downgrade target questions before sync: ${downgradeError.message}`,
    );
  }

  console.log(
    "downgraded target question statuses to draft for guardrail-safe sync",
  );

  const deleteOrder = [
    { table: "question_topics", requiredColumn: "question_id" },
    { table: "topic_edges", requiredColumn: "from_topic_id" },
    { table: "answers", requiredColumn: "id" },
    { table: "questions", requiredColumn: "id" },
    { table: "topics", requiredColumn: "id" },
    { table: "subcategories", requiredColumn: "id" },
    { table: "categories", requiredColumn: "id" },
    { table: "user_preferences", requiredColumn: "user_id" },
    { table: "users", requiredColumn: "id" },
  ];

  for (const step of deleteOrder) {
    await deleteAllRows(targetClient, step.table, step.requiredColumn);
    console.log(`cleared target ${step.table}`);
  }

  await insertRows(targetClient, "users", sourceRowsByTable.get("users") ?? []);
  await insertRows(
    targetClient,
    "user_preferences",
    sourceRowsByTable.get("user_preferences") ?? [],
  );
  await insertRows(
    targetClient,
    "categories",
    sourceRowsByTable.get("categories") ?? [],
  );
  await insertRows(
    targetClient,
    "subcategories",
    sourceRowsByTable.get("subcategories") ?? [],
  );
  await insertRows(
    targetClient,
    "topics",
    sourceRowsByTable.get("topics") ?? [],
  );
  await insertRows(targetClient, "questions", sourceQuestionsAsDraft);
  await insertRows(
    targetClient,
    "answers",
    sourceRowsByTable.get("answers") ?? [],
  );
  await insertRows(
    targetClient,
    "question_topics",
    sourceRowsByTable.get("question_topics") ?? [],
  );
  await insertRows(
    targetClient,
    "topic_edges",
    sourceRowsByTable.get("topic_edges") ?? [],
  );

  await upsertRows(targetClient, "questions", sourceQuestions, "id");
  console.log(
    "restored original question publish states after question_topics insert",
  );
}

function printUsage() {
  console.log(
    `
Usage:
  node scripts/sync-dev-to-prod-public-data.mjs [options]

Options:
  --source-env <path>      Source env file (default: .env.local)
  --target-env <path>      Target env file (default: .env.production)
  --reset-target           Reset target DB with migrations before syncing data
  --verify-only            Do not mutate; only compare source vs target row counts
  --skip-auth-sync         Skip auth user creation on target
  --help                   Show this message

Examples:
  node scripts/sync-dev-to-prod-public-data.mjs --verify-only
  node scripts/sync-dev-to-prod-public-data.mjs --reset-target
  node scripts/sync-dev-to-prod-public-data.mjs --source-env .env.local --target-env .env.production
`.trim(),
  );
}

async function main() {
  const args = parseArgs();

  if (args.help === "true") {
    printUsage();
    return;
  }

  const sourceEnvPath = args["source-env"] || DEFAULT_SOURCE_ENV_PATH;
  const targetEnvPath = args["target-env"] || DEFAULT_TARGET_ENV_PATH;

  const sourceEnv = resolveRuntimeEnv({
    envPath: sourceEnvPath,
  });
  const targetEnv = resolveRuntimeEnv({
    envPath: targetEnvPath,
    fallbackAccessToken: sourceEnv.accessToken,
  });

  const sourceServiceRoleKey = getServiceRoleKey(
    sourceEnv.projectRef,
    sourceEnv.accessToken,
  );
  const targetServiceRoleKey = getServiceRoleKey(
    targetEnv.projectRef,
    targetEnv.accessToken,
  );

  const sourceClient = createClient(sourceEnv.url, sourceServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  const targetClient = createClient(targetEnv.url, targetServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  console.log(
    `source=${sourceEnv.projectRef} (${sourceEnv.filePath}) target=${targetEnv.projectRef} (${targetEnv.filePath})`,
  );

  if (args["verify-only"] === "true") {
    const mismatches = await verifyCounts({
      sourceClient,
      targetClient,
    });

    if (mismatches.length) {
      console.error(
        `count mismatches found (${mismatches.length}): ${JSON.stringify(mismatches)}`,
      );
      process.exitCode = 2;
      return;
    }

    console.log("verification passed: all tracked table counts match");
    return;
  }

  if (args["reset-target"] === "true") {
    console.log(`resetting target ${targetEnv.projectRef} (destructive)...`);
    runSupabaseCommand(
      [
        "link",
        "--project-ref",
        targetEnv.projectRef,
        "--yes",
        "-p",
        `"${targetEnv.dbPassword}"`,
      ],
      targetEnv.accessToken,
      "inherit",
    );
    runSupabaseCommand(
      ["db", "reset", "--linked", "--yes", "--no-seed"],
      targetEnv.accessToken,
      "inherit",
    );
  }

  if (args["skip-auth-sync"] !== "true") {
    const authSummary = await ensureAuthUsersExistInTarget({
      sourceClient,
      targetClient,
    });
    console.log(
      `auth sync: source=${authSummary.sourceUsers} target_before=${authSummary.targetUsersBefore} created=${authSummary.createdUsers}`,
    );
  } else {
    console.log("auth sync skipped (--skip-auth-sync)");
  }

  await syncPublicData({
    sourceClient,
    targetClient,
  });

  const mismatches = await verifyCounts({
    sourceClient,
    targetClient,
  });

  if (mismatches.length) {
    console.error(
      `sync completed with verification mismatches (${mismatches.length}): ${JSON.stringify(mismatches)}`,
    );
    process.exitCode = 3;
    return;
  }

  console.log("dev->prod sync complete and verified");
}

main().catch((error) => {
  console.error("sync failed");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
