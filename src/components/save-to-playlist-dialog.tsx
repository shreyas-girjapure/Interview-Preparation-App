"use client";

import {
  useEffect,
  useState,
  useTransition,
  useCallback,
  useMemo,
} from "react";
import {
  Check,
  Loader2,
  ListPlus,
  ListMusic,
  Search,
  Lock,
  Globe,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { showAppToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  getUserPlaylistsForQuestion,
  toggleQuestionInPlaylist,
  type PlaylistWithPresence,
} from "@/app/(site)/playlists/playlist-actions";

const PAGE_SIZE = 6;

type SaveToPlaylistDialogProps = {
  questionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAuthenticated: boolean;
};

export function SaveToPlaylistDialog({
  questionId,
  open,
  onOpenChange,
  isAuthenticated,
}: SaveToPlaylistDialogProps) {
  const [playlists, setPlaylists] = useState<PlaylistWithPresence[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const loadPlaylists = useCallback(() => {
    setIsLoading(true);
    getUserPlaylistsForQuestion(questionId)
      .then((res) => {
        if (res.ok) {
          setPlaylists(res.playlists);
        } else {
          showAppToast({
            title: "Failed to load playlists",
            description: res.message || "Unknown error",
          });
        }
      })
      .finally(() => setIsLoading(false));
  }, [questionId]);

  useEffect(() => {
    if (open && isAuthenticated) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetching on open
      loadPlaylists();
      setSearch("");
      setVisibleCount(PAGE_SIZE);
    }
  }, [open, isAuthenticated, loadPlaylists]);

  const filteredPlaylists = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return playlists;
    return playlists.filter((p) => p.title.toLowerCase().includes(q));
  }, [playlists, search]);

  const visiblePlaylists = filteredPlaylists.slice(0, visibleCount);
  const hasMore = visibleCount < filteredPlaylists.length;

  function handleSearchChange(value: string) {
    setSearch(value);
    setVisibleCount(PAGE_SIZE);
  }

  function handleToggle(playlistId: string, currentHasQuestion: boolean) {
    if (isPending) return;

    const playlistName =
      playlists.find((p) => p.id === playlistId)?.title ?? "Playlist";

    setPlaylists((prev) =>
      prev.map((p) =>
        p.id === playlistId ? { ...p, hasQuestion: !currentHasQuestion } : p,
      ),
    );

    startTransition(async () => {
      const res = await toggleQuestionInPlaylist({
        playlistId,
        questionId,
        isAdding: !currentHasQuestion,
      });

      if (!res.ok) {
        showAppToast({
          title: "Update failed",
          description: res.message,
        });
        setPlaylists((prev) =>
          prev.map((p) =>
            p.id === playlistId ? { ...p, hasQuestion: currentHasQuestion } : p,
          ),
        );
      } else {
        showAppToast({
          title: !currentHasQuestion
            ? "Added to playlist"
            : "Removed from playlist",
          description: !currentHasQuestion
            ? `Question added to ${playlistName}.`
            : `Question removed from ${playlistName}.`,
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-4 sm:px-6">
          <DialogTitle>Add to playlist</DialogTitle>
          <DialogDescription>
            Select playlists to add or remove this question.
          </DialogDescription>
        </DialogHeader>

        <Separator />

        {/* Search bar */}
        {!isLoading && playlists.length > 0 && (
          <div className="px-4 pt-3 pb-1 sm:px-5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search playlists..."
                className="pl-9"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Playlist list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredPlaylists.length > 0 ? (
            <div className="px-2 py-1.5">
              {visiblePlaylists.map((playlist) => (
                <button
                  key={playlist.id}
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    handleToggle(playlist.id, playlist.hasQuestion)
                  }
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors",
                    "hover:bg-accent/60",
                    isPending && "opacity-50 pointer-events-none",
                  )}
                >
                  {/* Checkbox */}
                  <div
                    className={cn(
                      "flex shrink-0 items-center justify-center size-[18px] rounded-[4px] border-[1.5px] transition-all",
                      playlist.hasQuestion
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-muted-foreground/40 bg-background",
                    )}
                  >
                    {playlist.hasQuestion && (
                      <Check className="size-3 stroke-[3]" />
                    )}
                  </div>

                  {/* Playlist info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-snug truncate">
                      {playlist.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {playlist.questionCount}{" "}
                      {playlist.questionCount === 1 ? "question" : "questions"}
                      <span className="inline-flex items-center gap-1 ml-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                        {playlist.isOwner ? (
                          <>
                            <Lock className="size-2.5" /> private
                          </>
                        ) : (
                          <>
                            <Globe className="size-2.5" /> public
                          </>
                        )}
                      </span>
                    </p>
                  </div>

                  {/* Icon */}
                  <ListMusic className="size-4 shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground/60 transition-colors" />
                </button>
              ))}

              {/* Load more */}
              {hasMore && (
                <Button
                  type="button"
                  variant="outline"
                  className="mt-1 w-full"
                  onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                >
                  Load more ({filteredPlaylists.length - visibleCount}{" "}
                  remaining)
                </Button>
              )}
            </div>
          ) : playlists.length > 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No playlists match &quot;{search}&quot;
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
              <div className="rounded-full bg-accent/60 p-3 mb-3">
                <ListPlus className="size-5 text-muted-foreground/60" />
              </div>
              <p className="text-sm font-medium text-foreground/80">
                No playlists yet
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">
                Create your first playlist to start organizing questions.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
