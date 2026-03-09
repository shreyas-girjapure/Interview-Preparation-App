import { getTopicBySlug } from "@/lib/interview/questions";

export type VoiceInterviewScopeType = "topic" | "playlist" | "question";

export type VoiceInterviewScopeQuestion = {
  id: string;
  slug: string;
  title: string;
  summary: string;
};

export type VoiceInterviewScope = {
  scopeType: "topic";
  scopeLabel: string;
  slug: string;
  title: string;
  summary: string;
  stayInScope: string;
  expectations: string[];
  evaluationDimensions: string[];
  starterPrompts: string[];
  questionMap: string[];
  questionSummaries: VoiceInterviewScopeQuestion[];
};

export type VoiceInterviewScopeRequest = {
  scopeType: VoiceInterviewScopeType;
  scopeSlug: string;
};

export async function resolveVoiceInterviewScope(
  request: VoiceInterviewScopeRequest,
): Promise<VoiceInterviewScope | undefined> {
  if (request.scopeType !== "topic") {
    return undefined;
  }

  return getTopicVoiceInterviewScopeBySlug(request.scopeSlug);
}

export async function getTopicVoiceInterviewScopeBySlug(
  slug: string,
): Promise<VoiceInterviewScope | undefined> {
  const topic = await getTopicBySlug(slug);

  if (!topic) {
    return undefined;
  }

  const questionSummaries = topic.relatedQuestions
    .slice(0, 4)
    .map((question) => ({
      id: question.id,
      slug: question.slug,
      title: question.title,
      summary: question.summary,
    }));

  const firstQuestion = questionSummaries[0]?.title;
  const secondQuestion = questionSummaries[1]?.title;

  return {
    scopeType: "topic",
    scopeLabel: "Topic scope",
    slug: topic.slug,
    title: topic.name,
    summary: topic.shortDescription,
    stayInScope: `If the learner drifts into unrelated interview topics, the coach redirects back to ${topic.name} or to recent changes that are directly tied to this topic.`,
    expectations: [
      `Explain ${topic.name} with precise terminology instead of a memorized one-line definition.`,
      firstQuestion
        ? `Use at least one practical example grounded in "${firstQuestion}".`
        : `Use at least one practical production example instead of staying abstract.`,
      `Stay inside ${topic.name} when follow-up questions or recent-changes prompts appear.`,
    ],
    evaluationDimensions: [
      "Concept precision under follow-up pressure",
      "Production examples and tradeoff reasoning",
      "Scope discipline when recent changes appear",
    ],
    starterPrompts: [
      "Start with a plain-language explanation",
      firstQuestion
        ? `Push deeper on "${firstQuestion}"`
        : `Push deeper on one concrete implementation detail`,
      secondQuestion
        ? `Use "${secondQuestion}" as a follow-up`
        : "Add one scoped recent-changes follow-up with visible citations",
    ],
    questionMap: questionSummaries.map((question) => question.title),
    questionSummaries,
  };
}
