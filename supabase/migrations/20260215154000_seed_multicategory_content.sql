begin;

insert into public.categories (slug, name, description, sort_order, is_active)
values
  (
    'flutter',
    'Flutter',
    'Flutter mobile development, rendering, async patterns, and app architecture interviews.',
    12,
    true
  ),
  (
    'mulesoft',
    'MuleSoft',
    'MuleSoft API-led connectivity, runtime deployment, and integration reliability topics.',
    13,
    true
  ),
  (
    'typescript',
    'TypeScript',
    'Type-safe JavaScript patterns, generics, and narrowing for frontend/backend interviews.',
    14,
    true
  )
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = timezone('utc', now());

insert into public.topics (
  slug,
  name,
  short_description,
  overview_markdown,
  status,
  published_at,
  sort_order,
  preparation_category_id
)
select
  seed.slug,
  seed.name,
  seed.short_description,
  seed.overview_markdown,
  'published'::public.content_status,
  timezone('utc', now()),
  seed.sort_order,
  c.id
from (
  values
    (
      'flutter-state-management',
      'Flutter State Management',
      'Choose and scale state management patterns in production Flutter applications.',
      '# Flutter State Management

Strong answers explain where local widget state ends and app state orchestration begins.

## High-signal talking points

- Provider, Riverpod, Bloc tradeoffs
- Feature-level vs app-level state boundaries
- Testability and rebuild control',
      1210,
      'flutter'
    ),
    (
      'dart-async-isolates',
      'Dart Async and Isolates',
      'Understand event loop behavior, isolates, and compute offloading in Dart/Flutter.',
      '# Dart Async and Isolates

Dart async is single-threaded by default; isolates provide separate heaps for CPU-heavy work.

## Interview framing

- `Future`/`await` for non-blocking I/O
- Isolates for CPU-bound jobs
- Messaging overhead and data transfer costs',
      1220,
      'flutter'
    ),
    (
      'flutter-render-pipeline',
      'Flutter Render Pipeline',
      'Diagnose jank and optimize frame rendering with profiling-driven changes.',
      '# Flutter Render Pipeline

Performance answers should tie widget rebuilds to frame budget.

## Focus

- Build/layout/paint phases
- Repaint boundaries and const widgets
- Profiling with DevTools timeline',
      1230,
      'flutter'
    ),
    (
      'mulesoft-api-led-connectivity',
      'MuleSoft API-led Connectivity',
      'Design System, Process, and Experience APIs with clear ownership boundaries.',
      '# MuleSoft API-led Connectivity

Good integration design decomposes responsibilities across API layers.

## Layers

- System APIs for core systems
- Process APIs for orchestration
- Experience APIs for channel-specific needs',
      1310,
      'mulesoft'
    ),
    (
      'mulesoft-error-handling',
      'MuleSoft Error Handling',
      'Use on-error strategies, retries, and dead-letter patterns for reliable integration.',
      '# MuleSoft Error Handling

Reliability answers should include both prevention and recovery paths.

## Patterns

- `on-error-continue` vs `on-error-propagate`
- Retry with backoff
- Dead-letter channels for poison messages',
      1320,
      'mulesoft'
    ),
    (
      'mulesoft-runtime-deployment',
      'MuleSoft Runtime Deployment',
      'Discuss CloudHub/runtime deployment topology, scaling, and observability.',
      '# MuleSoft Runtime Deployment

Interviewers expect operational clarity, not only flow logic.

## Key points

- Worker sizing and autoscaling
- Environment promotion strategy
- Monitoring and alerting baselines',
      1330,
      'mulesoft'
    ),
    (
      'typescript-generics',
      'TypeScript Generics',
      'Use generics to model reusable, type-safe APIs without losing inference quality.',
      '# TypeScript Generics

Generics allow reusable abstractions while preserving concrete type information.

## Explain

- Generic constraints
- Inference vs explicit type params
- Practical API design examples',
      1410,
      'typescript'
    ),
    (
      'typescript-type-narrowing',
      'TypeScript Type Narrowing',
      'Apply control-flow narrowing, discriminated unions, and custom type guards.',
      '# TypeScript Type Narrowing

Narrowing turns broad unions into safe concrete branches.

## Interview-ready points

- `typeof`, `instanceof`, `in`
- Discriminated unions
- User-defined type predicates',
      1420,
      'typescript'
    ),
    (
      'salesforce-lwc-lifecycle',
      'Salesforce LWC Lifecycle',
      'Lifecycle hooks, reactivity model, and rendering implications in Lightning Web Components.',
      '# Salesforce LWC Lifecycle

LWC answers should connect lifecycle hooks to data fetching and rerender behavior.

## Mention

- `connectedCallback` and `renderedCallback`
- Reactive properties
- Wire adapters and imperative calls',
      1510,
      'salesforce'
    ),
    (
      'salesforce-integration-patterns',
      'Salesforce Integration Patterns',
      'Compare outbound/inbound integration options, async processing, and reliability guarantees.',
      '# Salesforce Integration Patterns

Strong integration answers compare platform-native and external orchestration options.

## Cover

- Platform events and CDC
- REST callouts and middleware handoff
- Idempotency and retry design',
      1520,
      'salesforce'
    )
) as seed(
  slug,
  name,
  short_description,
  overview_markdown,
  sort_order,
  category_slug
)
join public.categories c on c.slug = seed.category_slug
on conflict (slug) do update
set
  name = excluded.name,
  short_description = excluded.short_description,
  overview_markdown = excluded.overview_markdown,
  status = excluded.status,
  published_at = coalesce(public.topics.published_at, excluded.published_at),
  sort_order = excluded.sort_order,
  preparation_category_id = excluded.preparation_category_id,
  updated_at = timezone('utc', now());

