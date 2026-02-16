begin;

-- =============================================================
-- PART 1: Subcategories under the "Salesforce" category
-- =============================================================

insert into public.subcategories (slug, name, description, sort_order, category_id)
select
  seed.slug, seed.name, seed.description, seed.sort_order, c.id
from (
  values
    ('apex-programming', 'Apex Programming',
     'Core Salesforce programming language — triggers, async patterns, SOQL, and testing', 1),
    ('lwc-development', 'Lightning Web Components',
     'Modern Salesforce frontend framework — lifecycle, communication, data binding, and performance', 2),
    ('data-modeling', 'Data Modeling & Architecture',
     'Schema design, relationships, large data strategies, and platform architecture', 3),
    ('integration', 'Integration & APIs',
     'REST/SOAP callouts, platform events, authentication, and integration patterns', 4),
    ('security-and-access', 'Security & Access Control',
     'Sharing model, profiles, permission sets, FLS enforcement, and security best practices', 5),
    ('automation-and-config', 'Automation & Configuration',
     'Flows, validation rules, formulas, and the declarative vs code decision framework', 6),
    ('development-practices', 'Development Practices',
     'SFDX, CI/CD, code quality, debugging, and professional development workflows', 7)
) as seed(slug, name, description, sort_order)
join public.categories c on c.slug = 'salesforce'
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order,
  updated_at = timezone('utc', now());

-- =============================================================
-- PART 2: Topics — Apex Programming (first 4 high-value topics)
-- =============================================================

-- Update existing topics to point to subcategories
update public.topics t
set
  subcategory_id = s.id,
  updated_at = timezone('utc', now())
from public.subcategories s
where s.slug = 'apex-programming'
  and t.slug in ('apex-governor-limits', 'trigger-order-of-execution',
                 'soql-sosl-optimization', 'asynchronous-apex-patterns');

update public.topics t
set
  subcategory_id = s.id,
  updated_at = timezone('utc', now())
from public.subcategories s
where s.slug = 'security-and-access'
  and t.slug = 'salesforce-security-sharing';

-- Insert new topics with template-structured overview_markdown
insert into public.topics (
  slug, name, short_description, overview_markdown,
  status, published_at, sort_order, subcategory_id
)
select
  seed.slug, seed.name, seed.short_description, seed.overview_markdown,
  'published'::public.content_status, timezone('utc', now()),
  seed.sort_order, s.id
