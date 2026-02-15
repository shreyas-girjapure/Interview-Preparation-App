#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

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

function isPlaceholderServiceRoleKey(value) {
  if (!value) {
    return true;
  }

  const normalized = value.trim().toLowerCase();

  return (
    normalized === "your-service-role-key" ||
    normalized.startsWith("your-service")
  );
}

function loadRuntimeEnv() {
  const args = parseArgs();
  const repoRoot = process.cwd();
  const localEnv = parseEnvFile(path.join(repoRoot, ".env.local"));

  const getValue = (key) => process.env[key] ?? localEnv[key] ?? "";

  const url = getValue("NEXT_PUBLIC_SUPABASE_URL");
  const projectRef =
    args["project-ref"] || getValue("SUPABASE_PROJECT_REF") || resolveProjectRef(url);
  const accessToken = getValue("SUPABASE_ACCESS_TOKEN");
  const serviceRoleKey = getValue("SUPABASE_SERVICE_ROLE_KEY");

  return {
    url,
    projectRef,
    accessToken,
    serviceRoleKey,
  };
}

function fetchServiceRoleKey(projectRef, accessToken) {
  if (!projectRef) {
    throw new Error(
      "Missing project ref. Pass --project-ref or set SUPABASE_PROJECT_REF.",
    );
  }

  if (!accessToken) {
    throw new Error(
      "Missing SUPABASE_ACCESS_TOKEN. Required to fetch service-role key via Supabase CLI.",
    );
  }

  const output =
    process.platform === "win32"
      ? execFileSync(
          "cmd.exe",
          [
            "/d",
            "/s",
            "/c",
            `npx supabase projects api-keys --project-ref ${projectRef} --output json`,
          ],
          {
            encoding: "utf8",
            env: {
              ...process.env,
              SUPABASE_ACCESS_TOKEN: accessToken,
            },
            stdio: ["ignore", "pipe", "pipe"],
          },
        )
      : execFileSync(
          "npx",
          [
            "supabase",
            "projects",
            "api-keys",
            "--project-ref",
            projectRef,
            "--output",
            "json",
          ],
          {
            encoding: "utf8",
            env: {
              ...process.env,
              SUPABASE_ACCESS_TOKEN: accessToken,
            },
            stdio: ["ignore", "pipe", "pipe"],
          },
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

async function runGuardrailSmokeTest({ url, serviceRoleKey }) {
  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const slug = `smoke-guardrail-${suffix}`;
  const title = `Smoke Guardrail ${suffix}`;

  let questionId = "";
  let topicId = "";

  try {
    const topicResult = await supabase
      .from("topics")
      .select("id")
      .eq("status", "published")
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (topicResult.error || !topicResult.data?.id) {
      throw new Error(
        `Unable to fetch a published topic: ${topicResult.error?.message ?? "none found"}`,
      );
    }

    topicId = topicResult.data.id;

    const createQuestionResult = await supabase
      .from("questions")
      .insert({
        slug,
        title,
        difficulty: "medium",
        summary: "Smoke test question for publish guardrail validation.",
        tags: ["smoke-test", "guardrail"],
        estimated_minutes: 5,
        status: "draft",
      })
      .select("id")
      .single();

    if (createQuestionResult.error || !createQuestionResult.data?.id) {
      throw new Error(
        `Failed to create smoke-test question: ${createQuestionResult.error?.message ?? "unknown error"}`,
      );
    }

    questionId = createQuestionResult.data.id;
    console.log(`Created draft question: ${questionId}`);

    const publishWithoutTopicResult = await supabase
      .from("questions")
      .update({ status: "published", published_at: new Date().toISOString() })
      .eq("id", questionId)
      .select("id")
      .single();

    if (!publishWithoutTopicResult.error) {
      throw new Error(
        "Guardrail failed: question was published without any linked topic.",
      );
    }
    console.log("Check 1 passed: publish without topics is blocked.");

    const linkTopicResult = await supabase
      .from("question_topics")
      .insert({
        question_id: questionId,
        topic_id: topicId,
        sort_order: 0,
      })
      .select("id")
      .single();

    if (linkTopicResult.error || !linkTopicResult.data?.id) {
      throw new Error(
        `Failed to link topic to smoke-test question: ${linkTopicResult.error?.message ?? "unknown error"}`,
      );
    }

    const publishWithTopicResult = await supabase
      .from("questions")
      .update({ status: "published", published_at: new Date().toISOString() })
      .eq("id", questionId)
      .select("id")
      .single();

    if (publishWithTopicResult.error || !publishWithTopicResult.data?.id) {
      throw new Error(
        `Expected publish with topic link to succeed: ${publishWithTopicResult.error?.message ?? "unknown error"}`,
      );
    }
    console.log("Check 2 passed: publish with topic link succeeds.");

    const removeLastTopicResult = await supabase
      .from("question_topics")
      .delete()
      .eq("question_id", questionId)
      .eq("topic_id", topicId)
      .select("id");

    if (!removeLastTopicResult.error) {
      throw new Error(
        "Guardrail failed: removed last topic from a published question.",
      );
    }
    console.log(
      "Check 3 passed: removing the last topic from a published question is blocked.",
    );

    const demoteQuestionResult = await supabase
      .from("questions")
      .update({ status: "draft", published_at: null })
      .eq("id", questionId)
      .select("id")
      .single();

    if (demoteQuestionResult.error) {
      throw new Error(
        `Failed to demote smoke-test question for cleanup: ${demoteQuestionResult.error.message}`,
      );
    }

    const removeTopicAfterDemoteResult = await supabase
      .from("question_topics")
      .delete()
      .eq("question_id", questionId)
      .eq("topic_id", topicId)
      .select("id");

    if (removeTopicAfterDemoteResult.error) {
      throw new Error(
        `Expected topic removal after demote to succeed: ${removeTopicAfterDemoteResult.error.message}`,
      );
    }
    console.log("Check 4 passed: cleanup path works after demotion.");

    const deleteQuestionResult = await supabase
      .from("questions")
      .delete()
      .eq("id", questionId)
      .select("id")
      .single();

    if (deleteQuestionResult.error) {
      throw new Error(
        `Failed to delete smoke-test question: ${deleteQuestionResult.error.message}`,
      );
    }

    questionId = "";
    console.log("Guardrail smoke test passed.");
  } finally {
    if (!questionId) {
      return;
    }

    await supabase
      .from("questions")
      .update({ status: "draft", published_at: null })
      .eq("id", questionId);

    await supabase.from("question_topics").delete().eq("question_id", questionId);
    await supabase.from("questions").delete().eq("id", questionId);
  }
}

async function main() {
  const env = loadRuntimeEnv();

  if (!env.url) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL in process env or .env.local.",
    );
  }

  let serviceRoleKey = env.serviceRoleKey;

  if (isPlaceholderServiceRoleKey(serviceRoleKey)) {
    serviceRoleKey = fetchServiceRoleKey(env.projectRef, env.accessToken);
  }

  if (!serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY and failed to fetch one from Supabase CLI.",
    );
  }

  await runGuardrailSmokeTest({
    url: env.url,
    serviceRoleKey,
  });
}

main().catch((error) => {
  console.error(`Guardrail smoke test failed: ${error.message}`);
  process.exitCode = 1;
});
