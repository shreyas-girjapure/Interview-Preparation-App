"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

type SaveState = "idle" | "saving" | "saved" | "error";

type SaveFeaturesRequest = {
  wrapCodeBlocksOnMobile: boolean;
};

export function FeaturesForm({
  initialWrapCodeBlocksOnMobile,
}: {
  initialWrapCodeBlocksOnMobile: boolean;
}) {
  const router = useRouter();
  const [wrapCodeBlocksOnMobile, setWrapCodeBlocksOnMobile] = useState(
    initialWrapCodeBlocksOnMobile,
  );
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [warningMessage, setWarningMessage] = useState("");

  const saveLabel = useMemo(() => {
    switch (saveState) {
      case "saving":
        return "Saving...";
      case "saved":
        return "Saved";
      default:
        return "Save features";
    }
  }, [saveState]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveState("saving");
    setErrorMessage("");
    setWarningMessage("");

    const payload: SaveFeaturesRequest = {
      wrapCodeBlocksOnMobile,
    };

    try {
      const response = await fetch("/api/account/preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const body = (await response.json().catch(() => null)) as {
        error?: string;
        warning?: string;
      } | null;

      if (!response.ok) {
        setSaveState("error");
        const message = body?.error || "Unable to save features right now.";
        setErrorMessage(message);
        toast.error(message);
        return;
      }

      if (body?.warning) {
        setWarningMessage(body.warning);
        toast.warning(body.warning);
      }
    } catch {
      setSaveState("error");
      const message =
        "Unable to save features right now. Check your connection and try again.";
      setErrorMessage(message);
      toast.error(message);
      return;
    }

    setSaveState("saved");
    toast.success("Features saved.");
    router.refresh();
  }

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <div className="rounded-xl border border-border/70 bg-muted/35 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">Wrap code lines on mobile</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Long snippets wrap within the viewport to reduce horizontal
              scrolling on phones.
            </p>
          </div>
          <Switch
            checked={wrapCodeBlocksOnMobile}
            onCheckedChange={setWrapCodeBlocksOnMobile}
            aria-label="Wrap code lines on mobile"
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        This Features section is reserved for future reader settings.
      </p>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saveState === "saving"}>
          {saveLabel}
        </Button>
        {saveState === "saved" ? (
          <p className="text-sm text-muted-foreground">Features saved.</p>
        ) : null}
        {saveState === "error" ? (
          <p className="text-sm text-destructive">
            {errorMessage || "Something went wrong."}
          </p>
        ) : null}
        {warningMessage ? (
          <p className="text-sm text-muted-foreground">{warningMessage}</p>
        ) : null}
      </div>
    </form>
  );
}
