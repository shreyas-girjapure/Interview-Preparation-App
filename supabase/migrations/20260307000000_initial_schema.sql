


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "hypopg" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "index_advisor" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."app_role" AS ENUM (
    'admin',
    'editor',
    'user'
);


ALTER TYPE "public"."app_role" OWNER TO "postgres";


CREATE TYPE "public"."attempt_state" AS ENUM (
    'started',
    'completed',
    'needs_review'
);


ALTER TYPE "public"."attempt_state" OWNER TO "postgres";


CREATE TYPE "public"."content_entity_type" AS ENUM (
    'category',
    'question',
    'answer'
);


ALTER TYPE "public"."content_entity_type" OWNER TO "postgres";


CREATE TYPE "public"."content_status" AS ENUM (
    'draft',
    'review',
    'published'
);


ALTER TYPE "public"."content_status" OWNER TO "postgres";


CREATE TYPE "public"."experience_level" AS ENUM (
    'junior',
    'mid',
    'senior',
    'lead',
    'architect'
);


ALTER TYPE "public"."experience_level" OWNER TO "postgres";


CREATE TYPE "public"."playlist_access" AS ENUM (
    'free',
    'preview',
    'paid'
);


ALTER TYPE "public"."playlist_access" OWNER TO "postgres";


CREATE TYPE "public"."topic_relation_type" AS ENUM (
    'related',
    'prerequisite',
    'deep_dive'
);


ALTER TYPE "public"."topic_relation_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."assert_published_question_has_topics"("target_question_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare
  question_status public.content_status;
  has_topics boolean;
begin
  select q.status
  into question_status
  from public.questions q
  where q.id = target_question_id;

  if question_status is null or question_status <> 'published' then
    return;
  end if;

  select exists (
    select 1
    from public.question_topics qt
    where qt.question_id = target_question_id
  )
  into has_topics;

  if has_topics then
    return;
  end if;

  raise exception using
    errcode = '23514',
    message = 'Published questions must have at least one linked topic.',
    detail = format(
      'question_id=%s has status=published but no rows in public.question_topics.',
      target_question_id
    ),
    hint = 'Insert at least one question_topics row before publishing, or set the question status away from published.';
end;
$$;


ALTER FUNCTION "public"."assert_published_question_has_topics"("target_question_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_generate_playlist_slug"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  base_slug text;
  new_slug text;
  counter integer := 1;
begin
  -- Only apply to user-created playlists (is_system = false)
  if new.is_system = false then
    -- If no slug is provided, or we just want to ensure it's slugified from title
    if new.slug is null or new.slug = '' then
      base_slug := public.slugify(new.title);
      new_slug := base_slug;
      
      -- Ensure uniqueness
      while exists (select 1 from public.playlists where slug = new_slug and id != new.id) loop
        new_slug := base_slug || '-' || counter;
        counter := counter + 1;
      end loop;
      
      new.slug := new_slug;
    end if;
  end if;
  
  return new;
end;
$$;


ALTER FUNCTION "public"."auto_generate_playlist_slug"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_published_questions_have_topics_from_question_topics"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  perform public.assert_published_question_has_topics(old.question_id);

  if tg_op = 'UPDATE' and new.question_id is distinct from old.question_id then
    perform public.assert_published_question_has_topics(new.question_id);
  end if;

  return null;
end;
$$;


ALTER FUNCTION "public"."enforce_published_questions_have_topics_from_question_topics"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_published_questions_have_topics_from_questions"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  perform public.assert_published_question_has_topics(new.id);
  return new;
end;
$$;


ALTER FUNCTION "public"."enforce_published_questions_have_topics_from_questions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_any_role"("required_roles" "public"."app_role"[]) RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.role = any(required_roles)
  );
$$;


ALTER FUNCTION "public"."has_any_role"("required_roles" "public"."app_role"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;


ALTER FUNCTION "public"."trigger_set_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."answers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "question_id" "uuid" NOT NULL,
    "title" "text",
    "content_markdown" "text" NOT NULL,
    "is_primary" boolean DEFAULT false NOT NULL,
    "status" "public"."content_status" DEFAULT 'draft'::"public"."content_status" NOT NULL,
    "published_at" timestamp with time zone,
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "answers_content_not_empty" CHECK (("char_length"(TRIM(BOTH FROM "content_markdown")) >= 10)),
    CONSTRAINT "answers_published_at_required" CHECK ((("status" <> 'published'::"public"."content_status") OR ("published_at" IS NOT NULL)))
);


ALTER TABLE "public"."answers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    CONSTRAINT "categories_name_not_empty" CHECK (("char_length"(TRIM(BOTH FROM "name")) >= 2)),
    CONSTRAINT "categories_slug_check" CHECK (("slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'::"text")),
    CONSTRAINT "categories_sort_order_non_negative" CHECK (("sort_order" >= 0))
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."content_revisions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_type" "public"."content_entity_type" NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "revision_number" integer NOT NULL,
    "snapshot" "jsonb" NOT NULL,
    "change_summary" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "content_revisions_revision_number_check" CHECK (("revision_number" > 0))
);


ALTER TABLE "public"."content_revisions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."playlist_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "playlist_id" "uuid" NOT NULL,
    "question_id" "uuid" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "playlist_items_sort_order_check" CHECK (("sort_order" >= 0))
);