from (
  values
    (
      'apex-fundamentals',
      'Apex Fundamentals',
      'Variables, collections, data types, null handling, control flow',
      $$## Why This Matters in Interviews

Apex fundamentals are tested in every Salesforce developer interview, especially in technical screening rounds. Interviewers use these questions to quickly assess baseline competency before moving to advanced topics like triggers and governor limits.

## What You Need to Know

### Core Concepts
- Data types: primitives (Integer, String, Boolean, Decimal) vs. complex types (sObjects, collections)
- Collections: List, Set, Map — when to use each and performance implications
- Null handling: null-safe navigation (`?.`), common NullPointerException scenarios
- Control flow: if/else, switch-on, for loops, while loops
- Type casting and type checking with `instanceof`
- Constants, enums, and static vs instance context

### Key Differences to Know
| Concept | Java Equivalent | Apex Difference |
|---------|----------------|-----------------|
| Collections | ArrayList/HashMap | Governor-limit-aware, max heap size |
| Strings | Immutable | Same, but `String.isBlank()` preferred over `isEmpty()` |
| Null handling | Optional | No Optional class — use explicit null checks |

### Common Interview Scenarios
- "Initialize a Map from a SOQL query in one line"
- "Explain the difference between `==` and `===` in Apex"
- "How would you safely access a nested relationship field?"
- "What happens when you add a duplicate to a Set?"

## Seniority Expectations

| Level | What's Expected |
|-------|----------------|
| Junior | Solid understanding of all data types, collections, and control flow |
| Mid | Efficient collection usage, null-safe patterns, clean code style |

## Prerequisites

- Basic object-oriented programming concepts

## Related Topics

- [Apex Triggers](/topics/apex-triggers) — applies fundamentals in event-driven context
- [SOQL & SOSL](/topics/soql-and-sosl) — query results feed into collections
- [Exception Handling](/topics/apex-exception-handling) — error patterns build on control flow$$,
      100
    ),
    (
      'apex-triggers',
      'Apex Triggers',
      'Trigger context variables, bulkification, before/after events',
      $$## Why This Matters in Interviews

Apex triggers are asked in virtually every Salesforce technical interview from junior to senior level. They test your understanding of event-driven programming, bulkification, and how automation fits into the platform execution model.

## What You Need to Know

### Core Concepts
- Trigger events: before insert, before update, after insert, after update, before delete, after delete, after undelete
- Context variables: `Trigger.new`, `Trigger.old`, `Trigger.newMap`, `Trigger.oldMap`, `Trigger.isInsert`, etc.
- Before vs after: before for field mutation without DML, after for related-record DML and access to record IDs
- Bulkification: always process `Trigger.new` as a collection, never assume single record
- Recursion prevention: static flags or framework-level guards
- One trigger per object best practice

### Key Differences to Know
| Before Trigger | After Trigger |
|---------------|--------------|
| Can modify `Trigger.new` directly | Records are read-only |
| No record ID on insert | Record IDs available |
| No DML needed for field changes | Must use DML for related records |
| Runs before validation rules | Runs after commit preparation |

### Common Interview Scenarios
- "Write a trigger that prevents duplicate Account names"
- "When would you use before vs after trigger?"
- "How do you prevent recursive trigger execution?"
- "Explain how to bulkify a trigger that validates against related records"

## Seniority Expectations

| Level | What's Expected |
|-------|----------------|
| Junior | Basic trigger syntax, context variables, simple before/after use cases |
| Mid | Bulkification patterns, handler class separation, recursion guards |
| Senior | Framework design, metadata-driven triggers, complex multi-object orchestration |

## Prerequisites

- [Apex Fundamentals](/topics/apex-fundamentals) — collections and control flow
- [Order of Execution](/topics/order-of-execution) — where triggers fit in the transaction

## Related Topics

- [Trigger Frameworks](/topics/trigger-frameworks) — structured patterns for trigger logic
- [Governor Limits](/topics/governor-limits) — triggers must operate within limits$$,
      110
    ),
    (
      'trigger-frameworks',
      'Trigger Frameworks',
      'Handler patterns, recursion guards, metadata-driven triggers',
      $$## Why This Matters in Interviews

Trigger framework questions separate mid-level developers from seniors. Interviewers want to see that you think about maintainability, testability, and org-level architecture — not just "make it work."

## What You Need to Know

### Core Concepts
- Handler pattern: one trigger per object delegates to a handler class
- Interface-based frameworks: `TriggerHandler` interface with `beforeInsert()`, `afterUpdate()`, etc.
- Recursion control: static Set or framework-level tracking of processed IDs
- Metadata-driven triggers: Custom Metadata to enable/disable triggers per object without deployment
- Separation of concerns: trigger file is thin, business logic lives in service classes
- Testing: handler classes are unit-testable without trigger context

### Key Differences to Know
| Pattern | Pros | Cons |
|---------|------|------|
| One handler per object | Simple, clear ownership | Can grow large |
| Domain layer (fflib) | Enterprise-grade, separation | Steep learning curve |
| Metadata-driven | Toggle without deploy | Extra complexity upfront |

### Common Interview Scenarios
- "Design a trigger framework for an org with 20+ objects"
- "How do you unit test trigger logic without inserting records?"
- "Walk through how you would add a new trigger to an existing framework"

## Seniority Expectations

| Level | What's Expected |
|-------|----------------|
| Mid | Knows handler pattern, can implement basic framework |
| Senior | Can design a framework, metadata-driven toggles, testing strategy |
| Architect | Enterprise patterns (fflib), cross-org considerations, deployment strategy |

## Prerequisites

- [Apex Triggers](/topics/apex-triggers) — must understand raw triggers first
- [Apex Fundamentals](/topics/apex-fundamentals) — interfaces and OOP concepts

## Related Topics

- [Governor Limits](/topics/governor-limits) — frameworks help manage limits at scale
- [Code Quality & Review](/topics/code-quality-and-review) — framework adoption is a code quality decision$$,
      120
    ),
    (
      'apex-testing',
      'Apex Testing',
      'Test factories, mocking, HttpCalloutMock, bulk test patterns',
      $$## Why This Matters in Interviews

Apex testing is asked in mid-to-senior interviews and is a strong signal of professional maturity. Interviewers want to see that you understand test data isolation, bulk testing, and mock patterns — not just code coverage.

## What You Need to Know

### Core Concepts
- Test isolation: `@IsTest` annotation, `SeeAllData=false` default, test setup methods
- Test data factories: reusable helper classes for creating test records
- Bulk testing: always test with 200+ records to catch governor limit violations
- Mocking callouts: `HttpCalloutMock` and `Test.setMock()` for external service tests
- Assertions: `Assert.areEqual()`, `Assert.isTrue()`, custom error messages
- Test.startTest() / Test.stopTest(): reset governor limits for focused assertions

### Key Differences to Know
| Concept | Good Practice | Anti-Pattern |
|---------|--------------|-------------|
| Test data | Factory classes | Hardcoded in each test |
| Assertions | Specific with messages | Just checking coverage |
| Bulk testing | 200+ records | Single record only |
| Callout testing | HttpCalloutMock | Skipping callout tests |

### Common Interview Scenarios
- "How do you test a trigger that makes an HTTP callout?"
- "What is the difference between Test.startTest() and Test.stopTest()?"
- "How would you achieve 90%+ coverage while actually testing behavior?"
- "Design a test data factory for a complex object hierarchy"

## Seniority Expectations

| Level | What's Expected |
|-------|----------------|
| Mid | Test factories, basic mocking, governor limit testing |
| Senior | Comprehensive negative testing, complex mock scenarios, CI/CD integration |

## Prerequisites

- [Apex Fundamentals](/topics/apex-fundamentals) — basic Apex syntax and OOP
- [Apex Triggers](/topics/apex-triggers) — most tests validate trigger behavior

## Related Topics

- [Exception Handling](/topics/apex-exception-handling) — testing error scenarios
- [Code Quality & Review](/topics/code-quality-and-review) — testing standards$$,
      160
    )
) as seed(slug, name, short_description, overview_markdown, sort_order)
join public.subcategories s on s.slug = 'apex-programming'
on conflict (slug) do update
set
  name = excluded.name,
  short_description = excluded.short_description,
  overview_markdown = excluded.overview_markdown,
  subcategory_id = excluded.subcategory_id,
  status = excluded.status,
  published_at = coalesce(public.topics.published_at, excluded.published_at),
  sort_order = excluded.sort_order,
  updated_at = timezone('utc', now());

