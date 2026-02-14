begin;

insert into public.categories (slug, name, description, sort_order)
values
  (
    'nodejs',
    'Node.js',
    'Node.js runtime, event loop behavior, and async backend patterns.',
    10
  ),
  (
    'react',
    'React',
    'React rendering, reconciliation, and frontend performance concepts.',
    20
  ),
  (
    'javascript',
    'JavaScript',
    'Core language fundamentals for modern frontend and backend interviews.',
    30
  ),
  (
    'databases',
    'Databases',
    'SQL modeling, indexing, and query optimization patterns.',
    40
  ),
  (
    'system-design',
    'System Design',
    'Scalable architecture, caching, and tradeoff-driven design decisions.',
    50
  ),
  (
    'behavioral',
    'Behavioral',
    'Communication and leadership storytelling for behavioral rounds.',
    60
  )
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  updated_at = timezone('utc', now());

insert into public.topics (
  slug,
  name,
  short_description,
  overview_markdown,
  status,
  published_at,
  sort_order,
  legacy_category_id
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
      'event-loop-internals',
      'Event Loop Internals',
      'Understand how microtasks, macrotasks, and callback ordering work in practice.',
      '# Event Loop Internals

Strong interview answers separate synchronous execution from queued callbacks.

## What to explain

- Why microtasks run before the next macrotask
- How Node delegates I/O work outside the JavaScript thread
- Where CPU-heavy work still blocks throughput',
      110,
      'nodejs'
    ),
    (
      'async-javascript-patterns',
      'Async JavaScript Patterns',
      'Connect promises, async/await, retries, and backpressure to production behavior.',
      '# Async JavaScript Patterns

Good async design is predictable under load and failure.

## Interview-ready angles

- Promise composition vs uncontrolled parallelism
- Timeouts and retries with bounded attempts
- Queue-based backpressure for slower downstream systems',
      120,
      'javascript'
    ),
    (
      'nodejs-runtime',
      'Node.js Runtime',
      'How libuv, streams, and worker threads affect scalability in Node.js services.',
      '# Node.js Runtime

Node scales I/O-heavy workloads well, but CPU saturation needs separate handling.

## Key points

- Event loop and libuv model
- Streams for memory-safe data flow
- Worker threads for CPU-bound tasks',
      130,
      'nodejs'
    ),
    (
      'react-reconciliation',
      'React Reconciliation',
      'Understand identity, keys, and diffing behavior in dynamic lists.',
      '# React Reconciliation

Reconciliation is how React maps one render tree to the next.

## High-signal explanation

- Stable keys preserve component identity
- Index keys in mutable lists can move state incorrectly
- Rendering performance follows identity stability',
      210,
      'react'
    ),
    (
      'frontend-performance',
      'Frontend Performance',
      'User-perceived performance tuning through rendering, hydration, and bundle strategy.',
      '# Frontend Performance

Performance discussions should be tied to user impact.

## Useful framing

- Reduce work before first meaningful paint
- Avoid unnecessary rerenders via stable references
- Prioritize bottlenecks shown by profiling data',
      220,
      'react'
    ),
    (
      'javascript-closures',
      'JavaScript Closures',
      'Use closures for encapsulation, factory functions, and callback context management.',
      '# JavaScript Closures

A closure retains access to lexical scope after the outer function returns.

## Real use cases

- Module-style encapsulation
- Handler factories
- Stateful utility wrappers',
      310,
      'javascript'
    ),
    (
      'sql-indexing',
      'SQL Indexing',
      'Choose indexes for WHERE/JOIN/ORDER BY paths while handling write tradeoffs.',
      '# SQL Indexing

Indexes speed reads by adding storage and write overhead.

## Interview framing

- Match index shape to query predicates
- Mention selectivity and cardinality
- Validate with `EXPLAIN` before and after changes',
      410,
      'databases'
    ),
    (
      'query-planning',
      'Query Planning',
      'How database planners estimate costs and pick execution plans.',
      '# Query Planning

The optimizer chooses plans using table statistics and estimated row counts.

## Strong answer points

- Wrong estimates lead to poor plans
- Statistics freshness matters
- Plans guide indexing and query rewrites',
      420,
      'databases'
    ),
    (
      'database-performance',
      'Database Performance',
      'End-to-end database latency optimization from schema to query execution.',
      '# Database Performance

Treat performance as a system concern, not only a single-query concern.

## Useful talking points

- Optimize hottest paths first
- Track tail latency, not just averages
- Balance read speed against write amplification',
      430,
      'databases'
    ),
    (
      'caching-strategies',
      'Caching Strategies',
      'Place caches deliberately and define clear cache-miss behavior.',
      '# Caching Strategies

Caches reduce latency for repeated reads and absorb backend load.

## Interview checklist

- Cache layer placement (edge, API, data)
- TTL and freshness model
- Cache miss and fallback behavior',
      510,
      'system-design'
    ),
    (
      'cache-invalidation',
      'Cache Invalidation',
      'TTL and event-driven invalidation choices for balancing freshness and complexity.',
      '# Cache Invalidation

Invalidation policy determines correctness under changing data.

## Patterns

- TTL-only for tolerant use cases
- Event-driven invalidation for stricter freshness
- Write-through or write-behind depending on consistency needs',
      520,
      'system-design'
    ),
    (
      'system-design-tradeoffs',
      'System Design Tradeoffs',
      'Communicate tradeoffs explicitly across latency, consistency, and operational cost.',
      '# System Design Tradeoffs

High-quality design answers make tradeoffs explicit and measurable.

## Structure

1. State workload assumptions and SLOs.
2. Compare viable designs.
3. Justify the selected tradeoff path.',
      530,
      'system-design'
    ),
    (
      'behavioral-storytelling',
      'Behavioral Storytelling',
      'Craft STAR stories with clear ownership, constraints, and measurable outcomes.',
      '# Behavioral Storytelling

Behavioral interviews evaluate decision quality and communication clarity.

## Strong STAR signals

- Clear constraints
- Concrete decision process
- Measurable impact and reflection',
      610,
      'behavioral'
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
  published_at = excluded.published_at,
  sort_order = excluded.sort_order,
  legacy_category_id = excluded.legacy_category_id,
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
    ('event-loop-internals', 'async-javascript-patterns', 'related', 10),
    ('event-loop-internals', 'nodejs-runtime', 'deep_dive', 20),
    ('react-reconciliation', 'frontend-performance', 'related', 10),
    ('javascript-closures', 'async-javascript-patterns', 'related', 10),
    ('sql-indexing', 'query-planning', 'related', 10),
    ('query-planning', 'database-performance', 'deep_dive', 20),
    ('caching-strategies', 'cache-invalidation', 'related', 10),
    ('cache-invalidation', 'system-design-tradeoffs', 'deep_dive', 20),
    ('behavioral-storytelling', 'system-design-tradeoffs', 'related', 10)
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
  category_id,
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
  c.id,
  seed.difficulty::public.question_difficulty,
  seed.summary,
  seed.tags,
  seed.estimated_minutes,
  'published'::public.content_status,
  timezone('utc', now())
from (
  values
    (
      'nodejs-event-loop',
      'Explain the Node.js event loop to an interviewer',
      'nodejs',
      'medium',
      'Describe macrotasks, microtasks, and why Node handles I/O-heavy workloads efficiently.',
      array['node', 'async', 'runtime']::text[],
      6
    ),
    (
      'react-keys-and-reconciliation',
      'Why are stable keys important in React lists?',
      'react',
      'easy',
      'Explain reconciliation behavior and how unstable keys can cause state bugs.',
      array['react', 'rendering', 'reconciliation']::text[],
      5
    ),
    (
      'javascript-closures-practical',
      'What is a closure, and where is it useful?',
      'javascript',
      'medium',
      'Define closure in practical terms and connect it to encapsulation and callbacks.',
      array['javascript', 'scope', 'functions']::text[],
      7
    ),
    (
      'sql-indexing-basics',
      'How do indexes improve SQL query performance?',
      'databases',
      'medium',
      'Cover B-tree intuition, read/write tradeoffs, and indexing strategy for common predicates.',
      array['sql', 'postgres', 'performance']::text[],
      8
    ),
    (
      'system-design-caching-strategy',
      'When would you introduce caching in a system design interview?',
      'system-design',
      'hard',
      'Show where caches fit, invalidation strategy, and consistency tradeoffs.',
      array['system-design', 'scalability', 'cache']::text[],
      9
    ),
    (
      'behavioral-tradeoff-example',
      'Describe a technical tradeoff decision you made',
      'behavioral',
      'easy',
      'Structure a STAR-style response with constraints, decision criteria, and measured outcome.',
      array['behavioral', 'communication', 'ownership']::text[],
      4
    )
) as seed(
  slug,
  title,
  category_slug,
  difficulty,
  summary,
  tags,
  estimated_minutes
)
join public.categories c on c.slug = seed.category_slug
on conflict (slug) do update
set
  title = excluded.title,
  category_id = excluded.category_id,
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
    ('nodejs-event-loop', 'event-loop-internals', 10),
    ('nodejs-event-loop', 'async-javascript-patterns', 20),
    ('nodejs-event-loop', 'nodejs-runtime', 30),
    ('react-keys-and-reconciliation', 'react-reconciliation', 10),
    ('react-keys-and-reconciliation', 'frontend-performance', 20),
    ('javascript-closures-practical', 'javascript-closures', 10),
    ('javascript-closures-practical', 'async-javascript-patterns', 20),
    ('sql-indexing-basics', 'sql-indexing', 10),
    ('sql-indexing-basics', 'query-planning', 20),
    ('sql-indexing-basics', 'database-performance', 30),
    ('system-design-caching-strategy', 'caching-strategies', 10),
    ('system-design-caching-strategy', 'cache-invalidation', 20),
    ('system-design-caching-strategy', 'system-design-tradeoffs', 30),
    ('behavioral-tradeoff-example', 'behavioral-storytelling', 10),
    ('behavioral-tradeoff-example', 'system-design-tradeoffs', 20)
) as seed(question_slug, topic_slug, sort_order)
join public.questions q on q.slug = seed.question_slug
join public.topics t on t.slug = seed.topic_slug
on conflict (question_id, topic_id) do update
set
  sort_order = excluded.sort_order,
  updated_at = timezone('utc', now());