ALTER TABLE "public"."playlist_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."playlists" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "access_level" "public"."playlist_access" DEFAULT 'free'::"public"."playlist_access" NOT NULL,
    "cover_image_url" "text",
    "preview_count" smallint DEFAULT 3 NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "status" "public"."content_status" DEFAULT 'draft'::"public"."content_status" NOT NULL,
    "published_at" timestamp with time zone,
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "is_system" boolean DEFAULT false NOT NULL,
    "tag" "text",
    CONSTRAINT "playlists_check" CHECK ((("status" <> 'published'::"public"."content_status") OR ("published_at" IS NOT NULL))),
    CONSTRAINT "playlists_cover_image_url_check" CHECK ((("cover_image_url" IS NULL) OR ("cover_image_url" ~ '^https?://'::"text"))),
    CONSTRAINT "playlists_description_check" CHECK ((("description" IS NULL) OR ("char_length"(TRIM(BOTH FROM "description")) >= 1))),
    CONSTRAINT "playlists_preview_count_check" CHECK ((("preview_count" >= 0) AND ("preview_count" <= 50))),
    CONSTRAINT "playlists_slug_check" CHECK (("slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'::"text")),
    CONSTRAINT "playlists_sort_order_check" CHECK (("sort_order" >= 0)),
    CONSTRAINT "playlists_title_check" CHECK ((("char_length"(TRIM(BOTH FROM "title")) >= 3) AND ("char_length"("title") <= 300)))
);


ALTER TABLE "public"."playlists" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."question_attempts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "question_id" "uuid" NOT NULL,
    "attempt_state" "public"."attempt_state" DEFAULT 'started'::"public"."attempt_state" NOT NULL,
    "notes" "text",
    "self_rating" smallint,
    "duration_seconds" integer,
    "attempted_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "question_attempts_duration_seconds_check" CHECK ((("duration_seconds" IS NULL) OR ("duration_seconds" >= 0))),
    CONSTRAINT "question_attempts_self_rating_check" CHECK ((("self_rating" >= 1) AND ("self_rating" <= 5)))
);


ALTER TABLE "public"."question_attempts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."question_topics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "question_id" "uuid" NOT NULL,
    "topic_id" "uuid" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "qt_sort_order_non_negative" CHECK (("sort_order" >= 0))
);


ALTER TABLE "public"."question_topics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."questions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "title" "text" NOT NULL,
    "summary" "text" NOT NULL,
    "status" "public"."content_status" DEFAULT 'draft'::"public"."content_status" NOT NULL,
    "published_at" timestamp with time zone,
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "question_type" "text" DEFAULT 'standard'::"text" NOT NULL,
    "seniority_level" "text",
    CONSTRAINT "questions_published_at_required" CHECK ((("status" <> 'published'::"public"."content_status") OR ("published_at" IS NOT NULL))),
    CONSTRAINT "questions_question_type_check" CHECK (("question_type" = ANY (ARRAY['standard'::"text", 'scenario'::"text", 'code_review'::"text"]))),
    CONSTRAINT "questions_seniority_level_check" CHECK (("seniority_level" = ANY (ARRAY['junior'::"text", 'mid'::"text", 'senior'::"text", 'lead'::"text", 'architect'::"text"]))),
    CONSTRAINT "questions_slug_check" CHECK (("slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'::"text")),
    CONSTRAINT "questions_summary_not_empty" CHECK (("char_length"(TRIM(BOTH FROM "summary")) >= 1)),
    CONSTRAINT "questions_title_length" CHECK ((("char_length"(TRIM(BOTH FROM "title")) >= 5) AND ("char_length"("title") <= 500)))
);


ALTER TABLE "public"."questions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subcategories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category_id" "uuid" NOT NULL,
    "slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "subcategories_description_check" CHECK ((("description" IS NULL) OR ("char_length"(TRIM(BOTH FROM "description")) >= 1))),
    CONSTRAINT "subcategories_name_check" CHECK ((("char_length"(TRIM(BOTH FROM "name")) >= 2) AND ("char_length"("name") <= 200))),
    CONSTRAINT "subcategories_slug_check" CHECK (("slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'::"text")),
    CONSTRAINT "subcategories_sort_order_check" CHECK (("sort_order" >= 0))
);


ALTER TABLE "public"."subcategories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."topic_edges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "from_topic_id" "uuid" NOT NULL,
    "to_topic_id" "uuid" NOT NULL,
    "relation_type" "public"."topic_relation_type" DEFAULT 'related'::"public"."topic_relation_type" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "te_sort_order_non_negative" CHECK (("sort_order" >= 0)),
    CONSTRAINT "topic_edges_no_self_ref" CHECK (("from_topic_id" <> "to_topic_id"))
);


ALTER TABLE "public"."topic_edges" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."topics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    "short_description" "text" NOT NULL,
    "overview_markdown" "text" DEFAULT ''::"text" NOT NULL,
    "status" "public"."content_status" DEFAULT 'draft'::"public"."content_status" NOT NULL,
    "published_at" timestamp with time zone,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "subcategory_id" "uuid",
    CONSTRAINT "topics_name_length" CHECK ((("char_length"(TRIM(BOTH FROM "name")) >= 2) AND ("char_length"("name") <= 200))),
    CONSTRAINT "topics_published_at_required" CHECK ((("status" <> 'published'::"public"."content_status") OR ("published_at" IS NOT NULL))),
    CONSTRAINT "topics_short_desc_not_empty" CHECK (("char_length"(TRIM(BOTH FROM "short_description")) >= 1)),
    CONSTRAINT "topics_slug_check" CHECK (("slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'::"text")),
    CONSTRAINT "topics_sort_order_non_negative" CHECK (("sort_order" >= 0))
);


ALTER TABLE "public"."topics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_playlist_progress" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "playlist_id" "uuid" NOT NULL,
    "items_read" smallint DEFAULT 0 NOT NULL,
    "last_item_id" "uuid",
    "started_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "user_playlist_progress_items_read_check" CHECK (("items_read" >= 0))
);


ALTER TABLE "public"."user_playlist_progress" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_preferences" (
    "user_id" "uuid" NOT NULL,
    "focus_areas" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "target_role" "text",
    "experience_level" "public"."experience_level",
    "daily_goal_minutes" integer,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "wrap_code_blocks_on_mobile" boolean DEFAULT false NOT NULL,
    CONSTRAINT "user_preferences_daily_goal_minutes_check" CHECK ((("daily_goal_minutes" IS NULL) OR (("daily_goal_minutes" >= 0) AND ("daily_goal_minutes" <= 1440))))
);


