begin;

-- Hide prior generic demo rows from public views.
update public.answers
set
  status = 'draft'::public.content_status,
  updated_at = timezone('utc', now())
where question_id in (
  select id
  from public.questions
  where slug in (
    'nodejs-event-loop',
    'react-keys-and-reconciliation',
    'javascript-closures-practical',
    'sql-indexing-basics',
    'system-design-caching-strategy',
    'behavioral-tradeoff-example'
  )
);

update public.questions
set
  status = 'draft'::public.content_status,
  updated_at = timezone('utc', now())
where slug in (
  'nodejs-event-loop',
  'react-keys-and-reconciliation',
  'javascript-closures-practical',
  'sql-indexing-basics',
  'system-design-caching-strategy',
  'behavioral-tradeoff-example'
);

update public.topics
set
  status = 'draft'::public.content_status,
  updated_at = timezone('utc', now())
where slug in (
  'event-loop-internals',
  'async-javascript-patterns',
  'nodejs-runtime',
  'react-reconciliation',
  'frontend-performance',
  'javascript-closures',
  'sql-indexing',
  'query-planning',
  'database-performance',
  'caching-strategies',
  'cache-invalidation',
  'system-design-tradeoffs',
  'behavioral-storytelling'
);

insert into public.categories (slug, name, description, sort_order)
values
  (
    'salesforce',
    'Salesforce',
    'Salesforce platform architecture, Apex, security, and data access interview topics.',
    5
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
      'apex-governor-limits',
      'Apex Governor Limits',
      'Explain limits, bulkification, and resource-aware Apex design.',
      $$# Apex Governor Limits

Governor limits protect multi-tenant performance on the Salesforce platform.

## High-signal interview framing

- Bulkify all trigger and Apex logic.
- Avoid SOQL/DML inside loops.
- Design for worst-case batch sizes and recursion control.

## Typical limits to mention

- SOQL query count
- DML statement count
- CPU time and heap size$$,
      110
    ),
    (
      'trigger-order-of-execution',
      'Trigger Order Of Execution',
      'Describe the Salesforce transaction lifecycle and trigger timing decisions.',
      $$# Trigger Order Of Execution

Strong answers show where validation rules, flows, triggers, and workflow updates interact.

## Interview focus

- Before-trigger use cases vs after-trigger use cases
- Re-entry behavior caused by automation updates
- Idempotent logic and recursion guards$$,
      120
    ),
    (
      'soql-sosl-optimization',
      'SOQL SOSL Optimization',
      'Query design for selective filters, large data volumes, and search use-cases.',
      $$# SOQL SOSL Optimization

SOQL and SOSL solve different retrieval problems.

## What to cover

- SOQL for structured object/field filters
- SOSL for text-search across multiple objects
- Selective filters and index-aware query patterns$$,
      130
    ),
    (
      'salesforce-security-sharing',
      'Salesforce Security And Sharing',
      'Profiles, permission sets, sharing model, and secure Apex patterns.',
      $$# Salesforce Security And Sharing

Security questions test whether you can protect data while enabling business workflows.

## Core layers to explain

- Object and field permissions
- OWD and role hierarchy
- Sharing rules and Apex managed sharing
- `with sharing` and field-level enforcement in Apex$$,
      140
    ),
    (
      'asynchronous-apex-patterns',
      'Asynchronous Apex Patterns',
      'Choose Queueable, Batch, and Scheduled Apex based on workload shape.',
      $$# Asynchronous Apex Patterns

Async options in Salesforce are selected by processing volume, chaining needs, and retry behavior.

## Interview lens

- Queueable for flexible async units and chaining
- Batch Apex for large record processing
- Scheduled Apex for time-driven orchestration$$,
      150
    )
) as seed(slug, name, short_description, overview_markdown, sort_order)
join public.categories c on c.slug = 'salesforce'
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
    ('apex-governor-limits', 'trigger-order-of-execution', 'related', 10),
    ('apex-governor-limits', 'soql-sosl-optimization', 'related', 20),
    ('apex-governor-limits', 'asynchronous-apex-patterns', 'deep_dive', 30),
    ('trigger-order-of-execution', 'salesforce-security-sharing', 'related', 10),
    ('trigger-order-of-execution', 'apex-governor-limits', 'prerequisite', 20),
    ('soql-sosl-optimization', 'apex-governor-limits', 'prerequisite', 10),
    ('soql-sosl-optimization', 'asynchronous-apex-patterns', 'related', 20),
    ('salesforce-security-sharing', 'trigger-order-of-execution', 'related', 10),
    ('salesforce-security-sharing', 'apex-governor-limits', 'deep_dive', 20),
    ('asynchronous-apex-patterns', 'apex-governor-limits', 'prerequisite', 10),
    ('asynchronous-apex-patterns', 'soql-sosl-optimization', 'related', 20)
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
      'salesforce-governor-limits-bulkification',
      'How do you design Apex to avoid governor limit failures?',
      'medium',
      'Explain bulkification patterns, query strategy, and transaction-safe trigger design.',
      array['salesforce', 'apex', 'governor-limits', 'bulkification']::text[],
      8
    ),
    (
      'salesforce-trigger-order-of-execution',
      'Walk through Salesforce order of execution in a transaction',
      'medium',
      'Cover validation, flows, triggers, workflow field updates, and recursion implications.',
      array['salesforce', 'triggers', 'order-of-execution', 'automation']::text[],
      9
    ),
    (
      'salesforce-before-vs-after-trigger',
      'When do you use before triggers vs after triggers?',
      'easy',
      'Contrast mutation use-cases, related-record DML, and side-effect boundaries.',
      array['salesforce', 'apex', 'triggers']::text[],
      6
    ),
    (
      'salesforce-soql-large-data-volumes',
      'How do you optimize SOQL for large data volumes?',
      'hard',
      'Discuss selectivity, indexes, limits, and async processing strategies.',
      array['salesforce', 'soql', 'performance', 'ldv']::text[],
      10
    ),
    (
      'salesforce-sosl-vs-soql',
      'SOSL vs SOQL: when should you use each?',
      'easy',
      'Explain differences in search behavior, object scope, and practical selection criteria.',
      array['salesforce', 'sosl', 'soql', 'search']::text[],
      5
    ),
    (
      'salesforce-sharing-model-explained',
      'Explain Salesforce sharing model end-to-end',
      'medium',
      'Describe OWD, role hierarchy, sharing rules, and how Apex enforces security.',
      array['salesforce', 'security', 'sharing', 'access-control']::text[],
      9
    ),
    (
      'salesforce-queueable-vs-batch-apex',
      'Queueable vs Batch Apex: how do you decide?',
      'medium',
      'Compare execution model, throughput, chaining, and monitoring choices.',
      array['salesforce', 'async', 'queueable', 'batch-apex']::text[],
      8
    ),
    (
      'salesforce-secure-apex-stripinaccessible',
      'How do you enforce CRUD/FLS in Apex code?',
      'hard',
      'Show secure Apex patterns using sharing keywords and Security.stripInaccessible.',
      array['salesforce', 'security', 'apex', 'fls', 'crud']::text[],
      9
    )
) as seed(slug, title, difficulty, summary, tags, estimated_minutes)
join public.categories c on c.slug = 'salesforce'
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
    ('salesforce-governor-limits-bulkification', 'apex-governor-limits', 10),
    ('salesforce-governor-limits-bulkification', 'trigger-order-of-execution', 20),
    ('salesforce-governor-limits-bulkification', 'soql-sosl-optimization', 30),
    ('salesforce-trigger-order-of-execution', 'trigger-order-of-execution', 10),
    ('salesforce-trigger-order-of-execution', 'apex-governor-limits', 20),
    ('salesforce-trigger-order-of-execution', 'salesforce-security-sharing', 30),
    ('salesforce-before-vs-after-trigger', 'trigger-order-of-execution', 10),
    ('salesforce-before-vs-after-trigger', 'apex-governor-limits', 20),
    ('salesforce-soql-large-data-volumes', 'soql-sosl-optimization', 10),
    ('salesforce-soql-large-data-volumes', 'apex-governor-limits', 20),
    ('salesforce-soql-large-data-volumes', 'asynchronous-apex-patterns', 30),
    ('salesforce-sosl-vs-soql', 'soql-sosl-optimization', 10),
    ('salesforce-sharing-model-explained', 'salesforce-security-sharing', 10),
    ('salesforce-sharing-model-explained', 'trigger-order-of-execution', 20),
    ('salesforce-queueable-vs-batch-apex', 'asynchronous-apex-patterns', 10),
    ('salesforce-queueable-vs-batch-apex', 'apex-governor-limits', 20),
    ('salesforce-queueable-vs-batch-apex', 'soql-sosl-optimization', 30),
    ('salesforce-secure-apex-stripinaccessible', 'salesforce-security-sharing', 10),
    ('salesforce-secure-apex-stripinaccessible', 'apex-governor-limits', 20)
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
    'salesforce-governor-limits-bulkification',
    'salesforce-trigger-order-of-execution',
    'salesforce-before-vs-after-trigger',
    'salesforce-soql-large-data-volumes',
    'salesforce-sosl-vs-soql',
    'salesforce-sharing-model-explained',
    'salesforce-queueable-vs-batch-apex',
    'salesforce-secure-apex-stripinaccessible'
  )
  and qt.question_id = q.id;

