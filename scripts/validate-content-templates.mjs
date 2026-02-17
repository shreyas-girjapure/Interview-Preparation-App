import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const errors = [];

function readTemplate(relativePath) {
  const fullPath = path.join(repoRoot, relativePath);
  return readFileSync(fullPath, "utf8");
}

function assertNoNonAscii(relativePath, source) {
  if (/[^\x00-\x7F]/.test(source)) {
    errors.push(`${relativePath}: contains non-ASCII characters.`);
  }
}

function assertIncludes(relativePath, source, snippet) {
  if (!source.includes(snippet)) {
    errors.push(`${relativePath}: missing required snippet: ${snippet}`);
  }
}

function assertJsonFencesParse(relativePath, source, minBlocks = 1) {
  const fenceRegex = /```json\s*([\s\S]*?)```/gi;
  const matches = [...source.matchAll(fenceRegex)];

  if (matches.length < minBlocks) {
    errors.push(
      `${relativePath}: expected at least ${minBlocks} JSON code block(s), found ${matches.length}.`,
    );
    return;
  }

  matches.forEach((match, index) => {
    const raw = match[1]?.trim() ?? "";
    try {
      JSON.parse(raw);
    } catch (error) {
      errors.push(
        `${relativePath}: invalid JSON in block #${index + 1}: ${(error && typeof error === "object" && "message" in error && error.message) || "parse failure"}`,
      );
    }
  });
}

function validateJsonOutputTemplate(relativePath, requiredSnippets) {
  const source = readTemplate(relativePath);
  assertNoNonAscii(relativePath, source);
  assertJsonFencesParse(relativePath, source, 1);
  assertIncludes(relativePath, source, "Output Rules");
  assertIncludes(relativePath, source, "valid JSON");
  requiredSnippets.forEach((snippet) =>
    assertIncludes(relativePath, source, snippet),
  );
}

function validateMarkdownContractTemplate(relativePath, headingSnippets) {
  const source = readTemplate(relativePath);
  assertNoNonAscii(relativePath, source);
  assertIncludes(relativePath, source, "Output Rules");
  assertIncludes(relativePath, source, "Return markdown only.");
  headingSnippets.forEach((snippet) =>
    assertIncludes(relativePath, source, snippet),
  );
}

validateJsonOutputTemplate("content/templates/question-generation.md", [
  "Mode: `canonical`",
  "Mode: `admin_composer`",
  '"topic_slug": "string"',
  '"questions": [',
]);

validateJsonOutputTemplate("content/templates/topic-edges-generation.md", [
  '"relation_type": "prerequisite | related | deep_dive"',
  '"candidate_edges": [',
]);

validateJsonOutputTemplate("content/templates/catalog-dedup-check.md", [
  '"decisions": [',
  '"summary": {',
  '"decision": "reuse_existing | create_new | update_existing | reject_duplicate | reject_missing_parent"',
]);

validateJsonOutputTemplate("content/templates/subcategory-seed.md", [
  "Canonical Salesforce manifest:",
  '"name": "Apex Programming"',
]);

validateMarkdownContractTemplate("content/templates/standard-answer.md", [
  "1. ## Key Points",
  "2. ## Detailed Explanation",
  "3. ## Example",
  "4. ## Best Practices",
  "5. ## Common Mistakes",
]);

validateMarkdownContractTemplate("content/templates/scenario-answer.md", [
  "1. ## Context",
  "2. ## Approach: <Approach A Name>",
  "3. ## Approach: <Approach B Name>",
  "4. ## Tradeoffs",
  "5. ## Recommendation",
  "6. ## Follow-ups",
]);

validateMarkdownContractTemplate("content/templates/code-review-answer.md", [
  "1. ## Code",
  "2. ## Issue: <Issue Name>",
  "3. ## Corrected Version",
  "4. ## Review Summary",
]);

const finalizationChecklist = readTemplate(
  "docs/CONTENT_FINALIZATION_CHECKLIST.md",
);
assertNoNonAscii(
  "docs/CONTENT_FINALIZATION_CHECKLIST.md",
  finalizationChecklist,
);
assertIncludes(
  "docs/CONTENT_FINALIZATION_CHECKLIST.md",
  finalizationChecklist,
  "### 3) Validation and QA",
);

if (errors.length > 0) {
  console.error("Template validation failed:");
  errors.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}

console.log("Template validation passed.");