ALTER TABLE "public"."user_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_question_progress" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "question_id" "uuid" NOT NULL,
    "is_read" boolean DEFAULT false NOT NULL,
    "read_at" timestamp with time zone,
    "completion_percent" smallint DEFAULT 0 NOT NULL,
    "last_viewed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "review_status" "text",
    "next_review_at" timestamp with time zone,
    "review_count" smallint DEFAULT 0 NOT NULL,
    "ease_factor" real DEFAULT 2.5 NOT NULL,
    CONSTRAINT "user_question_progress_completion_percent_check" CHECK ((("completion_percent" >= 0) AND ("completion_percent" <= 100))),
    CONSTRAINT "user_question_progress_ease_factor_check" CHECK ((("ease_factor" >= (1.0)::double precision) AND ("ease_factor" <= (5.0)::double precision))),
    CONSTRAINT "user_question_progress_review_count_check" CHECK (("review_count" >= 0)),
    CONSTRAINT "user_question_progress_review_status_check" CHECK (("review_status" = ANY (ARRAY['got_it'::"text", 'review_later'::"text"])))
);


ALTER TABLE "public"."user_question_progress" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_topic_progress" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "topic_id" "uuid" NOT NULL,
    "is_read" boolean DEFAULT false NOT NULL,
    "read_at" timestamp with time zone,
    "completion_percent" smallint DEFAULT 0 NOT NULL,
    "last_viewed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "review_status" "text",
    "next_review_at" timestamp with time zone,
    "review_count" smallint DEFAULT 0 NOT NULL,
    "ease_factor" real DEFAULT 2.5 NOT NULL,
    CONSTRAINT "user_topic_progress_completion_percent_check" CHECK ((("completion_percent" >= 0) AND ("completion_percent" <= 100))),
    CONSTRAINT "user_topic_progress_ease_factor_check" CHECK ((("ease_factor" >= (1.0)::double precision) AND ("ease_factor" <= (5.0)::double precision))),
    CONSTRAINT "user_topic_progress_review_count_check" CHECK (("review_count" >= 0)),
    CONSTRAINT "user_topic_progress_review_status_check" CHECK (("review_status" = ANY (ARRAY['got_it'::"text", 'review_later'::"text"])))
);


ALTER TABLE "public"."user_topic_progress" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "full_name" "text",
    "avatar_url" "text",
    "role" "public"."app_role" DEFAULT 'user'::"public"."app_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."answers"
    ADD CONSTRAINT "answers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."content_revisions"
    ADD CONSTRAINT "content_revisions_entity_type_entity_id_revision_number_key" UNIQUE ("entity_type", "entity_id", "revision_number");



ALTER TABLE ONLY "public"."content_revisions"
    ADD CONSTRAINT "content_revisions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."playlist_items"
    ADD CONSTRAINT "playlist_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."playlist_items"
    ADD CONSTRAINT "playlist_items_playlist_id_question_id_key" UNIQUE ("playlist_id", "question_id");



ALTER TABLE ONLY "public"."playlists"
    ADD CONSTRAINT "playlists_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."playlists"
    ADD CONSTRAINT "playlists_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."question_attempts"
    ADD CONSTRAINT "question_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."question_topics"
    ADD CONSTRAINT "question_topics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."question_topics"
    ADD CONSTRAINT "question_topics_question_id_topic_id_key" UNIQUE ("question_id", "topic_id");



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."subcategories"
    ADD CONSTRAINT "subcategories_category_id_name_key" UNIQUE ("category_id", "name");



ALTER TABLE ONLY "public"."subcategories"
    ADD CONSTRAINT "subcategories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subcategories"
    ADD CONSTRAINT "subcategories_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."topic_edges"
    ADD CONSTRAINT "topic_edges_from_topic_id_to_topic_id_relation_type_key" UNIQUE ("from_topic_id", "to_topic_id", "relation_type");



ALTER TABLE ONLY "public"."topic_edges"
    ADD CONSTRAINT "topic_edges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."topics"
    ADD CONSTRAINT "topics_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."topics"
    ADD CONSTRAINT "topics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."topics"
    ADD CONSTRAINT "topics_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."user_playlist_progress"
    ADD CONSTRAINT "user_playlist_progress_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_playlist_progress"
    ADD CONSTRAINT "user_playlist_progress_user_id_playlist_id_key" UNIQUE ("user_id", "playlist_id");



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."user_question_progress"
    ADD CONSTRAINT "user_question_progress_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_question_progress"
    ADD CONSTRAINT "user_question_progress_user_id_question_id_key" UNIQUE ("user_id", "question_id");



