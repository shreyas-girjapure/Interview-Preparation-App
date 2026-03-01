"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { showAppToast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
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

import { Plus, ListPlus, Loader2 } from "lucide-react";
import type { PickerQuestion } from "./picker-question";
import { PlaylistQuestionPicker } from "./playlist-question-picker";
import { createUserPlaylist } from "./playlist-actions";

type CreatePlaylistModalProps = {
  questions: PickerQuestion[];
  isSignedIn: boolean;
};

function toSlug(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function CreatePlaylistModal({
  questions,
  isSignedIn,
}: CreatePlaylistModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  const handleButtonClick = () => {
    if (!isSignedIn) {
      showAppToast({
        title: "Sign in required",
        description: "Please sign in to create a playlist.",
      });
      router.push(`/login?next=${encodeURIComponent("/playlists")}`);
      return;
    }
    setOpen(true);
  };

  const slug = toSlug(name);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setName("");
      setDescription("");
      setSelected([]);
    }
  };

  const handleCreate = () => {
    if (!name.trim()) {
      showAppToast({
        title: "Playlist name required",
        description: "Enter a playlist name to continue.",
      });
      return;
    }
    if (!description.trim()) {
      showAppToast({
        title: "Description required",
        description: "Add a short description for your playlist.",
      });
      return;
    }
    if (selected.length === 0) {
      showAppToast({
        title: "Questions required",
        description: "Select at least one question.",
      });
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
          showAppToast({
            title: "Create playlist failed",
            description: result.message,
          });
          return;
        }

        showAppToast({
          title: "Playlist created",
          description: result.message,
        });
        handleOpenChange(false);
      })();
    });
  };

  return (
    <>
      <Button
        size="icon"
        className="shrink-0 sm:h-10 sm:w-auto sm:px-4"
        onClick={handleButtonClick}
        aria-label="Create playlist"
      >
        <Plus className="size-4" />
        <span className="hidden sm:inline">Create Playlist</span>
        <span className="sr-only sm:hidden">Create Playlist</span>
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
            <div className="space-y-1.5">
              <Label htmlFor="playlist-name">
                Playlist Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="playlist-name"
                placeholder="e.g. My JavaScript Deep Dive"
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={isPending}
              />
              {slug && (
                <p className="text-xs text-muted-foreground">
                  Slug:{" "}
                  <span className="font-mono text-foreground/70">{slug}</span>
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="playlist-desc">
                Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="playlist-desc"
                placeholder="Describe what this playlist covers..."
                rows={2}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="resize-none"
                disabled={isPending}
              />
            </div>

            <Separator />

            <PlaylistQuestionPicker
              questions={questions}
              selectedIds={selected}
              onSelectedIdsChange={setSelected}
              disabled={isPending}
              label="Add Questions"
            />
          </div>

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