-- =============================================================
-- PART 3: Questions with question_type + seniority_level
-- =============================================================

insert into public.questions (
  slug, title, summary,
  question_type, seniority_level,
  status, published_at
)
select
  seed.slug, seed.title,
  seed.summary,
  seed.question_type, seed.seniority_level,
  'published'::public.content_status, timezone('utc', now())
from (
  values
    (
      'apex-triggers-context-variables-junior',
      'Explain the trigger context variables in Apex and when you would use each one',
      'Tests understanding of Trigger.new, Trigger.old, Trigger.newMap, Trigger.oldMap and their availability per event type.',
      'standard', 'junior'
    ),
    (
      'apex-triggers-framework-design-senior',
      'Design a trigger framework for an org with 20+ custom objects that supports per-object toggle and recursion control',
      'Tests architecture thinking for enterprise-scale trigger management with metadata-driven configuration.',
      'scenario', 'senior'
    ),
    (
      'apex-triggers-bulkification-review-mid',
      'Review this Apex trigger and identify the issues that would cause failures in production',
      'Tests ability to spot SOQL-in-loop, missing bulkification, and recursion vulnerabilities in trigger code.',
      'code_review', 'mid'
    )
) as seed(slug, title, summary, question_type, seniority_level)
on conflict (slug) do update
set
  title = excluded.title,
  summary = excluded.summary,
  question_type = excluded.question_type,
  seniority_level = excluded.seniority_level,
  status = 'published'::public.content_status,
  published_at = coalesce(public.questions.published_at, excluded.published_at),
  updated_at = timezone('utc', now());

