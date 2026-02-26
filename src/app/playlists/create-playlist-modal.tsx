"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Check, Plus, Search, ListPlus, Loader2, X } from "lucide-react";
import { createUserPlaylist } from "./playlist-actions";

/* ── Types ── */
export type PickerQuestion = {
  id: string;
  title: string;
  topic: string;
};

type CreatePlaylistModalProps = {
  questions: PickerQuestion[];
  isSignedIn: boolean;
};

/* ── Constants ── */
const PAGE_SIZE = 6;

function toSlug(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/* ── Component ── */
export function CreatePlaylistModal({
  questions,
  isSignedIn,
}: CreatePlaylistModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isPending, startTransition] = useTransition();

  // Auth-gated open
  const handleButtonClick = () => {
    if (!isSignedIn) {
      toast.error("Please sign in to create a playlist.");
      router.push(`/login?next=${encodeURIComponent("/playlists")}`);
      return;
    }
    setOpen(true);
  };

  const slug = toSlug(name);

  // Derive topics from the question data
  const topics = useMemo(() => {
    const set = new Set<string>();
    for (const q of questions) {
      if (q.topic) set.add(q.topic);
    }
    return Array.from(set).sort();
  }, [questions]);

  // Filter questions by search + topic
  const filtered = useMemo(() => {
    return questions.filter((q) => {
      const matchesSearch =
        !search ||
        q.title.toLowerCase().includes(search.toLowerCase()) ||
        q.topic.toLowerCase().includes(search.toLowerCase());
      const matchesTopic =
        selectedTopics.length === 0 || selectedTopics.includes(q.topic);
      return matchesSearch && matchesTopic;
    });
  }, [questions, search, selectedTopics]);

  // Suggested topics based on search
  const suggestedTopics = useMemo(() => {
    if (!search.trim()) return [];
    return topics
      .filter(
        (t) =>
          t.toLowerCase().includes(search.toLowerCase()) &&
          !selectedTopics.includes(t),
      )
      .slice(0, 10);
  }, [search, topics, selectedTopics]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  // Reset visible count when filters change
  const handleTopicToggle = (topic: string) => {
    setSelectedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic],
    );
    setVisibleCount(PAGE_SIZE);
  };
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setVisibleCount(PAGE_SIZE);
  };

  // Reset form when dialog closes
  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setName("");
      setDescription("");
      setSelected([]);
      setSearch("");
      setSelectedTopics([]);
      setVisibleCount(PAGE_SIZE);
    }
  };

  // Submit
  const handleCreate = () => {
    if (!name.trim()) {
      toast.error("Playlist name is required.");
      return;
    }
    if (!description.trim()) {
      toast.error("Description is required.");
      return;
    }
    if (selected.length === 0) {
      toast.error("Select at least one question.");
      return;
    }

    startTransition(() => {
      void (async () => {
        const result = await createUserPlaylist({
          name: name.trim(),
          description: description.trim(),
          questionIds: selected,
        });

        if (!result.ok) {
          toast.error(result.message);
          return;
        }

        toast.success(result.message);
        handleOpenChange(false);
      })();
    });
  };

  return (
    <>
      <Button size="lg" className="gap-2" onClick={handleButtonClick}>
        <Plus className="size-4" />
        Create Playlist
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-5 pt-5 pb-0 sm:px-6">
            <DialogTitle className="font-serif text-2xl">
              Create New Playlist
            </DialogTitle>
            <DialogDescription>
              Build a custom collection from available questions.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 px-5 py-4 sm:px-6">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="playlist-name">
                Playlist Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="playlist-name"
                placeholder="e.g. My JavaScript Deep Dive"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isPending}
              />
              {slug && (
                <p className="text-xs text-muted-foreground">
                  Slug:{" "}
                  <span className="font-mono text-foreground/70">{slug}</span>
                </p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="playlist-desc">
                Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="playlist-desc"
                placeholder="Describe what this playlist covers..."
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="resize-none"
                disabled={isPending}
              />
            </div>

            <Separator />

            {/* Questions section header */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Add Questions</Label>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {selected.length} selected
                  </span>
                  {(selected.length > 0 || selectedTopics.length > 0) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelected([]);
                        setSelectedTopics([]);
                      }}
                      className="flex items-center gap-1 text-xs font-medium text-muted-foreground underline hover:text-foreground md:no-underline md:hover:underline transition-colors"
                    >
                      Clear all
                      <X className="size-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Search bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title or topic..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  disabled={isPending}
                />
              </div>

              {/* Topic filter pills */}
              {(selectedTopics.length > 0 || suggestedTopics.length > 0) && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedTopics.map((topic) => (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => handleTopicToggle(topic)}
                      disabled={isPending}
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-medium border transition-all flex items-center gap-1",
                        "bg-primary text-primary-foreground border-primary hover:bg-primary/90",
                      )}
                    >
                      {topic} <span className="opacity-70 text-[10px]">✕</span>
                    </button>
                  ))}
                  {suggestedTopics.map((topic) => (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => handleTopicToggle(topic)}
                      disabled={isPending}
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-medium border transition-all flex items-center gap-1",
                        "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                      )}
                    >
                      {topic} <span className="opacity-70 text-[10px]">+</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Full-width question tiles */}
            <div className="space-y-2">
              {visible.map((q) => {
                const isSelected = selected.includes(q.id);
                return (
                  <button
                    key={q.id}
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      setSelected((prev) =>
                        isSelected
                          ? prev.filter((id) => id !== q.id)
                          : [...prev, q.id],
                      )
                    }
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border p-3.5 text-left text-sm transition-all",
                      isSelected
                        ? "border-primary/40 bg-primary/5 shadow-sm ring-1 ring-primary/10"
                        : "border-border/60 hover:border-border hover:bg-accent/30",
                    )}
                  >
                    <div
                      className={cn(
                        "flex items-center justify-center size-7 rounded-lg transition-colors shrink-0",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {isSelected ? (
                        <Check className="size-4" />
                      ) : (
                        <Plus className="size-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium leading-snug">{q.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {q.topic}
                      </p>
                    </div>
                  </button>
                );
              })}

              {filtered.length === 0 && (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No questions match your filters.
                </div>
              )}

              {/* Load more */}
              {hasMore && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full mt-1"
                  disabled={isPending}
                  onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                >
                  Load more ({filtered.length - visibleCount} remaining)
                </Button>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t px-5 py-4 sm:px-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              disabled={isPending}
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              className="w-full sm:w-auto gap-1.5"
              onClick={handleCreate}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <ListPlus className="size-4" />
                  Create Playlist
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
