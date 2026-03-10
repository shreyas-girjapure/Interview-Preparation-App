ALTER TABLE "public"."interview_sessions"
    ADD COLUMN IF NOT EXISTS "runtime_prompt_version" "text",
    ADD COLUMN IF NOT EXISTS "runtime_search_policy_version" "text",
    ADD COLUMN IF NOT EXISTS "runtime_persistence_version" "text",
    ADD COLUMN IF NOT EXISTS "runtime_transport_version" "text",
    ADD COLUMN IF NOT EXISTS "forced_end_reason" "text",
    ADD COLUMN IF NOT EXISTS "forced_end_at" timestamp with time zone,
    ADD COLUMN IF NOT EXISTS "stale_at" timestamp with time zone,
    ADD COLUMN IF NOT EXISTS "last_client_heartbeat_at" timestamp with time zone;


ALTER TABLE "public"."interview_sessions"
    DROP CONSTRAINT IF EXISTS "interview_sessions_runtime_prompt_version_check";


ALTER TABLE "public"."interview_sessions"
    ADD CONSTRAINT "interview_sessions_runtime_prompt_version_check" CHECK ((("runtime_prompt_version" IS NULL) OR ("char_length"(TRIM(BOTH FROM "runtime_prompt_version")) >= 1)));


ALTER TABLE "public"."interview_sessions"
    DROP CONSTRAINT IF EXISTS "interview_sessions_runtime_search_policy_version_check";


ALTER TABLE "public"."interview_sessions"
    ADD CONSTRAINT "interview_sessions_runtime_search_policy_version_check" CHECK ((("runtime_search_policy_version" IS NULL) OR ("char_length"(TRIM(BOTH FROM "runtime_search_policy_version")) >= 1)));


ALTER TABLE "public"."interview_sessions"
    DROP CONSTRAINT IF EXISTS "interview_sessions_runtime_persistence_version_check";


ALTER TABLE "public"."interview_sessions"
    ADD CONSTRAINT "interview_sessions_runtime_persistence_version_check" CHECK ((("runtime_persistence_version" IS NULL) OR ("char_length"(TRIM(BOTH FROM "runtime_persistence_version")) >= 1)));


ALTER TABLE "public"."interview_sessions"
    DROP CONSTRAINT IF EXISTS "interview_sessions_runtime_transport_version_check";


ALTER TABLE "public"."interview_sessions"
    ADD CONSTRAINT "interview_sessions_runtime_transport_version_check" CHECK ((("runtime_transport_version" IS NULL) OR ("char_length"(TRIM(BOTH FROM "runtime_transport_version")) >= 1)));


ALTER TABLE "public"."interview_sessions"
    DROP CONSTRAINT IF EXISTS "interview_sessions_forced_end_reason_check";


ALTER TABLE "public"."interview_sessions"
    ADD CONSTRAINT "interview_sessions_forced_end_reason_check" CHECK ((("forced_end_reason" IS NULL) OR ("forced_end_reason" = ANY (ARRAY['duplicate_session'::"text", 'stale_session'::"text", 'policy_update'::"text", 'admin_shutdown'::"text"]))));


ALTER TABLE "public"."interview_sessions"
    DROP CONSTRAINT IF EXISTS "interview_sessions_forced_end_at_check";


ALTER TABLE "public"."interview_sessions"
    ADD CONSTRAINT "interview_sessions_forced_end_at_check" CHECK ((("forced_end_at" IS NULL) OR ("forced_end_reason" IS NOT NULL)));


CREATE INDEX IF NOT EXISTS "interview_sessions_user_state_created_at_idx" ON "public"."interview_sessions" USING "btree" ("user_id", "state", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "interview_sessions_user_state_stale_at_idx" ON "public"."interview_sessions" USING "btree" ("user_id", "state", "stale_at");


WITH "ranked_live_sessions" AS (
    SELECT
        "id",
        ROW_NUMBER() OVER (PARTITION BY "user_id" ORDER BY "created_at" DESC) AS "rank_by_recent"
    FROM "public"."interview_sessions"
    WHERE "state" = ANY (ARRAY['bootstrapping'::"public"."interview_session_state", 'ready'::"public"."interview_session_state", 'active'::"public"."interview_session_state"])
)
UPDATE "public"."interview_sessions" AS "sessions"
SET
    "state" = 'cancelled'::"public"."interview_session_state",
    "forced_end_reason" = 'duplicate_session',
    "forced_end_at" = timezone('utc'::"text", now()),
    "ended_at" = COALESCE("sessions"."ended_at", timezone('utc'::"text", now()))
FROM "ranked_live_sessions" AS "ranked"
WHERE "sessions"."id" = "ranked"."id"
  AND "ranked"."rank_by_recent" > 1;


CREATE UNIQUE INDEX IF NOT EXISTS "interview_sessions_one_live_per_user_idx"
    ON "public"."interview_sessions" USING "btree" ("user_id")
    WHERE ("state" = ANY (ARRAY['bootstrapping'::"public"."interview_session_state", 'ready'::"public"."interview_session_state", 'active'::"public"."interview_session_state"]));
