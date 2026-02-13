export const QUESTION_DIFFICULTIES = ["easy", "medium", "hard"] as const;

export type QuestionDifficulty = (typeof QUESTION_DIFFICULTIES)[number];

export type InterviewQuestion = {
  id: string;
  slug: string;
  title: string;
  category: string;
  difficulty: QuestionDifficulty;
  summary: string;
  answerMarkdown: string;
  tags: string[];
  estimatedMinutes: number;
};

export type InterviewQuestionSummary = Omit<
  InterviewQuestion,
  "answerMarkdown"
>;

export type QuestionFilters = {
  category?: string;
  difficulty?: QuestionDifficulty;
  search?: string;
};

type FilterOption = {
  label: string;
  value: string;
  count: number;
};

const INTERVIEW_QUESTIONS: InterviewQuestion[] = [
  {
    id: "q_node_event_loop",
    slug: "nodejs-event-loop",
    title: "Explain the Node.js event loop to an interviewer",
    category: "Node.js",
    difficulty: "medium",
    summary:
      "Describe macrotasks, microtasks, and why Node handles I/O-heavy workloads efficiently.",
    estimatedMinutes: 6,
    tags: ["node", "async", "runtime"],
    answerMarkdown: `# Node.js event loop: interview-ready answer

Node.js uses a **single-threaded JavaScript execution model** with a runtime loop that coordinates I/O callbacks.

## Clear mental model

1. JavaScript runs synchronous code first.
2. Async operations (filesystem, network, timers) are delegated to runtime/OS facilities.
3. Completed callbacks are queued.
4. Promise microtasks are drained before moving to the next timer/I/O callback phase.

## Why this matters in production

- You can serve many concurrent I/O requests without one thread per request.
- CPU-heavy work still blocks the thread and should be moved to workers/queues.

\`\`\`ts title="event-loop-order.ts"
console.log("sync");
setTimeout(() => console.log("timer"), 0);
Promise.resolve().then(() => console.log("microtask"));
\`\`\`

Expected order: \`sync\`, then \`microtask\`, then \`timer\`.`,
  },
  {
    id: "q_react_keys",
    slug: "react-keys-and-reconciliation",
    title: "Why are stable keys important in React lists?",
    category: "React",
    difficulty: "easy",
    summary:
      "Explain reconciliation behavior and how unstable keys can cause state bugs.",
    estimatedMinutes: 5,
    tags: ["react", "rendering", "reconciliation"],
    answerMarkdown: `# React keys and reconciliation

Keys help React identify which list item is which between renders.

## Correct rule

Use a **stable, unique identifier from data**.

## What breaks with index keys

- Reordering can move component state to the wrong item.
- Inputs may appear to "swap values."
- Extra re-renders happen because React can't match elements correctly.

\`\`\`tsx title="good-keys.tsx"
{todos.map((todo) => (
  <TodoRow key={todo.id} todo={todo} />
))}
\`\`\`

For static lists that never change order, index keys can be acceptable, but that is a narrow exception.`,
  },
  {
    id: "q_js_closure",
    slug: "javascript-closures-practical",
    title: "What is a closure, and where is it useful?",
    category: "JavaScript",
    difficulty: "medium",
    summary:
      "Define closure in practical terms and connect it to encapsulation and callbacks.",
    estimatedMinutes: 7,
    tags: ["javascript", "scope", "functions"],
    answerMarkdown: `# Closure in practical terms

A closure is when a function keeps access to variables from its lexical scope **even after the outer function returns**.

## Practical use cases

- Data privacy (module-like encapsulation)
- Function factories
- Event/callback handlers that need contextual data

\`\`\`ts title="closure-counter.ts"
function createCounter() {
  let count = 0;
  return () => ++count;
}

const next = createCounter();
next(); // 1
next(); // 2
\`\`\`

The inner function remembers \`count\`, which demonstrates closure.`,
  },
  {
    id: "q_sql_index",
    slug: "sql-indexing-basics",
    title: "How do indexes improve SQL query performance?",
    category: "Databases",
    difficulty: "medium",
    summary:
      "Cover B-tree intuition, read/write tradeoffs, and indexing strategy for common predicates.",
    estimatedMinutes: 8,
    tags: ["sql", "postgres", "performance"],
    answerMarkdown: `# SQL indexing basics

An index is a data structure (commonly a B-tree) that helps the database find rows faster.

## Benefits

- Faster reads on filtered/sorted columns
- Better performance on joins with indexed keys

## Tradeoffs

- Extra disk usage
- Slower writes because index entries must be updated

## Interview framing

Start with "index columns used in \`WHERE\`, \`JOIN\`, and \`ORDER BY\` often."  
Then mention measuring with query plans before/after.`,
  },
  {
    id: "q_system_design_cache",
    slug: "system-design-caching-strategy",
    title: "When would you introduce caching in a system design interview?",
    category: "System Design",
    difficulty: "hard",
    summary:
      "Show where caches fit, invalidation strategy, and consistency tradeoffs.",
    estimatedMinutes: 9,
    tags: ["system-design", "scalability", "cache"],
    answerMarkdown: `# Caching strategy in system design

Introduce caching when reads are high, data is reused, and latency matters.

## Typical placements

- CDN/edge cache for static or semi-static content
- API response cache for expensive reads
- Database query/result cache for hot keys

## What interviewers expect

- TTL and invalidation approach
- Cache-miss fallback behavior
- Consistency tradeoff (stale vs fresh data)

Always call out that **cache invalidation is the hard part** and describe one concrete invalidation path.`,
  },
  {
    id: "q_behavioral_tradeoff",
    slug: "behavioral-tradeoff-example",
    title: "Describe a technical tradeoff decision you made",
    category: "Behavioral",
    difficulty: "easy",
    summary:
      "Structure a STAR-style response with constraints, decision criteria, and measured outcome.",
    estimatedMinutes: 4,
    tags: ["behavioral", "communication", "ownership"],
    answerMarkdown: `# Tradeoff answer structure (STAR)

## Situation
State the project, timeline, and constraint.

## Task
Define your responsibility and what success looked like.

## Action
Explain options considered and why you chose one.

## Result
Quantify outcome with metrics if possible.

Close with what you learned and what you would do differently next time.`,
  },
];