ALTER TABLE ONLY "public"."user_topic_progress"
    ADD CONSTRAINT "user_topic_progress_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_topic_progress"
    ADD CONSTRAINT "user_topic_progress_user_id_topic_id_key" UNIQUE ("user_id", "topic_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "answers_primary_per_question_idx" ON "public"."answers" USING "btree" ("question_id") WHERE "is_primary";



CREATE INDEX "answers_published_question_order_idx" ON "public"."answers" USING "btree" ("question_id", "published_at" DESC, "created_at" DESC) WHERE ("status" = 'published'::"public"."content_status");



CREATE INDEX "answers_question_status_idx" ON "public"."answers" USING "btree" ("question_id", "status");



CREATE INDEX "categories_active_sort_name_idx" ON "public"."categories" USING "btree" ("is_active", "sort_order", "name");



CREATE INDEX "categories_sort_order_idx" ON "public"."categories" USING "btree" ("sort_order", "name");



CREATE INDEX "content_revisions_lookup_idx" ON "public"."content_revisions" USING "btree" ("entity_type", "entity_id", "created_at" DESC);



CREATE INDEX "idx_user_question_progress_lookup" ON "public"."user_question_progress" USING "btree" ("user_id", "question_id");



CREATE INDEX "playlist_items_playlist_sort_idx" ON "public"."playlist_items" USING "btree" ("playlist_id", "sort_order", "question_id");



CREATE INDEX "playlists_sort_order_idx" ON "public"."playlists" USING "btree" ("sort_order", "title");



CREATE INDEX "playlists_system_status_idx" ON "public"."playlists" USING "btree" ("is_system", "status", "published_at" DESC);



CREATE INDEX "playlists_tag_idx" ON "public"."playlists" USING "btree" ("tag") WHERE ("tag" IS NOT NULL);



CREATE INDEX "question_attempts_question_idx" ON "public"."question_attempts" USING "btree" ("question_id", "attempted_at" DESC);



CREATE INDEX "question_attempts_user_attempted_idx" ON "public"."question_attempts" USING "btree" ("user_id", "attempted_at" DESC);



CREATE INDEX "question_topics_question_sort_idx" ON "public"."question_topics" USING "btree" ("question_id", "sort_order", "topic_id");



CREATE INDEX "question_topics_topic_idx" ON "public"."question_topics" USING "btree" ("topic_id", "sort_order", "question_id");



CREATE INDEX "questions_published_order_idx" ON "public"."questions" USING "btree" ("published_at" DESC, "id") WHERE ("status" = 'published'::"public"."content_status");



CREATE INDEX "questions_seniority_status_idx" ON "public"."questions" USING "btree" ("seniority_level", "status", "published_at" DESC) WHERE ("seniority_level" IS NOT NULL);



CREATE INDEX "questions_title_lower_idx" ON "public"."questions" USING "btree" ("lower"("title"));



CREATE INDEX "questions_type_status_idx" ON "public"."questions" USING "btree" ("question_type", "status", "published_at" DESC);



CREATE INDEX "subcategories_category_sort_idx" ON "public"."subcategories" USING "btree" ("category_id", "sort_order", "name");



CREATE INDEX "topic_edges_from_idx" ON "public"."topic_edges" USING "btree" ("from_topic_id", "relation_type", "sort_order");



CREATE INDEX "topic_edges_to_idx" ON "public"."topic_edges" USING "btree" ("to_topic_id", "relation_type");



CREATE INDEX "topics_sort_order_idx" ON "public"."topics" USING "btree" ("sort_order", "name");



CREATE INDEX "topics_status_idx" ON "public"."topics" USING "btree" ("status", "published_at" DESC);



CREATE INDEX "topics_subcategory_name_idx" ON "public"."topics" USING "btree" ("subcategory_id", "lower"("name"));



CREATE INDEX "topics_subcategory_sort_paged_idx" ON "public"."topics" USING "btree" ("subcategory_id", "sort_order", "id") WHERE ("status" = 'published'::"public"."content_status");



CREATE INDEX "topics_subcategory_status_sort_idx" ON "public"."topics" USING "btree" ("subcategory_id", "status", "sort_order", "name");



CREATE INDEX "uqp_review_due_idx" ON "public"."user_question_progress" USING "btree" ("user_id", "next_review_at") WHERE (("review_status" = 'review_later'::"text") AND ("next_review_at" IS NOT NULL));



CREATE INDEX "user_playlist_progress_user_idx" ON "public"."user_playlist_progress" USING "btree" ("user_id", "updated_at" DESC);



CREATE INDEX "user_question_progress_user_idx" ON "public"."user_question_progress" USING "btree" ("user_id", "updated_at" DESC);



CREATE INDEX "user_topic_progress_user_idx" ON "public"."user_topic_progress" USING "btree" ("user_id", "updated_at" DESC);



CREATE INDEX "users_role_idx" ON "public"."users" USING "btree" ("role");



CREATE INDEX "utp_review_due_idx" ON "public"."user_topic_progress" USING "btree" ("user_id", "next_review_at") WHERE (("review_status" = 'review_later'::"text") AND ("next_review_at" IS NOT NULL));



CREATE OR REPLACE TRIGGER "answers_set_updated_at" BEFORE UPDATE ON "public"."answers" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



CREATE OR REPLACE TRIGGER "categories_set_updated_at" BEFORE UPDATE ON "public"."categories" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



CREATE OR REPLACE TRIGGER "ensure_user_playlist_slug" BEFORE INSERT OR UPDATE ON "public"."playlists" FOR EACH ROW EXECUTE FUNCTION "public"."auto_generate_playlist_slug"();



CREATE OR REPLACE TRIGGER "playlists_set_updated_at" BEFORE UPDATE ON "public"."playlists" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



CREATE CONSTRAINT TRIGGER "question_topics_preserve_published_question_links" AFTER DELETE OR UPDATE OF "question_id" ON "public"."question_topics" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION "public"."enforce_published_questions_have_topics_from_question_topics"();



CREATE OR REPLACE TRIGGER "question_topics_set_updated_at" BEFORE UPDATE ON "public"."question_topics" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



CREATE CONSTRAINT TRIGGER "questions_require_topic_links_when_published" AFTER INSERT OR UPDATE OF "status" ON "public"."questions" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW WHEN (("new"."status" = 'published'::"public"."content_status")) EXECUTE FUNCTION "public"."enforce_published_questions_have_topics_from_questions"();



CREATE OR REPLACE TRIGGER "questions_set_updated_at" BEFORE UPDATE ON "public"."questions" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



CREATE OR REPLACE TRIGGER "subcategories_set_updated_at" BEFORE UPDATE ON "public"."subcategories" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



CREATE OR REPLACE TRIGGER "topic_edges_set_updated_at" BEFORE UPDATE ON "public"."topic_edges" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



CREATE OR REPLACE TRIGGER "topics_set_updated_at" BEFORE UPDATE ON "public"."topics" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



CREATE OR REPLACE TRIGGER "user_playlist_progress_set_updated_at" BEFORE UPDATE ON "public"."user_playlist_progress" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



CREATE OR REPLACE TRIGGER "user_preferences_set_updated_at" BEFORE UPDATE ON "public"."user_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



CREATE OR REPLACE TRIGGER "user_question_progress_set_updated_at" BEFORE UPDATE ON "public"."user_question_progress" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



CREATE OR REPLACE TRIGGER "user_topic_progress_set_updated_at" BEFORE UPDATE ON "public"."user_topic_progress" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



CREATE OR REPLACE TRIGGER "users_set_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



ALTER TABLE ONLY "public"."answers"
    ADD CONSTRAINT "answers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."answers"
    ADD CONSTRAINT "answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."answers"
    ADD CONSTRAINT "answers_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."content_revisions"
    ADD CONSTRAINT "content_revisions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."playlist_items"
    ADD CONSTRAINT "playlist_items_playlist_id_fkey" FOREIGN KEY ("playlist_id") REFERENCES "public"."playlists"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."playlist_items"
    ADD CONSTRAINT "playlist_items_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."playlists"
    ADD CONSTRAINT "playlists_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."playlists"
    ADD CONSTRAINT "playlists_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."question_attempts"
    ADD CONSTRAINT "question_attempts_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."question_attempts"
    ADD CONSTRAINT "question_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."question_topics"
    ADD CONSTRAINT "question_topics_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."question_topics"
    ADD CONSTRAINT "question_topics_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."question_topics"
    ADD CONSTRAINT "question_topics_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."question_topics"
    ADD CONSTRAINT "question_topics_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."subcategories"
    ADD CONSTRAINT "subcategories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subcategories"
    ADD CONSTRAINT "subcategories_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."subcategories"
    ADD CONSTRAINT "subcategories_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."topic_edges"
    ADD CONSTRAINT "topic_edges_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."topic_edges"
    ADD CONSTRAINT "topic_edges_from_topic_id_fkey" FOREIGN KEY ("from_topic_id") REFERENCES "public"."topics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."topic_edges"
    ADD CONSTRAINT "topic_edges_to_topic_id_fkey" FOREIGN KEY ("to_topic_id") REFERENCES "public"."topics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."topic_edges"
    ADD CONSTRAINT "topic_edges_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."topics"
    ADD CONSTRAINT "topics_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."topics"
    ADD CONSTRAINT "topics_subcategory_id_fkey" FOREIGN KEY ("subcategory_id") REFERENCES "public"."subcategories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."topics"
    ADD CONSTRAINT "topics_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_playlist_progress"
    ADD CONSTRAINT "user_playlist_progress_last_item_id_fkey" FOREIGN KEY ("last_item_id") REFERENCES "public"."playlist_items"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_playlist_progress"
    ADD CONSTRAINT "user_playlist_progress_playlist_id_fkey" FOREIGN KEY ("playlist_id") REFERENCES "public"."playlists"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_playlist_progress"
    ADD CONSTRAINT "user_playlist_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_question_progress"
    ADD CONSTRAINT "user_question_progress_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_question_progress"
    ADD CONSTRAINT "user_question_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_topic_progress"
    ADD CONSTRAINT "user_topic_progress_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_topic_progress"
    ADD CONSTRAINT "user_topic_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE "public"."answers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "answers_manage_policy" ON "public"."answers" USING ("public"."has_any_role"(ARRAY['admin'::"public"."app_role", 'editor'::"public"."app_role"])) WITH CHECK ("public"."has_any_role"(ARRAY['admin'::"public"."app_role", 'editor'::"public"."app_role"]));



CREATE POLICY "answers_select_policy" ON "public"."answers" FOR SELECT USING ((("status" = 'published'::"public"."content_status") OR "public"."has_any_role"(ARRAY['admin'::"public"."app_role", 'editor'::"public"."app_role"])));



ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "categories_manage_policy" ON "public"."categories" USING ("public"."has_any_role"(ARRAY['admin'::"public"."app_role", 'editor'::"public"."app_role"])) WITH CHECK ("public"."has_any_role"(ARRAY['admin'::"public"."app_role", 'editor'::"public"."app_role"]));



CREATE POLICY "categories_select_policy" ON "public"."categories" FOR SELECT USING (true);



ALTER TABLE "public"."content_revisions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "content_revisions_manage_policy" ON "public"."content_revisions" USING ("public"."has_any_role"(ARRAY['admin'::"public"."app_role", 'editor'::"public"."app_role"])) WITH CHECK ("public"."has_any_role"(ARRAY['admin'::"public"."app_role", 'editor'::"public"."app_role"]));



CREATE POLICY "content_revisions_select_policy" ON "public"."content_revisions" FOR SELECT USING ("public"."has_any_role"(ARRAY['admin'::"public"."app_role", 'editor'::"public"."app_role"]));



ALTER TABLE "public"."playlist_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "playlist_items_manage_policy" ON "public"."playlist_items" USING ("public"."has_any_role"(ARRAY['admin'::"public"."app_role", 'editor'::"public"."app_role"])) WITH CHECK ("public"."has_any_role"(ARRAY['admin'::"public"."app_role", 'editor'::"public"."app_role"]));



CREATE POLICY "playlist_items_select_policy" ON "public"."playlist_items" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."playlists" "p"
  WHERE (("p"."id" = "playlist_items"."playlist_id") AND (("p"."status" = 'published'::"public"."content_status") OR (("p"."created_by" = "auth"."uid"()) AND ("p"."is_system" = false)))))) OR "public"."has_any_role"(ARRAY['admin'::"public"."app_role", 'editor'::"public"."app_role"])));



