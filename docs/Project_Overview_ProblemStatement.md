# Interview Preparation App - Project Overview

## Problem Statement

Interview learners need answers that are easy to read, easy to revise, and easy to explore in depth.
Most interview prep tools are question-by-question only and do not help learners follow connected concepts.

## Product Direction

The app is a topic-first interview preparation product.
Users should be able to start from a topic, read a concise overview, jump to related questions, and continue learning through linked topics.

## v1 Features

### 1. Rabbit-Hole Learning Through Topics

- Answers should expose key topics as links.
- Each topic page should include:
  - A short overview.
  - Related questions.
  - Related topics.
- Main flow:
  - User chooses a topic.
  - User reads topic overview.
  - User opens related questions.
  - User follows linked topics and continues learning.

Example:

- Question: "What is a Future method in Salesforce?"
- Answer mentions topics such as:
  - Future Method
  - Asynchronous Apex
  - Transaction
  - Limits
- Each topic should be linkable to its own content path.

Another example:

- Question: "What is better: Custom Settings or Custom Metadata?"
- Answer mentions topics such as:
  - Custom Settings
  - Custom Metadata
  - SFDX CLI
  - Deployment

### 2. Readable Answers With Code Snippets

- Answers can include code examples.
- Code blocks should be readable and consistently formatted.

### 3. Progress Tracking

- Users can mark both topics and questions as read.
- Progress state should be visible and persisted.

## v2 Features

### 1. Bulk Content Upsert

- Support bulk updates for topics, questions, and answers.
- Keep content aligned with changing technologies and interview trends.

### 2. Crawlers for Discovery

- Use crawlers to discover candidate questions and topics.
- New content should go through review before publishing.