insert into public.topic_edges (
  from_topic_id,
  to_topic_id,
  relation_type,
  sort_order
)
select
  source.id,
  target.id,
  edge.relation_type::public.topic_relation_type,
  edge.sort_order
from (
  values
    ('flutter-state-management', 'flutter-render-pipeline', 'related', 10),
    ('flutter-state-management', 'dart-async-isolates', 'deep_dive', 20),
    ('mulesoft-api-led-connectivity', 'mulesoft-runtime-deployment', 'related', 10),
    ('mulesoft-api-led-connectivity', 'mulesoft-error-handling', 'deep_dive', 20),
    ('typescript-generics', 'typescript-type-narrowing', 'related', 10),
    ('salesforce-lwc-lifecycle', 'salesforce-integration-patterns', 'related', 10),
    ('salesforce-integration-patterns', 'asynchronous-apex-patterns', 'related', 20),
    ('mulesoft-error-handling', 'system-design-tradeoffs', 'related', 10),
    ('dart-async-isolates', 'async-javascript-patterns', 'related', 10)
) as edge(from_slug, to_slug, relation_type, sort_order)
join public.topics source on source.slug = edge.from_slug
join public.topics target on target.slug = edge.to_slug
on conflict (from_topic_id, to_topic_id, relation_type) do update
set
  sort_order = excluded.sort_order,
  updated_at = timezone('utc', now());

insert into public.questions (
  slug,
  title,
  difficulty,
  summary,
  tags,
  estimated_minutes,
  status,
  published_at
)
select
  seed.slug,
  seed.title,
  seed.difficulty::public.question_difficulty,
  seed.summary,
  seed.tags,
  seed.estimated_minutes,
  'published'::public.content_status,
  timezone('utc', now())
from (
  values
    (
      'flutter-state-management-bloc-vs-provider',
      'Bloc vs Provider in Flutter: how do you choose?',
      'medium',
      'Compare architecture, testability, and rebuild behavior for production Flutter teams.',
      array['flutter', 'state-management', 'bloc', 'provider']::text[],
      8
    ),
    (
      'dart-isolates-vs-async-await',
      'Dart isolates vs async/await: when should you use each?',
      'medium',
      'Explain the difference between concurrency and parallelism in Dart runtime decisions.',
      array['dart', 'flutter', 'async', 'isolates']::text[],
      7
    ),
    (
      'mulesoft-api-led-layering',
      'How do you design API-led layers in MuleSoft?',
      'medium',
      'Describe system/process/experience boundaries and avoid orchestration leakage.',
      array['mulesoft', 'integration', 'api-led']::text[],
      9
    ),
    (
      'mulesoft-global-error-handling',
      'How would you implement global error handling in MuleSoft?',
      'hard',
      'Discuss reusable error handling, retries, and dead-letter strategies.',
      array['mulesoft', 'error-handling', 'resilience']::text[],
      10
    ),
    (
      'typescript-generics-real-world',
      'Show a real-world use of TypeScript generics in API design',
      'medium',
      'Demonstrate constraints, inference, and practical type-safe helper patterns.',
      array['typescript', 'generics', 'api-design']::text[],
      7
    ),
    (
      'cross-platform-retry-idempotency',
      'How do you design retries and idempotency across integration platforms?',
      'hard',
      'Connect middleware retries, platform events, and consumer-side idempotency keys.',
      array['integration', 'retries', 'idempotency', 'system-design']::text[],
      11
    ),
    (
      'salesforce-lwc-lifecycle-vs-react',
      'How does LWC lifecycle compare to React rendering lifecycle?',
      'medium',
      'Compare mental models for rerendering, state updates, and performance tuning.',
      array['salesforce', 'lwc', 'react', 'frontend']::text[],
      8
    ),
    (
      'flutter-jank-diagnosis-playbook',
      'How do you diagnose and fix jank in Flutter apps?',
      'medium',
      'Outline profiling workflow and prioritized optimization strategy.',
      array['flutter', 'performance', 'profiling']::text[],
      8
    )
) as seed(slug, title, difficulty, summary, tags, estimated_minutes)
on conflict (slug) do update
set
  title = excluded.title,
  difficulty = excluded.difficulty,
  summary = excluded.summary,
  tags = excluded.tags,
  estimated_minutes = excluded.estimated_minutes,
  status = 'published'::public.content_status,
  published_at = coalesce(public.questions.published_at, excluded.published_at),
  updated_at = timezone('utc', now());

