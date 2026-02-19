"use client";

import { useState } from "react";
import { Check, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type ProgressState = "unread" | "read" | "review_later";

function labelForState(state: ProgressState) {
  if (state === "review_later") {
    return "Revisit later";
  }

  if (state === "read") {
    return "Read";
  }

  return "Unread";
}

export function QuestionProgressSampleOnePreview({
  categories,
}: {
  categories: string[];
}) {
  const [state, setState] = useState<ProgressState>("unread");

  function updateState(
    nextState: ProgressState,
    title: string,
    description: string,
  ) {
    const previousState = state;
    setState(nextState);

    toast(title, {
      description,
      action: {
        label: "Undo",
        onClick: () => {
          setState(previousState);
          toast(`Reverted to ${labelForState(previousState).toLowerCase()}`);
        },
      },
    });
  }

  function toggleReadState() {
    if (state === "read") {
      updateState(
        "unread",
        "Marked as unread",
        "Question moved back to unread.",
      );
      return;
    }

    updateState("read", "Marked as read", "Question progress saved.");
  }

  function toggleRevisitState() {
    if (state === "review_later") {
      updateState(
        "unread",
        "Removed revisit status",
        "Question moved back to unread.",
      );
      return;
    }

    updateState(
      "review_later",
      "Added to revisit list",
      "This question is scheduled for review.",
    );
  }

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        {categories.map((category) => (
          <Badge key={category} variant="outline">
            {category}
          </Badge>
        ))}
        <Badge variant="secondary" className="capitalize">
          {labelForState(state)}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2 md:justify-end">
        <Button
          size="sm"
          variant={state === "read" ? "default" : "outline"}
          onClick={toggleReadState}
        >
          <Check className="mr-1.5 size-4" />
          {state === "read" ? "Mark unread" : "Mark as read"}
        </Button>
        <Button
          size="sm"
          variant={state === "review_later" ? "default" : "outline"}
          onClick={toggleRevisitState}
        >
          <RotateCcw className="mr-1.5 size-4" />
          {state === "review_later" ? "Remove revisit" : "Revisit later"}
        </Button>
      </div>
    </div>
  );
}