-- Link questions to topics
insert into public.question_topics (question_id, topic_id, sort_order)
select q.id, t.id, seed.sort_order
from (
  values
    ('apex-triggers-context-variables-junior', 'apex-triggers', 10),
    ('apex-triggers-context-variables-junior', 'apex-fundamentals', 20),
    ('apex-triggers-framework-design-senior', 'trigger-frameworks', 10),
    ('apex-triggers-framework-design-senior', 'apex-triggers', 20),
    ('apex-triggers-framework-design-senior', 'apex-governor-limits', 30),
    ('apex-triggers-bulkification-review-mid', 'apex-triggers', 10),
    ('apex-triggers-bulkification-review-mid', 'apex-governor-limits', 20)
) as seed(question_slug, topic_slug, sort_order)
join public.questions q on q.slug = seed.question_slug
join public.topics t on t.slug = seed.topic_slug
on conflict (question_id, topic_id) do update
set
  sort_order = excluded.sort_order,
  updated_at = timezone('utc', now());

-- =============================================================
-- PART 4: Answers following template heading structures
-- =============================================================

-- 4a. STANDARD answer (follows standard-answer.md template)
insert into public.answers (
  question_id, title, content_markdown, is_primary,
  status, published_at
)
select
  q.id, seed.title, seed.content_markdown, true,
  'published'::public.content_status, timezone('utc', now())