update public.question_topics qt
set
  is_primary = false,
  updated_at = timezone('utc', now())
from public.questions q
where
  q.slug in (
    'nodejs-event-loop',
    'react-keys-and-reconciliation',
    'javascript-closures-practical',
    'sql-indexing-basics',
    'system-design-caching-strategy',
    'behavioral-tradeoff-example'
  )
  and qt.question_id = q.id;

update public.question_topics qt
set
  is_primary = true,
  updated_at = timezone('utc', now())
from (
  values
    ('nodejs-event-loop', 'event-loop-internals'),
    ('react-keys-and-reconciliation', 'react-reconciliation'),
    ('javascript-closures-practical', 'javascript-closures'),
    ('sql-indexing-basics', 'sql-indexing'),
    ('system-design-caching-strategy', 'caching-strategies'),
    ('behavioral-tradeoff-example', 'behavioral-storytelling')
) as seed(question_slug, topic_slug)
join public.questions q on q.slug = seed.question_slug
join public.topics t on t.slug = seed.topic_slug
where
  qt.question_id = q.id
  and qt.topic_id = t.id;

update public.questions q
set
  primary_topic_id = t.id,
  updated_at = timezone('utc', now())
from (
  values
    ('nodejs-event-loop', 'event-loop-internals'),
    ('react-keys-and-reconciliation', 'react-reconciliation'),
    ('javascript-closures-practical', 'javascript-closures'),
    ('sql-indexing-basics', 'sql-indexing'),
    ('system-design-caching-strategy', 'caching-strategies'),
    ('behavioral-tradeoff-example', 'behavioral-storytelling')
) as seed(question_slug, topic_slug)
join public.topics t on t.slug = seed.topic_slug
where
  q.slug = seed.question_slug
  and (q.primary_topic_id is distinct from t.id);

