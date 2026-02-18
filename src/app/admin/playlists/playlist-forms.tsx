"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import {
  MultiCombobox,
  type MultiComboboxOption,
} from "@/components/ui/multi-combobox";

type ServerActionResult = {
  ok: boolean;
  message: string;
};

type ServerAction = (formData: FormData) => Promise<ServerActionResult>;

type PlaylistOption = {
  id: string;
  title: string;
  slug: string;
  status: string;
};

type QuestionOption = {
  id: string;
  title: string;
  slug: string;
};

type AdminPlaylistFormsProps = {
  createPlaylistAction: ServerAction;
  linkQuestionsAction: ServerAction;
  playlists: PlaylistOption[];
  questions: QuestionOption[];
};

const PLAYLIST_TYPE_OPTIONS: ComboboxOption[] = [
  {
    value: "role",
    label: "Role",
    keywords: ["job", "track"],
  },
  {
    value: "company",
    label: "Company",
    keywords: ["brand", "target"],
  },
  {
    value: "custom",
    label: "Custom",
    keywords: ["manual", "bespoke"],
  },
];

const ACCESS_LEVEL_OPTIONS: ComboboxOption[] = [
  {
    value: "free",
    label: "Free",
    keywords: ["public"],
  },
  {
    value: "preview",
    label: "Preview",
    keywords: ["partial", "teaser"],
  },
  {
    value: "paid",
    label: "Paid",
    keywords: ["premium", "subscription"],
  },
];

const STATUS_OPTIONS: ComboboxOption[] = [
  {
    value: "draft",
    label: "Draft",
    keywords: ["hidden"],
  },
  {
    value: "published",
    label: "Published",
    keywords: ["visible", "live"],
  },
];

const inputClassName =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring";

const textAreaClassName =
  "min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring";

