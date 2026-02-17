import { readFile } from "node:fs/promises";
import path from "node:path";

export type QuestionType = "standard" | "scenario" | "code_review";
export type SeniorityLevel = "junior" | "mid" | "senior" | "lead" | "architect";

const templatePathByQuestionType: Record<QuestionType, string> = {
  standard: "content/templates/standard-answer.md",
  scenario: "content/templates/scenario-answer.md",
  code_review: "content/templates/code-review-answer.md",
};

const templateCache = new Map<QuestionType, string>();

export function getTemplatePath(questionType: QuestionType) {
  return templatePathByQuestionType[questionType];
}

export async function loadAnswerTemplate(questionType: QuestionType) {
  const cached = templateCache.get(questionType);

  if (cached) {
    return cached;
  }

  const relativePath = getTemplatePath(questionType);
  const absolutePath = path.join(process.cwd(), relativePath);
  const raw = await readFile(absolutePath, "utf8");
  templateCache.set(questionType, raw);
  return raw;
}

export function extractPromptBlock(templateMarkdown: string) {
  const promptSectionStart = templateMarkdown.indexOf("## Prompt");
  const scanTarget =
    promptSectionStart >= 0
      ? templateMarkdown.slice(promptSectionStart)
      : templateMarkdown;

  const fencedBlockMatch = scanTarget.match(
    /```(?:text|md|markdown)?\s*([\s\S]*?)```/i,
  );

  if (fencedBlockMatch?.[1]?.trim()) {
    return fencedBlockMatch[1].trim();
  }

  return templateMarkdown.trim();
}

function fillPlaceholders(
  input: string,
  replacements: Record<string, string | undefined>,
) {
  return input.replace(/\{([A-Z0-9_]+)\}/g, (_match, key: string) => {
    const replacement = replacements[key];
    return replacement ?? `{${key}}`;
  });
}

export type ResolveTemplatePromptInput = {
  domain?: string;
  questionType: QuestionType;
  questionTitle: string;
  topicName: string;
  subcategoryName: string;
  seniorityLevel: SeniorityLevel;
  codeLanguage?: string;
  codeSnippet?: string;
};

export async function resolveTemplatePrompt({
  domain,
  questionType,
  questionTitle,
  topicName,
  subcategoryName,
  seniorityLevel,
  codeLanguage,
  codeSnippet,
}: ResolveTemplatePromptInput) {
  const templateMarkdown = await loadAnswerTemplate(questionType);
  const promptBlock = extractPromptBlock(templateMarkdown);

  return fillPlaceholders(promptBlock, {
    DOMAIN: domain || "Salesforce",
    QUESTION_TITLE: questionTitle,
    TOPIC: topicName,
    SUBCATEGORY: subcategoryName,
    SENIORITY: seniorityLevel,
    PRIMARY_CODE_LANG: codeLanguage || "apex",
    CODE_SNIPPET: codeSnippet || "",
  });
}
