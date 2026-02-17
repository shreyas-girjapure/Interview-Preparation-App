# Interview Preparation App - Project Overview

## Problem Statement

Interview learners need answers that are easy to read, easy to revise, and easy to explore in depth.
Most interview prep tools are question-by-question only and do not help learners follow connected concepts.

## Product Direction

The app is a topic-first interview preparation product.
Users should be able to start from a topic, read a concise overview, jump to related questions, and continue learning through linked topics.

## v1 Features (Live)

### 1. Rabbit-Hole Learning Through Topics

- Answers expose key topics as links.
- Each topic page includes:
  - A short overview.
  - Related questions.
  - Related topics.
- Main flow:
  - User chooses a topic.
  - User reads topic overview.
  - User opens related questions.
  - User follows linked topics and continues learning.

### 2. Readable Answers With Code Snippets

- Answers include code examples with syntax highlighting.
- Code blocks are readable and consistently formatted.
- Three answer formats: standard Q&A, scenario-based, and code review.

### 3. Question Types & Seniority Levels

- Questions are typed: **standard** (factual), **scenario** (design/architecture), **code_review** (spot-the-bug).
- Questions have optional seniority level: junior, mid, senior, lead, architect.
- Each format has a dedicated answer template for consistent structure.

### 4. Progress Tracking

- Users can mark both topics and questions as read.
- Progress state is visible and persisted.

### 5. Admin Content Composer

- Role-gated admin page at `/admin`.
- Create or link topics, write questions and answers with live markdown preview.
- Save draft → preview → publish workflow.

## v2 Features (Planned)

### 1. Playlist-Based Preparation

- Curated question playlists for specific roles and companies.
- Schema is live (playlists, playlist_items, access levels) — UI coming next.

### 2. Spaced Repetition

- Review queue with "Got It" / "Review Later" controls.
- Ease factor and review scheduling on progress tables.

### 3. LLM-Assisted Content Ingestion

- Use LLM to generate topics, questions, and answers from templates.
- Staging tables with human review gate before canonical writes.
- Content generation templates already created in `content/templates/`.

### 4. Crawlers for Discovery

- Use crawlers to discover candidate questions and topics.
- New content goes through review before publishing.
