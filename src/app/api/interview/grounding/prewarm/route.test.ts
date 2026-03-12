import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/interview/voice-scope", () => ({
  resolveVoiceInterviewScope: vi.fn(),
}));

vi.mock("@/lib/interview/scoped-documentation-search", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/interview/scoped-documentation-search")
  >("@/lib/interview/scoped-documentation-search");

  return {
    ...actual,
    prewarmScopedDocumentationGrounding: vi.fn(),
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

import { POST } from "@/app/api/interview/grounding/prewarm/route";
import { prewarmScopedDocumentationGrounding } from "@/lib/interview/scoped-documentation-search";
import { resolveVoiceInterviewScope } from "@/lib/interview/voice-scope";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const mockedCreateSupabaseServerClient = vi.mocked(createSupabaseServerClient);
const mockedPrewarmScopedDocumentationGrounding = vi.mocked(
  prewarmScopedDocumentationGrounding,
);
const mockedResolveVoiceInterviewScope = vi.mocked(resolveVoiceInterviewScope);

const scope = {
  evaluationDimensions: ["Concept precision"],
  expectations: ["Stay on topic"],
  knowledgeDomain: "salesforce" as const,
  questionMap: ["Explain Batch Apex."],
  questionSummaries: [
    {
      id: "q-1",
      slug: "batch-apex",
      summary: "Explain Batch Apex in plain language.",
      title: "Explain Batch Apex.",
    },
  ],
  scopeLabel: "Topic scope",
  scopeType: "topic" as const,
  slug: "batch-apex",
  starterPrompts: ["Start with Batch Apex."],
  stayInScope: "Stay on Batch Apex.",
  summary: "Salesforce async processing",
  title: "Batch Apex",
};

function createRequest(body: object) {
  return new Request("http://localhost:3000/api/interview/grounding/prewarm", {
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
}

describe("POST /api/interview/grounding/prewarm", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockedCreateSupabaseServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: "user-1",
            },
          },
          error: null,
        }),
      },
    } as never);
    mockedResolveVoiceInterviewScope.mockResolvedValue(scope);
    mockedPrewarmScopedDocumentationGrounding.mockResolvedValue(undefined);
  });

  it("starts a best-effort grounding prewarm for a valid scope", async () => {
    const response = await POST(
      createRequest({
        scopeSlug: scope.slug,
        scopeType: scope.scopeType,
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(202);
    expect(body).toEqual({ ok: true });
    expect(mockedResolveVoiceInterviewScope).toHaveBeenCalledWith({
      scopeSlug: scope.slug,
      scopeType: scope.scopeType,
    });
    expect(mockedPrewarmScopedDocumentationGrounding).toHaveBeenCalledWith(
      scope,
    );
  });
});