CREATE POLICY "playlist_items_user_delete_policy" ON "public"."playlist_items" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."playlists" "p"
  WHERE (("p"."id" = "playlist_items"."playlist_id") AND ("p"."created_by" = "auth"."uid"()) AND ("p"."is_system" = false)))));



CREATE POLICY "playlist_items_user_insert_policy" ON "public"."playlist_items" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."playlists" "p"
  WHERE (("p"."id" = "playlist_items"."playlist_id") AND ("p"."created_by" = "auth"."uid"()) AND ("p"."is_system" = false)))));



CREATE POLICY "playlist_items_user_update_policy" ON "public"."playlist_items" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."playlists" "p"
  WHERE (("p"."id" = "playlist_items"."playlist_id") AND ("p"."created_by" = "auth"."uid"()) AND ("p"."is_system" = false))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."playlists" "p"
  WHERE (("p"."id" = "playlist_items"."playlist_id") AND ("p"."created_by" = "auth"."uid"()) AND ("p"."is_system" = false)))));



ALTER TABLE "public"."playlists" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "playlists_manage_policy" ON "public"."playlists" USING ("public"."has_any_role"(ARRAY['admin'::"public"."app_role", 'editor'::"public"."app_role"])) WITH CHECK ("public"."has_any_role"(ARRAY['admin'::"public"."app_role", 'editor'::"public"."app_role"]));



