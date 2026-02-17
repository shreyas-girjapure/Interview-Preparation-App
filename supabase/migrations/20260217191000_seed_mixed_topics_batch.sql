begin;

-- =============================================================
-- Batch: Mixed Topics Seed (Apex + LWC + Security)
-- 6 new topics, 11 new questions, 11 answers
-- Plus: rename 3 existing question slugs to remove seniority
-- =============================================================

-- PART 0: Rename existing question slugs (remove seniority suffix)
-- =============================================================
update public.questions set slug = 'apex-triggers-context-variables',       updated_at = timezone('utc', now()) where slug = 'apex-triggers-context-variables-junior';
update public.questions set slug = 'apex-triggers-bulkification-review',    updated_at = timezone('utc', now()) where slug = 'apex-triggers-bulkification-review-mid';
update public.questions set slug = 'apex-triggers-framework-design',        updated_at = timezone('utc', now()) where slug = 'apex-triggers-framework-design-senior';

-- Also update question_topics references in existing seed rely on IDs, so no changes needed there.

-- =============================================================
-- PART 1: Categories — none (using existing 'salesforce')
-- PART 2: Subcategories — none (using existing subcategories)
-- =============================================================

-- =============================================================
-- PART 3: Topics (6 new topics across 3 subcategories)
-- =============================================================

-- 3a: Apex Programming topics
insert into public.topics (slug, name, short_description, overview_markdown, status, published_at, sort_order, subcategory_id)
select
  seed.slug, seed.name, seed.short_description, seed.overview_markdown,
  'published'::public.content_status, timezone('utc', now()),
  seed.sort_order, s.id
from (
  values
    (
      'mixed-dml-operations',
      'Mixed DML Operations',
      'Understanding setup and non-setup object DML restrictions, same-transaction limitations, and workarounds',
      $$## Overview

Mixed DML operations occur when Salesforce DML statements target both setup objects (like User, Group, PermissionSet) and non-setup objects (like Account, Contact, custom objects) within the same transaction context. Salesforce enforces strict separation between these object types at the platform level.

## Key Concepts

- **Setup Objects**: User, Group, GroupMember, PermissionSet, QueueSObject, and other metadata-related sObjects
- **Non-Setup Objects**: Standard business objects (Account, Contact, Opportunity) and all custom objects
- **Transaction Boundary**: The platform evaluates DML grouping at the transaction level, not the code block level
- **System.runAs()**: Creates a new transaction context in test methods, allowing mixed DML
- **@future / Queueable**: Moves one type of DML to a separate transaction to avoid the restriction

## Common Patterns

1. **future method workaround** — move setup object DML to an @future method
2. **Queueable chaining** — enqueue setup DML as a separate async operation
3. **Platform Event** — publish an event that triggers setup DML in a separate context
4. **Test isolation** — use System.runAs() to separate setup and non-setup DML in tests

## Why It Matters for Interviews

Mixed DML is a common gotcha that catches developers who understand code flow but not Salesforce transaction boundaries. It tests whether a candidate knows how the platform groups DML operations and can architect solutions that respect these constraints.$$,
      30
    ),
    (
      'asynchronous-apex',
      'Asynchronous Apex',
      'Future methods, Queueable, Batch Apex, and Scheduled Apex — patterns, governor limits, and chaining strategies',
      $$## Overview

Asynchronous Apex allows long-running or resource-intensive operations to execute outside the synchronous request lifecycle. Salesforce provides four async mechanisms, each with distinct use cases, governor limit profiles, and chaining capabilities.

## Key Concepts

- **@future methods**: Simple fire-and-forget; cannot chain, limited parameter types (primitives and collections of primitives)
- **Queueable Apex**: Supports complex parameters (sObjects, custom types), job chaining via System.enqueueJob(), and monitoring via AsyncApexJob
- **Batch Apex**: Processes large datasets in chunks (up to 2000 records per execute); implements Database.Batchable interface with start/execute/finish lifecycle
- **Scheduled Apex**: Runs at specified intervals via CRON expressions; implements Schedulable interface
- **Mixed Limits**: Async context gets higher governor limits (e.g., 60s CPU vs 10s synchronous, 200 SOQL queries vs 100)
- **Flex Queue**: Holds batch jobs beyond the 5 concurrent limit; supports reordering

## Common Patterns

1. **Queueable chaining** — one job enqueues the next (max 1 child in production)
2. **Batch with Queueable finish** — batch processes bulk data, finish() enqueues follow-up work
3. **Scheduled kickoff** — Scheduled Apex triggers a Batch or Queueable at intervals
4. **Callout patterns** — use Database.AllowsCallouts in Batch or @future(callout=true) for HTTP requests

## Why It Matters for Interviews

Async Apex questions reveal whether candidates understand governor limit boundaries, can select the right async tool for a given problem, and know the platform constraints around chaining and concurrency.$$,
      40
    )
) as seed(slug, name, short_description, overview_markdown, sort_order)
join public.subcategories s on s.slug = 'apex-programming'
on conflict (slug) do update
set
  name = excluded.name,
  short_description = excluded.short_description,
  overview_markdown = excluded.overview_markdown,
  status = excluded.status,
  published_at = coalesce(public.topics.published_at, excluded.published_at),
  sort_order = excluded.sort_order,
  updated_at = timezone('utc', now());

-- 3b: LWC Development topics
insert into public.topics (slug, name, short_description, overview_markdown, status, published_at, sort_order, subcategory_id)
select
  seed.slug, seed.name, seed.short_description, seed.overview_markdown,
  'published'::public.content_status, timezone('utc', now()),
  seed.sort_order, s.id