from (
  values
    (
      'apex-triggers-context-variables-junior',
      'Apex Trigger Context Variables Explained',
      $$## Key Points

- Apex provides context variables like `Trigger.new`, `Trigger.old`, `Trigger.newMap`, and `Trigger.oldMap` to access records involved in the triggering operation
- `Trigger.new` contains the new versions of records and is available in insert and update events
- `Trigger.old` contains the previous versions of records and is only available in update and delete events
- Boolean variables (`Trigger.isInsert`, `Trigger.isUpdate`, etc.) let you branch logic by operation type
- Map versions (`Trigger.newMap`, `Trigger.oldMap`) are essential for efficient lookups when comparing old vs new values

## Detailed Explanation

Every Apex trigger receives a set of context variables that describe **what happened** and **which records are affected**. These variables are automatically populated by the platform — you never construct them manually.

The two most important variables are `Trigger.new` (a `List<SObject>` of records in their current state) and `Trigger.old` (a `List<SObject>` of records in their previous state). On insert, there is no "old" state, so `Trigger.old` is null. On delete, there is no "new" state, so `Trigger.new` is null. Update events provide both.

The Map equivalents — `Trigger.newMap` and `Trigger.oldMap` — provide the same records keyed by their `Id`. These are critical for efficient field-change detection: instead of nested loops, you look up the old record by ID in O(1) time.

Boolean flags like `Trigger.isBefore`, `Trigger.isAfter`, `Trigger.isInsert`, `Trigger.isUpdate`, and `Trigger.isDelete` allow you to write a single trigger per object that delegates to different handler methods based on the operation.

## Example

```apex
trigger AccountTrigger on Account (before insert, before update, after update) {
    if (Trigger.isBefore && Trigger.isInsert) {
        // Trigger.new available, Trigger.old is null
        for (Account acc : Trigger.new) {
            if (String.isBlank(acc.Industry)) {
                acc.Industry = 'Other';
            }
        }
    }

    if (Trigger.isBefore && Trigger.isUpdate) {
        // Both Trigger.new and Trigger.oldMap available
        for (Account acc : Trigger.new) {
            Account oldAcc = Trigger.oldMap.get(acc.Id);
            if (acc.Rating != oldAcc.Rating) {
                acc.Description = 'Rating changed from '
                    + oldAcc.Rating + ' to ' + acc.Rating;
            }
        }
    }

    if (Trigger.isAfter && Trigger.isUpdate) {
        // Records are read-only here — use DML for related records
        List<Task> followUps = new List<Task>();
        for (Account acc : Trigger.new) {
            Account oldAcc = Trigger.oldMap.get(acc.Id);
            if (acc.OwnerId != oldAcc.OwnerId) {
                followUps.add(new Task(
                    WhatId = acc.Id,
                    Subject = 'Introduce yourself to new account',
                    OwnerId = acc.OwnerId
                ));
            }
        }
        if (!followUps.isEmpty()) {
            insert followUps;
        }
    }
}
```

This example shows all three context patterns: insert-only (no old), field-change detection with oldMap, and after-trigger DML for related records.

## Best Practices

- Always use `Trigger.newMap`/`Trigger.oldMap` for field-change comparisons instead of indexing into lists
- Check boolean flags to branch logic cleanly rather than using separate triggers per event
- Never modify `Trigger.new` records in an after trigger — use before triggers for field changes
- Delegate trigger logic to handler classes using context variables as parameters
- Always process the entire `Trigger.new` collection — never assume `Trigger.new.size() == 1`

> [!TIP]
> Interviewers asking this question want to hear you naturally say "bulkification" and explain that Trigger.new is a **list**, not a single record. Mention that you always iterate the full collection and never hardcode `Trigger.new[0]`.

## Common Mistakes

- Assuming `Trigger.old` is available on insert — it is null, causing NullPointerException
- Using `Trigger.new[0]` instead of iterating — breaks with bulk operations like Data Loader
- Trying to modify records in an after trigger — records are read-only after the before phase
- Not using Map versions for field-change detection — leads to O(n²) nested loops$$
    )
) as seed(question_slug, title, content_markdown)
join public.questions q on q.slug = seed.question_slug
on conflict do nothing;

-- 4b. SCENARIO answer (follows scenario-answer.md template)
insert into public.answers (
  question_id, title, content_markdown, is_primary,
  status, published_at
)
select
  q.id, seed.title, seed.content_markdown, true,
  'published'::public.content_status, timezone('utc', now())