CREATE POLICY "playlists_select_policy" ON "public"."playlists" FOR SELECT USING ((("status" = 'published'::"public"."content_status") OR "public"."has_any_role"(ARRAY['admin'::"public"."app_role", 'editor'::"public"."app_role"]) OR (("created_by" = "auth"."uid"()) AND ("is_system" = false))));



CREATE POLICY "playlists_user_delete_policy" ON "public"."playlists" FOR DELETE USING ((("created_by" = "auth"."uid"()) AND ("is_system" = false)));



CREATE POLICY "playlists_user_insert_policy" ON "public"."playlists" FOR INSERT WITH CHECK ((("created_by" = "auth"."uid"()) AND ("is_system" = false)));



CREATE POLICY "playlists_user_update_delete_policy" ON "public"."playlists" FOR UPDATE USING ((("created_by" = "auth"."uid"()) AND ("is_system" = false))) WITH CHECK ((("created_by" = "auth"."uid"()) AND ("is_system" = false)));



ALTER TABLE "public"."question_attempts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "question_attempts_delete_policy" ON "public"."question_attempts" FOR DELETE USING ((("user_id" = "auth"."uid"()) OR "public"."has_any_role"(ARRAY['admin'::"public"."app_role", 'editor'::"public"."app_role"])));



CREATE POLICY "question_attempts_insert_policy" ON "public"."question_attempts" FOR INSERT WITH CHECK ((("user_id" = "auth"."uid"()) OR "public"."has_any_role"(ARRAY['admin'::"public"."app_role", 'editor'::"public"."app_role"])));



CREATE POLICY "question_attempts_select_policy" ON "public"."question_attempts" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR "public"."has_any_role"(ARRAY['admin'::"public"."app_role", 'editor'::"public"."app_role"])));



CREATE POLICY "question_attempts_update_policy" ON "public"."question_attempts" FOR UPDATE USING ((("user_id" = "auth"."uid"()) OR "public"."has_any_role"(ARRAY['admin'::"public"."app_role", 'editor'::"public"."app_role"]))) WITH CHECK ((("user_id" = "auth"."uid"()) OR "public"."has_any_role"(ARRAY['admin'::"public"."app_role", 'editor'::"public"."app_role"])));



ALTER TABLE "public"."question_topics" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "question_topics_manage_policy" ON "public"."question_topics" USING ("public"."has_any_role"(ARRAY['admin'::"public"."app_role", 'editor'::"public"."app_role"])) WITH CHECK ("public"."has_any_role"(ARRAY['admin'::"public"."app_role", 'editor'::"public"."app_role"]));



CREATE POLICY "question_topics_select_policy" ON "public"."question_topics" FOR SELECT USING ((((EXISTS ( SELECT 1
   FROM "public"."questions" "q"
  WHERE (("q"."id" = "question_topics"."question_id") AND ("q"."status" = 'published'::"public"."content_status")))) AND (EXISTS ( SELECT 1
   FROM "public"."topics" "t"
  WHERE (("t"."id" = "question_topics"."topic_id") AND ("t"."status" = 'published'::"public"."content_status"))))) OR "public"."has_any_role"(ARRAY['admin'::"public"."app_role", 'editor'::"public"."app_role"])));



ALTER TABLE "public"."questions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "questions_manage_policy" ON "public"."questions" USING ("public"."has_any_role"(ARRAY['admin'::"public"."app_role", 'editor'::"public"."app_role"])) WITH CHECK ("public"."has_any_role"(ARRAY['admin'::"public"."app_role", 'editor'::"public"."app_role"]));



CREATE POLICY "questions_select_policy" ON "public"."questions" FOR SELECT USING ((("status" = 'published'::"public"."content_status") OR "public"."has_any_role"(ARRAY['admin'::"public"."app_role", 'editor'::"public"."app_role"])));



ALTER TABLE "public"."subcategories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "subcategories_manage_policy" ON "public"."subcategories" USING ("public"."has_any_role"(ARRAY['admin'::"public"."app_role", 'editor'::"public"."app_role"])) WITH CHECK ("public"."has_any_role"(ARRAY['admin'::"public"."app_role", 'editor'::"public"."app_role"]));