insert into public.question_topics (
  question_id,
  topic_id,
  sort_order
)
select
  q.id,
  t.id,
  seed.sort_order
from (
  values
    ('flutter-state-management-bloc-vs-provider', 'flutter-state-management', 10),
    ('flutter-state-management-bloc-vs-provider', 'flutter-render-pipeline', 20),
    ('dart-isolates-vs-async-await', 'dart-async-isolates', 10),
    ('dart-isolates-vs-async-await', 'async-javascript-patterns', 20),
    ('dart-isolates-vs-async-await', 'nodejs-runtime', 30),
    ('mulesoft-api-led-layering', 'mulesoft-api-led-connectivity', 10),
    ('mulesoft-api-led-layering', 'mulesoft-runtime-deployment', 20),
    ('mulesoft-api-led-layering', 'system-design-tradeoffs', 30),
    ('mulesoft-global-error-handling', 'mulesoft-error-handling', 10),
    ('mulesoft-global-error-handling', 'system-design-tradeoffs', 20),
    ('typescript-generics-real-world', 'typescript-generics', 10),
    ('typescript-generics-real-world', 'typescript-type-narrowing', 20),
    ('typescript-generics-real-world', 'javascript-closures', 30),
    ('cross-platform-retry-idempotency', 'mulesoft-error-handling', 10),
    ('cross-platform-retry-idempotency', 'async-javascript-patterns', 20),
    ('cross-platform-retry-idempotency', 'salesforce-integration-patterns', 30),
    ('salesforce-lwc-lifecycle-vs-react', 'salesforce-lwc-lifecycle', 10),
    ('salesforce-lwc-lifecycle-vs-react', 'react-reconciliation', 20),
    ('salesforce-lwc-lifecycle-vs-react', 'frontend-performance', 30),
    ('flutter-jank-diagnosis-playbook', 'flutter-render-pipeline', 10),
    ('flutter-jank-diagnosis-playbook', 'frontend-performance', 20),
    ('flutter-jank-diagnosis-playbook', 'flutter-state-management', 30)
) as seed(question_slug, topic_slug, sort_order)
join public.questions q on q.slug = seed.question_slug
join public.topics t on t.slug = seed.topic_slug
on conflict (question_id, topic_id) do update
set
  sort_order = excluded.sort_order,
  updated_at = timezone('utc', now());

update public.answers a
set
  title = seed.title,
  content_markdown = seed.content_markdown,
  is_primary = true,
  status = 'published'::public.content_status,
  published_at = coalesce(a.published_at, timezone('utc', now())),
  updated_at = timezone('utc', now())
