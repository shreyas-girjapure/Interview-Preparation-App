"use client";

import { useMemo, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  QUESTION_DIFFICULTIES,
  type QuestionDifficulty,
} from "@/lib/interview/questions";

export type AccountPreferences = {
  preferredDifficulty: QuestionDifficulty | null;
  focusAreas: string[];
  targetRole: string | null;
  experienceLevel: string | null;
  dailyGoalMinutes: number | null;
};

type SaveState = "idle" | "saving" | "saved" | "error";

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

export function PreferencesForm({
  initialPreferences,
}: {
  initialPreferences: AccountPreferences;
}) {
  const [preferredDifficulty, setPreferredDifficulty] = useState<
    QuestionDifficulty | ""
  >(initialPreferences.preferredDifficulty ?? "");
  const [focusAreasText, setFocusAreasText] = useState(
    initialPreferences.focusAreas.join(", "),
  );
  const [targetRole, setTargetRole] = useState(initialPreferences.targetRole ?? "");
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

    const parsedDailyGoal =
      dailyGoalMinutes.trim() === ""
        ? null
        : Number.parseInt(dailyGoalMinutes.trim(), 10);

    if (parsedDailyGoal !== null && Number.isNaN(parsedDailyGoal)) {
      setSaveState("error");
      setErrorMessage("Daily goal must be a valid number.");
      return;
    }

    setSaveState("saving");
    setErrorMessage("");

    const response = await fetch("/api/user/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        preferredDifficulty: preferredDifficulty || null,
        focusAreas: parseFocusAreas(focusAreasText),
        targetRole: targetRole.trim() || null,
        experienceLevel: experienceLevel.trim() || null,
        dailyGoalMinutes: parsedDailyGoal,
      }),
    });

    if (!response.ok) {
      setSaveState("error");
      setErrorMessage("Unable to save preferences right now.");
      return;
    }

    setSaveState("saved");
  }

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span className="font-medium">Preferred difficulty</span>
          <select
            value={preferredDifficulty}
            onChange={(event) =>
              setPreferredDifficulty(event.target.value as QuestionDifficulty | "")
            }
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">No preference</option>
            {QUESTION_DIFFICULTIES.map((difficulty) => (
              <option key={difficulty} value={difficulty}>
                {difficulty[0].toUpperCase() + difficulty.slice(1)}
              </option>
            ))}
          </select>
        </label>

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
      </div>

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