CREATE POLICY "subcategories_select_policy" ON "public"."subcategories" FOR SELECT USING ((("is_active" = true) OR "public"."has_any_role"(ARRAY['admin'::"public"."app_role", 'editor'::"public"."app_role"])));



ALTER TABLE "public"."topic_edges" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "topic_edges_manage_policy" ON "public"."topic_edges" USING ("public"."has_any_role"(ARRAY['admin'::"public"."app_role", 'editor'::"public"."app_role"])) WITH CHECK ("public"."has_any_role"(ARRAY['admin'::"public"."app_role", 'editor'::"public"."app_role"]));



CREATE POLICY "topic_edges_select_policy" ON "public"."topic_edges" FOR SELECT USING ((((EXISTS ( SELECT 1
   FROM "public"."topics" "source"
  WHERE (("source"."id" = "topic_edges"."from_topic_id") AND ("source"."status" = 'published'::"public"."content_status")))) AND (EXISTS ( SELECT 1
   FROM "public"."topics" "destination"
  WHERE (("destination"."id" = "topic_edges"."to_topic_id") AND ("destination"."status" = 'published'::"public"."content_status"))))) OR "public"."has_any_role"(ARRAY['admin'::"public"."app_role", 'editor'::"public"."app_role"])));



ALTER TABLE "public"."topics" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "topics_manage_policy" ON "public"."topics" USING ("public"."has_any_role"(ARRAY['admin'::"public"."app_role", 'editor'::"public"."app_role"])) WITH CHECK ("public"."has_any_role"(ARRAY['admin'::"public"."app_role", 'editor'::"public"."app_role"]));



CREATE POLICY "topics_select_policy" ON "public"."topics" FOR SELECT USING ((("status" = 'published'::"public"."content_status") OR "public"."has_any_role"(ARRAY['admin'::"public"."app_role", 'editor'::"public"."app_role"])));



ALTER TABLE "public"."user_playlist_progress" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_playlist_progress_delete_policy" ON "public"."user_playlist_progress" FOR DELETE USING ((("user_id" = "auth"."uid"()) OR "public"."has_any_role"(ARRAY['admin'::"public"."app_role", 'editor'::"public"."app_role"])));



CREATE POLICY "user_playlist_progress_insert_policy" ON "public"."user_playlist_progress" FOR INSERT WITH CHECK ((("user_id" = "auth"."uid"()) OR "public"."has_any_role"(ARRAY['admin'::"public"."app_role", 'editor'::"public"."app_role"])));



CREATE POLICY "user_playlist_progress_select_policy" ON "public"."user_playlist_progress" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR "public"."has_any_role"(ARRAY['admin'::"public"."app_role", 'editor'::"public"."app_role"])));



CREATE POLICY "user_playlist_progress_update_policy" ON "public"."user_playlist_progress" FOR UPDATE USING ((("user_id" = "auth"."uid"()) OR "public"."has_any_role"(ARRAY['admin'::"public"."app_role", 'editor'::"public"."app_role"]))) WITH CHECK ((("user_id" = "auth"."uid"()) OR "public"."has_any_role"(ARRAY['admin'::"public"."app_role", 'editor'::"public"."app_role"])));



ALTER TABLE "public"."user_preferences" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_preferences_delete_policy" ON "public"."user_preferences" FOR DELETE USING ((("user_id" = "auth"."uid"()) OR "public"."has_any_role"(ARRAY['admin'::"public"."app_role"])));



CREATE POLICY "user_preferences_insert_policy" ON "public"."user_preferences" FOR INSERT WITH CHECK ((("user_id" = "auth"."uid"()) OR "public"."has_any_role"(ARRAY['admin'::"public"."app_role"])));



CREATE POLICY "user_preferences_select_policy" ON "public"."user_preferences" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR "public"."has_any_role"(ARRAY['admin'::"public"."app_role"])));



CREATE POLICY "user_preferences_update_policy" ON "public"."user_preferences" FOR UPDATE USING ((("user_id" = "auth"."uid"()) OR "public"."has_any_role"(ARRAY['admin'::"public"."app_role"]))) WITH CHECK ((("user_id" = "auth"."uid"()) OR "public"."has_any_role"(ARRAY['admin'::"public"."app_role"])));



ALTER TABLE "public"."user_question_progress" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_question_progress_delete_policy" ON "public"."user_question_progress" FOR DELETE USING ((("user_id" = "auth"."uid"()) OR "public"."has_any_role"(ARRAY['admin'::"public"."app_role", 'editor'::"public"."app_role"])));



CREATE POLICY "user_question_progress_insert_policy" ON "public"."user_question_progress" FOR INSERT WITH CHECK ((("user_id" = "auth"."uid"()) OR "public"."has_any_role"(ARRAY['admin'::"public"."app_role", 'editor'::"public"."app_role"])));



CREATE POLICY "user_question_progress_select_policy" ON "public"."user_question_progress" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR "public"."has_any_role"(ARRAY['admin'::"public"."app_role", 'editor'::"public"."app_role"])));



CREATE POLICY "user_question_progress_update_policy" ON "public"."user_question_progress" FOR UPDATE USING ((("user_id" = "auth"."uid"()) OR "public"."has_any_role"(ARRAY['admin'::"public"."app_role", 'editor'::"public"."app_role"]))) WITH CHECK ((("user_id" = "auth"."uid"()) OR "public"."has_any_role"(ARRAY['admin'::"public"."app_role", 'editor'::"public"."app_role"])));



ALTER TABLE "public"."user_topic_progress" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_topic_progress_delete_policy" ON "public"."user_topic_progress" FOR DELETE USING ((("user_id" = "auth"."uid"()) OR "public"."has_any_role"(ARRAY['admin'::"public"."app_role", 'editor'::"public"."app_role"])));