update public.question_topics qt
set
  is_primary = true,
  updated_at = timezone('utc', now())
from (
  values
    ('salesforce-governor-limits-bulkification', 'apex-governor-limits'),
    ('salesforce-trigger-order-of-execution', 'trigger-order-of-execution'),
    ('salesforce-before-vs-after-trigger', 'trigger-order-of-execution'),
    ('salesforce-soql-large-data-volumes', 'soql-sosl-optimization'),
    ('salesforce-sosl-vs-soql', 'soql-sosl-optimization'),
    ('salesforce-sharing-model-explained', 'salesforce-security-sharing'),
    ('salesforce-queueable-vs-batch-apex', 'asynchronous-apex-patterns'),
    ('salesforce-secure-apex-stripinaccessible', 'salesforce-security-sharing')
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
    ('salesforce-governor-limits-bulkification', 'apex-governor-limits'),
    ('salesforce-trigger-order-of-execution', 'trigger-order-of-execution'),
    ('salesforce-before-vs-after-trigger', 'trigger-order-of-execution'),
    ('salesforce-soql-large-data-volumes', 'soql-sosl-optimization'),
    ('salesforce-sosl-vs-soql', 'soql-sosl-optimization'),
    ('salesforce-sharing-model-explained', 'salesforce-security-sharing'),
    ('salesforce-queueable-vs-batch-apex', 'asynchronous-apex-patterns'),
    ('salesforce-secure-apex-stripinaccessible', 'salesforce-security-sharing')
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
      'salesforce-governor-limits-bulkification',
      'Apex Governor Limits and Bulkification',
      $$# How to avoid governor limit failures

In Salesforce, every transaction shares finite limits, so design for bulk input by default.

## What interviewers expect

- No SOQL or DML inside loops
- Set-based processing
- One-pass validation and one-pass mutation patterns

```apex title="bulk-safe-trigger.apex"
trigger AccountBeforeInsert on Account (before insert) {
    Set<Id> ownerIds = new Set<Id>();
    for (Account acc : Trigger.new) {
        ownerIds.add(acc.OwnerId);
    }

    Map<Id, User> owners = new Map<Id, User>(
        [SELECT Id, IsActive FROM User WHERE Id IN :ownerIds]
    );

    for (Account acc : Trigger.new) {
        if (owners.containsKey(acc.OwnerId) && !owners.get(acc.OwnerId).IsActive) {
            acc.addError('Owner must be active.');
        }
    }
}
```

## Rabbit-hole topics

- [Apex Governor Limits](/topics/apex-governor-limits)
- [Trigger Order Of Execution](/topics/trigger-order-of-execution)
- [SOQL SOSL Optimization](/topics/soql-sosl-optimization)$$
    ),
    (
      'salesforce-trigger-order-of-execution',
      'Salesforce Order Of Execution',
      $$# Salesforce order of execution

A strong answer is about **sequence plus side effects**.

## Core sequence to mention

1. System validation
2. Before triggers
3. Custom validation
4. After triggers
5. Assignment rules / auto-response / workflow
6. Process/Flow re-entry updates
7. Commit and post-commit async actions

Call out that workflow/flow updates can cause trigger re-entry, so logic must stay idempotent.

## Rabbit-hole topics

- [Trigger Order Of Execution](/topics/trigger-order-of-execution)
- [Salesforce Security And Sharing](/topics/salesforce-security-sharing)
- [Apex Governor Limits](/topics/apex-governor-limits)$$
    ),
    (
      'salesforce-before-vs-after-trigger',
      'Before vs After Triggers',
      $$# Before vs After triggers

Use **before triggers** to mutate incoming records without extra DML.  
Use **after triggers** when you need record IDs or related-record DML.

```apex title="after-update-example.apex"
trigger OpportunityAfterUpdate on Opportunity (after update) {
    List<Task> tasks = new List<Task>();

    for (Opportunity opp : Trigger.new) {
        Opportunity oldOpp = Trigger.oldMap.get(opp.Id);
        if (opp.StageName == 'Closed Won' && oldOpp.StageName != 'Closed Won') {
            tasks.add(new Task(
                WhatId = opp.Id,
                Subject = 'Send welcome package'
            ));
        }
    }

    if (!tasks.isEmpty()) {
        insert tasks;
    }
}
```

## Rabbit-hole topics

- [Trigger Order Of Execution](/topics/trigger-order-of-execution)
- [Apex Governor Limits](/topics/apex-governor-limits)$$
    ),
    (
      'salesforce-soql-large-data-volumes',
      'SOQL Performance for LDV',
      $$# SOQL for large data volumes

For LDV, your query must stay selective and bounded.

## Practical guidance

- Filter on indexed/selective fields first
- Avoid broad negative filters on huge objects
- Use async processing (Batch Apex) for full-scale scans

```apex title="selective-query.apex"
List<Case> recentOpenCases = [
    SELECT Id, Status, CreatedDate
    FROM Case
    WHERE IsClosed = false
      AND CreatedDate = LAST_N_DAYS:30
    ORDER BY CreatedDate DESC
    LIMIT 200
];
```

## Rabbit-hole topics

- [SOQL SOSL Optimization](/topics/soql-sosl-optimization)
- [Apex Governor Limits](/topics/apex-governor-limits)
- [Asynchronous Apex Patterns](/topics/asynchronous-apex-patterns)$$
    ),
    (
      'salesforce-sosl-vs-soql',
      'SOSL vs SOQL',
      $$# SOSL vs SOQL

Use SOQL for structured data retrieval from known objects and fields.  
Use SOSL for text search across multiple objects.

```apex title="soql-vs-sosl.apex"
// SOQL: structured query
List<Account> accs = [
    SELECT Id, Name
    FROM Account
    WHERE Industry = 'Technology'
    LIMIT 50
];

// SOSL: text search
List<List<SObject>> searchResults = [
    FIND 'Acme*'
    IN ALL FIELDS
    RETURNING Account(Id, Name), Contact(Id, Name)
];
```

## Rabbit-hole topics

- [SOQL SOSL Optimization](/topics/soql-sosl-optimization)$$
    ),
    (
      'salesforce-sharing-model-explained',
      'Salesforce Sharing Model',
      $$# Salesforce sharing model

Explain security layers in order:

1. Object-level permissions (Profile/Permission Set)
2. Field-level security
3. Record-level access (OWD, roles, sharing rules)

For record exceptions, Apex managed sharing can grant targeted access.

```apex title="manual-share.apex"
AccountShare shareRow = new AccountShare();
shareRow.AccountId = accountId;
shareRow.UserOrGroupId = userId;
shareRow.AccountAccessLevel = 'Read';
shareRow.RowCause = Schema.AccountShare.RowCause.Manual;
insert shareRow;
```

## Rabbit-hole topics

- [Salesforce Security And Sharing](/topics/salesforce-security-sharing)
- [Trigger Order Of Execution](/topics/trigger-order-of-execution)$$
    ),
    (
      'salesforce-queueable-vs-batch-apex',
      'Queueable vs Batch Apex',
      $$# Queueable vs Batch Apex

Use Queueable for small-medium async jobs and chaining.  
Use Batch Apex when record volume is large and needs chunked execution.

```apex title="queueable-example.apex"
public class RecalcScoresJob implements Queueable {
    public void execute(QueueableContext context) {
        // async business logic
    }
}
System.enqueueJob(new RecalcScoresJob());
```

```apex title="batch-example.apex"
public class ArchiveCasesBatch implements Database.Batchable<SObject> {
    public Database.QueryLocator start(Database.BatchableContext bc) {
        return Database.getQueryLocator('SELECT Id FROM Case WHERE IsClosed = true');
    }
    public void execute(Database.BatchableContext bc, List<SObject> scope) {
        // process scope
    }
    public void finish(Database.BatchableContext bc) {}
}
Database.executeBatch(new ArchiveCasesBatch(), 200);
```

## Rabbit-hole topics

- [Asynchronous Apex Patterns](/topics/asynchronous-apex-patterns)
- [Apex Governor Limits](/topics/apex-governor-limits)$$
    ),
    (
      'salesforce-secure-apex-stripinaccessible',
      'Secure Apex with CRUD/FLS Enforcement',
      $$# Enforcing CRUD/FLS in Apex

Security is not automatic in all Apex contexts, so explicitly enforce access.

## Recommended pattern

- Use `with sharing` for record-level behavior.
- Enforce field/object access with `Security.stripInaccessible`.

```apex title="secure-read.apex"
List<Account> rows = [SELECT Id, Name, AnnualRevenue FROM Account LIMIT 200];

SObjectAccessDecision decision =
    Security.stripInaccessible(AccessType.READABLE, rows);

List<Account> safeRows = (List<Account>)decision.getRecords();
```

Also enforce write checks before DML in service-layer methods.

## Rabbit-hole topics

- [Salesforce Security And Sharing](/topics/salesforce-security-sharing)
- [Apex Governor Limits](/topics/apex-governor-limits)$$
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
      'salesforce-governor-limits-bulkification',
      'Apex Governor Limits and Bulkification',
      $$# How to avoid governor limit failures

In Salesforce, every transaction shares finite limits, so design for bulk input by default.

## What interviewers expect

- No SOQL or DML inside loops
- Set-based processing
- One-pass validation and one-pass mutation patterns

```apex title="bulk-safe-trigger.apex"
trigger AccountBeforeInsert on Account (before insert) {
    Set<Id> ownerIds = new Set<Id>();
    for (Account acc : Trigger.new) {
        ownerIds.add(acc.OwnerId);
    }

    Map<Id, User> owners = new Map<Id, User>(
        [SELECT Id, IsActive FROM User WHERE Id IN :ownerIds]
    );

    for (Account acc : Trigger.new) {
        if (owners.containsKey(acc.OwnerId) && !owners.get(acc.OwnerId).IsActive) {
            acc.addError('Owner must be active.');
        }
    }
}
```

## Rabbit-hole topics

- [Apex Governor Limits](/topics/apex-governor-limits)
- [Trigger Order Of Execution](/topics/trigger-order-of-execution)
- [SOQL SOSL Optimization](/topics/soql-sosl-optimization)$$
    ),
    (
      'salesforce-trigger-order-of-execution',
      'Salesforce Order Of Execution',
      $$# Salesforce order of execution

A strong answer is about **sequence plus side effects**.

## Core sequence to mention

1. System validation
2. Before triggers
3. Custom validation
4. After triggers
5. Assignment rules / auto-response / workflow
6. Process/Flow re-entry updates
7. Commit and post-commit async actions

Call out that workflow/flow updates can cause trigger re-entry, so logic must stay idempotent.

## Rabbit-hole topics

- [Trigger Order Of Execution](/topics/trigger-order-of-execution)
- [Salesforce Security And Sharing](/topics/salesforce-security-sharing)
- [Apex Governor Limits](/topics/apex-governor-limits)$$
    ),
    (
      'salesforce-before-vs-after-trigger',
      'Before vs After Triggers',
      $$# Before vs After triggers

Use **before triggers** to mutate incoming records without extra DML.  
Use **after triggers** when you need record IDs or related-record DML.

```apex title="after-update-example.apex"
trigger OpportunityAfterUpdate on Opportunity (after update) {
    List<Task> tasks = new List<Task>();

    for (Opportunity opp : Trigger.new) {
        Opportunity oldOpp = Trigger.oldMap.get(opp.Id);
        if (opp.StageName == 'Closed Won' && oldOpp.StageName != 'Closed Won') {
            tasks.add(new Task(
                WhatId = opp.Id,
                Subject = 'Send welcome package'
            ));
        }
    }

    if (!tasks.isEmpty()) {
        insert tasks;
    }
}
```

## Rabbit-hole topics

- [Trigger Order Of Execution](/topics/trigger-order-of-execution)
- [Apex Governor Limits](/topics/apex-governor-limits)$$
    ),
    (
      'salesforce-soql-large-data-volumes',
      'SOQL Performance for LDV',
      $$# SOQL for large data volumes

For LDV, your query must stay selective and bounded.

## Practical guidance

- Filter on indexed/selective fields first
- Avoid broad negative filters on huge objects
- Use async processing (Batch Apex) for full-scale scans

```apex title="selective-query.apex"
List<Case> recentOpenCases = [
    SELECT Id, Status, CreatedDate
    FROM Case
    WHERE IsClosed = false
      AND CreatedDate = LAST_N_DAYS:30
    ORDER BY CreatedDate DESC
    LIMIT 200
];
```

## Rabbit-hole topics

- [SOQL SOSL Optimization](/topics/soql-sosl-optimization)
- [Apex Governor Limits](/topics/apex-governor-limits)
- [Asynchronous Apex Patterns](/topics/asynchronous-apex-patterns)$$
    ),
    (
      'salesforce-sosl-vs-soql',
      'SOSL vs SOQL',
      $$# SOSL vs SOQL

Use SOQL for structured data retrieval from known objects and fields.  
Use SOSL for text search across multiple objects.

```apex title="soql-vs-sosl.apex"
// SOQL: structured query
List<Account> accs = [
    SELECT Id, Name
    FROM Account
    WHERE Industry = 'Technology'
    LIMIT 50
];

// SOSL: text search
List<List<SObject>> searchResults = [
    FIND 'Acme*'
    IN ALL FIELDS
    RETURNING Account(Id, Name), Contact(Id, Name)
];
```

## Rabbit-hole topics

- [SOQL SOSL Optimization](/topics/soql-sosl-optimization)$$
    ),
    (
      'salesforce-sharing-model-explained',
      'Salesforce Sharing Model',
      $$# Salesforce sharing model

Explain security layers in order:

1. Object-level permissions (Profile/Permission Set)
2. Field-level security
3. Record-level access (OWD, roles, sharing rules)

For record exceptions, Apex managed sharing can grant targeted access.

```apex title="manual-share.apex"
AccountShare shareRow = new AccountShare();
shareRow.AccountId = accountId;
shareRow.UserOrGroupId = userId;
shareRow.AccountAccessLevel = 'Read';
shareRow.RowCause = Schema.AccountShare.RowCause.Manual;
insert shareRow;
```

## Rabbit-hole topics

- [Salesforce Security And Sharing](/topics/salesforce-security-sharing)
- [Trigger Order Of Execution](/topics/trigger-order-of-execution)$$
    ),
    (
      'salesforce-queueable-vs-batch-apex',
      'Queueable vs Batch Apex',
      $$# Queueable vs Batch Apex

Use Queueable for small-medium async jobs and chaining.  
Use Batch Apex when record volume is large and needs chunked execution.

```apex title="queueable-example.apex"
public class RecalcScoresJob implements Queueable {
    public void execute(QueueableContext context) {
        // async business logic
    }
}
System.enqueueJob(new RecalcScoresJob());
```

```apex title="batch-example.apex"
public class ArchiveCasesBatch implements Database.Batchable<SObject> {
    public Database.QueryLocator start(Database.BatchableContext bc) {
        return Database.getQueryLocator('SELECT Id FROM Case WHERE IsClosed = true');
    }
    public void execute(Database.BatchableContext bc, List<SObject> scope) {
        // process scope
    }
    public void finish(Database.BatchableContext bc) {}
}
Database.executeBatch(new ArchiveCasesBatch(), 200);
```

## Rabbit-hole topics

- [Asynchronous Apex Patterns](/topics/asynchronous-apex-patterns)
- [Apex Governor Limits](/topics/apex-governor-limits)$$
    ),
    (
      'salesforce-secure-apex-stripinaccessible',
      'Secure Apex with CRUD/FLS Enforcement',
      $$# Enforcing CRUD/FLS in Apex

Security is not automatic in all Apex contexts, so explicitly enforce access.

## Recommended pattern

- Use `with sharing` for record-level behavior.
- Enforce field/object access with `Security.stripInaccessible`.

```apex title="secure-read.apex"
List<Account> rows = [SELECT Id, Name, AnnualRevenue FROM Account LIMIT 200];

SObjectAccessDecision decision =
    Security.stripInaccessible(AccessType.READABLE, rows);

List<Account> safeRows = (List<Account>)decision.getRecords();
```

Also enforce write checks before DML in service-layer methods.

## Rabbit-hole topics

- [Salesforce Security And Sharing](/topics/salesforce-security-sharing)
- [Apex Governor Limits](/topics/apex-governor-limits)$$
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