function CreatePlaylistForm({
  createPlaylistAction,
}: {
  createPlaylistAction: ServerAction;
}) {
  const [playlistType, setPlaylistType] = useState("role");
  const [accessLevel, setAccessLevel] = useState("free");
  const [status, setStatus] = useState("draft");
  const [isPending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    startTransition(() => {
      void (async () => {
        const result = await createPlaylistAction(formData);

        if (!result.ok) {
          toast.error(result.message);
          return;
        }

        toast.success(result.message);
        form.reset();
        setPlaylistType("role");
        setAccessLevel("free");
        setStatus("draft");
      })();
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-2xl border border-border/70 bg-card/70 p-5"
    >
      <h2 className="font-serif text-2xl tracking-tight">Create playlist</h2>

      <label className="space-y-2 text-sm">
        <span className="font-medium">Playlist title</span>
        <input
          name="title"
          required
          minLength={3}
          maxLength={300}
          placeholder="Salesforce interview warmup"
          className={inputClassName}
        />
        <p className="text-xs text-muted-foreground">
          Display name shown on playlist cards.
        </p>
      </label>

      <label className="space-y-2 text-sm">
        <span className="font-medium">Playlist slug</span>
        <input
          name="slug"
          required
          minLength={3}
          maxLength={120}
          pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
          placeholder="salesforce-interview-warmup"
          className={inputClassName}
        />
        <p className="text-xs text-muted-foreground">
          Lowercase letters, numbers, and hyphens only.
        </p>
      </label>

      <label className="space-y-2 text-sm">
        <span className="font-medium">Description</span>
        <textarea
          name="description"
          maxLength={1200}
          placeholder="What this playlist helps the learner practice."
          className={textAreaClassName}
        />
        <p className="text-xs text-muted-foreground">
          Optional short summary for playlist pages.
        </p>
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span className="font-medium">Playlist type</span>
          <Combobox
            value={playlistType}
            onValueChange={(value) => setPlaylistType(value ?? "role")}
            options={PLAYLIST_TYPE_OPTIONS}
            placeholder="Select playlist type"
            searchPlaceholder="Search playlist types"
            emptyMessage="No playlist types found."
          />
          <input type="hidden" name="playlistType" value={playlistType} />
        </label>

        <label className="space-y-2 text-sm">
          <span className="font-medium">Access level</span>
          <Combobox
            value={accessLevel}
            onValueChange={(value) => setAccessLevel(value ?? "free")}
            options={ACCESS_LEVEL_OPTIONS}
            placeholder="Select access level"
            searchPlaceholder="Search access levels"
            emptyMessage="No access levels found."
          />
          <input type="hidden" name="accessLevel" value={accessLevel} />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="space-y-2 text-sm md:col-span-1">
          <span className="font-medium">Status</span>
          <Combobox
            value={status}
            onValueChange={(value) => setStatus(value ?? "draft")}
            options={STATUS_OPTIONS}
            placeholder="Select status"
            searchPlaceholder="Search statuses"
            emptyMessage="No statuses found."
          />
          <input type="hidden" name="status" value={status} />
        </label>

        <label className="space-y-2 text-sm">
          <span className="font-medium">Sort order</span>
          <input
            name="sortOrder"
            type="number"
            inputMode="numeric"
            min={0}
            max={100000}
            step={1}
            defaultValue={0}
            className={inputClassName}
          />
          <p className="text-xs text-muted-foreground">
            Lower numbers are shown first.
          </p>
        </label>

        <label className="space-y-2 text-sm">
          <span className="font-medium">Preview count</span>
          <input
            name="previewCount"
            type="number"
            inputMode="numeric"
            min={0}
            max={50}
            step={1}
            defaultValue={3}
            className={inputClassName}
          />
          <p className="text-xs text-muted-foreground">
            Number of free preview questions.
          </p>
        </label>
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Creating..." : "Create playlist"}
      </Button>
    </form>
  );
}

function LinkQuestionsForm({
  linkQuestionsAction,
  playlists,
  questions,
}: {
  linkQuestionsAction: ServerAction;
  playlists: PlaylistOption[];
  questions: QuestionOption[];
}) {
  const [playlistId, setPlaylistId] = useState<string | null>(null);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  const playlistOptions = useMemo<ComboboxOption[]>(
    () =>
      playlists.map((playlist) => ({
        value: playlist.id,
        label: `${playlist.title} (${playlist.status})`,
        keywords: [playlist.slug],
      })),
    [playlists],
  );

  const questionOptions = useMemo<MultiComboboxOption[]>(
    () =>
      questions.map((question) => ({
        value: question.id,
        label: question.title,
        keywords: [question.slug],
      })),
    [questions],
  );

  const canSubmit = playlistId !== null && selectedQuestionIds.length > 0;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      toast.error("Select a playlist and at least one published question.");
      return;
    }

    const formData = new FormData(event.currentTarget);

    startTransition(() => {
      void (async () => {
        const result = await linkQuestionsAction(formData);

        if (!result.ok) {
          toast.error(result.message);
          return;
        }

        toast.success(result.message);
        setSelectedQuestionIds([]);
      })();
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-2xl border border-border/70 bg-card/70 p-5"
    >
      <h2 className="font-serif text-2xl tracking-tight">Link questions</h2>

      <label className="space-y-2 text-sm">
        <span className="font-medium">Playlist</span>
        <Combobox
          value={playlistId}
          onValueChange={setPlaylistId}
          options={playlistOptions}
          placeholder="Select a playlist"
          searchPlaceholder="Search playlists"
          emptyMessage="No playlists found."
        />
        <input type="hidden" name="playlistId" value={playlistId ?? ""} />
      </label>

      <label className="space-y-2 text-sm">
        <span className="font-medium">Published questions</span>
        <MultiCombobox
          values={selectedQuestionIds}
          onValuesChange={setSelectedQuestionIds}
          options={questionOptions}
          placeholder="Select one or more questions"
          searchPlaceholder="Search published questions"
          emptyMessage="No published questions found."
          selectedSummaryLabel="questions selected"
        />
        {selectedQuestionIds.map((questionId) => (
          <input
            key={questionId}
            type="hidden"
            name="questionIds"
            value={questionId}
          />
        ))}
        <p className="text-xs text-muted-foreground">
          Pick multiple questions in one pass, then submit once.
        </p>
      </label>

      <label className="space-y-2 text-sm">
        <span className="font-medium">Starting sort order</span>
        <input
          name="sortOrder"
          type="number"
          inputMode="numeric"
          min={1}
          max={100000}
          step={1}
          defaultValue={1}
          className={inputClassName}
        />
        <p className="text-xs text-muted-foreground">
          Selected questions are assigned sequentially from this number.
        </p>
      </label>

      <p className="text-xs text-muted-foreground">
        {selectedQuestionIds.length} question
        {selectedQuestionIds.length === 1 ? "" : "s"} currently selected.
      </p>

      <Button
        type="submit"
        variant="secondary"
        disabled={!canSubmit || isPending}
      >
        {isPending ? "Linking..." : "Link selected questions"}
      </Button>
    </form>
  );
}

export function AdminPlaylistForms({
  createPlaylistAction,
  linkQuestionsAction,
  playlists,
  questions,
}: AdminPlaylistFormsProps) {
  return (
    <section className="grid gap-6 lg:grid-cols-2">
      <CreatePlaylistForm createPlaylistAction={createPlaylistAction} />
      <LinkQuestionsForm
        linkQuestionsAction={linkQuestionsAction}
        playlists={playlists}
        questions={questions}
      />
    </section>
  );
}