CREATE POLICY "user_topic_progress_insert_policy" ON "public"."user_topic_progress" FOR INSERT WITH CHECK ((("user_id" = "auth"."uid"()) OR "public"."has_any_role"(ARRAY['admin'::"public"."app_role", 'editor'::"public"."app_role"])));



CREATE POLICY "user_topic_progress_select_policy" ON "public"."user_topic_progress" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR "public"."has_any_role"(ARRAY['admin'::"public"."app_role", 'editor'::"public"."app_role"])));



CREATE POLICY "user_topic_progress_update_policy" ON "public"."user_topic_progress" FOR UPDATE USING ((("user_id" = "auth"."uid"()) OR "public"."has_any_role"(ARRAY['admin'::"public"."app_role", 'editor'::"public"."app_role"]))) WITH CHECK ((("user_id" = "auth"."uid"()) OR "public"."has_any_role"(ARRAY['admin'::"public"."app_role", 'editor'::"public"."app_role"])));



ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users_delete_policy" ON "public"."users" FOR DELETE USING ("public"."has_any_role"(ARRAY['admin'::"public"."app_role"]));



CREATE POLICY "users_insert_policy" ON "public"."users" FOR INSERT WITH CHECK ((("id" = "auth"."uid"()) OR "public"."has_any_role"(ARRAY['admin'::"public"."app_role"])));



CREATE POLICY "users_select_policy" ON "public"."users" FOR SELECT USING ((("id" = "auth"."uid"()) OR "public"."has_any_role"(ARRAY['admin'::"public"."app_role"])));



CREATE POLICY "users_update_policy" ON "public"."users" FOR UPDATE USING ((("id" = "auth"."uid"()) OR "public"."has_any_role"(ARRAY['admin'::"public"."app_role"]))) WITH CHECK ((("id" = "auth"."uid"()) OR "public"."has_any_role"(ARRAY['admin'::"public"."app_role"])));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



































































































































































































GRANT ALL ON FUNCTION "public"."assert_published_question_has_topics"("target_question_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."assert_published_question_has_topics"("target_question_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."assert_published_question_has_topics"("target_question_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_generate_playlist_slug"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_generate_playlist_slug"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_generate_playlist_slug"() TO "service_role";



GRANT ALL ON FUNCTION "public"."enforce_published_questions_have_topics_from_question_topics"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_published_questions_have_topics_from_question_topics"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_published_questions_have_topics_from_question_topics"() TO "service_role";



GRANT ALL ON FUNCTION "public"."enforce_published_questions_have_topics_from_questions"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_published_questions_have_topics_from_questions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_published_questions_have_topics_from_questions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_any_role"("required_roles" "public"."app_role"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."has_any_role"("required_roles" "public"."app_role"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_any_role"("required_roles" "public"."app_role"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_set_updated_at"() TO "service_role";
























GRANT ALL ON TABLE "public"."answers" TO "anon";
GRANT ALL ON TABLE "public"."answers" TO "authenticated";
GRANT ALL ON TABLE "public"."answers" TO "service_role";



GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."content_revisions" TO "anon";
GRANT ALL ON TABLE "public"."content_revisions" TO "authenticated";
GRANT ALL ON TABLE "public"."content_revisions" TO "service_role";



GRANT ALL ON TABLE "public"."playlist_items" TO "anon";
GRANT ALL ON TABLE "public"."playlist_items" TO "authenticated";
GRANT ALL ON TABLE "public"."playlist_items" TO "service_role";



GRANT ALL ON TABLE "public"."playlists" TO "anon";
GRANT ALL ON TABLE "public"."playlists" TO "authenticated";
GRANT ALL ON TABLE "public"."playlists" TO "service_role";



GRANT ALL ON TABLE "public"."question_attempts" TO "anon";
GRANT ALL ON TABLE "public"."question_attempts" TO "authenticated";
GRANT ALL ON TABLE "public"."question_attempts" TO "service_role";



GRANT ALL ON TABLE "public"."question_topics" TO "anon";
GRANT ALL ON TABLE "public"."question_topics" TO "authenticated";
GRANT ALL ON TABLE "public"."question_topics" TO "service_role";



GRANT ALL ON TABLE "public"."questions" TO "anon";
GRANT ALL ON TABLE "public"."questions" TO "authenticated";
GRANT ALL ON TABLE "public"."questions" TO "service_role";



GRANT ALL ON TABLE "public"."subcategories" TO "anon";
GRANT ALL ON TABLE "public"."subcategories" TO "authenticated";
GRANT ALL ON TABLE "public"."subcategories" TO "service_role";



GRANT ALL ON TABLE "public"."topic_edges" TO "anon";
GRANT ALL ON TABLE "public"."topic_edges" TO "authenticated";
GRANT ALL ON TABLE "public"."topic_edges" TO "service_role";



GRANT ALL ON TABLE "public"."topics" TO "anon";
GRANT ALL ON TABLE "public"."topics" TO "authenticated";
GRANT ALL ON TABLE "public"."topics" TO "service_role";



GRANT ALL ON TABLE "public"."user_playlist_progress" TO "anon";
GRANT ALL ON TABLE "public"."user_playlist_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."user_playlist_progress" TO "service_role";



GRANT ALL ON TABLE "public"."user_preferences" TO "anon";
GRANT ALL ON TABLE "public"."user_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."user_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."user_question_progress" TO "anon";
GRANT ALL ON TABLE "public"."user_question_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."user_question_progress" TO "service_role";



GRANT ALL ON TABLE "public"."user_topic_progress" TO "anon";
GRANT ALL ON TABLE "public"."user_topic_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."user_topic_progress" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";
