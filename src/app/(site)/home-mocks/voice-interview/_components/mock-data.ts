export type VoiceInterviewMockStage =
  | "ready"
  | "connecting"
  | "live"
  | "completed"
  | "failed";

export type MockCitation = {
  label: string;
  source: string;
  href: string;
};

export type MockTranscriptItem = {
  id: string;
  speaker: "assistant" | "user" | "system";
  label: string;
  text: string;
  meta: string;
  tone?: "default" | "search" | "status" | "error";
  status?: "final" | "streaming";
  citations?: MockCitation[];
};

type MockScopeFixture = {
  typeLabel: string;
  title: string;
  summary: string;
  stayInScope: string;
  expectations: string[];
  evaluationDimensions: string[];
  starterPrompts: string[];
  questionMap: string[];
};

export type CompletionSummary = {
  summary: string;
  strengths: string;
  sharpen: string;
  nextDrill: string;
};

export type VoiceInterviewMockScenario = {
  id: VoiceInterviewMockStage;
  name: string;
  eyebrow: string;
  title: string;
  description: string;
  stateNote: string;
  stageQuote: string;
  stageSupport: string;
  micLabel: string;
  connectionLabel: string;
  elapsedLabel: string;
  transcriptCountLabel: string;
  recencyModeLabel: string;
  scope: MockScopeFixture;
  transcript: MockTranscriptItem[];
  completionSummary?: CompletionSummary;
  errorMessage?: string;
};

const sharedScope: MockScopeFixture = {
  typeLabel: "Topic scope",
  title: "JavaScript Closures",
  summary:
    "The interviewer stays inside closures, stale callbacks, lexical capture, and production tradeoffs instead of drifting into broad frontend coaching.",
  stayInScope:
    "If the learner asks about unrelated frameworks or a different interview topic, the coach redirects back to closures or scoped recent changes that matter to this topic.",
  expectations: [
    "Define closures beyond the textbook sentence.",
    "Explain stale closure bugs with concrete React or browser examples.",
    "Handle practical tradeoffs such as memory retention and callback design.",
  ],
  evaluationDimensions: [
    "Concept precision under follow-up pressure",
    "Production examples and tradeoff reasoning",
    "Scope discipline when recency questions appear",
  ],
  starterPrompts: [
    "Start with a warm-up definition check",
    "Push on stale closures in React",
    "Ask one scoped recent-changes follow-up with sources",
  ],
  questionMap: [
    "What does a closure capture, and when is that scope fixed?",
    "Where do stale closures show up in React effects or event handlers?",
    "How can closures accidentally retain memory longer than expected?",
    "When are closures preferable to class private fields or modules?",
  ],
};

const reactDocsCitation = {
  label: "React docs",
  source: "Synchronizing with Effects",
  href: "https://react.dev/learn/synchronizing-with-effects",
};

const mdnCitation = {
  label: "MDN",
  source: "Closures",
  href: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures",
};

