"use client";

import Link from "next/link";
import { CircleHelp, Sparkles, WandSparkles, X } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

type SubcategoryOption = {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
  categorySlug: string;
  categoryName: string;
};

type TopicOption = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  status: string;
  subcategorySlug: string;
  subcategoryName: string;
  categorySlug: string;
  categoryName: string;
};

type QuestionType = "standard" | "scenario" | "code_review";
type SeniorityLevel = "junior" | "mid" | "senior" | "lead" | "architect";
type SaveState = "idle" | "saving" | "saved" | "error";
type GenerateState = "idle" | "generating" | "generated" | "error";
type TemplateState = "idle" | "loading" | "loaded" | "error";
type SuggestState = "idle" | "loading" | "loaded" | "error";

type SuggestedTopic = {
  name: string;
  slug: string;
  subcategorySlug: string;
  subcategoryName: string;
  existingTopicSlug: string | null;
  reason: string;
  confidence: number;
};

function normalizeSlug(value: string) {
  return value.trim().toLowerCase();
}

function slugifyText(value: string, fallback = "topic") {
  const normalized = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return normalized || fallback;
}

function parseBoundedInt(
  value: string,
  fallback: number,
  min: number,
  max: number,
) {
  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(parsed, min), max);
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs = 45000,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function HelpHint({ text }: { text: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Show help"
          className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <CircleHelp className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 text-sm leading-6">
        {text}
      </PopoverContent>
    </Popover>
  );
}

function LabelWithHelp({ label, help }: { label: string; help: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-medium">
      {label}
      <HelpHint text={help} />
    </span>
  );
}