from (
  values
    (
      'flutter-state-management-bloc-vs-provider',
      'Bloc vs Provider in Flutter',
      $$# Bloc vs Provider

Choose based on team constraints, not trends.

## Practical comparison

- **Provider/Riverpod**: faster onboarding, lighter boilerplate.
- **Bloc**: stronger event/state separation, easier large-team conventions.

## Decision rule

Pick the one your team can keep consistent across features, tests, and code reviews.

## Rabbit-hole topics

- [Flutter State Management](/topics/flutter-state-management)
- [Flutter Render Pipeline](/topics/flutter-render-pipeline)$$
    ),
    (
      'dart-isolates-vs-async-await',
      'Dart Isolates vs Async/Await',
      $$# Isolates vs async/await

`async/await` handles non-blocking I/O on the same isolate.  
Use isolates for CPU-heavy work that would block the main isolate.

## Interview framing

- I/O bound: async/await
- CPU bound: isolate/compute
- Consider serialization cost when passing large data

## Rabbit-hole topics

- [Dart Async and Isolates](/topics/dart-async-isolates)
- [Async JavaScript Patterns](/topics/async-javascript-patterns)$$
    ),
    (
      'mulesoft-api-led-layering',
      'MuleSoft API-led Layering',
      $$# API-led layering

Keep each layer focused:

- **System APIs** expose system-of-record capabilities.
- **Process APIs** orchestrate business logic.
- **Experience APIs** shape payloads for channel/client needs.

This separation prevents brittle coupling and makes change safer.

## Rabbit-hole topics

- [MuleSoft API-led Connectivity](/topics/mulesoft-api-led-connectivity)
- [MuleSoft Runtime Deployment](/topics/mulesoft-runtime-deployment)$$
    ),
    (
      'mulesoft-global-error-handling',
      'MuleSoft Global Error Handling',
      $$# Global error handling in MuleSoft

Design for consistent behavior across flows.

## Baseline pattern

1. Classify errors (validation, downstream, transient).
2. Apply retry/backoff only for transient errors.
3. Route poison messages to DLQ with trace context.
4. Emit structured logs and metrics for each error branch.

## Rabbit-hole topics

- [MuleSoft Error Handling](/topics/mulesoft-error-handling)
- [System Design Tradeoffs](/topics/system-design-tradeoffs)$$
    ),
    (
      'typescript-generics-real-world',
      'TypeScript Generics in Real-world APIs',
      $$# TypeScript generics in practice

Use generics to keep helper APIs reusable without losing strong type inference.

## Example shape

- Generic repository helpers
- Typed API response wrappers
- Constraint-based utility types

## Rabbit-hole topics

- [TypeScript Generics](/topics/typescript-generics)
- [TypeScript Type Narrowing](/topics/typescript-type-narrowing)$$
    ),
    (
      'cross-platform-retry-idempotency',
      'Cross-platform Retries and Idempotency',
      $$# Retries + idempotency across platforms

Retries are safe only when operations are idempotent.

## Interview checklist

- Idempotency key strategy
- Retry policy boundaries by error type
- Exactly-once myths vs at-least-once reality
- Replay-safe downstream design

## Rabbit-hole topics

- [MuleSoft Error Handling](/topics/mulesoft-error-handling)
- [Salesforce Integration Patterns](/topics/salesforce-integration-patterns)
- [Async JavaScript Patterns](/topics/async-javascript-patterns)$$
    ),
    (
      'salesforce-lwc-lifecycle-vs-react',
      'LWC Lifecycle vs React Lifecycle',
      $$# LWC vs React lifecycle

Both are component models, but their reactivity and rendering mechanics differ.

## Good comparison points

- Lifecycle hook intent
- Reactive update triggers
- Render optimization techniques

Frame this as tradeoffs, not winner/loser.

## Rabbit-hole topics

- [Salesforce LWC Lifecycle](/topics/salesforce-lwc-lifecycle)
- [React Reconciliation](/topics/react-reconciliation)$$
    ),
    (
      'flutter-jank-diagnosis-playbook',
      'Flutter Jank Diagnosis Playbook',
      $$# Fixing jank in Flutter

Use measurement before optimization.

## Workflow

1. Reproduce and capture timeline.
2. Find expensive build/layout/paint work.
3. Reduce unnecessary rebuild scope.
4. Re-measure before/after frame times.

## Rabbit-hole topics

- [Flutter Render Pipeline](/topics/flutter-render-pipeline)
- [Frontend Performance](/topics/frontend-performance)$$
    )
) as seed(question_slug, title, content_markdown)
join public.questions q on q.slug = seed.question_slug
where
  a.question_id = q.id
  and a.is_primary = true;

insert into public.answers (
  question_id,
  title,
  content_markdown,
  is_primary,
  status,
  published_at
)
select
  q.id,
  seed.title,
  seed.content_markdown,
  true,
  'published'::public.content_status,
  timezone('utc', now())
