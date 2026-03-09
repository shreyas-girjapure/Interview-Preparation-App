CREATE TYPE "public"."interview_scope_type" AS ENUM (
    'topic',
    'playlist',
    'question'
);


ALTER TYPE "public"."interview_scope_type" OWNER TO "postgres";


CREATE TYPE "public"."interview_session_state" AS ENUM (
    'bootstrapping',
    'ready',
    'active',
    'completed',
    'failed',
    'cancelled'
);


ALTER TYPE "public"."interview_session_state" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."interview_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "scope_type" "public"."interview_scope_type" NOT NULL,
    "scope_slug" "text" NOT NULL,
    "scope_title" "text" NOT NULL,
    "scope_snapshot" "jsonb" NOT NULL,
    "state" "public"."interview_session_state" DEFAULT 'bootstrapping'::"public"."interview_session_state" NOT NULL,
    "openai_session_id" "text",
    "openai_model" "text",
    "openai_voice" "text",
    "openai_transcription_model" "text",
    "openai_client_secret_expires_at" timestamp with time zone,
    "last_error_code" "text",
    "last_error_message" "text",
    "started_at" timestamp with time zone,
    "ended_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "interview_sessions_last_error_message_check" CHECK ((("last_error_message" IS NULL) OR ("char_length"(TRIM(BOTH FROM "last_error_message")) >= 1))),
    CONSTRAINT "interview_sessions_scope_slug_check" CHECK (("scope_slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'::"text")),
    CONSTRAINT "interview_sessions_scope_title_check" CHECK (("char_length"(TRIM(BOTH FROM "scope_title")) >= 2))
);


ALTER TABLE "public"."interview_sessions" OWNER TO "postgres";


ALTER TABLE ONLY "public"."interview_sessions"
    ADD CONSTRAINT "interview_sessions_pkey" PRIMARY KEY ("id");


ALTER TABLE ONLY "public"."interview_sessions"
    ADD CONSTRAINT "interview_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;


CREATE INDEX "interview_sessions_state_idx" ON "public"."interview_sessions" USING "btree" ("state");
CREATE INDEX "interview_sessions_user_created_at_idx" ON "public"."interview_sessions" USING "btree" ("user_id", "created_at" DESC);


CREATE TRIGGER "set_interview_sessions_updated_at" BEFORE UPDATE ON "public"."interview_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();


ALTER TABLE "public"."interview_sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "interview_sessions_delete_policy" ON "public"."interview_sessions" FOR DELETE USING ((("user_id" = "auth"."uid"()) OR "public"."has_any_role"(ARRAY['admin'::"public"."app_role", 'editor'::"public"."app_role"])));


CREATE POLICY "interview_sessions_insert_policy" ON "public"."interview_sessions" FOR INSERT WITH CHECK ((("user_id" = "auth"."uid"()) OR "public"."has_any_role"(ARRAY['admin'::"public"."app_role", 'editor'::"public"."app_role"])));


CREATE POLICY "interview_sessions_select_policy" ON "public"."interview_sessions" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR "public"."has_any_role"(ARRAY['admin'::"public"."app_role", 'editor'::"public"."app_role"])));


CREATE POLICY "interview_sessions_update_policy" ON "public"."interview_sessions" FOR UPDATE USING ((("user_id" = "auth"."uid"()) OR "public"."has_any_role"(ARRAY['admin'::"public"."app_role", 'editor'::"public"."app_role"]))) WITH CHECK ((("user_id" = "auth"."uid"()) OR "public"."has_any_role"(ARRAY['admin'::"public"."app_role", 'editor'::"public"."app_role"])));


GRANT ALL ON TABLE "public"."interview_sessions" TO "anon";
GRANT ALL ON TABLE "public"."interview_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."interview_sessions" TO "service_role";
