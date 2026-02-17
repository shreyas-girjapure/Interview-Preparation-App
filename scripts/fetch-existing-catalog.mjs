#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

// Helper to parse .env.local
function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }
  const values = {};
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex <= 0) continue;

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

async function main() {
  // Load env vars
  const envPath = path.resolve(process.cwd(), ".env.local");
  const env = parseEnvFile(envPath);

  const supabaseUrl =
    env.SUPABASE_URL ||
    env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  let supabaseKey =
    env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseKey || supabaseKey.includes("your-service-role-key")) {
    supabaseKey =
      env.SUPABASE_ANON_KEY ||
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  }

  if (!supabaseUrl || !supabaseKey) {
    console.error(
      "Error: Could not find valid SUPABASE_URL or ANON/SERVICE_KEY in .env.local",
    );
    console.error("Checked: SUPABASE_URL, NEXT_PUBLIC_SUPABASE_URL");
    console.error(
      "Checked: SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY, NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const [categories, subcategories, topics, questions] = await Promise.all([
      // 1. Categories
      supabase.from("categories").select("slug, name").order("slug"),

      // 2. Subcategories with parent category slug
      supabase
        .from("subcategories")
        .select("slug, name, category_id, categories(slug)")
        .order("slug"),

      // 3. Topics with parent subcategory slug
      supabase
        .from("topics")
        .select("slug, name, subcategory_id, subcategories(slug)")
        .order("slug"),

      // 4. Questions
      supabase
        .from("questions")
        .select("slug, title, question_type, seniority_level")
        .order("slug"),
    ]);

    if (categories.error)
      throw new Error(`Categories error: ${categories.error.message}`);
    if (subcategories.error)
      throw new Error(`Subcategories error: ${subcategories.error.message}`);
    if (topics.error) throw new Error(`Topics error: ${topics.error.message}`);
    if (questions.error)
      throw new Error(`Questions error: ${questions.error.message}`);

    // Transform joined data to flat formats if needed
    const subcatsFormatted = subcategories.data.map((s) => ({
      slug: s.slug,
      name: s.name,
      category_slug: s.categories?.slug,
    }));

    const topicsFormatted = topics.data.map((t) => ({
      slug: t.slug,
      name: t.name,
      subcategory_slug: t.subcategories?.slug,
    }));

    const output = {
      categories: categories.data,
      subcategories: subcatsFormatted,
      topics: topicsFormatted,
      questions: questions.data,
    };

    console.log(JSON.stringify(output, null, 2));
  } catch (error) {
    console.error("Error fetching catalog:", error);
    process.exit(1);
  }
}

main();
