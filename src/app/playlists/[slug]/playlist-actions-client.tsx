"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Pencil, Trash2 } from "lucide-react";

import { deleteUserPlaylist, updateUserPlaylist } from "./playlist-actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { showAppToast } from "@/lib/toast";

type PlaylistActionsProps = {
  playlistId: string;
  initialTitle: string;
  initialDescription: string;
};

function showSuccessToast(title: string, description: string) {
  requestAnimationFrame(() => {
    showAppToast({ title, description });
  });
}

export function PlaylistActions({
  playlistId,
  initialTitle,
  initialDescription,
}: PlaylistActionsProps) {
  const router = useRouter();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [savedTitle, setSavedTitle] = useState(initialTitle);
  const [savedDescription, setSavedDescription] = useState(initialDescription);
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);

  function resetDraftValues() {
    setTitle(savedTitle);
    setDescription(savedDescription);
  }

  function onEditOpenChange(nextOpen: boolean) {
    if (isSaving) {
      return;
    }

    setIsEditOpen(nextOpen);

    if (!nextOpen) {
      resetDraftValues();
    }
  }

  async function handleSave() {
    const nextTitle = title.trim();

    if (!nextTitle) {
      showAppToast({
        title: "Playlist name required",
        description: "Enter a playlist name to continue.",
      });
      return;
    }

    setIsSaving(true);

    try {
      const result = await updateUserPlaylist({
        playlistId,
        title: nextTitle,
        description,
      });

      if (!result.ok) {
        showAppToast({
          title: "Update playlist failed",
          description: result.message,
        });
        return;
      }

      const nextDescription = result.description ?? "";
      setSavedTitle(result.title);
      setSavedDescription(nextDescription);
      setTitle(result.title);
      setDescription(nextDescription);
      setIsEditOpen(false);

      showSuccessToast(
        "Playlist updated",
        "Your changes were saved successfully.",
      );
      router.refresh();
    } catch {
      showAppToast({
        title: "Update playlist failed",
        description: "Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);

    try {
      const result = await deleteUserPlaylist({ playlistId });

      if (!result.ok) {
        showAppToast({
          title: "Delete playlist failed",
          description: result.message,
        });
        return;
      }

      setIsDeleteOpen(false);
      showSuccessToast(
        "Playlist deleted",
        `"${result.deletedTitle}" was removed from your playlists.`,
      );
      router.push("/playlists");
    } catch {
      showAppToast({
        title: "Delete playlist failed",
        description: "Please try again.",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <div className="flex w-fit items-stretch rounded-md border border-input shadow-sm">
        <Button
          variant="ghost"
          size="sm"
          className="h-9 gap-1.5 rounded-r-none border-r border-input px-3 font-medium"
          onClick={() => setIsEditOpen(true)}
        >
          <Pencil className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Edit Playlist</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 rounded-l-none px-2"
              aria-label="More options"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[160px]">
            <DropdownMenuItem
              onSelect={() => setIsEditOpen(true)}
              className="gap-2"
            >
              <Pencil className="h-4 w-4" />
              Edit details
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => setIsDeleteOpen(true)}
              className="gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              Delete playlist
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={isEditOpen} onOpenChange={onEditOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Playlist</DialogTitle>
            <DialogDescription>
              Update the name and description of your playlist.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="playlist-name">Playlist Name</Label>
              <Input
                id="playlist-name"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. React Interview Prep"
                autoFocus
                disabled={isSaving}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="playlist-description">
                Description{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <Textarea
                id="playlist-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What is this playlist about?"
                rows={3}
                disabled={isSaving}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => onEditOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !title.trim()}>
              {isSaving ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={isDeleteOpen}
        onOpenChange={(nextOpen) => {
          if (!isDeleting) {
            setIsDeleteOpen(nextOpen);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this playlist?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="text-foreground">{savedTitle}</strong> will be
              permanently deleted. The questions inside will remain available in
              the question bank. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete playlist"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
