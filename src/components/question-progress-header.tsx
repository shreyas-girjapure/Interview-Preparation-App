"use client";

import {
  CheckCircle2,
  MoreHorizontal,
  PlayCircle,
  Share,
  ListPlus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { showAppToast } from "@/lib/toast";
import { useQuestionProgress } from "@/hooks/use-question-progress";
import { type QuestionProgressState } from "@/lib/interview/question-progress-state";
import { SaveToPlaylistDialog } from "@/components/save-to-playlist-dialog";
import { useState } from "react";

type QuestionProgressHeaderProps = {
  questionId: string;
  categories: string[];
  initialState: QuestionProgressState;
  isAuthenticated: boolean;
};

export function QuestionProgressHeader({
  questionId,
  categories,
  initialState,
  isAuthenticated,
}: QuestionProgressHeaderProps) {
  const { isRead, toggleRead, isSaving } = useQuestionProgress({
    initialState,
    questionId,
    isAuthenticated,
  });

  const [isSavePlaylistOpen, setIsSavePlaylistOpen] = useState(false);

  async function handleShare() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: document.title,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        showAppToast({
          title: "Link copied",
          description: "Question link copied to clipboard.",
        });
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        showAppToast({
          title: "Failed to share",
          description: "Could not share this question.",
        });
      }
    }
  }

  return (
    <>
      <div className="flex w-full items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 pt-1.5">
          {categories.map((category) => (
            <Badge
              key={category}
              variant="outline"
              className="border-border/60"
            >
              {category}
            </Badge>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0 text-muted-foreground mr-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 xl:h-10 xl:w-10 rounded-full hover:bg-transparent hover:text-black dark:hover:text-white transition-colors"
          >
            <PlayCircle className="!h-[22px] !w-[22px] stroke-[1.25]" />
            <span className="sr-only">Listen</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 xl:h-10 xl:w-10 rounded-full hover:bg-transparent hover:text-black dark:hover:text-white transition-colors"
              >
                <MoreHorizontal className="!h-[22px] !w-[22px] stroke-[1.25]" />
                <span className="sr-only">More options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 shadow-lg">
              <DropdownMenuItem onClick={handleShare}>
                <Share className="mr-2 h-4 w-4" />
                <span>Share</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => !isSaving && toggleRead()}
                disabled={isSaving}
              >
                <CheckCircle2
                  className={cn(
                    "mr-2 h-4 w-4",
                    isRead ? "text-green-600 dark:text-green-500" : "",
                  )}
                />
                <span>{isRead ? "Mark as unread" : "Mark as read"}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsSavePlaylistOpen(true)}>
                <ListPlus className="mr-2 h-4 w-4" />
                <span>Add to playlist</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <SaveToPlaylistDialog
        questionId={questionId}
        open={isSavePlaylistOpen}
        onOpenChange={setIsSavePlaylistOpen}
        isAuthenticated={isAuthenticated}
      />
    </>
  );
}
