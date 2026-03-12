import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const options = parseArgs(args);

if (options.help) {
  printHelp();
  process.exit(0);
}

const credentials = resolveSupabaseCredentials(options);

if (!credentials.url || !credentials.key) {
  console.error(
    [
      "Unable to resolve Supabase credentials for voice interview debugging.",
      "Pass `--url` and `--key`, or ensure `.env.local` contains local Supabase keys.",
    ].join("\n"),
  );
  process.exit(1);
}

const supabase = createClient(credentials.url, credentials.key, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const sessions = await listRecentSessions(supabase, options.limit);
const selectedSessionId = options.sessionId ?? sessions[0]?.id ?? null;
const details =
  options.includeDetails && selectedSessionId
    ? await getSessionDetails(supabase, selectedSessionId)
    : null;

console.log(
  JSON.stringify(
    {
      credentialSource: credentials.source,
      recentSessions: sessions,
      selectedSessionId,
      selectedSession: details,
    },
    null,
    2,
  ),
);

function parseArgs(argv) {
  const parsed = {
    help: false,
    includeDetails: true,
    key: undefined,
    limit: 5,
    sessionId: undefined,
    url: undefined,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === "--help" || value === "-h") {
      parsed.help = true;
      continue;
    }

    if (value === "--no-details") {
      parsed.includeDetails = false;
      continue;
    }

    if (value === "--session" || value === "--session-id") {
      parsed.sessionId = argv[index + 1];
      index += 1;
      continue;
    }

    if (value === "--limit") {
      parsed.limit = Number.parseInt(argv[index + 1] ?? "5", 10);
      index += 1;
      continue;
    }

    if (value === "--url") {
      parsed.url = argv[index + 1];
      index += 1;
      continue;
    }

    if (value === "--key") {
      parsed.key = argv[index + 1];
      index += 1;
    }
  }

  if (!Number.isFinite(parsed.limit) || parsed.limit < 1) {
    parsed.limit = 5;
  }

  return parsed;
}

function printHelp() {
  console.log(
    [
      "Usage: node scripts/debug-voice-interview-session.mjs [options]",
      "",
      "Options:",
      "  --session, --session-id <id>  Inspect one specific interview session",
      "  --limit <n>                   Number of recent sessions to list (default: 5)",
      "  --no-details                  Skip transcript/events/usage detail lookup",
      "  --url <supabase-url>          Override Supabase project URL",
      "  --key <service-role-key>      Override Supabase service role key",
      "  --help                        Show this message",
      "",
      "Examples:",
      "  node scripts/debug-voice-interview-session.mjs",
      "  node scripts/debug-voice-interview-session.mjs --session-id <uuid>",
      "  npm run debug:voice-session -- --limit 10",
    ].join("\n"),
  );
}

function resolveSupabaseCredentials(options) {
  if (options.url && options.key) {
    return {
      key: options.key,
      source: "cli_args",
      url: options.url,
    };
  }

  const envFile = readEnvFile(path.join(process.cwd(), ".env.local"));
  const envFileUrl =
    envFile.DEBUG_SUPABASE_URL ?? envFile.NEXT_PUBLIC_SUPABASE_URL;
  const envFileKey =
    envFile.DEBUG_SUPABASE_KEY ??
    envFile.SUPABASE_SERVICE_ROLE_KEY ??
    envFile.SUPABASE_SECRET_KEY;

  if (envFileUrl && envFileKey) {
    return {
      key: envFileKey,
      source: ".env.local",
      url: envFileUrl,
    };
  }

  return {
    key:
      options.key ??
      process.env.DEBUG_SUPABASE_KEY ??
      process.env.SUPABASE_SERVICE_ROLE_KEY ??
      process.env.SUPABASE_SECRET_KEY,
    source: "environment",
    url:
      options.url ??
      process.env.DEBUG_SUPABASE_URL ??
      process.env.SUPABASE_URL ??
      process.env.NEXT_PUBLIC_SUPABASE_URL,
  };
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

async function listRecentSessions(supabaseClient, limit) {
  const { data, error } = await supabaseClient
    .from("interview_sessions")
    .select(
      [
        "id",
        "scope_slug",
        "scope_title",
        "state",
        "runtime_kind",
        "runtime_profile_id",
        "created_at",
        "started_at",
        "ended_at",
        "last_client_heartbeat_at",
        "last_client_flush_at",
        "telemetry_updated_at",
        "persisted_turn_count",
        "last_disconnect_reason",
        "last_error_code",
        "last_error_message",
        "diagnostics_json",
      ].join(", "),
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return data ?? [];
}

async function getSessionDetails(supabaseClient, sessionId) {
  const [sessionResult, messagesResult, eventsResult, usageResult] =
    await Promise.all([
      supabaseClient
        .from("interview_sessions")
        .select(
          [
            "id",
            "scope_slug",
            "scope_title",
            "state",
            "runtime_kind",
            "runtime_profile_id",
            "created_at",
            "started_at",
            "ended_at",
            "last_client_heartbeat_at",
            "last_client_flush_at",
            "telemetry_updated_at",
            "persisted_turn_count",
            "last_disconnect_reason",
            "last_error_code",
            "last_error_message",
            "diagnostics_json",
          ].join(", "),
        )
        .eq("id", sessionId)
        .maybeSingle(),
      supabaseClient
        .from("interview_messages")
        .select("*")
        .eq("session_id", sessionId)
        .order("client_sequence", { ascending: true }),
      supabaseClient
        .from("interview_session_events")
        .select("*")
        .eq("session_id", sessionId)
        .order("recorded_at", { ascending: true }),
      supabaseClient
        .from("interview_session_usage_events")
        .select("*")
        .eq("session_id", sessionId)
        .order("recorded_at", { ascending: true }),
    ]);

  for (const result of [
    sessionResult,
    messagesResult,
    eventsResult,
    usageResult,
  ]) {
    if (result.error) {
      throw result.error;
    }
  }

  return {
    events: eventsResult.data ?? [],
    messages: messagesResult.data ?? [],
    session: sessionResult.data
      ? {
          ...sessionResult.data,
          grounding: sessionResult.data.diagnostics_json?.grounding ?? null,
        }
      : null,
    usageEvents: usageResult.data ?? [],
  };
}
