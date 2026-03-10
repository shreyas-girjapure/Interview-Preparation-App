ALTER TABLE "public"."interview_sessions"
    ADD COLUMN IF NOT EXISTS "metrics_json" "jsonb",
    ADD COLUMN IF NOT EXISTS "debrief_json" "jsonb",
    ADD COLUMN IF NOT EXISTS "debrief_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    ADD COLUMN IF NOT EXISTS "debrief_error_code" "text",
    ADD COLUMN IF NOT EXISTS "debrief_generated_at" timestamp with time zone,
    ADD COLUMN IF NOT EXISTS "completion_reason" "text",
    ADD COLUMN IF NOT EXISTS "persisted_turn_count" integer DEFAULT 0 NOT NULL,
    ADD COLUMN IF NOT EXISTS "last_client_flush_at" timestamp with time zone;


ALTER TABLE "public"."interview_sessions"
    DROP CONSTRAINT IF EXISTS "interview_sessions_debrief_status_check";


ALTER TABLE "public"."interview_sessions"
    ADD CONSTRAINT "interview_sessions_debrief_status_check" CHECK (("debrief_status" = ANY (ARRAY['pending'::"text", 'ready'::"text", 'failed'::"text"])));


ALTER TABLE "public"."interview_sessions"
    DROP CONSTRAINT IF EXISTS "interview_sessions_completion_reason_check";


ALTER TABLE "public"."interview_sessions"
    ADD CONSTRAINT "interview_sessions_completion_reason_check" CHECK ((("completion_reason" IS NULL) OR ("completion_reason" = ANY (ARRAY['user_end'::"text", 'disconnect'::"text", 'error_recovery'::"text", 'user_exit'::"text", 'page_unload'::"text", 'retry'::"text", 'setup_abort'::"text"]))));


ALTER TABLE "public"."interview_sessions"
    DROP CONSTRAINT IF EXISTS "interview_sessions_persisted_turn_count_check";


ALTER TABLE "public"."interview_sessions"
    ADD CONSTRAINT "interview_sessions_persisted_turn_count_check" CHECK (("persisted_turn_count" >= 0));


CREATE TABLE IF NOT EXISTS "public"."interview_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "item_id" "text" NOT NULL,
    "previous_item_id" "text",
    "client_sequence" integer NOT NULL,
    "speaker" "text" NOT NULL,
    "source" "text" NOT NULL,
    "label" "text" NOT NULL,
    "meta_label" "text" NOT NULL,
    "tone" "text",
    "content_text" "text" NOT NULL,
    "citations_json" "jsonb",
    "finalized_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "interview_messages_client_sequence_check" CHECK (("client_sequence" >= 0)),
    CONSTRAINT "interview_messages_content_text_check" CHECK (("char_length"(TRIM(BOTH FROM "content_text")) >= 1)),
    CONSTRAINT "interview_messages_item_id_check" CHECK (("char_length"(TRIM(BOTH FROM "item_id")) >= 1)),
    CONSTRAINT "interview_messages_label_check" CHECK (("char_length"(TRIM(BOTH FROM "label")) >= 1)),
    CONSTRAINT "interview_messages_meta_label_check" CHECK (("char_length"(TRIM(BOTH FROM "meta_label")) >= 1)),
    CONSTRAINT "interview_messages_source_check" CHECK (("source" = ANY (ARRAY['realtime'::"text", 'system'::"text", 'search'::"text"]))),
    CONSTRAINT "interview_messages_speaker_check" CHECK (("speaker" = ANY (ARRAY['assistant'::"text", 'user'::"text", 'system'::"text"]))),
    CONSTRAINT "interview_messages_tone_check" CHECK ((("tone" IS NULL) OR ("tone" = ANY (ARRAY['default'::"text", 'search'::"text", 'status'::"text", 'error'::"text"]))))
);


ALTER TABLE "public"."interview_messages" OWNER TO "postgres";


ALTER TABLE ONLY "public"."interview_messages"
    ADD CONSTRAINT "interview_messages_pkey" PRIMARY KEY ("id");


ALTER TABLE ONLY "public"."interview_messages"
    ADD CONSTRAINT "interview_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."interview_sessions"("id") ON DELETE CASCADE;


ALTER TABLE ONLY "public"."interview_messages"
    ADD CONSTRAINT "interview_messages_session_item_unique" UNIQUE ("session_id", "item_id");


CREATE INDEX "interview_messages_session_client_sequence_idx" ON "public"."interview_messages" USING "btree" ("session_id", "client_sequence", "updated_at");
CREATE INDEX "interview_messages_session_finalized_at_idx" ON "public"."interview_messages" USING "btree" ("session_id", "finalized_at", "created_at");


CREATE TRIGGER "set_interview_messages_updated_at" BEFORE UPDATE ON "public"."interview_messages" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();


ALTER TABLE "public"."interview_messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "interview_messages_insert_policy" ON "public"."interview_messages" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."interview_sessions"
  WHERE (("interview_sessions"."id" = "interview_messages"."session_id") AND (("interview_sessions"."user_id" = "auth"."uid"()) OR "public"."has_any_role"(ARRAY['admin'::"public"."app_role", 'editor'::"public"."app_role"]))))));


CREATE POLICY "interview_messages_select_policy" ON "public"."interview_messages" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."interview_sessions"
  WHERE (("interview_sessions"."id" = "interview_messages"."session_id") AND (("interview_sessions"."user_id" = "auth"."uid"()) OR "public"."has_any_role"(ARRAY['admin'::"public"."app_role", 'editor'::"public"."app_role"]))))));


CREATE POLICY "interview_messages_update_policy" ON "public"."interview_messages" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."interview_sessions"
  WHERE (("interview_sessions"."id" = "interview_messages"."session_id") AND (("interview_sessions"."user_id" = "auth"."uid"()) OR "public"."has_any_role"(ARRAY['admin'::"public"."app_role", 'editor'::"public"."app_role"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."interview_sessions"
  WHERE (("interview_sessions"."id" = "interview_messages"."session_id") AND (("interview_sessions"."user_id" = "auth"."uid"()) OR "public"."has_any_role"(ARRAY['admin'::"public"."app_role", 'editor'::"public"."app_role"]))))));


CREATE POLICY "interview_messages_delete_policy" ON "public"."interview_messages" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."interview_sessions"
  WHERE (("interview_sessions"."id" = "interview_messages"."session_id") AND (("interview_sessions"."user_id" = "auth"."uid"()) OR "public"."has_any_role"(ARRAY['admin'::"public"."app_role", 'editor'::"public"."app_role"]))))));


GRANT ALL ON TABLE "public"."interview_messages" TO "anon";
GRANT ALL ON TABLE "public"."interview_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."interview_messages" TO "service_role";