function normalize(text: string) {
  return text.trim().toLowerCase();
}

function matchesSearch(question: InterviewQuestion, search: string) {
  const term = normalize(search);

  if (!term) {
    return true;
  }

  return [question.title, question.summary, question.category, ...question.tags]
    .join(" ")
    .toLowerCase()
    .includes(term);
}

function toSummary(question: InterviewQuestion): InterviewQuestionSummary {
  return {
    id: question.id,
    slug: question.slug,
    title: question.title,
    category: question.category,
    difficulty: question.difficulty,
    summary: question.summary,
    tags: question.tags,
    estimatedMinutes: question.estimatedMinutes,
  };
}

export function isQuestionDifficulty(
  value: string | null | undefined,
): value is QuestionDifficulty {
  return QUESTION_DIFFICULTIES.includes(value as QuestionDifficulty);
}

export function listQuestions(filters: QuestionFilters = {}) {
  const category = normalize(filters.category ?? "");
  const difficulty = filters.difficulty;
  const search = filters.search ?? "";

  return INTERVIEW_QUESTIONS.filter((question) => {
    const categoryMatch = category
      ? normalize(question.category) === category
      : true;
    const difficultyMatch = difficulty
      ? question.difficulty === difficulty
      : true;
    const searchMatch = matchesSearch(question, search);

    return categoryMatch && difficultyMatch && searchMatch;
  }).map(toSummary);
}

export function listQuestionFilterOptions() {
  const categoryMap = new Map<string, number>();
  const difficultyMap = new Map<QuestionDifficulty, number>();

  for (const question of INTERVIEW_QUESTIONS) {
    categoryMap.set(
      question.category,
      (categoryMap.get(question.category) ?? 0) + 1,
    );
    difficultyMap.set(
      question.difficulty,
      (difficultyMap.get(question.difficulty) ?? 0) + 1,
    );
  }

  const categories: FilterOption[] = Array.from(categoryMap.entries())
    .map(([label, count]) => ({
      label,
      value: label.toLowerCase(),
      count,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const difficulties: FilterOption[] = QUESTION_DIFFICULTIES.map((value) => ({
    label: value[0].toUpperCase() + value.slice(1),
    value,
    count: difficultyMap.get(value) ?? 0,
  }));

  return { categories, difficulties };
}

export function listFeaturedQuestions(limit = 3) {
  return INTERVIEW_QUESTIONS.slice(0, limit).map(toSummary);
}

export function listQuestionSlugs() {
  return INTERVIEW_QUESTIONS.map((question) => question.slug);
}

export function getQuestionBySlug(slug: string) {
  return INTERVIEW_QUESTIONS.find((question) => question.slug === slug);
}