from (
  values
    (
      'flutter-state-management-bloc-vs-provider',
      'Bloc vs Provider in Flutter',
      $$# Bloc vs Provider

Choose based on team constraints, not trends.

## Practical comparison

- **Provider/Riverpod**: faster onboarding, lighter boilerplate.
- **Bloc**: stronger event/state separation, easier large-team conventions.

## Decision rule

Pick the one your team can keep consistent across features, tests, and code reviews.

## Rabbit-hole topics

- [Flutter State Management](/topics/flutter-state-management)
- [Flutter Render Pipeline](/topics/flutter-render-pipeline)$$
    ),
    (
      'dart-isolates-vs-async-await',
      'Dart Isolates vs Async/Await',
      $$# Isolates vs async/await

`async/await` handles non-blocking I/O on the same isolate.  
Use isolates for CPU-heavy work that would block the main isolate.

## Interview framing

- I/O bound: async/await
- CPU bound: isolate/compute
- Consider serialization cost when passing large data

## Rabbit-hole topics

- [Dart Async and Isolates](/topics/dart-async-isolates)
- [Async JavaScript Patterns](/topics/async-javascript-patterns)$$
    ),
    (
      'mulesoft-api-led-layering',
      'MuleSoft API-led Layering',
      $$# API-led layering

Keep each layer focused:

- **System APIs** expose system-of-record capabilities.
- **Process APIs** orchestrate business logic.
- **Experience APIs** shape payloads for channel/client needs.

This separation prevents brittle coupling and makes change safer.

## Rabbit-hole topics

- [MuleSoft API-led Connectivity](/topics/mulesoft-api-led-connectivity)
- [MuleSoft Runtime Deployment](/topics/mulesoft-runtime-deployment)$$
    ),
    (
      'mulesoft-global-error-handling',
      'MuleSoft Global Error Handling',
      $$# Global error handling in MuleSoft

Design for consistent behavior across flows.

## Baseline pattern

1. Classify errors (validation, downstream, transient).
2. Apply retry/backoff only for transient errors.
3. Route poison messages to DLQ with trace context.
4. Emit structured logs and metrics for each error branch.

## Rabbit-hole topics

- [MuleSoft Error Handling](/topics/mulesoft-error-handling)
- [System Design Tradeoffs](/topics/system-design-tradeoffs)$$
    ),
    (
      'typescript-generics-real-world',
      'TypeScript Generics in Real-world APIs',
      $$# TypeScript generics in practice

Use generics to keep helper APIs reusable without losing strong type inference.

## Example shape

- Generic repository helpers
- Typed API response wrappers
- Constraint-based utility types

## Rabbit-hole topics

- [TypeScript Generics](/topics/typescript-generics)
- [TypeScript Type Narrowing](/topics/typescript-type-narrowing)$$
    ),
    (
      'cross-platform-retry-idempotency',
      'Cross-platform Retries and Idempotency',
      $$# Retries + idempotency across platforms

Retries are safe only when operations are idempotent.

## Interview checklist

- Idempotency key strategy
- Retry policy boundaries by error type
- Exactly-once myths vs at-least-once reality
- Replay-safe downstream design

## Rabbit-hole topics

- [MuleSoft Error Handling](/topics/mulesoft-error-handling)
- [Salesforce Integration Patterns](/topics/salesforce-integration-patterns)
- [Async JavaScript Patterns](/topics/async-javascript-patterns)$$
    ),
    (
      'salesforce-lwc-lifecycle-vs-react',
      'LWC Lifecycle vs React Lifecycle',
      $$# LWC vs React lifecycle

Both are component models, but their reactivity and rendering mechanics differ.

## Good comparison points

- Lifecycle hook intent
- Reactive update triggers
- Render optimization techniques

Frame this as tradeoffs, not winner/loser.

## Rabbit-hole topics

- [Salesforce LWC Lifecycle](/topics/salesforce-lwc-lifecycle)
- [React Reconciliation](/topics/react-reconciliation)$$
    ),
    (
      'flutter-jank-diagnosis-playbook',
      'Flutter Jank Diagnosis Playbook',
      $$# Fixing jank in Flutter

Use measurement before optimization.

## Workflow

1. Reproduce and capture timeline.
2. Find expensive build/layout/paint work.
3. Reduce unnecessary rebuild scope.
4. Re-measure before/after frame times.

## Rabbit-hole topics

- [Flutter Render Pipeline](/topics/flutter-render-pipeline)
- [Frontend Performance](/topics/frontend-performance)$$
    )
) as seed(question_slug, title, content_markdown)
join public.questions q on q.slug = seed.question_slug
where not exists (
  select 1
  from public.answers a
  where a.question_id = q.id
    and a.is_primary = true
);

commit;