export const voiceInterviewMockScenarios: VoiceInterviewMockScenario[] = [
  {
    id: "ready",
    name: "Ready",
    eyebrow: "Before mic access",
    title: "The route is staged, but nothing starts until the learner does.",
    description:
      "This state previews the interview shell before microphone access or browser session setup. The transcript stays visible, the scope is already clear, and the CTA remains deliberate.",
    stateNote:
      "Mic permission should be requested only after the explicit start action.",
    stageQuote:
      "Start when you are ready. We will stay inside JavaScript closures.",
    stageSupport:
      "This is the approval baseline for the calm, focused waiting state before any live transport or audio work begins.",
    micLabel: "Idle until start",
    connectionLabel: "No session requested",
    elapsedLabel: "Not started",
    transcriptCountLabel: "0 finalized turns",
    recencyModeLabel: "Scoped search armed, inactive",
    scope: sharedScope,
    transcript: [
      {
        id: "ready-system",
        speaker: "system",
        label: "Session note",
        text: "The interview shell is visible before any microphone request so the learner can review scope, expectations, and transcript treatment first.",
        meta: "Ready state",
        tone: "status",
      },
      {
        id: "ready-assistant",
        speaker: "assistant",
        label: "Interviewer preview",
        text: "When you start, I will open with one practical question about what closures capture and why the distinction matters in real code.",
        meta: "Preview only",
      },
    ],
  },
  {
    id: "connecting",
    name: "Connecting",
    eyebrow: "Secure bootstrap",
    title:
      "The browser is asking for mic access and creating the scoped session.",
    description:
      "This state previews the short-lived connection phase: explicit mic access, secure bootstrap, and the handoff into the SDK-managed voice runtime.",
    stateNote:
      "Connection copy should reassure the learner without exposing transport details or raw API mechanics.",
    stageQuote: "Securing microphone access and preparing the interviewer.",
    stageSupport:
      "The route should feel alive during setup, but not noisy. This is where we confirm that loading and failure treatments feel intentional.",
    micLabel: "Permission granted",
    connectionLabel: "Creating signed browser session",
    elapsedLabel: "00:08",
    transcriptCountLabel: "Handshake in progress",
    recencyModeLabel: "Scope locked before connect",
    scope: sharedScope,
    transcript: [
      {
        id: "connecting-system-1",
        speaker: "system",
        label: "Browser",
        text: "Microphone permission accepted. Starting secure session bootstrap for the active topic scope.",
        meta: "00:02",
        tone: "status",
      },
      {
        id: "connecting-system-2",
        speaker: "system",
        label: "Session",
        text: "Preparing the browser voice session through the Agents SDK. Transcript panel stays open so loading never feels like a blank screen.",
        meta: "00:07",
        tone: "status",
      },
    ],
  },
  {
    id: "live",
    name: "Live",
    eyebrow: "In interview",
    title:
      "The coach is speaking, the transcript is readable, and recency stays grounded.",
    description:
      "This is the main review state for the live experience: active scope, compact controls, visible transcript, and citations when the learner asks about recent changes inside the topic.",
    stateNote:
      "Transcript and controls should stay legible under interruptions and streaming assistant output.",
    stageQuote: "Make it practical, not theoretical.",
    stageSupport:
      "The voice stage stays central, but the transcript and scope context never disappear behind an orb-only presentation.",
    micLabel: "Live and unmuted",
    connectionLabel: "Realtime session healthy",
    elapsedLabel: "08:42",
    transcriptCountLabel: "12 finalized turns",
    recencyModeLabel: "2 citations visible",
    scope: sharedScope,
    transcript: [
      {
        id: "live-assistant-1",
        speaker: "assistant",
        label: "Interviewer",
        text: "We are staying inside JavaScript closures today. Start simple: what is a closure, and why do interviewers care about it beyond the textbook definition?",
        meta: "00:04",
      },
      {
        id: "live-user-1",
        speaker: "user",
        label: "You",
        text: "A closure is when a function keeps access to variables from the lexical scope where it was created, even after that outer function has returned.",
        meta: "00:17",
      },
      {
        id: "live-assistant-2",
        speaker: "assistant",
        label: "Interviewer",
        text: "Good baseline. Now make it practical. Give me a production example where that behavior is useful, and then tell me how the same mechanism can accidentally keep memory alive longer than expected.",
        meta: "00:26",
      },
      {
        id: "live-user-2",
        speaker: "user",
        label: "You",
        text: "A stale closure in a React effect is a good example. The callback captures an old value, then the UI behaves correctly sometimes and incorrectly under updates.",
        meta: "00:42",
      },
      {
        id: "live-assistant-search",
        speaker: "assistant",
        label: "Interviewer",
        text: "Recent guidance still emphasizes accurate effect dependencies and structuring callbacks so they see current values. I would summarize that briefly, cite the source, and then bring the conversation back to closures in production code.",
        meta: "Scoped recent changes",
        tone: "search",
        citations: [reactDocsCitation, mdnCitation],
      },
      {
        id: "live-assistant-stream",
        speaker: "assistant",
        label: "Interviewer",
        text: "Now tighten that answer into thirty seconds and compare it with closure-based module privacy.",
        meta: "Streaming delta",
        status: "streaming",
      },
    ],
  },
  {
    id: "completed",
    name: "Completed",
    eyebrow: "Post session",
    title:
      "The live interview is over, and the learner gets a short, useful wrap-up.",
    description:
      "This state previews the completion treatment after the voice exchange ends. The session reads as finished, the transcript remains available, and the learner gets a concise next-step summary instead of a wall of output.",
    stateNote:
      "Completion should feel calm and actionable, not like a scoring dashboard or a dead end.",
    stageQuote:
      "You were strongest when you connected stale closures to real bugs.",
    stageSupport:
      "Completion is where the experience pivots from live coaching to review. The shell should stay intact so debrief data can plug into it later.",
    micLabel: "Released",
    connectionLabel: "Session closed cleanly",
    elapsedLabel: "12:14",
    transcriptCountLabel: "18 finalized turns",
    recencyModeLabel: "Grounded answer preserved",
    scope: sharedScope,
    transcript: [
      {
        id: "completed-assistant-1",
        speaker: "assistant",
        label: "Interviewer",
        text: "Your strongest explanation was the stale closure example. You connected lexical capture to a bug someone could actually debug in production.",
        meta: "11:31",
      },
      {
        id: "completed-user-1",
        speaker: "user",
        label: "You",
        text: "The weaker part was comparing closures with class private fields. I know the difference, but I took too long to make the tradeoff practical.",
        meta: "11:52",
      },
      {
        id: "completed-assistant-2",
        speaker: "assistant",
        label: "Interviewer",
        text: "That is the right area to sharpen next. Practice one compact contrast: closures are great for encapsulated factory state, while private fields can be clearer when object identity and instance methods matter.",
        meta: "12:08",
      },
      {
        id: "completed-assistant-search",
        speaker: "assistant",
        label: "Interviewer",
        text: "Your recent-changes answer stayed grounded because it cited current guidance rather than guessing. That should remain visible in the written review later.",
        meta: "Completion note",
        tone: "search",
        citations: [reactDocsCitation],
      },
    ],
    completionSummary: {
      summary:
        "Accurate, practical, and strongest when you connected closures to stale effect bugs instead of staying abstract.",
      strengths:
        "You gave a clean definition, used a believable production example, and handled follow-up pressure without drifting off topic.",
      sharpen:
        "Tighten the comparison with class private fields and answer the memory-retention angle in one shorter pass.",
      nextDrill:
        "Run a timed round on closures, hooks, and event handlers with one scoped recency prompt at the end.",
    },
  },
  {
    id: "failed",
    name: "Failed",
    eyebrow: "Retry path",
    title:
      "The setup failed, but the route still explains what happened and how to recover.",
    description:
      "This state previews the failure treatment for bootstrap or connection issues. The page should preserve context, present a retry path, and avoid trapping the learner in a broken stage.",
    stateNote:
      "Failure copy should be specific enough to act on, but still terse and safe for the UI.",
    stageQuote:
      "The interview did not start, but your topic context is still intact.",
    stageSupport:
      "This state is part of the approval gate because reliability problems are easiest to spot when the failure layout is designed early.",
    micLabel: "Released after failure",
    connectionLabel: "Bootstrap timed out",
    elapsedLabel: "00:19",
    transcriptCountLabel: "No interview turns saved",
    recencyModeLabel: "Search stayed off",
    scope: sharedScope,
    transcript: [
      {
        id: "failed-system-1",
        speaker: "system",
        label: "Session error",
        text: "The secure interview session could not be created in time. No live voice session was opened, and the microphone was released immediately.",
        meta: "00:19",
        tone: "error",
      },
      {
        id: "failed-assistant-1",
        speaker: "assistant",
        label: "Recovery hint",
        text: "Retry the session from the same topic scope, or return to the topic page if you want to review closures before starting again.",
        meta: "Recovery path",
      },
    ],
    errorMessage:
      "We could not finish interview setup. Retry the same topic scope or return to the topic page without losing context.",
  },
];

export const defaultVoiceInterviewScenarioId: VoiceInterviewMockStage = "live";
