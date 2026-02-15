# Schema Diagram

This document visualizes the planned canonical schema and LLM-assisted ingestion staging flow.

## Canonical Content Schema (Post-Migration)

```mermaid
erDiagram
    CATEGORIES ||--o{ TOPICS : contains
    TOPICS ||--o{ QUESTION_TOPICS : maps
    QUESTIONS ||--o{ QUESTION_TOPICS : maps
    TOPICS ||--o{ TOPIC_EDGES : from_topic
    TOPICS ||--o{ TOPIC_EDGES : to_topic
    QUESTIONS ||--o{ ANSWERS : has

    CATEGORIES {
      uuid id PK
      text slug UK
      text name
      text description
      int sort_order
      bool is_active
    }

    TOPICS {
      uuid id PK
      text slug UK
      text name
      uuid preparation_category_id FK
      text short_description
      text overview_markdown
      text status
      int sort_order
    }

    QUESTIONS {
      uuid id PK
      text slug UK
      text title
      text difficulty
      text summary
      int estimated_minutes
      text status
      timestamptz published_at
    }

    QUESTION_TOPICS {
      uuid id PK
      uuid question_id FK
      uuid topic_id FK
      int sort_order
    }

    ANSWERS {
      uuid id PK
      uuid question_id FK
      text title
      text content_markdown
      bool is_primary
      text status
      timestamptz published_at
    }

    TOPIC_EDGES {
      uuid id PK
      uuid from_topic_id FK
      uuid to_topic_id FK
      text relation_type
      int sort_order
    }
```

## LLM Ingestion Staging Schema (Human Review Gate)

```mermaid
erDiagram
    INGEST_BATCHES ||--o{ INGEST_RAW_QUESTIONS : groups
    INGEST_BATCHES ||--o{ INGEST_TOPIC_CANDIDATES : generates
    INGEST_BATCHES ||--o{ INGEST_QUESTION_TOPIC_SUGGESTIONS : generates
    INGEST_RAW_QUESTIONS ||--o{ INGEST_QUESTION_TOPIC_SUGGESTIONS : source
    INGEST_TOPIC_CANDIDATES ||--o{ INGEST_REVIEW_DECISIONS : reviewed
    INGEST_QUESTION_TOPIC_SUGGESTIONS ||--o{ INGEST_REVIEW_DECISIONS : reviewed

    INGEST_BATCHES {
      uuid id PK
      text source_name
      text status
      timestamptz created_at
    }

    INGEST_RAW_QUESTIONS {
      uuid id PK
      uuid batch_id FK
      text raw_text
      text source_url
      text status
    }

    INGEST_TOPIC_CANDIDATES {
      uuid id PK
      uuid batch_id FK
      text candidate_name
      text suggested_category_slug
      numeric confidence
      text model_name
      text status
    }

    INGEST_QUESTION_TOPIC_SUGGESTIONS {
      uuid id PK
      uuid batch_id FK
      uuid raw_question_id FK
      text suggested_topic_slug
      numeric confidence
      text model_name
      text status
    }

    INGEST_REVIEW_DECISIONS {
      uuid id PK
      text entity_type
      uuid entity_id
      text decision
      text reason
      uuid reviewed_by
      timestamptz reviewed_at
    }
```

## Visualizer

1. GitHub/GitLab Markdown viewer should render Mermaid blocks automatically.
2. For interactive editing, paste either Mermaid block into https://mermaid.live.
3. In VS Code, install a Mermaid preview extension to render this file locally.
