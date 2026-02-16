"use client";

import Link from "next/link";
import { CircleHelp, X } from "lucide-react";
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
  status: string;
  subcategorySlug: string;
  subcategoryName: string;
  categorySlug: string;
  categoryName: string;
};

type SaveState = "idle" | "saving" | "saved" | "error";
type PublishState = "idle" | "publishing" | "published" | "error";

function normalizeSlug(value: string) {
  return value.trim().toLowerCase();
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

function slugifyText(value: string, fallback = "untitled") {
  const normalized = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return normalized || fallback;
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

export function AdminContentComposer({
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
  const [publishCreatedTopicNow, setPublishCreatedTopicNow] = useState(true);

  const [questionSlug, setQuestionSlug] = useState("");
  const [questionTitle, setQuestionTitle] = useState("");
  const [questionSummary, setQuestionSummary] = useState("");

  const [answerTitle, setAnswerTitle] = useState("");
  const [answerContentMarkdown, setAnswerContentMarkdown] = useState("");

  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [publishState, setPublishState] = useState<PublishState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [warningMessages, setWarningMessages] = useState<string[]>([]);
  const [lastSavedQuestionSlug, setLastSavedQuestionSlug] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [publicUrl, setPublicUrl] = useState("");

  const selectedLinkedTopics = linkedTopicSlugs
    .map((slug) => topicBySlug.get(slug))
    .filter((topic): topic is TopicOption => Boolean(topic));

  const selectedCreateSubcategory = createTopicSubcategorySlug
    ? subcategoryBySlug.get(createTopicSubcategorySlug)
    : null;

  const computedAutoQuestionSlug = useMemo(() => {
    if (questionSlug.trim()) {
      return normalizeSlug(questionSlug);
    }

    if (lastSavedQuestionSlug) {
      return normalizeSlug(lastSavedQuestionSlug);
    }

    return slugifyText(questionTitle, "question");
  }, [questionSlug, questionTitle, lastSavedQuestionSlug]);

  const inferredPreviewUrl = useMemo(() => {
    return computedAutoQuestionSlug
      ? `/admin/questions/preview/${computedAutoQuestionSlug}`
      : "";
  }, [computedAutoQuestionSlug]);

  const previewCategoryNames = useMemo(() => {
    const names = new Set<string>();

    selectedLinkedTopics.forEach((topic) => {
      if (topic.categoryName) {
        names.add(topic.categoryName);
      }
    });

    if (createTopicEnabled && selectedCreateSubcategory?.categoryName) {
      names.add(selectedCreateSubcategory.categoryName);
    }

    return Array.from(names);
  }, [selectedLinkedTopics, createTopicEnabled, selectedCreateSubcategory]);

  const previewTopicNames = useMemo(() => {
    const names = new Set<string>();

    selectedLinkedTopics.forEach((topic) => {
      names.add(topic.name);
    });

    if (createTopicEnabled && createTopicName.trim()) {
      names.add(createTopicName.trim());
    }

    return Array.from(names);
  }, [selectedLinkedTopics, createTopicEnabled, createTopicName]);

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

  async function onSaveDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaveState("saving");
    setPublishState("idle");
    setErrorMessage("");
    setSuccessMessage("");
    setWarningMessages([]);
    setPublicUrl("");

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
          publishNow: publishCreatedTopicNow,
        },
        question: {
          slug: normalizeSlug(questionSlug || lastSavedQuestionSlug),
          title: questionTitle.trim(),
          summary: questionSummary.trim(),
        },
        answer: {
          title: answerTitle,
          contentMarkdown: answerContentMarkdown,
        },
      },
    };

    try {
      const response = await fetch("/api/admin/content-package", {
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
        publishPayload?: {
          questionSlug?: string;
        };
      } | null;

      if (!response.ok) {
        setSaveState("error");
        setErrorMessage(body?.error ?? "Unable to save draft package.");
        setWarningMessages(body?.warnings ?? []);
        return;
      }

      const savedSlug =
        body?.publishPayload?.questionSlug ?? payload.data.question.slug;
      setLastSavedQuestionSlug(savedSlug);
      setPreviewUrl(body?.previewUrl ?? "");
      setWarningMessages(body?.warnings ?? []);
      setSaveState("saved");
      setSuccessMessage(
        "Draft saved. Review runtime/full preview, then publish.",
      );
    } catch {
      setSaveState("error");
      setErrorMessage(
        "Unable to save draft package right now. Check your connection and try again.",
      );
    }
  }

  async function onPublish() {
    const publishSlug = normalizeSlug(lastSavedQuestionSlug || questionSlug);

    if (!publishSlug) {
      setPublishState("error");
      setErrorMessage(
        "Save a draft with a valid question slug before publishing.",
      );
      return;
    }

    setPublishState("publishing");
    setErrorMessage("");
    setSuccessMessage("");
    setWarningMessages([]);

    try {
      const response = await fetch("/api/admin/content-package", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "publish",
          data: {
            questionSlug: publishSlug,
          },
        }),
      });

      const body = (await response.json().catch(() => null)) as {
        error?: string;
        warnings?: string[];
        publicUrl?: string;
        previewUrl?: string;
      } | null;

      if (!response.ok) {
        setPublishState("error");
        setErrorMessage(body?.error ?? "Unable to publish content package.");
        setWarningMessages(body?.warnings ?? []);
        return;
      }

      setPublishState("published");
      setWarningMessages(body?.warnings ?? []);
      setPublicUrl(body?.publicUrl ?? "");
      setPreviewUrl(body?.previewUrl ?? previewUrl);
      setSuccessMessage(
        "Published. This write is persisted in Supabase and the question is now live.",
      );
    } catch {
      setPublishState("error");
      setErrorMessage(
        "Unable to publish right now. Check your connection and try again.",
      );
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_390px]">
      <form className="space-y-8" onSubmit={onSaveDraft}>
        <section className="space-y-4 rounded-2xl border border-border/80 bg-card/70 p-5">
          <div>
            <h2 className="inline-flex items-center gap-2 font-serif text-2xl tracking-tight">
              Linked Topics
              <HelpHint text="Choose one or more existing topics for the question. Category is inferred automatically from these topics." />
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Topic-first authoring with multi-topic linking.
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
              No topics linked yet.
            </p>
          )}

          <label className="flex items-center justify-between rounded-md border border-border/70 bg-background/60 px-3 py-2 text-sm">
            <LabelWithHelp
              label="Create topic inline"
              help="Enable this if the topic does not exist yet. It will be created and linked automatically."
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
                    help="Required. Slug is auto-generated from name if left blank."
                  />
                  <input
                    value={createTopicName}
                    onChange={(event) => setCreateTopicName(event.target.value)}
                    placeholder="e.g. Event Loop Internals"
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
                  help="Select an existing subcategory. Category is inferred from this selection."
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
                <p className="text-xs text-muted-foreground">
                  Category:{" "}
                  {selectedCreateSubcategory?.categoryName || "Unknown"}
                </p>
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

              <div className="grid gap-4 md:grid-cols-2">
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
                <label className="flex items-center justify-between rounded-md border border-border/70 bg-background/60 px-3 py-2 text-sm">
                  <LabelWithHelp
                    label="Publish new topic now"
                    help="Publishes created topic immediately during draft save."
                  />
                  <Switch
                    checked={publishCreatedTopicNow}
                    onCheckedChange={setPublishCreatedTopicNow}
                  />
                </label>
              </div>
            </div>
          ) : null}
        </section>

        <section className="space-y-4 rounded-2xl border border-border/80 bg-card/70 p-5">
          <div>
            <h2 className="inline-flex items-center gap-2 font-serif text-2xl tracking-tight">
              Question
              <HelpHint text="Slug auto-generates from title if custom slug is empty." />
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm md:col-span-2">
              <LabelWithHelp
                label="Question title"
                help="Required. Used for auto slug generation and duplicate checks."
              />
              <input
                value={questionTitle}
                onChange={(event) => setQuestionTitle(event.target.value)}
                placeholder="e.g. Explain the Node.js event loop."
                required
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            <label className="space-y-2 text-sm md:col-span-2">
              <LabelWithHelp
                label="Custom slug (optional)"
                help="Leave empty to auto-generate from title. Saved draft slug is reused automatically."
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
            <span className="font-mono">{computedAutoQuestionSlug}</span>
          </p>

          <label className="space-y-2 text-sm">
            <LabelWithHelp
              label="Summary"
              help="Displayed in question catalog and detail page hero."
            />
            <textarea
              value={questionSummary}
              onChange={(event) => setQuestionSummary(event.target.value)}
              rows={3}
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
        </section>

        <section className="space-y-4 rounded-2xl border border-border/80 bg-card/70 p-5">
          <div>
            <h2 className="inline-flex items-center gap-2 font-serif text-2xl tracking-tight">
              Answer
              <HelpHint text="Runtime markdown preview updates instantly on the right." />
            </h2>
          </div>

          <label className="space-y-2 text-sm">
            <LabelWithHelp
              label="Answer title (optional)"
              help="Optional internal title for primary answer."
            />
            <input
              value={answerTitle}
              onChange={(event) => setAnswerTitle(event.target.value)}
              placeholder="e.g. Event loop mental model"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>

          <label className="space-y-2 text-sm">
            <LabelWithHelp
              label="Answer markdown"
              help="Primary content shown on question detail page."
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
          <Button
            type="button"
            variant="secondary"
            disabled={publishState === "publishing"}
            onClick={onPublish}
          >
            {publishState === "publishing" ? "Publishing..." : "Publish"}
          </Button>
          {previewUrl || inferredPreviewUrl ? (
            <Button asChild type="button" variant="outline">
              <Link href={previewUrl || inferredPreviewUrl}>
                Open Full Preview
              </Link>
            </Button>
          ) : null}
          {publicUrl ? (
            <Button asChild type="button" variant="outline">
              <Link href={publicUrl}>Open Live Question</Link>
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
            <p className="font-medium">Duplicate/quality warnings</p>
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
            {previewCategoryNames.length ? (
              previewCategoryNames.map((name) => (
                <Badge key={name} variant="outline">
                  {name}
                </Badge>
              ))
            ) : (
              <Badge variant="outline">Category pending</Badge>
            )}
            {previewTopicNames.length ? (
              previewTopicNames.map((name) => (
                <Badge key={name} variant="outline">
                  {name}
                </Badge>
              ))
            ) : (
              <Badge variant="outline">Topics pending</Badge>
            )}
          </div>

          <Separator />

          <div className="max-h-[420px] overflow-auto rounded-md border border-border/80 bg-background/90 p-4">
            <div className="interview-prose prose prose-neutral max-w-none text-sm">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {answerContentMarkdown.trim() ||
                  "Answer markdown runtime preview appears here as you type."}
              </ReactMarkdown>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Runtime preview updates instantly. Use{" "}
            <span className="font-medium">Open Full Preview</span> to see full
            page rendering.
          </p>
        </section>
      </aside>
    </div>
  );
}
