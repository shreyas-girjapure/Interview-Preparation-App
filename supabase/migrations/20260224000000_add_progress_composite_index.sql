-- =============================================================================
-- Optimization A: Composite index for the hot read-state lookup path
--
-- The query `WHERE user_id = X AND question_id IN (...)` has no covering index.
-- Existing indexes only cover (user_id, updated_at) and (user_id, next_review_at).
-- This index makes the per-page progress lookup an O(log n) index seek.
-- =============================================================================

create index if not exists idx_user_question_progress_lookup
  on public.user_question_progress (user_id, question_id);