export function AiContentComposer({
  initialSubcategories,
  initialTopics,
}: {
  initialSubcategories: SubcategoryOption[];
  initialTopics: TopicOption[];
}) {
  const topicOptions = useMemo<ComboboxOption[]>(
    () =>
      initialTopics.map((topic) => ({
        value: topic.slug,
        label: `${topic.name} (${topic.slug})`,
        keywords: [
          topic.subcategoryName,
          topic.subcategorySlug,
          topic.categoryName,
          topic.categorySlug,
          topic.status,
          topic.shortDescription,
        ],
      })),
    [initialTopics],
  );

  const subcategoryOptions = useMemo<ComboboxOption[]>(
    () =>
      initialSubcategories.map((subcategory) => ({
        value: subcategory.slug,
        label: `${subcategory.name} (${subcategory.slug})`,
        keywords: [subcategory.categoryName, subcategory.categorySlug],
      })),
    [initialSubcategories],
  );

  const topicBySlug = useMemo(
    () => new Map(initialTopics.map((topic) => [topic.slug, topic])),
    [initialTopics],
  );

  const subcategoryBySlug = useMemo(
    () =>
      new Map(
        initialSubcategories.map((subcategory) => [
          subcategory.slug,
          subcategory,
        ]),
      ),
    [initialSubcategories],
  );

  const [topicPickerSlug, setTopicPickerSlug] = useState<string | null>(
    initialTopics[0]?.slug ?? null,
  );
  const [linkedTopicSlugs, setLinkedTopicSlugs] = useState<string[]>(
    initialTopics[0]?.slug ? [initialTopics[0].slug] : [],
  );
  const [suggestions, setSuggestions] = useState<SuggestedTopic[]>([]);

  const [createTopicEnabled, setCreateTopicEnabled] = useState(false);
  const [createTopicSlug, setCreateTopicSlug] = useState("");
  const [createTopicName, setCreateTopicName] = useState("");
  const [createTopicShortDescription, setCreateTopicShortDescription] =
    useState("");
  const [createTopicOverviewMarkdown, setCreateTopicOverviewMarkdown] =
    useState("");
  const [createTopicSortOrder, setCreateTopicSortOrder] = useState(0);
  const [createTopicSubcategorySlug, setCreateTopicSubcategorySlug] = useState<
    string | null
  >(initialSubcategories[0]?.slug ?? null);

  const [questionSlug, setQuestionSlug] = useState("");
  const [questionTitle, setQuestionTitle] = useState("");
  const [questionSummary, setQuestionSummary] = useState("");
  const [questionType, setQuestionType] = useState<QuestionType>("standard");
  const [seniorityLevel, setSeniorityLevel] = useState<SeniorityLevel>("mid");

  const [answerTitle, setAnswerTitle] = useState("");
  const [answerContentMarkdown, setAnswerContentMarkdown] = useState("");
  const [templatePrompt, setTemplatePrompt] = useState("");

  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [generateState, setGenerateState] = useState<GenerateState>("idle");
  const [templateState, setTemplateState] = useState<TemplateState>("idle");
  const [suggestState, setSuggestState] = useState<SuggestState>("idle");

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [warningMessages, setWarningMessages] = useState<string[]>([]);
  const [previewUrl, setPreviewUrl] = useState("");
  const [lastSavedQuestionSlug, setLastSavedQuestionSlug] = useState("");

  const selectedLinkedTopics = linkedTopicSlugs
    .map((slug) => topicBySlug.get(slug))
    .filter((topic): topic is TopicOption => Boolean(topic));

  const selectedCreateSubcategory = createTopicSubcategorySlug
    ? subcategoryBySlug.get(createTopicSubcategorySlug)
    : null;

  const effectiveQuestionSlug = useMemo(() => {
    if (questionSlug.trim()) {
      return normalizeSlug(questionSlug);
    }

    if (lastSavedQuestionSlug) {
      return normalizeSlug(lastSavedQuestionSlug);
    }

    return slugifyText(questionTitle, "question");
  }, [questionSlug, questionTitle, lastSavedQuestionSlug]);

  function getTopicContext() {
    const firstLinkedTopic = selectedLinkedTopics[0];

    if (firstLinkedTopic) {
      return {
        topicName: firstLinkedTopic.name,
        subcategoryName:
          firstLinkedTopic.subcategoryName ||
          firstLinkedTopic.subcategorySlug ||
          "General",
      };
    }

    if (createTopicEnabled && createTopicName.trim()) {
      return {
        topicName: createTopicName.trim(),
        subcategoryName:
          selectedCreateSubcategory?.name ||
          createTopicSubcategorySlug ||
          "General",
      };
    }

    return {
      topicName: "General Topic",
      subcategoryName: "General",
    };
  }

  function addSelectedTopic() {
    if (!topicPickerSlug) {
      return;
    }

    if (linkedTopicSlugs.includes(topicPickerSlug)) {
      return;
    }

    setLinkedTopicSlugs((current) => [...current, topicPickerSlug]);
  }

  function removeLinkedTopic(slug: string) {
    setLinkedTopicSlugs((current) => current.filter((item) => item !== slug));
  }

  function applyTopicSuggestion(suggestion: SuggestedTopic) {
    if (suggestion.existingTopicSlug) {
      if (!linkedTopicSlugs.includes(suggestion.existingTopicSlug)) {
        setLinkedTopicSlugs((current) => [
          ...current,
          suggestion.existingTopicSlug!,
        ]);
      }

      return;
    }

    setCreateTopicEnabled(true);
    setCreateTopicName(suggestion.name);
    setCreateTopicSlug(suggestion.slug);
    setCreateTopicShortDescription(
      `AI suggested topic for: ${questionTitle.trim() || "new question"}`,
    );
    setCreateTopicSubcategorySlug(suggestion.subcategorySlug || null);
  }

  async function onSuggestTopics() {
    if (!questionTitle.trim()) {
      setSuggestState("error");
      setErrorMessage(
        "Add a question title before requesting topic suggestions.",
      );
      return;
    }

    setSuggestState("loading");
    setErrorMessage("");
    setWarningMessages([]);

    try {
      const response = await fetchWithTimeout("/api/admin/ai-compose", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "suggest_topics",
          data: {
            questionTitle: questionTitle.trim(),
            subcategorySlug: normalizeSlug(createTopicSubcategorySlug ?? ""),
            limit: 3,
          },
        }),
      });

      const body = (await response.json().catch(() => null)) as {
        error?: string;
        warnings?: string[];
        suggestions?: SuggestedTopic[];
      } | null;

      if (!response.ok) {
        setSuggestState("error");
        setErrorMessage(body?.error ?? "Unable to suggest topics.");
        return;
      }

      setSuggestions(body?.suggestions ?? []);
      setWarningMessages(body?.warnings ?? []);
      setSuggestState("loaded");
    } catch {
      setSuggestState("error");
      setErrorMessage("Unable to suggest topics right now. Try again.");
    }
  }

  async function onLoadTemplate() {
    if (!questionTitle.trim()) {
      setTemplateState("error");
      setErrorMessage("Question title is required before loading template.");
      return;
    }

    setTemplateState("loading");
    setErrorMessage("");

    const topicContext = getTopicContext();

    try {
      const response = await fetchWithTimeout("/api/admin/ai-compose", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "resolve_template",
          data: {
            domain: "Salesforce",
            questionTitle: questionTitle.trim(),
            questionType,
            seniorityLevel,
            topicName: topicContext.topicName,
            subcategoryName: topicContext.subcategoryName,
            codeSnippet: "",
          },
        }),
      });

      const body = (await response.json().catch(() => null)) as {
        error?: string;
        resolvedPrompt?: string;
      } | null;

      if (!response.ok) {
        setTemplateState("error");
        setErrorMessage(body?.error ?? "Unable to resolve template.");
        return;
      }

      setTemplatePrompt(body?.resolvedPrompt ?? "");
      setTemplateState("loaded");
    } catch {
      setTemplateState("error");
      setErrorMessage("Unable to resolve template right now.");
    }
  }

  async function onGenerateAnswer() {
    if (!questionTitle.trim()) {
      setGenerateState("error");
      setErrorMessage(
        "Question title is required before generating an answer.",
      );
      return;
    }

    setGenerateState("generating");
    setErrorMessage("");
    setSuccessMessage("");
    setWarningMessages([]);

    const topicContext = getTopicContext();

    try {
      const response = await fetchWithTimeout("/api/admin/ai-compose", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "generate_answer",
          data: {
            domain: "Salesforce",
            questionTitle: questionTitle.trim(),
            questionType,
            seniorityLevel,
            topicName: topicContext.topicName,
            subcategoryName: topicContext.subcategoryName,
            codeSnippet: "",
            promptOverride: templatePrompt,
          },
        }),
      });

      const body = (await response.json().catch(() => null)) as {
        error?: string;
        answerMarkdown?: string;
        resolvedPrompt?: string;
      } | null;

      if (!response.ok) {
        setGenerateState("error");
        setErrorMessage(body?.error ?? "Unable to generate answer.");
        return;
      }

      const generated = body?.answerMarkdown?.trim() ?? "";
      setAnswerContentMarkdown(generated);
      if (body?.resolvedPrompt) {
        setTemplatePrompt(body.resolvedPrompt);
      }
      setGenerateState("generated");
      setSuccessMessage(
        "Answer generated. Review and edit before saving draft.",
      );
    } catch (error) {
      setGenerateState("error");
      if (error instanceof Error && error.name === "AbortError") {
        setErrorMessage(
          "Generate Answer timed out. Check OPENAI_API_KEY/network and try again.",
        );
      } else {
        setErrorMessage("Unable to generate answer right now.");
      }
    }
  }

  async function onSaveDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaveState("saving");
    setErrorMessage("");
    setSuccessMessage("");
    setWarningMessages([]);

    const payload = {
      action: "save_draft" as const,
      data: {
        existingTopicSlugs: linkedTopicSlugs.map((slug) => normalizeSlug(slug)),
        createTopic: {
          enabled: createTopicEnabled,
          slug: normalizeSlug(createTopicSlug),
          name: createTopicName,
          shortDescription: createTopicShortDescription,
          overviewMarkdown: createTopicOverviewMarkdown,
          sortOrder: createTopicSortOrder,
          subcategorySlug: normalizeSlug(createTopicSubcategorySlug ?? ""),
        },
        question: {
          slug: normalizeSlug(questionSlug || lastSavedQuestionSlug),
          title: questionTitle.trim(),
          summary: questionSummary.trim(),
          questionType,
          seniorityLevel,
        },
        answer: {
          title: answerTitle,
          contentMarkdown: answerContentMarkdown,
        },
      },
    };

    try {
      const response = await fetchWithTimeout("/api/admin/ai-compose", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const body = (await response.json().catch(() => null)) as {
        error?: string;
        warnings?: string[];
        previewUrl?: string;
        draft?: {
          questionSlug?: string;
        };
      } | null;

      if (!response.ok) {
        setSaveState("error");
        setErrorMessage(body?.error ?? "Unable to save draft.");
        setWarningMessages(body?.warnings ?? []);
        return;
      }

      const savedSlug = body?.draft?.questionSlug ?? payload.data.question.slug;
      setLastSavedQuestionSlug(savedSlug || "");
      setPreviewUrl(body?.previewUrl ?? "");
      setWarningMessages(body?.warnings ?? []);
      setSaveState("saved");
      setSuccessMessage(
        "Draft saved. Open preview to run final review and publish from preview controls.",
      );
    } catch {
      setSaveState("error");
      setErrorMessage("Unable to save draft right now. Try again.");
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_390px]">
      <form className="space-y-8" onSubmit={onSaveDraft}>
        <section className="space-y-4 rounded-2xl border border-border/80 bg-card/70 p-5">
          <div>
            <h2 className="inline-flex items-center gap-2 font-serif text-2xl tracking-tight">
              Topics
              <HelpHint text="Select existing topics, create a new topic, or ask AI to suggest one when blank." />
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              At least one topic is required before saving draft.
            </p>
          </div>

          <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
            <Combobox
              value={topicPickerSlug}
              onValueChange={setTopicPickerSlug}
              options={topicOptions}
              placeholder="Search and select topic"
              searchPlaceholder="Search by topic, slug, category, subcategory"
              emptyMessage="No topics found."
              noneLabel="No topic selected"
            />
            <Button type="button" variant="outline" onClick={addSelectedTopic}>
              Add Topic
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onSuggestTopics}
              disabled={suggestState === "loading"}
            >
              <Sparkles className="mr-1 h-4 w-4" />
              {suggestState === "loading"
                ? "Suggesting..."
                : "Suggest Topic With AI"}
            </Button>
          </div>

          {suggestions.length ? (
            <div className="space-y-2 rounded-md border border-border/70 bg-background/60 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Suggested Topics
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={`${suggestion.slug}-${suggestion.subcategorySlug}-${suggestion.existingTopicSlug ?? "new"}`}
                    type="button"
                    onClick={() => applyTopicSuggestion(suggestion)}
                    className="rounded-md border border-border bg-background px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                  >
                    <p className="font-medium">{suggestion.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {suggestion.existingTopicSlug
                        ? `Use existing: ${suggestion.existingTopicSlug}`
                        : `Create in ${suggestion.subcategoryName || suggestion.subcategorySlug}`}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {selectedLinkedTopics.length ? (
            <div className="flex flex-wrap gap-2">
              {selectedLinkedTopics.map((topic) => (
                <Badge
                  key={topic.slug}
                  variant="outline"
                  className="inline-flex items-center gap-2"
                >
                  <span>
                    {topic.name} (
                    {topic.subcategoryName ||
                      topic.subcategorySlug ||
                      topic.categoryName ||
                      topic.categorySlug}
                    )
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove ${topic.name}`}
                    onClick={() => removeLinkedTopic(topic.slug)}
                    className="inline-flex items-center justify-center rounded-full p-0.5 hover:bg-foreground/10"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No topics linked yet. Use selection or AI suggestion.
            </p>
          )}

          <label className="flex items-center justify-between rounded-md border border-border/70 bg-background/60 px-3 py-2 text-sm">
            <LabelWithHelp
              label="Create topic inline"
              help="Enable this if no suitable topic exists."
            />
            <Switch
              checked={createTopicEnabled}
              onCheckedChange={setCreateTopicEnabled}
            />
          </label>

          {createTopicEnabled ? (
            <div className="space-y-4 rounded-lg border border-border/70 bg-background/40 p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <LabelWithHelp
                    label="Topic name"
                    help="Required. AI suggestions can prefill this."
                  />
                  <input
                    value={createTopicName}
                    onChange={(event) => setCreateTopicName(event.target.value)}
                    placeholder="e.g. Trigger Context Variables"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <LabelWithHelp
                    label="Custom topic slug (optional)"
                    help="Leave empty to auto-generate from topic name."
                  />
                  <input
                    value={createTopicSlug}
                    onChange={(event) => setCreateTopicSlug(event.target.value)}
                    placeholder="auto from topic name"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </label>
              </div>

              <label className="space-y-2 text-sm">
                <LabelWithHelp
                  label="Short description"
                  help="Required one-line summary for topic cards."
                />
                <input
                  value={createTopicShortDescription}
                  onChange={(event) =>
                    setCreateTopicShortDescription(event.target.value)
                  }
                  placeholder="One-line summary"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>

              <label className="space-y-2 text-sm">
                <LabelWithHelp
                  label="Subcategory"
                  help="Required for topic creation."
                />
                <Combobox
                  value={createTopicSubcategorySlug}
                  onValueChange={setCreateTopicSubcategorySlug}
                  options={subcategoryOptions}
                  placeholder="Select subcategory"
                  searchPlaceholder="Search subcategories"
                  emptyMessage="No subcategories found."
                  noneLabel="No subcategory selected"
                />
              </label>

              <label className="space-y-2 text-sm">
                <LabelWithHelp
                  label="Overview markdown (optional)"
                  help="Long-form topic overview content."
                />
                <textarea
                  value={createTopicOverviewMarkdown}
                  onChange={(event) =>
                    setCreateTopicOverviewMarkdown(event.target.value)
                  }
                  rows={4}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>

              <label className="space-y-2 text-sm">
                <LabelWithHelp
                  label="Topic sort order"
                  help="Lower numbers appear earlier."
                />
                <input
                  type="number"
                  min={0}
                  max={100000}
                  value={createTopicSortOrder}
                  onChange={(event) =>
                    setCreateTopicSortOrder(
                      parseBoundedInt(event.target.value, 0, 0, 100000),
                    )
                  }
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>
            </div>
          ) : null}
        </section>

        <section className="space-y-4 rounded-2xl border border-border/80 bg-card/70 p-5">
          <div>
            <h2 className="inline-flex items-center gap-2 font-serif text-2xl tracking-tight">
              Question
              <HelpHint text="Question type and seniority decide the answer template used by Generate Answer." />
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm md:col-span-2">
              <LabelWithHelp
                label="Question title"
                help="Required. Used for duplicate blocking and prompt generation."
              />
              <input
                value={questionTitle}
                onChange={(event) => setQuestionTitle(event.target.value)}
                placeholder="e.g. Explain the order of execution in Salesforce."
                required
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            <label className="space-y-2 text-sm md:col-span-2">
              <LabelWithHelp
                label="Summary"
                help="Required one-line description shown in question list."
              />
              <textarea
                value={questionSummary}
                onChange={(event) => setQuestionSummary(event.target.value)}
                rows={3}
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            <label className="space-y-2 text-sm">
              <LabelWithHelp
                label="Question type"
                help="Select the template family used for answer generation."
              />
              <select
                value={questionType}
                onChange={(event) =>
                  setQuestionType(event.target.value as QuestionType)
                }
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="standard">standard</option>
                <option value="scenario">scenario</option>
                <option value="code_review">code_review</option>
              </select>
            </label>
            <label className="space-y-2 text-sm">
              <LabelWithHelp
                label="Seniority level"
                help="Controls the depth and calibration of generated answer."
              />
              <select
                value={seniorityLevel}
                onChange={(event) =>
                  setSeniorityLevel(event.target.value as SeniorityLevel)
                }
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="junior">junior</option>
                <option value="mid">mid</option>
                <option value="senior">senior</option>
                <option value="lead">lead</option>
                <option value="architect">architect</option>
              </select>
            </label>
            <label className="space-y-2 text-sm md:col-span-2">
              <LabelWithHelp
                label="Custom slug (optional)"
                help="Leave empty to auto-generate from title."
              />
              <input
                value={questionSlug}
                onChange={(event) => setQuestionSlug(event.target.value)}
                placeholder="auto from title"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
          </div>

          <p className="text-xs text-muted-foreground">
            Effective slug:{" "}
            <span className="font-mono">{effectiveQuestionSlug}</span>
          </p>
        </section>

        <section className="space-y-4 rounded-2xl border border-border/80 bg-card/70 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="inline-flex items-center gap-2 font-serif text-2xl tracking-tight">
              Template and Answer
              <HelpHint text="Load and edit the resolved template prompt for this generation only." />
            </h2>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onLoadTemplate}
                disabled={templateState === "loading"}
              >
                {templateState === "loading"
                  ? "Loading Template..."
                  : "Load Template"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={onGenerateAnswer}
                disabled={generateState === "generating"}
              >
                <WandSparkles className="mr-1 h-4 w-4" />
                {generateState === "generating"
                  ? "Generating..."
                  : "Generate Answer"}
              </Button>
            </div>
          </div>

          <label className="space-y-2 text-sm">
            <LabelWithHelp
              label="Resolved prompt (temporary editable)"
              help="Edit before generation. Edits are used only for this run and are not persisted globally."
            />
            <textarea
              value={templatePrompt}
              onChange={(event) => setTemplatePrompt(event.target.value)}
              rows={10}
              className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>

          <label className="space-y-2 text-sm">
            <LabelWithHelp
              label="Answer title (optional)"
              help="Optional internal title for the answer draft."
            />
            <input
              value={answerTitle}
              onChange={(event) => setAnswerTitle(event.target.value)}
              placeholder="e.g. Order of execution mental model"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>

          <label className="space-y-2 text-sm">
            <LabelWithHelp
              label="Answer markdown"
              help="Generated answer appears here; you can edit before saving."
            />
            <textarea
              value={answerContentMarkdown}
              onChange={(event) => setAnswerContentMarkdown(event.target.value)}
              rows={14}
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={saveState === "saving"}>
            {saveState === "saving" ? "Saving draft..." : "Save Draft"}
          </Button>
          {previewUrl ? (
            <Button asChild type="button" variant="outline">
              <Link href={previewUrl}>Open Preview</Link>
            </Button>
          ) : null}
        </div>

        {successMessage ? (
          <p className="rounded-md border border-emerald-300/60 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {successMessage}
          </p>
        ) : null}
        {errorMessage ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errorMessage}
          </p>
        ) : null}
        {warningMessages.length ? (
          <div className="rounded-md border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <p className="font-medium">Warnings</p>
            <ul className="mt-1 list-disc pl-5">
              {warningMessages.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </form>

      <aside className="space-y-5">
        <section className="space-y-4 rounded-2xl border border-border/80 bg-card/70 p-5">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Runtime Preview
            </p>
            <h3 className="font-serif text-2xl leading-tight">
              {questionTitle.trim() || "Question title preview"}
            </h3>
            <p className="text-sm leading-6 text-muted-foreground">
              {questionSummary.trim() || "Question summary preview."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">type: {questionType}</Badge>
            <Badge variant="outline">seniority: {seniorityLevel}</Badge>
          </div>

          <Separator />

          <div className="max-h-[420px] overflow-auto rounded-md border border-border/80 bg-background/90 p-4">
            <div className="interview-prose prose prose-neutral max-w-none text-sm">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {answerContentMarkdown.trim() ||
                  "Generated answer markdown preview appears here."}
              </ReactMarkdown>
            </div>
          </div>
        </section>
      </aside>
    </div>
  );
}