from (
  values
    (
      'apex-triggers-framework-design-senior',
      'Designing an Enterprise Trigger Framework',
      $$## Context

You are the lead developer in a Salesforce org with 20+ custom objects, each requiring trigger logic. Multiple teams contribute code, and the current state is a mix of inline trigger logic, some handler classes, and no consistent pattern. Deployments frequently cause trigger conflicts, and debugging is painful because logic is scattered. You need to design a framework that scales, supports per-object toggling without deployment, and prevents recursion.

Key constraints: the org has 15 developers across 3 teams, monthly release cadence, and a strict code review process. Governor limits are a concern because several objects have complex automation chains.

## Approach: Metadata-Driven Handler Dispatcher

Use a central `TriggerDispatcher` class that reads Custom Metadata (`Trigger_Setting__mdt`) to determine which handler class to invoke for each object. Each handler implements a `ITriggerHandler` interface.

```apex
public interface ITriggerHandler {
    void beforeInsert(List<SObject> newRecords);
    void afterInsert(List<SObject> newRecords);
    void beforeUpdate(Map<Id, SObject> oldMap, List<SObject> newRecords);
    void afterUpdate(Map<Id, SObject> oldMap, List<SObject> newRecords);
    void beforeDelete(List<SObject> oldRecords);
    void afterDelete(List<SObject> oldRecords);
}

public class TriggerDispatcher {
    public static void run(ITriggerHandler handler, String objectName) {
        Trigger_Setting__mdt setting = Trigger_Setting__mdt.getInstance(objectName);

        if (setting != null && !setting.Is_Active__c) return;
        if (TriggerRecursionGuard.hasRun(objectName, Trigger.operationType)) return;

        TriggerRecursionGuard.markRun(objectName, Trigger.operationType);

        if (Trigger.isBefore && Trigger.isInsert) handler.beforeInsert(Trigger.new);
        if (Trigger.isAfter && Trigger.isInsert) handler.afterInsert(Trigger.new);
        // ... other events
    }
}
```

Each trigger file is one line: `TriggerDispatcher.run(new AccountTriggerHandler(), 'Account');`

## Approach: Domain Layer Pattern (fflib-inspired)

Adopt the Apex Enterprise Patterns domain layer where each object has a Domain class extending `fflib_SObjectDomain`. The domain class encapsulates all trigger logic and validation, and is instantiated via a factory.

```apex
public class Accounts extends fflib_SObjectDomain {
    public Accounts(List<Account> records) { super(records); }

    public override void onBeforeInsert() {
        for (Account acc : (List<Account>) Records) {
            if (String.isBlank(acc.Industry)) acc.Industry = 'Other';
        }
    }

    public override void onAfterUpdate(Map<Id, SObject> oldMap) {
        // Related record logic with service layer calls
        AccountsService.handleOwnerChanges(Records, oldMap);
    }

    public class Constructor implements fflib_SObjectDomain.IConstructable {
        public fflib_SObjectDomain construct(List<SObject> records) {
            return new Accounts(records);
        }
    }
}
```

The trigger file registers with the factory: `fflib_SObjectDomain.triggerHandler(Accounts.class);`

## Tradeoffs

| Criteria | Metadata-Driven Dispatcher | Domain Layer (fflib) |
|----------|---------------------------|---------------------|
| Learning curve | ⚠️ Moderate — custom interface | ❌ Steep — full framework adoption |
| Toggle without deploy | ✅ Custom Metadata toggle | ⚠️ Requires feature flags |
| Recursion control | ✅ Built into dispatcher | ✅ Built into base class |
| Testability | ✅ Handler classes are unit-testable | ✅ Domain classes are unit-testable |
| Multi-team scaling | ✅ One handler per object, clear ownership | ✅ Strong separation of concerns |
| Governor limit safety | ⚠️ Depends on handler implementation | ✅ Unit of Work pattern manages DML |
| Adoption cost | ✅ Low — incremental adoption | ❌ High — requires service + selector layers |

## Recommendation

For an org with 20+ objects and 15 developers, the **Metadata-Driven Dispatcher** is the better fit. It provides the per-object toggle that admins and releases need, has a low adoption barrier, and can be rolled out incrementally — one object at a time. Reserve the fflib domain layer for greenfield projects or orgs with a dedicated architecture team.

If the org later needs the full Unit of Work and Selector patterns, the dispatcher handlers can gradually evolve into domain classes.

> [!TIP]
> In the interview, explicitly state your assumptions ("I'm assuming a monthly release cadence and mixed-skill team"). Then walk through the dispatcher flow step by step. Interviewers value seeing you think about adoption cost and team dynamics, not just technical elegance.

## Follow-ups

- "How do you handle a trigger that needs to call an external system?" — Use Platform Events from the after-trigger handler to decouple the callout
- "What if two handlers need to share data in the same transaction?" — Pass context through a static transaction cache class
- "How do you test the dispatcher itself vs individual handlers?" — Dispatcher gets integration tests with full DML; handlers get isolated unit tests with mock data
- "How do you prevent a rogue handler from breaking the whole framework?" — Try-catch in the dispatcher with error logging, plus a kill switch per handler in metadata$$
    )
) as seed(question_slug, title, content_markdown)
join public.questions q on q.slug = seed.question_slug
on conflict do nothing;