from (
  values
    (
      'lwc-wire-service',
      'LWC Wire Service',
      'Reactive data binding with @wire decorator, caching behavior, and provisioned data lifecycle in Lightning Web Components',
      $$## Overview

The Lightning Wire Service provides a reactive data pipeline between Salesforce data sources and LWC components. The @wire decorator connects a component property or function to an Apex method or Lightning Data Service adapter, provisioning data automatically and re-rendering the component when data changes.

## Key Concepts

- **@wire decorator**: Binds a property or function to a data source; the framework controls invocation timing
- **Wire adapters**: Built-in adapters (getRecord, getObjectInfo) and custom Apex methods annotated with @AuraEnabled(cacheable=true)
- **Caching**: Wire results are cached per user session; cache key is based on adapter + parameters
- **Reactivity**: When @wire parameters change (tracked properties), the wire re-provisions data automatically
- **Error handling**: Wire provisions both data and error properties; components must handle both states

## Common Patterns

1. **Property-based wire** — data provisioned to a property, accessed in template with `if:true={data}`
2. **Function-based wire** — data provisioned to a function for pre-processing before rendering
3. **Imperative calls** — using imported Apex methods imperatively when caching is not desired
4. **refreshApex()** — forces cache invalidation and re-fetch of wired data after DML

## Why It Matters for Interviews

Wire service questions test understanding of the reactive programming model, caching semantics, and the difference between declarative (wired) and imperative data access in LWC.$$,
      10
    ),
    (
      'lwc-component-communication',
      'LWC Component Communication',
      'Parent-child data flow, custom events, Lightning Message Service, and pub-sub patterns in Lightning Web Components',
      $$## Overview

Lightning Web Components communicate through a unidirectional data flow model: data flows down via public properties (@api), and events flow up via CustomEvent dispatching. For cross-hierarchy communication, Lightning Message Service (LMS) provides a publish-subscribe channel.

## Key Concepts

- **@api properties**: Public properties set by parent components; changes trigger re-render in the child
- **CustomEvent**: Child-to-parent communication via DOM events; supports bubbling and composed options
- **Lightning Message Service**: Cross-DOM communication using message channels; works across Aura and LWC
- **Pub-Sub pattern**: Custom event bus for same-page communication (deprecated in favor of LMS)
- **Slots**: Content projection allowing parents to inject markup into child component templates

## Common Patterns

1. **Parent → Child**: Set @api properties on child tag in parent template
2. **Child → Parent**: dispatch CustomEvent, parent handles with oneventname attribute
3. **Sibling → Sibling**: Use LMS message channel or shared state service
4. **Deep hierarchy**: Use events with bubbles:true, composed:true or LMS for non-ancestor communication

## Why It Matters for Interviews

Communication patterns test architectural thinking about component design, encapsulation, and the tradeoffs between tight coupling (direct property/event) and loose coupling (LMS).$$,
      20
    ),
    (
      'lwc-rendering-lifecycle',
      'LWC Rendering Lifecycle',
      'Component rendering phases, tracked properties, reactivity system, and re-render optimization in Lightning Web Components',
      $$## Overview

The LWC rendering lifecycle controls when and how components update their DOM output. Understanding the lifecycle hooks (constructor, connectedCallback, renderedCallback, disconnectedCallback) and the reactivity system (@track, reactive properties) is essential for building performant components.

## Key Concepts

- **Lifecycle hooks**: constructor → connectedCallback → render → renderedCallback → disconnectedCallback
- **Reactive properties**: Public (@api) and private reactive fields automatically trigger re-render on mutation
- **@track**: Deeply tracks object/array mutations (implicit since API v50+ for all fields)
- **Render cycle**: Framework batches property changes and re-renders asynchronously in a microtask
- **renderedCallback()**: Fires after every render; must guard against infinite re-render loops
- **shouldComponentUpdate**: Not available in LWC — all tracked changes trigger re-render

## Common Patterns

1. **Lazy initialization** — use connectedCallback for data fetching, not constructor
2. **Render guards** — boolean flags in renderedCallback to prevent repeated logic
3. **Computed properties** — getters that derive values from reactive state without storing duplicates
4. **Template conditionals** — if:true/if:false to control DOM creation vs. hiding

## Why It Matters for Interviews

Lifecycle questions reveal whether candidates can debug unexpected re-renders, optimize component performance, and understand the framework's reactivity contract.$$,
      30
    )
) as seed(slug, name, short_description, overview_markdown, sort_order)
join public.subcategories s on s.slug = 'lwc-development'
on conflict (slug) do update
set
  name = excluded.name,
  short_description = excluded.short_description,
  overview_markdown = excluded.overview_markdown,
  status = excluded.status,
  published_at = coalesce(public.topics.published_at, excluded.published_at),
  sort_order = excluded.sort_order,
  updated_at = timezone('utc', now());

-- 3c: Security & Access Control topics
insert into public.topics (slug, name, short_description, overview_markdown, status, published_at, sort_order, subcategory_id)
select
  seed.slug, seed.name, seed.short_description, seed.overview_markdown,
  'published'::public.content_status, timezone('utc', now()),
  seed.sort_order, s.id
from (
  values
    (
      'crud-fls-sharing',
      'CRUD, FLS, and Sharing',
      'Object-level CRUD permissions, field-level security, and organization-wide sharing rules in the Salesforce security model',
      $$## Overview

Salesforce enforces data access through three distinct layers: CRUD (Create, Read, Update, Delete) permissions at the object level, FLS (Field-Level Security) at the field level, and Sharing rules that control record-level visibility. Each layer is independent and all three must grant access for a user to interact with data.

## Key Concepts

- **CRUD**: Object-level permissions defined in Profiles and Permission Sets; controls whether a user can create, read, update, or delete records of a given object
- **FLS**: Field-level permissions controlling visibility and editability of individual fields; also set via Profiles and Permission Sets
- **OWD (Organization-Wide Defaults)**: The baseline sharing level for each object (Private, Public Read Only, Public Read/Write)
- **Sharing Rules**: Extend access beyond OWD using criteria-based or ownership-based rules
- **Role Hierarchy**: Grants upward visibility — managers see their subordinates records
- **Manual Sharing**: Ad-hoc record-level access grants via Apex or the UI
- **WITH SECURITY_ENFORCED / stripInaccessible()**: Apex mechanisms to enforce CRUD/FLS programmatically

## Common Patterns

1. **Security review compliance** — always enforce CRUD/FLS in Apex exposed to Lightning components
2. **Schema.SObjectType describe** — check isAccessible(), isCreateable(), isUpdateable() before DML
3. **stripInaccessible()** — remove inaccessible fields from query results before returning to client
4. **Sharing keywords** — with sharing / without sharing / inherited sharing on Apex classes

## Why It Matters for Interviews

Security questions are fundamental and appear at every level. They test whether candidates understand the layered security model and can write secure Apex that respects user permissions.$$,
      10
    )
) as seed(slug, name, short_description, overview_markdown, sort_order)
join public.subcategories s on s.slug = 'security-and-access'
on conflict (slug) do update
set
  name = excluded.name,
  short_description = excluded.short_description,
  overview_markdown = excluded.overview_markdown,
  status = excluded.status,
  published_at = coalesce(public.topics.published_at, excluded.published_at),
  sort_order = excluded.sort_order,
  updated_at = timezone('utc', now());

