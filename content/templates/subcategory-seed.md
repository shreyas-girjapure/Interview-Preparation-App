# Subcategory Seed Template

Generate subcategory data for organizing topics within a parent category.

## Input Variables

- `{CATEGORY_NAME}` — Parent category (e.g., "Salesforce")
- `{CATEGORY_SLUG}` — Parent slug (e.g., "salesforce")

## Prompt

```
You are organizing content for a Salesforce interview preparation platform. Generate subcategories for the following category.

**Category:** {CATEGORY_NAME}

For our platform, the existing subcategories and their topics are:

1. **Apex Programming** → Apex Fundamentals, Apex Triggers, Trigger Frameworks, Governor Limits, Asynchronous Apex, SOQL & SOSL, Apex Testing, Exception Handling
2. **Lightning Web Components** → LWC Fundamentals, LWC Communication, LWC Data & Apex, LWC Performance, Aura vs LWC
3. **Data Modeling & Architecture** → Object Relationships, Schema Design Patterns, Large Data Volumes, Order of Execution, Multi-Tenant Architecture
4. **Integration & APIs** → REST & SOAP APIs, Platform Events & CDC, Integration Patterns, OAuth & Authentication, Middleware & ETL
5. **Security & Access Control** → Sharing Model, Profiles & Permission Sets, Field-Level Security, Security Best Practices
6. **Automation & Configuration** → Flows & Process Automation, Validation Rules & Formulas, Declarative vs Code
7. **Development Practices** → DevOps & Deployment, Code Quality & Review, Debugging & Monitoring

Generate as a JSON array:

[
  {
    "name": "Subcategory Name",
    "slug": "kebab-case-slug",
    "description": "One sentence describing what this subcategory covers and why it matters for interviews",
    "sort_order": 1,
    "topics": ["topic-slug-1", "topic-slug-2"]
  }
]
```

## Pre-Built Seed Data (use directly)

Since our subcategories are already defined in the seed plan, here is the ready-to-use data:

```json
[
  {
    "name": "Apex Programming",
    "slug": "apex-programming",
    "description": "Core Salesforce programming language — triggers, async patterns, SOQL, and testing",
    "sort_order": 1
  },
  {
    "name": "Lightning Web Components",
    "slug": "lwc-development",
    "description": "Modern Salesforce frontend framework — lifecycle, communication, data binding, and performance",
    "sort_order": 2
  },
  {
    "name": "Data Modeling & Architecture",
    "slug": "data-modeling",
    "description": "Schema design, relationships, large data strategies, and platform architecture",
    "sort_order": 3
  },
  {
    "name": "Integration & APIs",
    "slug": "integration",
    "description": "REST/SOAP callouts, platform events, authentication, and integration patterns",
    "sort_order": 4
  },
  {
    "name": "Security & Access Control",
    "slug": "security-and-access",
    "description": "Sharing model, profiles, permission sets, FLS enforcement, and security best practices",
    "sort_order": 5
  },
  {
    "name": "Automation & Configuration",
    "slug": "automation-and-config",
    "description": "Flows, validation rules, formulas, and the declarative vs code decision framework",
    "sort_order": 6
  },
  {
    "name": "Development Practices",
    "slug": "development-practices",
    "description": "SFDX, CI/CD, code quality, debugging, and professional development workflows",
    "sort_order": 7
  }
]
```

## Output Rules

1. Subcategory slugs must match the pattern used in topics
2. Descriptions should be concise (under 100 characters)
3. Sort order determines display order on the category page
4. Before adding any new subcategory, run `catalog-dedup-check.md` and only insert rows classified as `create_new` or `update_existing`
5. If an existing subcategory is found by slug or normalized name in the same category, reuse/update it instead of creating a new duplicate
