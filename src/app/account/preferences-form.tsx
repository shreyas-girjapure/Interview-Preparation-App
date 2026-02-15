"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export type AccountPreferences = {
  focusAreas: string[];
  targetRole: string | null;
  experienceLevel: string | null;
  dailyGoalMinutes: number | null;
};

type SaveState = "idle" | "saving" | "saved" | "error";

type SavePreferencesRequest = {
  focusAreas: string[];
  targetRole: string | null;
  experienceLevel: string | null;
  dailyGoalMinutes: number | null;
};

function parseFocusAreas(input: string) {
  return Array.from(
    new Set(
      input
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

const MIN_DAILY_GOAL = 0;
const MAX_DAILY_GOAL = 1440;

function parseDailyGoalMinutes(input: string) {
  const trimmed = input.trim();

  if (!trimmed) {
    return { value: null as number | null, error: null as string | null };
  }

  if (!/^\d+$/.test(trimmed)) {
    return {
      value: null,
      error: "Daily goal must be a whole number between 0 and 1440.",
    };
  }

  const parsed = Number.parseInt(trimmed, 10);

  if (parsed < MIN_DAILY_GOAL || parsed > MAX_DAILY_GOAL) {
    return {
      value: null,
      error: "Daily goal must be between 0 and 1440 minutes.",
    };
  }

  return { value: parsed, error: null as string | null };
}

export function PreferencesForm({
  initialPreferences,
}: {
  initialPreferences: AccountPreferences;
}) {
  const router = useRouter();

  const [focusAreasText, setFocusAreasText] = useState(
    initialPreferences.focusAreas.join(", "),
  );
  const [targetRole, setTargetRole] = useState(
    initialPreferences.targetRole ?? "",
  );
  const [experienceLevel, setExperienceLevel] = useState(
    initialPreferences.experienceLevel ?? "",
  );
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(
    initialPreferences.dailyGoalMinutes?.toString() ?? "",
  );
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const saveLabel = useMemo(() => {
    switch (saveState) {
      case "saving":
        return "Saving...";
      case "saved":
        return "Saved";
      default:
        return "Save preferences";
    }
  }, [saveState]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const dailyGoalResult = parseDailyGoalMinutes(dailyGoalMinutes);
    if (dailyGoalResult.error) {
      setSaveState("error");
      setErrorMessage(dailyGoalResult.error);
      return;
    }

    setSaveState("saving");
    setErrorMessage("");

    const payload: SavePreferencesRequest = {
      focusAreas: parseFocusAreas(focusAreasText),
      targetRole: targetRole.trim() || null,
      experienceLevel: experienceLevel.trim() || null,
      dailyGoalMinutes: dailyGoalResult.value,
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
      } | null;

      if (!response.ok) {
        setSaveState("error");
        setErrorMessage(body?.error || "Unable to save preferences right now.");
        return;
      }
    } catch {
      setSaveState("error");
      setErrorMessage(
        "Unable to save preferences right now. Check your connection and try again.",
      );
      return;
    }

    setSaveState("saved");
    router.refresh();
  }

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <label className="space-y-2 text-sm">
        <span className="font-medium">Daily goal (minutes)</span>
        <input
          inputMode="numeric"
          value={dailyGoalMinutes}
          onChange={(event) => setDailyGoalMinutes(event.target.value)}
          placeholder="e.g. 30"
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>

      <label className="space-y-2 text-sm">
        <span className="font-medium">Focus areas</span>
        <input
          value={focusAreasText}
          onChange={(event) => setFocusAreasText(event.target.value)}
          placeholder="e.g. node.js, system design, behavioral"
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
        />
        <p className="text-xs text-muted-foreground">
          Comma-separated topics you want to prioritize.
        </p>
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span className="font-medium">Target role</span>
          <input
            value={targetRole}
            onChange={(event) => setTargetRole(event.target.value)}
            placeholder="e.g. Frontend Engineer"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>

        <label className="space-y-2 text-sm">
          <span className="font-medium">Experience level</span>
          <input
            value={experienceLevel}
            onChange={(event) => setExperienceLevel(event.target.value)}
            placeholder="e.g. 2 years"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <Button type="submit" disabled={saveState === "saving"}>
          {saveLabel}
        </Button>
        {saveState === "saved" ? (
          <p className="text-sm text-muted-foreground">
            Preferences saved successfully.
          </p>
        ) : null}
        {saveState === "error" ? (
          <p className="text-sm text-destructive">
            {errorMessage || "Something went wrong."}
          </p>
        ) : null}
      </div>
    </form>
  );
}
