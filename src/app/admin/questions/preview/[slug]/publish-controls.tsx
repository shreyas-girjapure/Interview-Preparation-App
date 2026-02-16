"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";

type PublishState = "idle" | "publishing" | "published" | "error";

export function PreviewPublishControls({
  questionSlug,
}: {
  questionSlug: string;
}) {
  const [publishState, setPublishState] = useState<PublishState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [publicUrl, setPublicUrl] = useState("");

  async function onPublish() {
    setPublishState("publishing");
    setErrorMessage("");

    try {
      const response = await fetch("/api/admin/content-package", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "publish",
          data: {
            questionSlug,
          },
        }),
      });

      const body = (await response.json().catch(() => null)) as {
        error?: string;
        publicUrl?: string;
      } | null;

      if (!response.ok) {
        setPublishState("error");
        setErrorMessage(body?.error ?? "Unable to publish this question.");
        return;
      }

      setPublishState("published");
      setPublicUrl(body?.publicUrl ?? "");
    } catch {
      setPublishState("error");
      setErrorMessage(
        "Unable to publish right now. Check your connection and try again.",
      );
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          onClick={onPublish}
          disabled={publishState === "publishing"}
        >
          {publishState === "publishing" ? "Publishing..." : "Publish"}
        </Button>
        {publicUrl ? (
          <Button asChild type="button" variant="outline">
            <Link href={publicUrl}>Open Live Question</Link>
          </Button>
        ) : null}
      </div>
      {publishState === "published" ? (
        <p className="text-sm text-emerald-700">Published successfully.</p>
      ) : null}
      {publishState === "error" ? (
        <p className="text-sm text-destructive">{errorMessage}</p>
      ) : null}
    </div>
  );
}