-- =============================================================
-- PART 4: Questions (11 new standard questions)
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
      'mixed-dml-errors-separated-logically',
      'Why can mixed DML errors occur even when DML is separated logically?',
      'Tests understanding of Salesforce transaction boundaries and how the platform groups setup and non-setup object DML regardless of code structure.',
      'standard', 'senior'
    ),
    (
      'crud-fls-sharing-differences',
      'What is the difference between CRUD, FLS, and Sharing?',
      'Tests knowledge of the three-layer Salesforce security model: object-level permissions, field-level security, and record-level sharing.',
      'standard', 'junior'
    ),
    (
      'wire-cache-user-sessions',
      'Why does @wire cache behave differently between user sessions?',
      'Tests understanding of LWC wire service caching mechanics, cache key composition, and per-session cache isolation.',
      'standard', 'senior'
    ),
    (
      'integration-sync-vs-queueable-failure',
      'Why does an integration work in synchronous Apex but fail in Queueable?',
      'Tests knowledge of async callout restrictions, transaction isolation, and the differences in governor limit contexts between sync and async Apex.',
      'standard', 'senior'
    ),
    (
      'trigger-update-contacts-cpu-timeout',
      'Write a trigger on Account that updates child Contacts but must avoid CPU timeout for 50k records.',
      'Tests ability to design triggers that handle large data volumes by offloading work to async processing and avoiding CPU governor limits.',
      'standard', 'senior'
    ),
    (
      'child-component-rerender-parent-unchanged',
      'Why can a child component re-render even when parent data didn''t change?',
      'Tests understanding of LWC reactivity, object reference identity, and how the framework determines when to re-provision child components.',
      'standard', 'mid'
    ),
    (
      'trigger-mixed-dml-user-account',
      'Write a trigger that handles mixed DML scenario (User + Account)',
      'Tests practical ability to separate setup and non-setup DML operations using async patterns within trigger context.',
      'standard', 'mid'
    ),
    (
      'future-method-limitation-queueable-rewrite',
      'What is a future method limitation? Rewrite the logic using Queueable',
      'Tests knowledge of @future method constraints and ability to refactor code to use the more flexible Queueable interface.',
      'standard', 'mid'
    ),
    (
      'lwc-rerender-no-tracked-property-change',
      'Why can an LWC re-render even when no tracked property changes?',
      'Tests deep understanding of the LWC rendering lifecycle, implicit tracking, and scenarios that trigger unexpected DOM updates.',
      'standard', 'senior'
    ),
    (
      'customevent-dispatched-before-parent-connected',
      'What happens if a CustomEvent is dispatched before the parent is connected?',
      'Tests understanding of LWC lifecycle timing, event propagation, and the relationship between connectedCallback and event handling.',
      'standard', 'mid'
    ),
    (
      'batch-apex-skips-records-investigation',
      'A Batch Apex job processes 1M records but skips some records without exception. How would you investigate?',
      'Tests debugging skills for batch processing issues including query scope, state management, and silent failure patterns.',
      'standard', 'senior'
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
    ('mixed-dml-errors-separated-logically',        'mixed-dml-operations', 10),
    ('crud-fls-sharing-differences',                 'crud-fls-sharing', 10),
    ('wire-cache-user-sessions',                     'lwc-wire-service', 10),
    ('integration-sync-vs-queueable-failure',        'asynchronous-apex', 10),
    ('trigger-update-contacts-cpu-timeout',          'apex-triggers', 10),
    ('child-component-rerender-parent-unchanged',    'lwc-component-communication', 10),
    ('child-component-rerender-parent-unchanged',    'lwc-rendering-lifecycle', 20),
    ('trigger-mixed-dml-user-account',               'mixed-dml-operations', 10),
    ('trigger-mixed-dml-user-account',               'apex-triggers', 20),
    ('future-method-limitation-queueable-rewrite',   'asynchronous-apex', 10),
    ('lwc-rerender-no-tracked-property-change',      'lwc-rendering-lifecycle', 10),
    ('customevent-dispatched-before-parent-connected','lwc-component-communication', 10),
    ('batch-apex-skips-records-investigation',        'asynchronous-apex', 10)
) as seed(question_slug, topic_slug, sort_order)
join public.questions q on q.slug = seed.question_slug
join public.topics t on t.slug = seed.topic_slug
on conflict (question_id, topic_id) do update
set
  sort_order = excluded.sort_order,
  updated_at = timezone('utc', now());

-- =============================================================
-- PART 5: Answers (11 standard answers)
-- =============================================================

insert into public.answers (
  question_id, title, content_markdown, is_primary,
  status, published_at
)
select
  q.id, seed.title, seed.content_markdown, true,
  'published'::public.content_status, timezone('utc', now())