update public.answers a
set
  title = seed.title,
  content_markdown = seed.content_markdown,
  status = 'published'::public.content_status,
  published_at = coalesce(a.published_at, timezone('utc', now())),
  updated_at = timezone('utc', now())
from (
  values
    (
      'nodejs-event-loop',
      'Node.js Event Loop',
      '# Node.js event loop: interview-ready answer

Node.js runs JavaScript on a single thread and coordinates async callbacks through the event loop.

## Mental model

1. Run synchronous code first.
2. Delegate async I/O to runtime or OS.
3. Queue completed callbacks.
4. Drain promise microtasks before the next macrotask.

```ts title="event-loop-order.ts"
console.log("sync");
setTimeout(() => console.log("timer"), 0);
Promise.resolve().then(() => console.log("microtask"));
```

Expected order: `sync`, then `microtask`, then `timer`.

## Rabbit-hole topics

- [Event Loop Internals](/topics/event-loop-internals)
- [Async JavaScript Patterns](/topics/async-javascript-patterns)
- [Node.js Runtime](/topics/nodejs-runtime)'
    ),
    (
      'react-keys-and-reconciliation',
      'React Keys and Reconciliation',
      '# React keys and reconciliation

Keys help React preserve identity between renders.

## Rule

Use a stable unique key from your data.

```tsx title="good-keys.tsx"
{todos.map((todo) => (
  <TodoRow key={todo.id} todo={todo} />
))}
```

## Rabbit-hole topics

- [React Reconciliation](/topics/react-reconciliation)
- [Frontend Performance](/topics/frontend-performance)'
    ),
    (
      'javascript-closures-practical',
      'JavaScript Closures',
      '# Closures in practical terms

A closure means an inner function retains access to variables from lexical scope.

```ts title="closure-counter.ts"
function createCounter() {
  let count = 0;
  return () => ++count;
}
```

## Rabbit-hole topics

- [JavaScript Closures](/topics/javascript-closures)
- [Async JavaScript Patterns](/topics/async-javascript-patterns)'
    ),
    (
      'sql-indexing-basics',
      'SQL Indexing Basics',
      '# SQL indexing basics

Indexes speed reads by reducing scan cost, but increase write overhead.

## Interview framing

- Start with columns used in `WHERE`, `JOIN`, and `ORDER BY`.
- Explain selectivity.
- Validate with query plans.

## Rabbit-hole topics

- [SQL Indexing](/topics/sql-indexing)
- [Query Planning](/topics/query-planning)
- [Database Performance](/topics/database-performance)'
    ),
    (
      'system-design-caching-strategy',
      'Caching Strategy in System Design',
      '# Caching strategy in system design

Use caching when read traffic is high and latency goals are strict.

## Cover these in interviews

- Cache layer placement
- Invalidation strategy
- Cache-miss fallback behavior

## Rabbit-hole topics

- [Caching Strategies](/topics/caching-strategies)
- [Cache Invalidation](/topics/cache-invalidation)
- [System Design Tradeoffs](/topics/system-design-tradeoffs)'
    ),
    (
      'behavioral-tradeoff-example',
      'Behavioral Tradeoff Example',
      '# Tradeoff answer structure (STAR)

## Situation
State the context and constraints.

## Task
Define your responsibility.

## Action
Explain options and why you chose one.

## Result
Quantify impact and share what you learned.

## Rabbit-hole topics

- [Behavioral Storytelling](/topics/behavioral-storytelling)
- [System Design Tradeoffs](/topics/system-design-tradeoffs)'
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
      'nodejs-event-loop',
      'Node.js Event Loop',
      '# Node.js event loop: interview-ready answer

Node.js runs JavaScript on a single thread and coordinates async callbacks through the event loop.

## Mental model

1. Run synchronous code first.
2. Delegate async I/O to runtime or OS.
3. Queue completed callbacks.
4. Drain promise microtasks before the next macrotask.

```ts title="event-loop-order.ts"
console.log("sync");
setTimeout(() => console.log("timer"), 0);
Promise.resolve().then(() => console.log("microtask"));
```

Expected order: `sync`, then `microtask`, then `timer`.

## Rabbit-hole topics

- [Event Loop Internals](/topics/event-loop-internals)
- [Async JavaScript Patterns](/topics/async-javascript-patterns)
- [Node.js Runtime](/topics/nodejs-runtime)'
    ),
    (
      'react-keys-and-reconciliation',
      'React Keys and Reconciliation',
      '# React keys and reconciliation

Keys help React preserve identity between renders.

## Rule

Use a stable unique key from your data.

```tsx title="good-keys.tsx"
{todos.map((todo) => (
  <TodoRow key={todo.id} todo={todo} />
))}
```

## Rabbit-hole topics

- [React Reconciliation](/topics/react-reconciliation)
- [Frontend Performance](/topics/frontend-performance)'
    ),
    (
      'javascript-closures-practical',
      'JavaScript Closures',
      '# Closures in practical terms

A closure means an inner function retains access to variables from lexical scope.

```ts title="closure-counter.ts"
function createCounter() {
  let count = 0;
  return () => ++count;
}
```

## Rabbit-hole topics

- [JavaScript Closures](/topics/javascript-closures)
- [Async JavaScript Patterns](/topics/async-javascript-patterns)'
    ),
    (
      'sql-indexing-basics',
      'SQL Indexing Basics',
      '# SQL indexing basics

Indexes speed reads by reducing scan cost, but increase write overhead.

## Interview framing

- Start with columns used in `WHERE`, `JOIN`, and `ORDER BY`.
- Explain selectivity.
- Validate with query plans.

## Rabbit-hole topics

- [SQL Indexing](/topics/sql-indexing)
- [Query Planning](/topics/query-planning)
- [Database Performance](/topics/database-performance)'
    ),
    (
      'system-design-caching-strategy',
      'Caching Strategy in System Design',
      '# Caching strategy in system design

Use caching when read traffic is high and latency goals are strict.

## Cover these in interviews

- Cache layer placement
- Invalidation strategy
- Cache-miss fallback behavior

## Rabbit-hole topics

- [Caching Strategies](/topics/caching-strategies)
- [Cache Invalidation](/topics/cache-invalidation)
- [System Design Tradeoffs](/topics/system-design-tradeoffs)'
    ),
    (
      'behavioral-tradeoff-example',
      'Behavioral Tradeoff Example',
      '# Tradeoff answer structure (STAR)

## Situation
State the context and constraints.

## Task
Define your responsibility.

## Action
Explain options and why you chose one.

## Result
Quantify impact and share what you learned.

## Rabbit-hole topics

- [Behavioral Storytelling](/topics/behavioral-storytelling)
- [System Design Tradeoffs](/topics/system-design-tradeoffs)'
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
