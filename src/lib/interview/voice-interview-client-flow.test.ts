import { describe, expect, it, vi } from "vitest";

import type { CreateVoiceInterviewSessionResponse } from "@/lib/interview/voice-interview-api";
import {
  activateVoiceInterviewSession,
  startMeasuredAsync,
  startVoiceInterviewConnectFlow,
} from "@/lib/interview/voice-interview-client-flow";

describe("voice interview client flow", () => {
  it("starts bootstrap and microphone work immediately", async () => {
    const started: string[] = [];
    let resolveBootstrap:
      | ((value: CreateVoiceInterviewSessionResponse) => void)
      | undefined;
    let resolveMicrophone: ((value: MediaStream) => void) | undefined;

    const flow = startVoiceInterviewConnectFlow({
      createBootstrap: () => {
        started.push("bootstrap");
        return new Promise((resolve) => {
          resolveBootstrap = resolve;
        });
      },
      getMicrophoneStream: () => {
        started.push("microphone");
        return new Promise((resolve) => {
          resolveMicrophone = resolve;
        });
      },
    });

    expect(started).toEqual(["bootstrap", "microphone"]);

    resolveBootstrap?.({
      clientSecret: {
        expiresAt: 1_763_000_000,
        value: "secret",
      },
      localSession: {
        id: "session-1",
        scopeSlug: "javascript",
        scopeTitle: "JavaScript",
        scopeType: "topic",
      },
      realtime: {
        model: "gpt-realtime",
        openAiSessionId: "openai-session-1",
        transcriptionModel: "gpt-4o-mini-transcribe",
        voice: "marin",
      },
      timingsMs: {
        openAiBootstrap: 180,
        total: 180,
      },
    });
    resolveMicrophone?.({} as MediaStream);

    await expect(flow.bootstrap.promise).resolves.toMatchObject({
      value: {
        localSession: {
          id: "session-1",
        },
      },
    });
    await expect(flow.microphone.promise).resolves.toMatchObject({
      value: {},
    });
  });

  it("measures async durations with the provided clock", async () => {
    const nowValues = [100, 148];
    const measured = startMeasuredAsync(
      async () => "ready",
      () => nowValues.shift() ?? 148,
    );

    await expect(measured.promise).resolves.toEqual({
      durationMs: 48,
      value: "ready",
    });
  });

  it("marks the session active without blocking on the state sync", async () => {
    const events: string[] = [];
    let resolveActive: (() => void) | undefined;

    const markSessionActive = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          events.push("mark-active-started");
          resolveActive = () => {
            events.push("mark-active-finished");
            resolve();
          };
        }),
    );
    const onStateSyncError = vi.fn();

    activateVoiceInterviewSession({
      markSessionActive,
      onStateSyncError,
    });

    expect(events).toEqual(["mark-active-started"]);
    expect(markSessionActive).toHaveBeenCalledTimes(1);
    expect(onStateSyncError).not.toHaveBeenCalled();

    resolveActive?.();
    await Promise.resolve();

    expect(events).toEqual(["mark-active-started", "mark-active-finished"]);
  });
});