-- 4c. CODE_REVIEW answer (follows code-review-answer.md template)
insert into public.answers (
  question_id, title, content_markdown, is_primary,
  status, published_at
)
select
  q.id, seed.title, seed.content_markdown, true,
  'published'::public.content_status, timezone('utc', now())
from (
  values
    (
      'apex-triggers-bulkification-review-mid',
      'Trigger Code Review: Bulkification and Production Issues',
      $$## Code

```apex
trigger OpportunityTrigger on Opportunity (after update) {
    for (Opportunity opp : Trigger.new) {
        Opportunity oldOpp = Trigger.oldMap.get(opp.Id);

        if (opp.StageName == 'Closed Won' && oldOpp.StageName != 'Closed Won') {
            // Get the account for this opportunity
            Account acc = [SELECT Id, Name, Industry FROM Account WHERE Id = :opp.AccountId];

            // Create a follow-up task
            Task t = new Task();
            t.Subject = 'Follow up on won deal: ' + acc.Name;
            t.WhatId = opp.Id;
            t.OwnerId = opp.OwnerId;
            t.ActivityDate = Date.today().addDays(7);
            insert t;

            // Update account status
            acc.Description = 'Last won deal: ' + opp.Name;
            update acc;

            // Send notification
            Messaging.SingleEmailMessage email = new Messaging.SingleEmailMessage();
            email.setToAddresses(new String[]{'sales-team@company.com'});
            email.setSubject('Deal Won: ' + opp.Name);
            email.setPlainTextBody('Opportunity ' + opp.Name + ' was closed won.');
            Messaging.sendEmail(new Messaging.SingleEmailMessage[]{email});
        }
    }
}
```

This trigger fires after an Opportunity is updated and attempts to create tasks, update accounts, and send emails when deals are won.

## Issue: SOQL Query Inside Loop

**Line(s):** 8
**Severity:** 🔴 Critical
**Category:** Governor Limit

The `SELECT` on Account is inside the `for` loop over `Trigger.new`. If 200 Opportunities are updated in a batch (e.g., via Data Loader), this trigger will execute 200 SOQL queries — exceeding the 100-query governor limit and failing the entire transaction.

```apex
// FIX: Collect all AccountIds first, query once outside the loop
Set<Id> accountIds = new Set<Id>();
for (Opportunity opp : Trigger.new) {
    accountIds.add(opp.AccountId);
}
Map<Id, Account> accountMap = new Map<Id, Account>(
    [SELECT Id, Name, Industry FROM Account WHERE Id IN :accountIds]
);
```

## Issue: DML Statements Inside Loop

**Line(s):** 15, 19
**Severity:** 🔴 Critical
**Category:** Governor Limit

Both `insert t` and `update acc` are inside the loop. With 200 records, this creates 400 DML statements against the 150-statement governor limit. All DML must be collected into lists and executed once after the loop.

```apex
// FIX: Collect into lists, DML once after the loop
List<Task> tasksToInsert = new List<Task>();
List<Account> accountsToUpdate = new List<Account>();
// ... build lists in loop ...
if (!tasksToInsert.isEmpty()) insert tasksToInsert;
if (!accountsToUpdate.isEmpty()) update accountsToUpdate;
```

## Issue: Email Sending Inside Loop

**Line(s):** 22-26
**Severity:** 🟡 Warning
**Category:** Governor Limit

`Messaging.sendEmail()` inside the loop will hit the 10-invocation limit quickly. Collect all email messages into a list and send them in a single call.

```apex
// FIX: Collect emails, send once
List<Messaging.SingleEmailMessage> emails = new List<Messaging.SingleEmailMessage>();
// ... build list in loop ...
if (!emails.isEmpty()) Messaging.sendEmail(emails);
```

## Issue: No Recursion Guard

**Line(s):** 1 (trigger declaration)
**Severity:** 🟡 Warning
**Category:** Best Practice

The trigger updates Account records, which could fire Account triggers that in turn update Opportunities — causing re-entry. There is no static flag or framework-level guard to prevent recursive execution.

```apex
// FIX: Add recursion guard
public class OpportunityTriggerGuard {
    public static Boolean hasRun = false;
}
// In trigger: if (OpportunityTriggerGuard.hasRun) return;
```

## Corrected Version

```apex
trigger OpportunityTrigger on Opportunity (after update) {
    if (OpportunityTriggerGuard.hasRun) return;
    OpportunityTriggerGuard.hasRun = true;

    // Identify won opportunities
    List<Opportunity> wonOpps = new List<Opportunity>();
    Set<Id> accountIds = new Set<Id>();

    for (Opportunity opp : Trigger.new) {
        Opportunity oldOpp = Trigger.oldMap.get(opp.Id);
        if (opp.StageName == 'Closed Won' && oldOpp.StageName != 'Closed Won') {
            wonOpps.add(opp);
            accountIds.add(opp.AccountId);
        }
    }

    if (wonOpps.isEmpty()) return;

    // Single SOQL query outside loop
    Map<Id, Account> accountMap = new Map<Id, Account>(
        [SELECT Id, Name, Industry FROM Account WHERE Id IN :accountIds]
    );

    List<Task> tasksToInsert = new List<Task>();
    List<Account> accountsToUpdate = new List<Account>();
    List<Messaging.SingleEmailMessage> emails = new List<Messaging.SingleEmailMessage>();

    for (Opportunity opp : wonOpps) {
        Account acc = accountMap.get(opp.AccountId);

        // Build task
        tasksToInsert.add(new Task(
            Subject = 'Follow up on won deal: ' + acc.Name,
            WhatId = opp.Id,
            OwnerId = opp.OwnerId,
            ActivityDate = Date.today().addDays(7)
        ));

        // Build account update
        acc.Description = 'Last won deal: ' + opp.Name;
        accountsToUpdate.add(acc);

        // Build email
        Messaging.SingleEmailMessage email = new Messaging.SingleEmailMessage();
        email.setToAddresses(new String[]{'sales-team@company.com'});
        email.setSubject('Deal Won: ' + opp.Name);
        email.setPlainTextBody('Opportunity ' + opp.Name + ' was closed won.');
        emails.add(email);
    }

    // Single DML operations outside loop
    if (!tasksToInsert.isEmpty()) insert tasksToInsert;
    if (!accountsToUpdate.isEmpty()) update accountsToUpdate;
    if (!emails.isEmpty()) Messaging.sendEmail(emails);
}
```

> [!CAUTION]
> The original trigger would fail with as few as **2 records** in a batch update, since each record generates 1 SOQL + 2 DML + 1 email call. With a Data Loader update of 200 records, this trigger guarantees a governor limit exception and complete transaction rollback.

## Review Summary

| # | Issue | Severity | Category |
|---|-------|----------|----------|
| 1 | SOQL query inside loop | 🔴 Critical | Governor Limit |
| 2 | DML statements inside loop | 🔴 Critical | Governor Limit |
| 3 | Email sending inside loop | 🟡 Warning | Governor Limit |
| 4 | No recursion guard | 🟡 Warning | Best Practice |

> [!TIP]
> In a code review interview, start by stating what the code is meant to do before finding issues. Say: "This trigger handles post-close-won automation — tasks, account updates, and notifications. Let me walk through it for bulkification and governor limit compliance." This shows structured thinking and impresses interviewers.$$
    )
) as seed(question_slug, title, content_markdown)
join public.questions q on q.slug = seed.question_slug
on conflict do nothing;

commit;