from (
  values
    -- ANSWER 1: Mixed DML errors separated logically
    (
      'mixed-dml-errors-separated-logically',
      'Why Mixed DML Errors Occur Despite Logical Separation',
      $$## Key Points

- Mixed DML errors are enforced at the **transaction level**, not the code-block level
- Salesforce classifies sObjects as "setup" (User, Group, PermissionSet) or "non-setup" (Account, Contact, custom objects)
- Even if DML statements are in separate methods or classes, they share the same transaction and will throw `MIXED_DML_OPERATION`
- The only way to truly separate them is to execute one in a **different transaction context** (async, Platform Event, or System.runAs in tests)

## Detailed Explanation

### Why Logical Separation Is Not Enough

When developers first encounter mixed DML, a common instinct is to move the setup-object DML into a separate method or utility class. This does not work because Salesforce evaluates DML grouping at the **transaction boundary**, not the code execution path. A single Apex transaction — whether triggered by a page action, REST call, or trigger — maintains one DML context.

```apex
// This STILL fails — same transaction
public void updateAccount(Account acc) {
    update acc; // non-setup DML
}

public void deactivateUser(User u) {
    u.IsActive = false;
    update u; // setup DML — MIXED_DML_OPERATION
}
```

Both methods execute within the same request lifecycle. The platform tracks all DML operations in the transaction and throws the error at commit time.

### How the Platform Evaluates DML

Salesforce maintains an internal DML operation log per transaction. When the transaction commits, the platform checks whether both setup and non-setup DML occurred. If yes, it rolls back and throws the exception. This means the error can appear to come from the second DML statement, but it is actually a transaction-level constraint.

### Correct Solutions

**1. @future method:**
```apex
public class MixedDMLHandler {
    public static void handleAccountAndUser(Account acc, Id userId) {
        update acc; // non-setup DML in current transaction
        deactivateUserAsync(userId); // setup DML in separate transaction
    }

    @future
    public static void deactivateUserAsync(Id userId) {
        User u = [SELECT Id, IsActive FROM User WHERE Id = :userId];
        u.IsActive = false;
        update u;
    }
}
```

**2. Queueable Apex:**
```apex
public class DeactivateUserQueueable implements Queueable {
    private Id userId;
    public DeactivateUserQueueable(Id userId) { this.userId = userId; }

    public void execute(QueueableContext ctx) {
        User u = [SELECT Id, IsActive FROM User WHERE Id = :userId];
        u.IsActive = false;
        update u;
    }
}
```

**3. Test context with System.runAs():**
```apex
@isTest
static void testMixedDML() {
    Account acc = new Account(Name = 'Test');
    insert acc;

    System.runAs(new User(Id = UserInfo.getUserId())) {
        // This creates a new transaction context
        Group g = new Group(Name = 'TestGroup', Type = 'Regular');
        insert g;
    }
}
```

## Best Practices

- Always move setup-object DML to an async context when non-setup DML occurs in the same flow
- Prefer Queueable over @future for better monitoring and complex parameter support
- In tests, use System.runAs() to create isolated transaction contexts
- Document mixed DML boundaries clearly in code comments for team awareness

## Common Mistakes

- Assuming that putting DML in a separate method or class avoids the restriction
- Using try-catch to suppress mixed DML errors instead of properly separating transactions
- Forgetting that triggers on non-setup objects can indirectly cause setup DML through automation
- Not accounting for workflow field updates or process builders that may introduce additional DML in the same transaction$$
    ),

    -- ANSWER 2: CRUD, FLS, and Sharing differences
    (
      'crud-fls-sharing-differences',
      'CRUD, FLS, and Sharing: The Three Layers of Salesforce Security',
      $$## Key Points

- **CRUD** controls object-level access: can the user Create, Read, Update, or Delete records of a given type?
- **FLS** (Field-Level Security) controls field-level access: can the user see or edit a specific field on an object?
- **Sharing** controls record-level access: which specific records can the user see?
- All three layers are independent — a user needs permission at every layer to access data
- Apex runs in **system mode** by default and bypasses CRUD/FLS (but not sharing unless `without sharing` is used)

## Detailed Explanation

### Layer 1: CRUD (Object-Level Security)

CRUD permissions are configured through Profiles and Permission Sets. They determine whether a user can perform basic operations on an entire object type.

| Permission | Meaning |
|-----------|---------|
| Create | Can insert new records |
| Read | Can query and view records |
| Update | Can modify existing records |
| Delete | Can remove records |

If a user lacks Read permission on the Account object, they cannot see any Account records regardless of sharing rules or FLS settings.

### Layer 2: FLS (Field-Level Security)

FLS is more granular — it controls visibility and editability per field. A user might have Read access to the Account object but be unable to see the `AnnualRevenue` field if FLS hides it.

FLS has two settings per field:
- **Visible**: User can see the field value
- **Read-Only**: User can see but not edit the field

### Layer 3: Sharing (Record-Level Security)

Sharing determines which specific records a user can access. It is configured through:

1. **Organization-Wide Defaults (OWD)**: The baseline — Private, Public Read Only, or Public Read/Write
2. **Role Hierarchy**: Managers inherit access to subordinates' records
3. **Sharing Rules**: Criteria-based or ownership-based rules that extend access
4. **Manual Sharing**: One-off grants via the UI or Apex
5. **Apex Managed Sharing**: Programmatic sharing using `__Share` objects

### How They Work Together

```
User wants to read Account.AnnualRevenue on record "Acme Corp"

Step 1: CRUD check → Does the user have Read on Account? → Yes
Step 2: FLS check  → Is AnnualRevenue visible to the user?  → Yes
Step 3: Sharing    → Can the user see the "Acme Corp" record? → Yes
Result: Access granted
```

If any layer says "no", access is denied.

### Enforcing in Apex

```apex
// Option 1: WITH SECURITY_ENFORCED (SOQL clause)
List<Account> accs = [
    SELECT Id, Name, AnnualRevenue
    FROM Account
    WITH SECURITY_ENFORCED
];

// Option 2: stripInaccessible (post-query)
SObjectAccessDecision decision = Security.stripInaccessible(
    AccessType.READABLE,
    [SELECT Id, Name, AnnualRevenue FROM Account]
);
List<Account> safeAccounts = decision.getRecords();

// Option 3: Schema describe (manual check)
if (Schema.sObjectType.Account.isAccessible() &&
    Schema.sObjectType.Account.fields.AnnualRevenue.isAccessible()) {
    // safe to query
}
```

## Best Practices

- Always enforce CRUD/FLS in Apex that is exposed to Lightning components or Visualforce
- Use `WITH SECURITY_ENFORCED` for simple queries and `stripInaccessible()` when you need partial results
- Understand that `with sharing` enforces sharing rules but NOT CRUD/FLS — you must handle both
- Test with non-admin users to validate security enforcement

## Common Mistakes

- Confusing sharing with FLS — sharing controls which records, FLS controls which fields
- Assuming Apex automatically enforces CRUD/FLS (it does not — Apex runs in system mode)
- Using `without sharing` unnecessarily, bypassing record-level security
- Forgetting that `with sharing` only affects the class where it is declared, not called classes$$
    ),

    -- ANSWER 3: @wire cache behavior between sessions
    (
      'wire-cache-user-sessions',
      'Understanding @wire Cache Behavior Across User Sessions',
      $$## Key Points

- The @wire cache is **per-user, per-session, and per-browser-tab** — it does not persist across sessions or users
- Cache keys are derived from the **wire adapter + parameter values** — different parameters hit different cache entries
- The cache is populated on first wire invocation and served from cache on subsequent renders within the same session
- `refreshApex()` forces a server round trip, bypassing the cache for that specific wire
- Different users see different cached data because the cache is scoped to the authenticated session context

## Detailed Explanation

### How the Wire Cache Works

When a component uses `@wire`, the Lightning framework provisions data through a caching layer. The cache operates at the **Lightning Data Service (LDS)** level and keys entries based on:

1. The wire adapter (e.g., `getRecord`, custom Apex method)
2. The parameters passed to the adapter
3. The current user's session context

```javascript
import { wire, LightningElement } from 'lwc';
import getAccounts from '@salesforce/apex/AccountController.getAccounts';

export default class AccountList extends LightningElement {
    @wire(getAccounts, { status: 'Active' })
    accounts;
    // Cache key: getAccounts + {status: 'Active'} + user session
}
```

### Why It Differs Between Sessions

Each user session creates an isolated cache context. When User A logs in and navigates to a component, the wire provisions fresh data from the server and caches it. When User B logs in on a different session, they get their own fresh provision. Even the same user in two different browser tabs may have separate cache states because LDS maintains independent cache stores per page lifecycle.

### Cache Invalidation Triggers

The cache is automatically invalidated when:
- The user performs DML through Lightning Data Service (e.g., `updateRecord`)
- `refreshApex()` is called explicitly
- The component is destroyed and recreated
- The session expires

The cache is **NOT** invalidated when:
- Another user modifies the same record
- DML is performed via Apex without going through LDS
- A background process updates data

### Practical Implications

```javascript
// Force cache refresh after imperative DML
import { refreshApex } from '@salesforce/apex';

export default class AccountEditor extends LightningElement {
    wiredAccountsResult;

    @wire(getAccounts)
    wiredAccounts(result) {
        this.wiredAccountsResult = result;
        // Store the provisioned result object for refreshApex
    }

    async handleSave() {
        await saveAccount({ /* params */ });
        // Cache still has old data — must explicitly refresh
        await refreshApex(this.wiredAccountsResult);
    }
}
```

## Best Practices

- Always store the wired result object (not just `.data`) when you plan to use `refreshApex()`
- Use imperative Apex calls instead of @wire when you need guaranteed fresh data on every invocation
- Annotate Apex methods with `@AuraEnabled(cacheable=true)` only for read operations
- Do not rely on @wire cache for real-time data synchronization across users

## Common Mistakes

- Expecting @wire to automatically reflect changes made by other users or backend processes
- Calling `refreshApex()` with the `.data` property instead of the full provisioned result object
- Assuming cache behavior is identical between Lightning Experience and mobile — mobile may have different caching strategies
- Not understanding that `cacheable=true` is required for @wire but means the method cannot perform DML$$
    ),

    -- ANSWER 4: Integration sync vs Queueable failure
    (
      'integration-sync-vs-queueable-failure',
      'Why Integrations Fail in Queueable but Work Synchronously',
      $$## Key Points

- Queueable Apex executes in an **async context** with different governor limits and restrictions than synchronous execution
- The most common reason for failure: the Queueable class does not implement `Database.AllowsCallouts`
- Async contexts have **isolated transactions** — DML, session state, and callout limits differ from synchronous Apex
- Callout ordering rules apply: once DML is performed in an async transaction, no more callouts are allowed (and vice versa)
- Certificate and Named Credential configurations may behave differently in async contexts due to running-user differences

## Detailed Explanation

### The AllowsCallouts Interface

The most frequent cause of integration failures in Queueable is forgetting to implement `Database.AllowsCallouts`. Without it, any HTTP callout throws a `System.CalloutException`.

```apex
// WRONG — callouts are blocked
public class SyncToExternal implements Queueable {
    public void execute(QueueableContext ctx) {
        HttpRequest req = new HttpRequest();
        req.setEndpoint('https://api.external.com/data');
        req.setMethod('GET');
        new Http().send(req); // CalloutException!
    }
}

// CORRECT — implements Database.AllowsCallouts
public class SyncToExternal implements Queueable, Database.AllowsCallouts {
    public void execute(QueueableContext ctx) {
        HttpRequest req = new HttpRequest();
        req.setEndpoint('https://api.external.com/data');
        req.setMethod('GET');
        HttpResponse res = new Http().send(req); // Works
    }
}
```

### DML and Callout Ordering

Salesforce enforces a strict rule: in any transaction, you cannot perform a callout after DML, or DML after a callout, in certain contexts. This is more strictly enforced in async contexts.

```apex
public class OrderMatters implements Queueable, Database.AllowsCallouts {
    public void execute(QueueableContext ctx) {
        // Callout FIRST, then DML — this works
        HttpResponse res = makeCallout();
        Account acc = parseResponse(res);
        insert acc;

        // But you cannot do another callout after the insert
        // makeAnotherCallout(); // Would fail
    }
}
```

### Other Async-Specific Differences

| Aspect | Synchronous | Queueable |
|--------|------------|-----------|
| CPU time limit | 10,000 ms | 60,000 ms |
| Callouts allowed | Yes (by default) | Only with Database.AllowsCallouts |
| Callout timeout | 120s total | 120s total |
| Running user | Current user | User who enqueued (or Automated Process) |
| Session ID | Available | May be null (no UI session) |

### Session and Auth Differences

Named Credentials using "Per User" authentication may fail in Queueable because there is no active user session. The async job runs under the context of the user who enqueued it, but the OAuth token may not be available without an active session.

## Best Practices

- Always implement `Database.AllowsCallouts` on Queueable classes that make HTTP requests
- Perform all callouts before any DML in the same transaction
- Use Named Credentials with "Named Principal" authentication for async integrations
- Add retry logic for transient network failures in async contexts
- Log callout responses for debugging since async jobs are harder to trace

## Common Mistakes

- Forgetting `Database.AllowsCallouts` — the most common cause of Queueable callout failures
- Performing DML before callouts, then wondering why the second callout fails
- Relying on `UserInfo.getSessionId()` in async context — it returns null
- Not testing integrations in async context during development$$
    ),

    -- ANSWER 5: Trigger update contacts CPU timeout
    (
      'trigger-update-contacts-cpu-timeout',
      'Writing a Trigger to Update 50k Child Contacts Without CPU Timeout',
      $$## Key Points

- A synchronous trigger updating 50k child Contacts will exceed the 10-second CPU time limit
- The solution is to **offload bulk processing to asynchronous Apex** (Batch or Queueable)
- The trigger should collect the Account IDs and delegate, not process inline
- Use `Database.executeBatch()` with an appropriate scope size (200–500) to stay within limits
- Consider using `Database.Stateful` if you need to track aggregate results across batches

## Detailed Explanation

### Why the Direct Approach Fails

A naive trigger that queries and updates all child Contacts synchronously will fail:

```apex
// BAD — CPU timeout for large data volumes
trigger AccountTrigger on Account (after update) {
    Set<Id> accountIds = Trigger.newMap.keySet();

    List<Contact> contacts = [
        SELECT Id, MailingCity FROM Contact
        WHERE AccountId IN :accountIds
    ];

    for (Contact c : contacts) {
        c.MailingCity = Trigger.newMap.get(c.AccountId).BillingCity;
    }

    update contacts; // 50k records = CPU timeout + DML row limit
}
```

This fails for two reasons:
1. **CPU time limit** (10s synchronous) exhausted by iterating 50,000 records
2. **DML row limit** (10,000 per transaction) exceeded

### The Correct Pattern: Trigger + Batch Apex

**Step 1: Trigger collects IDs and enqueues async work**

```apex
trigger AccountTrigger on Account (after update) {
    Set<Id> accountIds = new Set<Id>();

    for (Account acc : Trigger.new) {
        Account old = Trigger.oldMap.get(acc.Id);
        if (acc.BillingCity != old.BillingCity) {
            accountIds.add(acc.Id);
        }
    }

    if (!accountIds.isEmpty()) {
        Database.executeBatch(
            new UpdateContactsBatch(accountIds), 200
        );
    }
}
```

**Step 2: Batch processes records in manageable chunks**

```apex
public class UpdateContactsBatch implements Database.Batchable<SObject> {
    private Set<Id> accountIds;

    public UpdateContactsBatch(Set<Id> accountIds) {
        this.accountIds = accountIds;
    }

    public Database.QueryLocator start(Database.BatchableContext bc) {
        return Database.getQueryLocator([
            SELECT Id, AccountId, MailingCity
            FROM Contact
            WHERE AccountId IN :accountIds
        ]);
    }

    public void execute(Database.BatchableContext bc, List<Contact> scope) {
        Map<Id, Account> accountMap = new Map<Id, Account>([
            SELECT Id, BillingCity FROM Account
            WHERE Id IN :accountIds
        ]);

        for (Contact c : scope) {
            Account acc = accountMap.get(c.AccountId);
            if (acc != null) {
                c.MailingCity = acc.BillingCity;
            }
        }

        update scope;
    }

    public void finish(Database.BatchableContext bc) {
        // Optional: send notification or log completion
    }
}
```

### Scope Size Considerations

| Scope Size | Batches for 50k | CPU Risk | DML Risk |
|-----------|-----------------|----------|----------|
| 100 | 500 | Very low | Very low |
| 200 | 250 | Low | Low |
| 500 | 100 | Medium | Low |
| 2000 | 25 | High | Medium |

A scope of 200 provides a good balance between throughput and safety.

## Best Practices

- Always filter in the trigger — only enqueue async work when relevant fields actually changed
- Use a recursion guard to prevent the batch from re-triggering the same trigger
- Set batch scope size based on the complexity of processing per record
- Consider Queueable for smaller volumes (under 10k) for simpler implementation

## Common Mistakes

- Processing all child records inline in the trigger instead of delegating to async
- Not checking `Trigger.oldMap` to filter only changed records
- Using a batch scope size that is too large, risking CPU limits within each execute()
- Forgetting recursion prevention — the Contact update could trigger other automations$$
    ),

    -- ANSWER 6: Child component re-render when parent unchanged
    (
      'child-component-rerender-parent-unchanged',
      'Why Child Components Re-Render When Parent Data Has Not Changed',
      $$## Key Points

- LWC uses **reference identity** (===) to detect changes in objects and arrays passed to child components
- If the parent creates a new object/array reference (even with identical values), the child re-renders
- Spread operators (`...`), `Array.from()`, and `JSON.parse(JSON.stringify())` all create new references
- The framework does **not** perform deep equality checks — any new reference triggers a re-render
- Parent template re-evaluation caused by unrelated state changes can propagate to children

## Detailed Explanation

### Reference Identity vs Value Equality

LWC's reactivity system compares property values by reference, not by deep equality. When a parent passes an object to a child via `@api`, the framework checks if the reference has changed:

```javascript
// Parent component
export default class Parent extends LightningElement {
    accountData = { name: 'Acme', city: 'SF' };

    handleClick() {
        // Creates a NEW reference — child will re-render
        this.accountData = { ...this.accountData };

        // Same reference, mutated — child will NOT re-render
        // this.accountData.name = 'Acme'; // no re-render
    }
}
```

```html
<!-- parent.html -->
<c-child account={accountData}></c-child>
```

Even though the spread operator produces identical values, the child component receives a new object reference and re-renders.

### Unrelated Parent State Changes

When any reactive property in the parent changes, the parent template re-evaluates. If the template creates inline objects or arrays, new references are generated on every evaluation:

```html
<!-- BAD — creates a new array reference every render -->
<c-child items={computedItems}></c-child>
```

```javascript
// If computedItems is a getter that returns a new array each time:
get computedItems() {
    return this.rawItems.filter(i => i.active);
    // .filter() always returns a new array reference
}
```

Every time the parent re-renders for any reason, `computedItems` returns a new array, causing the child to re-render.

### How to Prevent Unnecessary Re-Renders

```javascript
// Cache the computed result and only update when inputs change
_cachedItems;
_lastRawItems;

get computedItems() {
    if (this.rawItems !== this._lastRawItems) {
        this._cachedItems = this.rawItems.filter(i => i.active);
        this._lastRawItems = this.rawItems;
    }
    return this._cachedItems;
}
```

## Best Practices

- Avoid creating new object/array references in getters unless the source data actually changed
- Cache computed results and compare source references before recalculating
- Use primitive values (@api strings, numbers, booleans) when possible — they compare by value
- Profile re-renders using Chrome DevTools Performance tab to identify unnecessary updates

## Common Mistakes

- Using spread operator or Object.assign() in getters, creating new references on every access
- Passing inline computed arrays in templates (e.g., `items={this.data.filter(...)}`)
- Confusing mutation detection with reference detection — LWC checks references, not deep values
- Not realizing that any parent state change triggers template re-evaluation, which can create new child prop references$$
    ),

    -- ANSWER 7: Trigger mixed DML User + Account
    (
      'trigger-mixed-dml-user-account',
      'Handling Mixed DML in a Trigger with User and Account',
      $$## Key Points

- Salesforce prohibits DML on setup objects (User) and non-setup objects (Account) in the same transaction
- A trigger on Account that also needs to update User must delegate the User DML to an async context
- Use `@future` or `Queueable` to move setup-object DML to a separate transaction
- In test methods, use `System.runAs()` to create a separate transaction context for setup objects

## Detailed Explanation

### The Problem

If an Account trigger needs to deactivate the Account Owner (a User record) when certain conditions are met, you cannot do both in the same transaction:

```apex
// FAILS — MIXED_DML_OPERATION
trigger AccountTrigger on Account (after update) {
    List<User> usersToDeactivate = new List<User>();

    for (Account acc : Trigger.new) {
        if (acc.Status__c == 'Closed') {
            usersToDeactivate.add(new User(
                Id = acc.OwnerId,
                IsActive = false
            ));
        }
    }

    if (!usersToDeactivate.isEmpty()) {
        update usersToDeactivate; // MIXED_DML_OPERATION
    }
}
```

### The Solution: @future for User DML

```apex
trigger AccountTrigger on Account (after update) {
    Set<Id> userIds = new Set<Id>();

    for (Account acc : Trigger.new) {
        if (acc.Status__c == 'Closed') {
            userIds.add(acc.OwnerId);
        }
    }

    if (!userIds.isEmpty()) {
        UserDeactivationService.deactivateUsersAsync(userIds);
    }
}
```

```apex
public class UserDeactivationService {

    @future
    public static void deactivateUsersAsync(Set<Id> userIds) {
        List<User> users = [
            SELECT Id, IsActive FROM User
            WHERE Id IN :userIds AND IsActive = true
        ];

        for (User u : users) {
            u.IsActive = false;
        }

        if (!users.isEmpty()) {
            update users;
        }
    }
}
```

### Queueable Alternative

```apex
public class DeactivateUsersQueueable implements Queueable {
    private Set<Id> userIds;

    public DeactivateUsersQueueable(Set<Id> userIds) {
        this.userIds = userIds;
    }

    public void execute(QueueableContext ctx) {
        List<User> users = [
            SELECT Id, IsActive FROM User WHERE Id IN :userIds AND IsActive = true
        ];
        for (User u : users) {
            u.IsActive = false;
        }
        update users;
    }
}
```

### Testing with System.runAs

```apex
@isTest
static void testMixedDMLScenario() {
    Account acc = new Account(Name = 'Test', Status__c = 'Active');
    insert acc;

    // Non-setup DML
    acc.Status__c = 'Closed';
    update acc;

    // Verify the @future method ran
    Test.startTest();
    Test.stopTest();

    User owner = [SELECT IsActive FROM User WHERE Id = :acc.OwnerId];
    System.assertEquals(false, owner.IsActive);
}
```

## Best Practices

- Always separate setup and non-setup DML into different transactions via async Apex
- Prefer Queueable over @future when you need to pass complex parameters or chain jobs
- Add null checks and guard clauses in the async method — the record state may have changed by execution time
- Log async operations for auditability since they execute outside the original user action

## Common Mistakes

- Attempting to update User records directly in an Account trigger
- Not handling the case where the async method executes after the Account has been modified again
- Forgetting that @future methods cannot call other @future methods (no chaining)
- Not testing the full flow including the async execution via Test.startTest()/Test.stopTest()$$
    ),

    -- ANSWER 8: Future method limitation + Queueable rewrite
    (
      'future-method-limitation-queueable-rewrite',
      'Future Method Limitations and Queueable Rewrite',
      $$## Key Points

- `@future` methods only accept **primitive parameters** and collections of primitives — no sObjects or custom types
- `@future` methods **cannot be chained** — a future method cannot call another future method
- They cannot return a value and provide **no job ID** for monitoring
- Maximum of 50 @future invocations per transaction
- **Queueable Apex** solves all of these: accepts complex types, supports chaining, provides job ID

## Detailed Explanation

### @future Method Limitations

```apex
// Limited to primitives — cannot pass sObjects
@future
public static void processRecords(Set<Id> recordIds) {
    // Must re-query records inside the method
    List<Account> accounts = [SELECT Id, Name FROM Account WHERE Id IN :recordIds];
    // Process...
}
```

Key restrictions:
1. **Parameters**: Only primitives (String, Id, Integer) and List/Set/Map of primitives
2. **No chaining**: Cannot call @future from @future
3. **No monitoring**: No way to check status or get results
4. **No ordering**: Execution order is not guaranteed
5. **No complex state**: Cannot pass sObjects, wrapper classes, or serialized state

### Queueable Rewrite

The same logic using Queueable:

```apex
public class AccountProcessor implements Queueable {
    private List<Account> accounts;
    private String processingMode;

    // Can accept complex types directly
    public AccountProcessor(List<Account> accounts, String processingMode) {
        this.accounts = accounts;
        this.processingMode = processingMode;
    }

    public void execute(QueueableContext ctx) {
        for (Account acc : accounts) {
            if (processingMode == 'enrich') {
                acc.Description = 'Enriched: ' + acc.Name;
            }
        }
        update accounts;

        // Can chain to another Queueable
        if (processingMode == 'enrich') {
            System.enqueueJob(new AccountNotifier(accounts));
        }
    }
}
```

### Calling the Queueable

```apex
// Returns a job ID for monitoring
List<Account> accounts = [SELECT Id, Name FROM Account WHERE Industry = 'Tech'];
Id jobId = System.enqueueJob(new AccountProcessor(accounts, 'enrich'));

// Check job status
AsyncApexJob job = [
    SELECT Status, NumberOfErrors, JobItemsProcessed
    FROM AsyncApexJob WHERE Id = :jobId
];
```

### Feature Comparison

| Feature | @future | Queueable |
|---------|---------|-----------|
| Parameters | Primitives only | Any serializable type |
| Chaining | Not supported | 1 child job (production) |
| Job ID | Not returned | Returned by enqueueJob() |
| Monitoring | Not possible | Via AsyncApexJob query |
| Callouts | @future(callout=true) | Database.AllowsCallouts |
| Max per transaction | 50 | 50 |
| Transaction isolation | Yes | Yes |

## Best Practices

- Default to Queueable for all new async work — it is strictly superior to @future
- Use @future only for simple, fire-and-forget operations in legacy code
- Implement `Database.AllowsCallouts` when your Queueable makes HTTP requests
- Always handle the case where the enqueued job fails — add error logging in execute()

## Common Mistakes

- Trying to pass sObjects to @future methods (they must be re-queried)
- Calling @future from a batch or another @future context — this throws an exception
- Not implementing `Database.AllowsCallouts` on Queueable classes that make callouts
- Assuming Queueable jobs execute immediately — they are subject to async queue processing$$
    ),

    -- ANSWER 9: LWC re-render without tracked property change
    (
      'lwc-rerender-no-tracked-property-change',
      'Why an LWC Can Re-Render Without Tracked Property Changes',
      $$## Key Points

- Since LWC API version 50+, **all fields are implicitly reactive** — the `@track` decorator is no longer required for reactivity
- Object/array mutations (deep changes) can trigger re-renders even without explicit @track, because the framework detects assignment to the field
- `renderedCallback()` side effects (like setting a property) can cause infinite re-render loops
- Wire service re-provisions can trigger re-renders even when the returned data is identical
- Parent re-renders propagate to children, even when the child props have not changed

## Detailed Explanation

### Implicit Reactivity (Post API v50)

Before API v50, only fields decorated with `@track` were deeply reactive. After v50, all fields are reactive:

```javascript
export default class Example extends LightningElement {
    // Both of these are reactive in API v50+
    name = 'Acme';           // re-renders on: this.name = 'New'
    config = { key: 'val' }; // re-renders on: this.config = { key: 'new' }
}
```

However, **deep mutations** on objects and arrays still require reassignment to trigger a re-render:

```javascript
// Does NOT trigger re-render (mutation without reassignment)
this.config.key = 'new';

// DOES trigger re-render (new reference assignment)
this.config = { ...this.config, key: 'new' };
```

### renderedCallback Side Effects

The most common cause of unexpected re-renders is code in `renderedCallback()` that modifies reactive state:

```javascript
renderedCallback() {
    // BAD — this triggers another re-render, creating an infinite loop
    this.counter = this.counter + 1;

    // GOOD — guard with a flag
    if (!this._initialized) {
        this._initialized = true;
        this.counter = this.counter + 1;
    }
}
```

### Wire Re-Provisioning

Even when a wired Apex method returns the same data, the framework may re-provision the wire result as a new object reference, triggering a re-render:

```javascript
@wire(getAccounts)
wiredHandler({ data, error }) {
    // This function fires on every provision, even if data is identical
    // Setting a tracked property here causes a re-render
    this.accounts = data;
}
```

### Template Expression Re-evaluation

Getters used in templates are re-evaluated on every render cycle. If a getter returns a new object/array reference, it causes re-render:

```javascript
// Causes re-render on every cycle — returns new array each time
get activeItems() {
    return this.items.filter(i => i.active);
}
```

## Best Practices

- Use boolean guards in `renderedCallback()` to prevent infinite re-render loops
- Cache getter results and only recalculate when source data changes
- Use private non-reactive fields (prefixed with `_`) for internal state that should not trigger renders
- Profile render performance using browser DevTools to identify unexpected re-render causes

## Common Mistakes

- Setting reactive properties inside `renderedCallback()` without guard conditions
- Assuming @track is still required for reactivity (it is not since API v50)
- Returning new array/object references from getters used in the template
- Not understanding that wire re-provisions can occur without actual data changes$$
    ),

    -- ANSWER 10: CustomEvent dispatched before parent connected
    (
      'customevent-dispatched-before-parent-connected',
      'What Happens When a CustomEvent Is Dispatched Before Parent Is Connected',
      $$## Key Points

- If a child dispatches a `CustomEvent` in its `constructor` or before the parent is in the DOM, the **event is lost**
- Events dispatched before `connectedCallback` complete propagation through the DOM — but if the parent has not yet rendered the child element, the event handler is not attached
- The correct lifecycle moment to dispatch initial events is `connectedCallback` or later
- Events rely on the **DOM hierarchy** — both the child and its parent must be connected to the DOM for event propagation to work

## Detailed Explanation

### Component Lifecycle and Event Timing

The LWC lifecycle executes in this order:
1. `constructor()` — component instance created, no DOM yet
2. Public properties set by parent
3. `connectedCallback()` — component inserted into DOM
4. Child components rendered
5. `renderedCallback()` — DOM rendering complete

Events dispatched in the `constructor` have nowhere to propagate because the component is not yet in the DOM tree:

```javascript
// Child component
export default class Child extends LightningElement {
    constructor() {
        super();
        // BAD — event dispatched before DOM connection
        this.dispatchEvent(new CustomEvent('ready', {
            detail: { status: 'initialized' }
        }));
        // This event is silently lost
    }

    connectedCallback() {
        // GOOD — component is now in the DOM
        this.dispatchEvent(new CustomEvent('ready', {
            detail: { status: 'connected' }
        }));
    }
}
```

### Why the Event Is Lost

DOM events propagate through the DOM tree. When `dispatchEvent` is called:
1. The browser looks for the event target in the DOM
2. It builds the propagation path (capture → target → bubble)
3. It invokes handlers along the path

If the component is not yet in the DOM (constructor phase), there is no propagation path. The event is dispatched and immediately discarded — no error is thrown, making this a **silent failure**.

### Parent Handler Attachment Timing

Even in `connectedCallback`, there is a subtle timing issue. The parent sets up event listeners by declaring `oneventname` in its template:

```html
<!-- Parent template -->
<c-child onready={handleReady}></c-child>
```

The parent's template renders the child element and attaches the `onready` handler. The child's `connectedCallback` fires after the element is inserted into the parent's rendered DOM, so the handler IS attached at this point. This means `connectedCallback` is safe for dispatching events.

### Edge Cases

The issue arises when:
- A child tries to communicate during `constructor` (too early)
- A dynamically created component dispatches events before being added to the DOM via `appendChild()`
- Events use `bubbles: true, composed: true` but the shadow DOM boundary has not been established yet

## Best Practices

- Always dispatch initialization events in `connectedCallback`, never in `constructor`
- For dynamic components, dispatch events only after calling `this.template.appendChild(element)`
- Use `bubbles: true` only when you explicitly need the event to propagate beyond the immediate parent
- Document the expected lifecycle events of your components for consumers

## Common Mistakes

- Dispatching events in the constructor, expecting the parent to receive them
- Not understanding that event loss is silent — no error or warning is thrown
- Assuming `renderedCallback` is the only safe place (connectedCallback is sufficient and preferred)
- Forgetting that `composed: true` is needed for events to cross shadow DOM boundaries$$
    ),

    -- ANSWER 11: Batch Apex skips records investigation
    (
      'batch-apex-skips-records-investigation',
      'Investigating Batch Apex That Silently Skips Records',
      $$## Key Points

- Batch jobs can skip records for several reasons: **query scope changes**, **try-catch swallowing exceptions**, **stateful vs stateless confusion**, or **Database.update with allOrNothing=false**
- The `start()` method QueryLocator captures a **snapshot** — records modified after snapshot may be excluded
- If `execute()` uses try-catch that catches all exceptions, failures are silently swallowed
- `Database.update(records, false)` (partial success) allows individual record failures without stopping the batch
- The `finish()` method provides no built-in reporting on skipped records

## Detailed Explanation

### Investigation Checklist

When a Batch job processes 1M records but some are missing, follow this systematic approach:

**1. Verify the Query Scope (start method)**

```apex
public Database.QueryLocator start(Database.BatchableContext bc) {
    return Database.getQueryLocator([
        SELECT Id, Status__c FROM LargeObject__c
        WHERE Status__c = 'Pending'
        // Records that changed to 'Pending' AFTER this query ran
        // will NOT be in the batch scope
    ]);
}
```

The QueryLocator takes a snapshot when the batch starts. Records created or modified after this snapshot are excluded. Check:
- Are records being created/modified by other processes during batch execution?
- Does the WHERE clause accidentally exclude valid records?

**2. Check for Silent Exception Handling**

```apex
// BAD — silently swallows exceptions
public void execute(Database.BatchableContext bc, List<SObject> scope) {
    try {
        for (SObject record : scope) {
            processRecord(record);
        }
        update scope;
    } catch (Exception e) {
        // Records in this scope are skipped with no trace
        System.debug('Error: ' + e.getMessage());
    }
}
```

```apex
// BETTER — log failures, process remaining
public void execute(Database.BatchableContext bc, List<SObject> scope) {
    List<SObject> toUpdate = new List<SObject>();
    for (SObject record : scope) {
        try {
            processRecord(record);
            toUpdate.add(record);
        } catch (Exception e) {
            logFailure(record.Id, e);
        }
    }

    List<Database.SaveResult> results = Database.update(toUpdate, false);
    for (Integer i = 0; i < results.size(); i++) {
        if (!results[i].isSuccess()) {
            logFailure(toUpdate[i].Id, results[i].getErrors());
        }
    }
}
```

**3. Check Database.update with Partial Success**

If using `Database.update(records, false)`, individual records can fail without stopping the batch. Failed records are "skipped" from the perspective of the final result.

**4. Verify Stateful Tracking**

If the batch implements `Database.Stateful`, instance variables persist across execute() calls. Without it, variables reset each chunk:

```apex
// WITHOUT Database.Stateful — counter resets every execute()
public class MyBatch implements Database.Batchable<SObject> {
    Integer processedCount = 0; // Resets to 0 each execute!
}

// WITH Database.Stateful — counter accumulates
public class MyBatch implements Database.Batchable<SObject>, Database.Stateful {
    Integer processedCount = 0; // Persists across execute() calls
}
```

**5. Check AsyncApexJob Record**

```apex
AsyncApexJob job = [
    SELECT TotalJobItems, JobItemsProcessed, NumberOfErrors,
           ExtendedStatus, CreatedDate, CompletedDate
    FROM AsyncApexJob
    WHERE Id = :batchJobId
];
// Compare TotalJobItems vs expected count
// Check NumberOfErrors for failed batches
```

### Common Root Causes Summary

| Symptom | Likely Cause |
|---------|-------------|
| Consistent skip count | Query scope excludes records |
| Random skips | try-catch swallowing, partial DML |
| Skips increase over time | Concurrent data modifications |
| All records in one chunk skipped | Governor limit hit in that execute() |

## Best Practices

- Always log per-record successes and failures in execute()
- Use `Database.SaveResult` to capture partial failures
- Implement `Database.Stateful` when you need to track counts or aggregate results
- Add finish() reporting that emails administrators with success/failure counts
- Run a validation query after batch completion to identify unprocessed records

## Common Mistakes

- Using a broad try-catch around the entire execute() method, hiding individual failures
- Not checking the AsyncApexJob record for NumberOfErrors
- Assuming Database.QueryLocator sees real-time data (it is a snapshot)
- Forgetting that without Database.Stateful, instance variables reset on each execute()$$
    )
) as seed(question_slug, title, content_markdown)
join public.questions q on q.slug = seed.question_slug
on conflict do nothing;

commit;
