/*
 Navicat PostgreSQL Dump SQL

 Source Server         : localhost
 Source Server Type    : PostgreSQL
 Source Server Version : 170002 (170002)
 Source Host           : localhost:5432
 Source Catalog        : app-success-onlineOct10
 Source Schema         : public

 Target Server Type    : PostgreSQL
 Target Server Version : 170002 (170002)
 File Encoding         : 65001

 Date: 14/10/2025 19:01:05
*/


-- ----------------------------
-- Sequence structure for eos_implementers_stage_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."eos_implementers_stage_id_seq";
CREATE SEQUENCE "public"."eos_implementers_stage_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;
ALTER SEQUENCE "public"."eos_implementers_stage_id_seq" OWNER TO "postgres";

-- ----------------------------
-- Sequence structure for help_content_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."help_content_id_seq";
CREATE SEQUENCE "public"."help_content_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;
ALTER SEQUENCE "public"."help_content_id_seq" OWNER TO "postgres";

-- ----------------------------
-- Sequence structure for help_content_tips_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."help_content_tips_id_seq";
CREATE SEQUENCE "public"."help_content_tips_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;
ALTER SEQUENCE "public"."help_content_tips_id_seq" OWNER TO "postgres";

-- ----------------------------
-- Sequence structure for roadmap_item_votes_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."roadmap_item_votes_id_seq";
CREATE SEQUENCE "public"."roadmap_item_votes_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;
ALTER SEQUENCE "public"."roadmap_item_votes_id_seq" OWNER TO "postgres";

-- ----------------------------
-- Sequence structure for roadmap_items_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."roadmap_items_id_seq";
CREATE SEQUENCE "public"."roadmap_items_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;
ALTER SEQUENCE "public"."roadmap_items_id_seq" OWNER TO "postgres";

-- ----------------------------
-- Sequence structure for roadmap_phases_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."roadmap_phases_id_seq";
CREATE SEQUENCE "public"."roadmap_phases_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;
ALTER SEQUENCE "public"."roadmap_phases_id_seq" OWNER TO "postgres";

-- ----------------------------
-- Table structure for comment_files
-- ----------------------------
DROP TABLE IF EXISTS "public"."comment_files";
CREATE TABLE "public"."comment_files" (
  "id" varchar(255) COLLATE "pg_catalog"."default" NOT NULL DEFAULT gen_random_uuid(),
  "comment_id" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "uploaded_file_url" text COLLATE "pg_catalog"."default" NOT NULL,
  "object_id" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "sync_id" int4 NOT NULL,
  "company_id" uuid NOT NULL
)
;
ALTER TABLE "public"."comment_files" OWNER TO "postgres";
COMMENT ON COLUMN "public"."comment_files"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."comment_files"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for comments
-- ----------------------------
DROP TABLE IF EXISTS "public"."comments";
CREATE TABLE "public"."comments" (
  "id" varchar(255) COLLATE "pg_catalog"."default" NOT NULL DEFAULT gen_random_uuid(),
  "object_id" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "order" int4 NOT NULL DEFAULT 20000,
  "text" text COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::text,
  "user_id" uuid NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "sync_id" int4 NOT NULL,
  "company_id" uuid NOT NULL,
  "type" varchar(100) COLLATE "pg_catalog"."default"
)
;
ALTER TABLE "public"."comments" OWNER TO "postgres";
COMMENT ON COLUMN "public"."comments"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."comments"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for companies
-- ----------------------------
DROP TABLE IF EXISTS "public"."companies";
CREATE TABLE "public"."companies" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "name" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "code" varchar(255) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "company_icon_url" varchar(255) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "previous_code" varchar(255) COLLATE "pg_catalog"."default" DEFAULT NULL::character varying,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "sync_id" int4 NOT NULL,
  "default_first_day_of_week" int2 NOT NULL DEFAULT 1,
  "default_time_zone" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'Europe/Dublin'::character varying,
  "integration_google_calendar_allowed" bool NOT NULL DEFAULT false,
  "integration_microsoft_calendar_allowed" bool NOT NULL DEFAULT false,
  "company_dark_icon_url" varchar(255) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "integration_todos_config" text COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::text,
  "integration_todos_app" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "integration_todos_app_is_setup" bool NOT NULL DEFAULT false,
  "subscription_state" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'NORMAL'::character varying,
  "subscription_notes" text COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::text,
  "name_display_order" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'WESTERN'::character varying,
  "bar_plus" int4 NOT NULL DEFAULT 3,
  "bar_plus_minus" int4 NOT NULL DEFAULT 2,
  "previous_platform_id" varchar(255) COLLATE "pg_catalog"."default",
  "show_issues_priority" bool NOT NULL DEFAULT true,
  "quarter_one_date" date DEFAULT make_date((EXTRACT(year FROM CURRENT_DATE))::integer, 1, 1),
  "quarter_two_date" date DEFAULT make_date((EXTRACT(year FROM CURRENT_DATE))::integer, 4, 1),
  "quarter_three_date" date DEFAULT make_date((EXTRACT(year FROM CURRENT_DATE))::integer, 7, 1),
  "quarter_four_date" date DEFAULT make_date((EXTRACT(year FROM CURRENT_DATE))::integer, 10, 1)
)
;
ALTER TABLE "public"."companies" OWNER TO "postgres";
COMMENT ON COLUMN "public"."companies"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."companies"."sync_id" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."companies"."integration_todos_config" IS '@omit';
COMMENT ON COLUMN "public"."companies"."integration_todos_app" IS 'Empty = off';
COMMENT ON COLUMN "public"."companies"."integration_todos_app_is_setup" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."companies"."subscription_state" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."companies"."subscription_notes" IS '@omit';

-- ----------------------------
-- Table structure for dashboard_layout_designs
-- ----------------------------
DROP TABLE IF EXISTS "public"."dashboard_layout_designs";
CREATE TABLE "public"."dashboard_layout_designs" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "device" varchar COLLATE "pg_catalog"."default" NOT NULL,
  "user_id" uuid NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "sync_id" int4 NOT NULL,
  "company_id" uuid NOT NULL
)
;
ALTER TABLE "public"."dashboard_layout_designs" OWNER TO "postgres";
COMMENT ON COLUMN "public"."dashboard_layout_designs"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."dashboard_layout_designs"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for dashboard_layout_displays
-- ----------------------------
DROP TABLE IF EXISTS "public"."dashboard_layout_displays";
CREATE TABLE "public"."dashboard_layout_displays" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "component" varchar(50) COLLATE "pg_catalog"."default" NOT NULL,
  "layout" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "w" float8 NOT NULL,
  "h" float8 NOT NULL,
  "x" float8 NOT NULL,
  "y" float8 NOT NULL,
  "layoutDesignId" uuid NOT NULL,
  "moved" bool NOT NULL DEFAULT false,
  "visible" bool NOT NULL DEFAULT true,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "sync_id" int4 NOT NULL DEFAULT 0,
  "company_id" uuid NOT NULL
)
;
ALTER TABLE "public"."dashboard_layout_displays" OWNER TO "postgres";
COMMENT ON COLUMN "public"."dashboard_layout_displays"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."dashboard_layout_displays"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for data_field_statuses
-- ----------------------------
DROP TABLE IF EXISTS "public"."data_field_statuses";
CREATE TABLE "public"."data_field_statuses" (
  "id" varchar(255) COLLATE "pg_catalog"."default" NOT NULL DEFAULT gen_random_uuid(),
  "built_in" bool NOT NULL DEFAULT false,
  "color" varchar(7) COLLATE "pg_catalog"."default" NOT NULL DEFAULT '#999999'::character varying,
  "name" varchar(255) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "order" int4 NOT NULL DEFAULT 20000,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "sync_id" int4 NOT NULL,
  "company_id" uuid NOT NULL
)
;
ALTER TABLE "public"."data_field_statuses" OWNER TO "postgres";
COMMENT ON COLUMN "public"."data_field_statuses"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."data_field_statuses"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for data_fields
-- ----------------------------
DROP TABLE IF EXISTS "public"."data_fields";
CREATE TABLE "public"."data_fields" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "data_field_status_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "desc" text COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::text,
  "goal_currency" varchar(10) COLLATE "pg_catalog"."default" NOT NULL DEFAULT '$'::character varying,
  "goal_target" varchar(20) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 100,
  "goal_target_end" varchar(20) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 100,
  "name" varchar(512) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "show_average" bool NOT NULL DEFAULT true,
  "show_total" bool NOT NULL DEFAULT true,
  "type" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'WEEKLY'::character varying,
  "unit_comparison" varchar(10) COLLATE "pg_catalog"."default" NOT NULL DEFAULT '>='::character varying,
  "unit_type" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'number'::character varying,
  "user_id" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "sync_id" int4 NOT NULL,
  "company_id" uuid NOT NULL,
  "order" int4 NOT NULL DEFAULT 5000,
  "status_updated_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "formula" text COLLATE "pg_catalog"."default",
  "auto_format" bool NOT NULL DEFAULT false,
  "auto_round_decimals" bool NOT NULL DEFAULT false
)
;
ALTER TABLE "public"."data_fields" OWNER TO "postgres";
COMMENT ON COLUMN "public"."data_fields"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."data_fields"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for data_values
-- ----------------------------
DROP TABLE IF EXISTS "public"."data_values";
CREATE TABLE "public"."data_values" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "data_field_id" uuid NOT NULL,
  "start_date" date NOT NULL,
  "value" varchar(255) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "sync_id" int4 NOT NULL,
  "company_id" uuid NOT NULL,
  "custom_goal_target" varchar(20) COLLATE "pg_catalog"."default",
  "custom_goal_target_end" varchar(20) COLLATE "pg_catalog"."default",
  "note" text COLLATE "pg_catalog"."default" DEFAULT ''::text
)
;
ALTER TABLE "public"."data_values" OWNER TO "postgres";
COMMENT ON COLUMN "public"."data_values"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."data_values"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for del_del_users_on_todos
-- ----------------------------
DROP TABLE IF EXISTS "public"."del_del_users_on_todos";
CREATE TABLE "public"."del_del_users_on_todos" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "todo_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "sync_id" int4 NOT NULL,
  "company_id" uuid NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL
)
;
ALTER TABLE "public"."del_del_users_on_todos" OWNER TO "postgres";
COMMENT ON COLUMN "public"."del_del_users_on_todos"."sync_id" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."del_del_users_on_todos"."updated_at" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for eos_implementers
-- ----------------------------
DROP TABLE IF EXISTS "public"."eos_implementers";
CREATE TABLE "public"."eos_implementers" (
  "id" uuid NOT NULL,
  "name" text COLLATE "pg_catalog"."default" NOT NULL,
  "level" text COLLATE "pg_catalog"."default" NOT NULL,
  "email" text COLLATE "pg_catalog"."default" NOT NULL,
  "service_area" text COLLATE "pg_catalog"."default" NOT NULL,
  "address" text COLLATE "pg_catalog"."default" NOT NULL,
  "short_note" text COLLATE "pg_catalog"."default" NOT NULL,
  "owned_by" text COLLATE "pg_catalog"."default" NOT NULL,
  "notes" text COLLATE "pg_catalog"."default" NOT NULL,
  "stage_id" int4 NOT NULL DEFAULT 2,
  "email_is_verified" bool NOT NULL DEFAULT false,
  "latitude" numeric(10,7),
  "longitude" numeric(10,7),
  "instant_access_code" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "linkedin_profile_url" varchar(255) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "outreach_video_url" varchar(255) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "is_key_influencer" bool NOT NULL DEFAULT false,
  "allowed_use_name" bool NOT NULL DEFAULT false
)
;
ALTER TABLE "public"."eos_implementers" OWNER TO "postgres";

-- ----------------------------
-- Table structure for eos_implementers_stage
-- ----------------------------
DROP TABLE IF EXISTS "public"."eos_implementers_stage";
CREATE TABLE "public"."eos_implementers_stage" (
  "id" int4 NOT NULL DEFAULT nextval('eos_implementers_stage_id_seq'::regclass),
  "name" text COLLATE "pg_catalog"."default" NOT NULL,
  "order" int4 NOT NULL DEFAULT 20000
)
;
ALTER TABLE "public"."eos_implementers_stage" OWNER TO "postgres";

-- ----------------------------
-- Table structure for external_lookup_cache
-- ----------------------------
DROP TABLE IF EXISTS "public"."external_lookup_cache";
CREATE TABLE "public"."external_lookup_cache" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "app_type" varchar(50) COLLATE "pg_catalog"."default" NOT NULL,
  "company_id" uuid NOT NULL,
  "internal_type" varchar(50) COLLATE "pg_catalog"."default" NOT NULL,
  "internal_id" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "external_id" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "lookup_key" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "created_at" timestamptz(6) DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) DEFAULT CURRENT_TIMESTAMP
)
;
ALTER TABLE "public"."external_lookup_cache" OWNER TO "postgres";

-- ----------------------------
-- Table structure for headline_statuses
-- ----------------------------
DROP TABLE IF EXISTS "public"."headline_statuses";
CREATE TABLE "public"."headline_statuses" (
  "id" varchar(255) COLLATE "pg_catalog"."default" NOT NULL DEFAULT gen_random_uuid(),
  "built_in" bool NOT NULL DEFAULT false,
  "color" varchar(7) COLLATE "pg_catalog"."default" NOT NULL DEFAULT '#bbbbbb'::character varying,
  "name" varchar(255) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "order" int4 NOT NULL DEFAULT 20000,
  "type" varchar(20) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'todo'::character varying,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "sync_id" int4 NOT NULL,
  "company_id" uuid NOT NULL
)
;
ALTER TABLE "public"."headline_statuses" OWNER TO "postgres";
COMMENT ON COLUMN "public"."headline_statuses"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."headline_statuses"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for headlines
-- ----------------------------
DROP TABLE IF EXISTS "public"."headlines";
CREATE TABLE "public"."headlines" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "desc" text COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "headline_status_id" varchar(255) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'DISCUSS'::character varying,
  "name" varchar(512) COLLATE "pg_catalog"."default" NOT NULL,
  "team_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "status_updated_at" timestamptz(6) NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "sync_id" int4 NOT NULL,
  "company_id" uuid NOT NULL,
  "meeting_id" uuid,
  "is_cascading_message" bool NOT NULL DEFAULT false,
  "order" int4 NOT NULL DEFAULT 5000
)
;
ALTER TABLE "public"."headlines" OWNER TO "postgres";
COMMENT ON COLUMN "public"."headlines"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."headlines"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for help_content
-- ----------------------------
DROP TABLE IF EXISTS "public"."help_content";
CREATE TABLE "public"."help_content" (
  "id" int4 NOT NULL DEFAULT nextval('help_content_id_seq'::regclass),
  "route_key" varchar(50) COLLATE "pg_catalog"."default" NOT NULL,
  "title" varchar(100) COLLATE "pg_catalog"."default" NOT NULL,
  "description" text COLLATE "pg_catalog"."default" NOT NULL,
  "concepts_video_id" varchar(20) COLLATE "pg_catalog"."default",
  "tool_video_id" varchar(20) COLLATE "pg_catalog"."default",
  "created_at" timestamptz(6) DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) DEFAULT CURRENT_TIMESTAMP
)
;
ALTER TABLE "public"."help_content" OWNER TO "postgres";

-- ----------------------------
-- Table structure for help_content_tips
-- ----------------------------
DROP TABLE IF EXISTS "public"."help_content_tips";
CREATE TABLE "public"."help_content_tips" (
  "id" int4 NOT NULL DEFAULT nextval('help_content_tips_id_seq'::regclass),
  "help_content_id" int4 NOT NULL,
  "tip_text" text COLLATE "pg_catalog"."default" NOT NULL,
  "display_order" int4 NOT NULL
)
;
ALTER TABLE "public"."help_content_tips" OWNER TO "postgres";

-- ----------------------------
-- Table structure for issue_files
-- ----------------------------
DROP TABLE IF EXISTS "public"."issue_files";
CREATE TABLE "public"."issue_files" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "issue_id" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "uploaded_file_url" text COLLATE "pg_catalog"."default" NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "company_id" uuid NOT NULL,
  "sync_id" int4 NOT NULL DEFAULT 1
)
;
ALTER TABLE "public"."issue_files" OWNER TO "postgres";
COMMENT ON COLUMN "public"."issue_files"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."issue_files"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for issue_statuses
-- ----------------------------
DROP TABLE IF EXISTS "public"."issue_statuses";
CREATE TABLE "public"."issue_statuses" (
  "id" varchar(255) COLLATE "pg_catalog"."default" NOT NULL DEFAULT gen_random_uuid(),
  "built_in" bool NOT NULL DEFAULT false,
  "color" varchar(7) COLLATE "pg_catalog"."default" NOT NULL DEFAULT '#888888'::character varying,
  "name" varchar(255) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "order" int4 NOT NULL DEFAULT 20000,
  "type" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "sync_id" int4 NOT NULL,
  "company_id" uuid NOT NULL
)
;
ALTER TABLE "public"."issue_statuses" OWNER TO "postgres";
COMMENT ON COLUMN "public"."issue_statuses"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."issue_statuses"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for issues
-- ----------------------------
DROP TABLE IF EXISTS "public"."issues";
CREATE TABLE "public"."issues" (
  "id" varchar(255) COLLATE "pg_catalog"."default" NOT NULL DEFAULT gen_random_uuid(),
  "desc" text COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "issue_status_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'TODO'::character varying,
  "name" varchar(512) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "priority_no" int4 NOT NULL DEFAULT 999,
  "status_updated_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "team_id" uuid NOT NULL,
  "type" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'long-term'::character varying,
  "user_id" uuid NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "sync_id" int4 NOT NULL,
  "company_id" uuid NOT NULL,
  "meeting_id" uuid,
  "priority_order" int2,
  "order" int4 NOT NULL DEFAULT 5000
)
;
ALTER TABLE "public"."issues" OWNER TO "postgres";
COMMENT ON COLUMN "public"."issues"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."issues"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for languages
-- ----------------------------
DROP TABLE IF EXISTS "public"."languages";
CREATE TABLE "public"."languages" (
  "id" varchar(2) COLLATE "pg_catalog"."default" NOT NULL,
  "display_order" int4 NOT NULL,
  "name" varchar COLLATE "pg_catalog"."default" NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "sync_id" int4 NOT NULL
)
;
ALTER TABLE "public"."languages" OWNER TO "postgres";
COMMENT ON COLUMN "public"."languages"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."languages"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for last_logins
-- ----------------------------
DROP TABLE IF EXISTS "public"."last_logins";
CREATE TABLE "public"."last_logins" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "last_login_date" timestamptz(6) NOT NULL,
  "company_id" uuid NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "sync_id" int4 NOT NULL
)
;
ALTER TABLE "public"."last_logins" OWNER TO "postgres";
COMMENT ON COLUMN "public"."last_logins"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for market_strategies_value
-- ----------------------------
DROP TABLE IF EXISTS "public"."market_strategies_value";
CREATE TABLE "public"."market_strategies_value" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "cascade_all" bool NOT NULL DEFAULT false,
  "guarantee" varchar(255) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "guarantee_desc" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "ideal_customer" varchar(255) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "ideal_customer_desc" text COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::text,
  "name" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "proven_process" varchar(255) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "proven_process_desc" text COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::text,
  "team_id" uuid NOT NULL,
  "unique_value_proposition" varchar(255) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "sync_id" int4 NOT NULL,
  "company_id" uuid NOT NULL
)
;
ALTER TABLE "public"."market_strategies_value" OWNER TO "postgres";
COMMENT ON COLUMN "public"."market_strategies_value"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."market_strategies_value"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for meeting_agenda_sections
-- ----------------------------
DROP TABLE IF EXISTS "public"."meeting_agenda_sections";
CREATE TABLE "public"."meeting_agenda_sections" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "desc" varchar(5000) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::text,
  "duration" int4 NOT NULL,
  "meeting_agenda_id" uuid NOT NULL,
  "name" varchar(255) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "order" int4 NOT NULL DEFAULT 50000,
  "type" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "visible" bool NOT NULL DEFAULT true,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "sync_id" int4 NOT NULL,
  "embed_url" varchar(5000) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::text,
  "company_id" uuid NOT NULL
)
;
ALTER TABLE "public"."meeting_agenda_sections" OWNER TO "postgres";
COMMENT ON COLUMN "public"."meeting_agenda_sections"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."meeting_agenda_sections"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for meeting_agenda_statuses
-- ----------------------------
DROP TABLE IF EXISTS "public"."meeting_agenda_statuses";
CREATE TABLE "public"."meeting_agenda_statuses" (
  "id" varchar(255) COLLATE "pg_catalog"."default" NOT NULL DEFAULT gen_random_uuid(),
  "built_in" bool NOT NULL DEFAULT false,
  "color" varchar(7) COLLATE "pg_catalog"."default" NOT NULL DEFAULT '#888888'::character varying,
  "name" varchar(255) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "order" int4 NOT NULL DEFAULT 20000,
  "type" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "sync_id" int4 NOT NULL,
  "company_id" uuid NOT NULL
)
;
ALTER TABLE "public"."meeting_agenda_statuses" OWNER TO "postgres";
COMMENT ON COLUMN "public"."meeting_agenda_statuses"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."meeting_agenda_statuses"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for meeting_agenda_types
-- ----------------------------
DROP TABLE IF EXISTS "public"."meeting_agenda_types";
CREATE TABLE "public"."meeting_agenda_types" (
  "id" varchar(255) COLLATE "pg_catalog"."default" NOT NULL DEFAULT gen_random_uuid(),
  "name" varchar(255) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "order" int4 NOT NULL DEFAULT 20000,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "sync_id" int4 NOT NULL,
  "company_id" uuid NOT NULL
)
;
ALTER TABLE "public"."meeting_agenda_types" OWNER TO "postgres";
COMMENT ON COLUMN "public"."meeting_agenda_types"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."meeting_agenda_types"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for meeting_agendas
-- ----------------------------
DROP TABLE IF EXISTS "public"."meeting_agendas";
CREATE TABLE "public"."meeting_agendas" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "built_in" bool NOT NULL DEFAULT false,
  "desc" text COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::text,
  "meeting_agenda_status_id" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "meeting_repeats_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "name" varchar(512) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "team_id" uuid NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "sync_id" int4 NOT NULL,
  "copied_from_meeting_agenda_id" uuid,
  "company_id" uuid NOT NULL,
  "meeting_agenda_type_id" varchar(255) COLLATE "pg_catalog"."default" DEFAULT 'CUSTOM'::character varying,
  "scribe_user_id" uuid,
  "facilitator_user_id" uuid,
  "repeat_interval" int4 DEFAULT 1,
  "repeat_unit" text COLLATE "pg_catalog"."default" DEFAULT 'WEEK'::text,
  "selected_days" text COLLATE "pg_catalog"."default" DEFAULT ''::text
)
;
ALTER TABLE "public"."meeting_agendas" OWNER TO "postgres";
COMMENT ON COLUMN "public"."meeting_agendas"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."meeting_agendas"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for meeting_external_sync_infos
-- ----------------------------
DROP TABLE IF EXISTS "public"."meeting_external_sync_infos";
CREATE TABLE "public"."meeting_external_sync_infos" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "external_sync_info" text COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "sync_id" int4 NOT NULL,
  "company_id" uuid NOT NULL,
  "updated_at" timestamptz(6) NOT NULL
)
;
ALTER TABLE "public"."meeting_external_sync_infos" OWNER TO "postgres";
COMMENT ON COLUMN "public"."meeting_external_sync_infos"."updated_at" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for meeting_info_statuses
-- ----------------------------
DROP TABLE IF EXISTS "public"."meeting_info_statuses";
CREATE TABLE "public"."meeting_info_statuses" (
  "id" varchar(255) COLLATE "pg_catalog"."default" NOT NULL DEFAULT gen_random_uuid(),
  "built_in" bool NOT NULL DEFAULT false,
  "color" varchar(7) COLLATE "pg_catalog"."default" NOT NULL DEFAULT '#888888'::character varying,
  "name" varchar(255) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "order" int4 NOT NULL DEFAULT 20000,
  "type" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "sync_id" int4 NOT NULL,
  "company_id" uuid NOT NULL
)
;
ALTER TABLE "public"."meeting_info_statuses" OWNER TO "postgres";
COMMENT ON COLUMN "public"."meeting_info_statuses"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."meeting_info_statuses"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for meeting_infos
-- ----------------------------
DROP TABLE IF EXISTS "public"."meeting_infos";
CREATE TABLE "public"."meeting_infos" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "meeting_agenda_id" uuid NOT NULL,
  "meeting_info_status_id" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "meeting_repeats_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'NEVER'::character varying,
  "name" varchar(512) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "team_id" uuid NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "sync_id" int4 NOT NULL,
  "company_id" uuid NOT NULL,
  "desc" text COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::text,
  "owner_user_id" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  "is_bulk_update" bool DEFAULT false,
  "repeat_interval" int4 NOT NULL DEFAULT 1,
  "repeat_unit" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'WEEK'::character varying,
  "selected_days" varchar(255) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying
)
;
ALTER TABLE "public"."meeting_infos" OWNER TO "postgres";
COMMENT ON COLUMN "public"."meeting_infos"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."meeting_infos"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for meeting_ratings
-- ----------------------------
DROP TABLE IF EXISTS "public"."meeting_ratings";
CREATE TABLE "public"."meeting_ratings" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "is_absent" bool NOT NULL DEFAULT false,
  "meeting_id" uuid NOT NULL,
  "rating" int4 NOT NULL DEFAULT 0,
  "user_id" uuid NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "sync_id" int4 NOT NULL,
  "company_id" uuid NOT NULL
)
;
ALTER TABLE "public"."meeting_ratings" OWNER TO "postgres";
COMMENT ON COLUMN "public"."meeting_ratings"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."meeting_ratings"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for meeting_repeats
-- ----------------------------
DROP TABLE IF EXISTS "public"."meeting_repeats";
CREATE TABLE "public"."meeting_repeats" (
  "id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL,
  "display_order" int4 NOT NULL DEFAULT 20000,
  "name" varchar(512) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "sync_id" int4 NOT NULL
)
;
ALTER TABLE "public"."meeting_repeats" OWNER TO "postgres";

-- ----------------------------
-- Table structure for meeting_section_infos
-- ----------------------------
DROP TABLE IF EXISTS "public"."meeting_section_infos";
CREATE TABLE "public"."meeting_section_infos" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "time_spent" int4 NOT NULL,
  "meeting_id" uuid NOT NULL,
  "section_id" uuid NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "company_id" uuid NOT NULL,
  "sync_id" int4 NOT NULL,
  "duration" int4 NOT NULL DEFAULT 0
)
;
ALTER TABLE "public"."meeting_section_infos" OWNER TO "postgres";
COMMENT ON COLUMN "public"."meeting_section_infos"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."meeting_section_infos"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for meeting_statuses
-- ----------------------------
DROP TABLE IF EXISTS "public"."meeting_statuses";
CREATE TABLE "public"."meeting_statuses" (
  "id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT gen_random_uuid(),
  "built_in" bool NOT NULL DEFAULT false,
  "name" varchar(255) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "order" int4 NOT NULL DEFAULT 20000,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "sync_id" int4 NOT NULL,
  "company_id" uuid NOT NULL
)
;
ALTER TABLE "public"."meeting_statuses" OWNER TO "postgres";
COMMENT ON COLUMN "public"."meeting_statuses"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."meeting_statuses"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for meeting_summary_emails
-- ----------------------------
DROP TABLE IF EXISTS "public"."meeting_summary_emails";
CREATE TABLE "public"."meeting_summary_emails" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "meeting_id" uuid NOT NULL,
  "sent_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "recipient_count" int4 NOT NULL,
  "html_content" text COLLATE "pg_catalog"."default" NOT NULL,
  "review_status" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'Not reviewed'::character varying,
  "review_comments" text COLLATE "pg_catalog"."default",
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
)
;
ALTER TABLE "public"."meeting_summary_emails" OWNER TO "postgres";

-- ----------------------------
-- Table structure for meetings
-- ----------------------------
DROP TABLE IF EXISTS "public"."meetings";
CREATE TABLE "public"."meetings" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "average_rating" int4 NOT NULL DEFAULT 0,
  "date" timestamptz(6) NOT NULL,
  "end_time" timestamptz(6),
  "last_paused_at_time" timestamptz(6),
  "meeting_info_id" uuid NOT NULL,
  "meeting_status_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL,
  "send_recap_email" bool NOT NULL DEFAULT true,
  "start_time" timestamptz(6),
  "total_paused_time_in_secs" int4 NOT NULL DEFAULT 0,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "sync_id" int4 NOT NULL,
  "company_id" uuid NOT NULL,
  "facilitator_user_id" uuid,
  "scribe_user_id" uuid,
  "facilitator_section_id" uuid,
  "section_start_time" timestamptz(6)
)
;
ALTER TABLE "public"."meetings" OWNER TO "postgres";
COMMENT ON COLUMN "public"."meetings"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."meetings"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for milestone_statuses
-- ----------------------------
DROP TABLE IF EXISTS "public"."milestone_statuses";
CREATE TABLE "public"."milestone_statuses" (
  "id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT gen_random_uuid(),
  "color" varchar(7) COLLATE "pg_catalog"."default" NOT NULL DEFAULT '#888888'::character varying,
  "name" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "order" int4 NOT NULL DEFAULT 20000,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "sync_id" int4 NOT NULL
)
;
ALTER TABLE "public"."milestone_statuses" OWNER TO "postgres";
COMMENT ON COLUMN "public"."milestone_statuses"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."milestone_statuses"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for milestones
-- ----------------------------
DROP TABLE IF EXISTS "public"."milestones";
CREATE TABLE "public"."milestones" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "rock_id" uuid NOT NULL,
  "name" varchar(512) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "due_date" date NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "sync_id" int4 NOT NULL,
  "company_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "milestone_status_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'TODO'::character varying
)
;
ALTER TABLE "public"."milestones" OWNER TO "postgres";
COMMENT ON COLUMN "public"."milestones"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."milestones"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for notifications
-- ----------------------------
DROP TABLE IF EXISTS "public"."notifications";
CREATE TABLE "public"."notifications" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "actor_id" uuid NOT NULL,
  "type" text COLLATE "pg_catalog"."default" NOT NULL,
  "title" varchar(255) COLLATE "pg_catalog"."default",
  "message" text COLLATE "pg_catalog"."default",
  "entity_table" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "entity_id" uuid NOT NULL,
  "related_data" jsonb,
  "is_read" bool NOT NULL DEFAULT false,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "company_id" uuid NOT NULL,
  "sync_id" int4 DEFAULT 0,
  "created_at" timestamptz(6) DEFAULT now(),
  "updated_at" timestamptz(6) DEFAULT now()
)
;
ALTER TABLE "public"."notifications" OWNER TO "postgres";
COMMENT ON COLUMN "public"."notifications"."sync_id" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."notifications"."updated_at" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for org_chart_roles_responsibilities
-- ----------------------------
DROP TABLE IF EXISTS "public"."org_chart_roles_responsibilities";
CREATE TABLE "public"."org_chart_roles_responsibilities" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "description" varchar(5000) COLLATE "pg_catalog"."default",
  "name" varchar(512) COLLATE "pg_catalog"."default" NOT NULL,
  "order" int4 NOT NULL,
  "org_chart_seat_id" uuid NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "sync_id" int4 NOT NULL,
  "company_id" uuid NOT NULL
)
;
ALTER TABLE "public"."org_chart_roles_responsibilities" OWNER TO "postgres";
COMMENT ON COLUMN "public"."org_chart_roles_responsibilities"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."org_chart_roles_responsibilities"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for org_chart_seat_docs
-- ----------------------------
DROP TABLE IF EXISTS "public"."org_chart_seat_docs";
CREATE TABLE "public"."org_chart_seat_docs" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "org_chart_seat_id" uuid NOT NULL,
  "file_name" varchar(50) COLLATE "pg_catalog"."default" NOT NULL,
  "file_url" varchar(255) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "order" int4 NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "sync_id" int4 NOT NULL,
  "company_id" uuid NOT NULL
)
;
ALTER TABLE "public"."org_chart_seat_docs" OWNER TO "postgres";
COMMENT ON COLUMN "public"."org_chart_seat_docs"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."org_chart_seat_docs"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for org_chart_seats
-- ----------------------------
DROP TABLE IF EXISTS "public"."org_chart_seats";
CREATE TABLE "public"."org_chart_seats" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "name" varchar(512) COLLATE "pg_catalog"."default" NOT NULL,
  "parent_id" uuid NOT NULL,
  "org_chart_id" uuid NOT NULL,
  "order" int4 NOT NULL DEFAULT 20000,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "sync_id" int4 NOT NULL,
  "company_id" uuid NOT NULL,
  "holders" varchar(5000) COLLATE "pg_catalog"."default"
)
;
ALTER TABLE "public"."org_chart_seats" OWNER TO "postgres";
COMMENT ON COLUMN "public"."org_chart_seats"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."org_chart_seats"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for org_chart_shared_users
-- ----------------------------
DROP TABLE IF EXISTS "public"."org_chart_shared_users";
CREATE TABLE "public"."org_chart_shared_users" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "org_chart_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "sync_id" int4 NOT NULL,
  "company_id" uuid NOT NULL
)
;
ALTER TABLE "public"."org_chart_shared_users" OWNER TO "postgres";
COMMENT ON COLUMN "public"."org_chart_shared_users"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."org_chart_shared_users"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for org_charts
-- ----------------------------
DROP TABLE IF EXISTS "public"."org_charts";
CREATE TABLE "public"."org_charts" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "name" varchar(512) COLLATE "pg_catalog"."default" NOT NULL,
  "user_id" uuid NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "sync_id" int4 NOT NULL,
  "company_id" uuid NOT NULL,
  "description" text COLLATE "pg_catalog"."default",
  "is_primary_chart" int4 NOT NULL DEFAULT 0
)
;
ALTER TABLE "public"."org_charts" OWNER TO "postgres";
COMMENT ON COLUMN "public"."org_charts"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."org_charts"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for org_checkup_answers
-- ----------------------------
DROP TABLE IF EXISTS "public"."org_checkup_answers";
CREATE TABLE "public"."org_checkup_answers" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "org_checkup_id" uuid NOT NULL,
  "question_number" int4 NOT NULL,
  "score" int4 NOT NULL,
  "created_by_user_id" uuid NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "sync_id" int4 NOT NULL,
  "company_id" uuid NOT NULL,
  "is_final" bool NOT NULL DEFAULT true
)
;
ALTER TABLE "public"."org_checkup_answers" OWNER TO "postgres";
COMMENT ON COLUMN "public"."org_checkup_answers"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."org_checkup_answers"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for org_checkup_statuses
-- ----------------------------
DROP TABLE IF EXISTS "public"."org_checkup_statuses";
CREATE TABLE "public"."org_checkup_statuses" (
  "id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT gen_random_uuid(),
  "name" varchar(255) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "order" int4 NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "sync_id" int4 NOT NULL
)
;
ALTER TABLE "public"."org_checkup_statuses" OWNER TO "postgres";
COMMENT ON COLUMN "public"."org_checkup_statuses"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."org_checkup_statuses"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for org_checkups
-- ----------------------------
DROP TABLE IF EXISTS "public"."org_checkups";
CREATE TABLE "public"."org_checkups" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "total_score" int4,
  "org_checkup_status_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "sync_id" int4 NOT NULL,
  "company_id" uuid NOT NULL,
  "created_by_user_id" uuid NOT NULL,
  "allow_team_scoring" bool NOT NULL DEFAULT false
)
;
ALTER TABLE "public"."org_checkups" OWNER TO "postgres";
COMMENT ON COLUMN "public"."org_checkups"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."org_checkups"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for partner_companies
-- ----------------------------
DROP TABLE IF EXISTS "public"."partner_companies";
CREATE TABLE "public"."partner_companies" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "partner_id" uuid NOT NULL,
  "company_id" uuid NOT NULL,
  "sync_id" int4 NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying
)
;
ALTER TABLE "public"."partner_companies" OWNER TO "postgres";
COMMENT ON COLUMN "public"."partner_companies"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for partners
-- ----------------------------
DROP TABLE IF EXISTS "public"."partners";
CREATE TABLE "public"."partners" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "email" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "user_id" uuid NOT NULL,
  "company_id" uuid NOT NULL,
  "partnerstack_partner_key" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "sync_id" int4 NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying
)
;
ALTER TABLE "public"."partners" OWNER TO "postgres";
COMMENT ON COLUMN "public"."partners"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for people_analyzer_session_statuses
-- ----------------------------
DROP TABLE IF EXISTS "public"."people_analyzer_session_statuses";
CREATE TABLE "public"."people_analyzer_session_statuses" (
  "id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT gen_random_uuid(),
  "name" varchar(255) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "order" int4 NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "sync_id" int4 NOT NULL,
  "company_id" uuid NOT NULL
)
;
ALTER TABLE "public"."people_analyzer_session_statuses" OWNER TO "postgres";
COMMENT ON COLUMN "public"."people_analyzer_session_statuses"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."people_analyzer_session_statuses"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for people_analyzer_session_users
-- ----------------------------
DROP TABLE IF EXISTS "public"."people_analyzer_session_users";
CREATE TABLE "public"."people_analyzer_session_users" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "people_analyzer_session_id" uuid NOT NULL,
  "gets_it" bool,
  "wants_it" bool,
  "capacity" bool,
  "above_the_bar" bool,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "sync_id" int4 NOT NULL,
  "company_id" uuid NOT NULL
)
;
ALTER TABLE "public"."people_analyzer_session_users" OWNER TO "postgres";
COMMENT ON COLUMN "public"."people_analyzer_session_users"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."people_analyzer_session_users"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for people_analyzer_session_users_scores
-- ----------------------------
DROP TABLE IF EXISTS "public"."people_analyzer_session_users_scores";
CREATE TABLE "public"."people_analyzer_session_users_scores" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "people_analyzer_session_user_id" uuid NOT NULL,
  "core_value_id" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "score" int4 NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "sync_id" int4 NOT NULL,
  "company_id" uuid NOT NULL
)
;
ALTER TABLE "public"."people_analyzer_session_users_scores" OWNER TO "postgres";
COMMENT ON COLUMN "public"."people_analyzer_session_users_scores"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."people_analyzer_session_users_scores"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for people_analyzer_sessions
-- ----------------------------
DROP TABLE IF EXISTS "public"."people_analyzer_sessions";
CREATE TABLE "public"."people_analyzer_sessions" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "name" varchar(255) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "core_values" text COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::text,
  "people_analyzer_session_status_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "sync_id" int4 NOT NULL,
  "company_id" uuid NOT NULL,
  "created_by_user_id" uuid NOT NULL,
  "bar_plus" int4,
  "bar_plus_minus" int4
)
;
ALTER TABLE "public"."people_analyzer_sessions" OWNER TO "postgres";
COMMENT ON COLUMN "public"."people_analyzer_sessions"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."people_analyzer_sessions"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for previous_platforms
-- ----------------------------
DROP TABLE IF EXISTS "public"."previous_platforms";
CREATE TABLE "public"."previous_platforms" (
  "id" varchar(255) COLLATE "pg_catalog"."default" NOT NULL DEFAULT gen_random_uuid(),
  "name" varchar(255) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "company_id" uuid NOT NULL,
  "updated_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sync_id" int4 NOT NULL
)
;
ALTER TABLE "public"."previous_platforms" OWNER TO "postgres";
COMMENT ON COLUMN "public"."previous_platforms"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."previous_platforms"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for related_items
-- ----------------------------
DROP TABLE IF EXISTS "public"."related_items";
CREATE TABLE "public"."related_items" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "item_id" uuid NOT NULL,
  "item_type" varchar(100) COLLATE "pg_catalog"."default" NOT NULL,
  "related_item_id" uuid NOT NULL,
  "related_item_type" varchar(100) COLLATE "pg_catalog"."default" NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "company_id" uuid NOT NULL,
  "sync_id" int4 NOT NULL,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying
)
;
ALTER TABLE "public"."related_items" OWNER TO "postgres";
COMMENT ON COLUMN "public"."related_items"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for relation_types
-- ----------------------------
DROP TABLE IF EXISTS "public"."relation_types";
CREATE TABLE "public"."relation_types" (
  "id" varchar(100) COLLATE "pg_catalog"."default" NOT NULL,
  "table_name" varchar(100) COLLATE "pg_catalog"."default" NOT NULL,
  "sync_id" int4 NOT NULL
)
;
ALTER TABLE "public"."relation_types" OWNER TO "postgres";
COMMENT ON COLUMN "public"."relation_types"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for roadmap_item_votes
-- ----------------------------
DROP TABLE IF EXISTS "public"."roadmap_item_votes";
CREATE TABLE "public"."roadmap_item_votes" (
  "id" int4 NOT NULL DEFAULT nextval('roadmap_item_votes_id_seq'::regclass),
  "roadmap_item_id" int4 NOT NULL,
  "user_email" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "created_at" timestamptz(6) DEFAULT CURRENT_TIMESTAMP
)
;
ALTER TABLE "public"."roadmap_item_votes" OWNER TO "postgres";

-- ----------------------------
-- Table structure for roadmap_items
-- ----------------------------
DROP TABLE IF EXISTS "public"."roadmap_items";
CREATE TABLE "public"."roadmap_items" (
  "id" int4 NOT NULL DEFAULT nextval('roadmap_items_id_seq'::regclass),
  "phase_id" int4,
  "title" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "description" text COLLATE "pg_catalog"."default",
  "status" varchar(50) COLLATE "pg_catalog"."default" DEFAULT 'planned'::character varying,
  "display_order" int4 NOT NULL,
  "estimated_completion_date" date,
  "actual_completion_date" date,
  "is_featured" bool DEFAULT false,
  "is_public" bool DEFAULT true,
  "created_at" timestamptz(6) DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) DEFAULT CURRENT_TIMESTAMP,
  "blog_link" varchar(500) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying
)
;
ALTER TABLE "public"."roadmap_items" OWNER TO "postgres";

-- ----------------------------
-- Table structure for roadmap_phases
-- ----------------------------
DROP TABLE IF EXISTS "public"."roadmap_phases";
CREATE TABLE "public"."roadmap_phases" (
  "id" int4 NOT NULL DEFAULT nextval('roadmap_phases_id_seq'::regclass),
  "name" varchar(100) COLLATE "pg_catalog"."default" NOT NULL,
  "description" text COLLATE "pg_catalog"."default",
  "display_order" int4 NOT NULL,
  "color" varchar(20) COLLATE "pg_catalog"."default",
  "created_at" timestamptz(6) DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) DEFAULT CURRENT_TIMESTAMP
)
;
ALTER TABLE "public"."roadmap_phases" OWNER TO "postgres";

-- ----------------------------
-- Table structure for rock_files
-- ----------------------------
DROP TABLE IF EXISTS "public"."rock_files";
CREATE TABLE "public"."rock_files" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "rock_id" uuid NOT NULL,
  "uploaded_file_url" text COLLATE "pg_catalog"."default" NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "company_id" uuid NOT NULL,
  "sync_id" int4 NOT NULL DEFAULT 1
)
;
ALTER TABLE "public"."rock_files" OWNER TO "postgres";
COMMENT ON COLUMN "public"."rock_files"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."rock_files"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for rock_statuses
-- ----------------------------
DROP TABLE IF EXISTS "public"."rock_statuses";
CREATE TABLE "public"."rock_statuses" (
  "id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT gen_random_uuid(),
  "built_in" bool NOT NULL DEFAULT false,
  "color" varchar(7) COLLATE "pg_catalog"."default" NOT NULL DEFAULT '#888888'::character varying,
  "name" varchar(255) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "order" int4 NOT NULL DEFAULT 20000,
  "type" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "sync_id" int4 NOT NULL,
  "company_id" uuid NOT NULL
)
;
ALTER TABLE "public"."rock_statuses" OWNER TO "postgres";
COMMENT ON COLUMN "public"."rock_statuses"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."rock_statuses"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for rocks
-- ----------------------------
DROP TABLE IF EXISTS "public"."rocks";
CREATE TABLE "public"."rocks" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "desc" text COLLATE "pg_catalog"."default" NOT NULL,
  "due_date" date NOT NULL,
  "name" varchar(512) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "rock_status_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL,
  "status_updated_at" timestamptz(6) NOT NULL,
  "type" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "user_id" uuid NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "sync_id" int4 NOT NULL,
  "company_id" uuid NOT NULL
)
;
ALTER TABLE "public"."rocks" OWNER TO "postgres";
COMMENT ON COLUMN "public"."rocks"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."rocks"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for service_api_translations
-- ----------------------------
DROP TABLE IF EXISTS "public"."service_api_translations";
CREATE TABLE "public"."service_api_translations" (
  "id" text COLLATE "pg_catalog"."default" NOT NULL,
  "de" text COLLATE "pg_catalog"."default",
  "es" text COLLATE "pg_catalog"."default",
  "fr" text COLLATE "pg_catalog"."default",
  "it" text COLLATE "pg_catalog"."default",
  "ja" text COLLATE "pg_catalog"."default",
  "nl" text COLLATE "pg_catalog"."default",
  "pt" text COLLATE "pg_catalog"."default",
  "sv" text COLLATE "pg_catalog"."default",
  "zh" text COLLATE "pg_catalog"."default"
)
;
ALTER TABLE "public"."service_api_translations" OWNER TO "postgres";

-- ----------------------------
-- Table structure for states
-- ----------------------------
DROP TABLE IF EXISTS "public"."states";
CREATE TABLE "public"."states" (
  "id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT gen_random_uuid(),
  "display_order" int2 NOT NULL DEFAULT 2000,
  "name" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "sync_id" int4 NOT NULL,
  "company_id" uuid NOT NULL
)
;
ALTER TABLE "public"."states" OWNER TO "postgres";
COMMENT ON COLUMN "public"."states"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."states"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for stripe_customers
-- ----------------------------
DROP TABLE IF EXISTS "public"."stripe_customers";
CREATE TABLE "public"."stripe_customers" (
  "company_id" uuid NOT NULL,
  "stripe_customer_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "email" varchar(255) COLLATE "pg_catalog"."default",
  "name" varchar(255) COLLATE "pg_catalog"."default",
  "balance" int4,
  "currency" varchar(3) COLLATE "pg_catalog"."default",
  "delinquent" bool,
  "livemode" bool,
  "phone" varchar(20) COLLATE "pg_catalog"."default",
  "tax_exempt" varchar(10) COLLATE "pg_catalog"."default",
  "city" varchar(255) COLLATE "pg_catalog"."default",
  "country" varchar(2) COLLATE "pg_catalog"."default",
  "line1" varchar(255) COLLATE "pg_catalog"."default",
  "line2" varchar(255) COLLATE "pg_catalog"."default",
  "postal_code" varchar(20) COLLATE "pg_catalog"."default",
  "state" varchar(255) COLLATE "pg_catalog"."default",
  "default_payment_method" varchar(50) COLLATE "pg_catalog"."default",
  "tax_country" varchar(2) COLLATE "pg_catalog"."default",
  "tax_type" varchar(50) COLLATE "pg_catalog"."default",
  "tax_value" varchar(255) COLLATE "pg_catalog"."default",
  "sync_id" int4,
  "id" uuid NOT NULL DEFAULT gen_random_uuid()
)
;
ALTER TABLE "public"."stripe_customers" OWNER TO "postgres";
COMMENT ON COLUMN "public"."stripe_customers"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for stripe_subscriptions
-- ----------------------------
DROP TABLE IF EXISTS "public"."stripe_subscriptions";
CREATE TABLE "public"."stripe_subscriptions" (
  "id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL,
  "stripe_customer_id" varchar(50) COLLATE "pg_catalog"."default",
  "status" varchar(50) COLLATE "pg_catalog"."default",
  "current_period_start" timestamptz(6),
  "current_period_end" timestamptz(6),
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "billing_cycle_anchor" timestamptz(6),
  "cancel_at_period_end" bool,
  "canceled_at" timestamptz(6),
  "default_payment_method" varchar(50) COLLATE "pg_catalog"."default",
  "trial_start" timestamptz(6),
  "trial_end" timestamptz(6),
  "quantity" int2 DEFAULT 1,
  "plan_id" varchar(50) COLLATE "pg_catalog"."default",
  "plan_amount" int4,
  "plan_billing_scheme" varchar(50) COLLATE "pg_catalog"."default",
  "plan_currency" varchar(3) COLLATE "pg_catalog"."default",
  "plan_interval" varchar(10) COLLATE "pg_catalog"."default",
  "plan_interval_count" int2,
  "plan_product" varchar(50) COLLATE "pg_catalog"."default",
  "sync_id" int4 NOT NULL,
  "company_id" uuid,
  "product_name" varchar(255) COLLATE "pg_catalog"."default"
)
;
ALTER TABLE "public"."stripe_subscriptions" OWNER TO "postgres";
COMMENT ON COLUMN "public"."stripe_subscriptions"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for swot_items
-- ----------------------------
DROP TABLE IF EXISTS "public"."swot_items";
CREATE TABLE "public"."swot_items" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "name" varchar(512) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "category" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'STRENGTH'::character varying,
  "display_order" int4 NOT NULL,
  "team_id" uuid NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "sync_id" int4 NOT NULL,
  "company_id" uuid NOT NULL
)
;
ALTER TABLE "public"."swot_items" OWNER TO "postgres";
COMMENT ON COLUMN "public"."swot_items"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."swot_items"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for sync
-- ----------------------------
DROP TABLE IF EXISTS "public"."sync";
CREATE TABLE "public"."sync" (
  "sync_id" int4 NOT NULL,
  "updated_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "company_id" uuid NOT NULL
)
;
ALTER TABLE "public"."sync" OWNER TO "postgres";
COMMENT ON COLUMN "public"."sync"."sync_id" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."sync"."updated_at" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for tags
-- ----------------------------
DROP TABLE IF EXISTS "public"."tags";
CREATE TABLE "public"."tags" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "name" varchar COLLATE "pg_catalog"."default" NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "sync_id" int4 NOT NULL,
  "company_id" uuid NOT NULL
)
;
ALTER TABLE "public"."tags" OWNER TO "postgres";
COMMENT ON COLUMN "public"."tags"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."tags"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for teams
-- ----------------------------
DROP TABLE IF EXISTS "public"."teams";
CREATE TABLE "public"."teams" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "color" varchar(7) COLLATE "pg_catalog"."default" NOT NULL DEFAULT '#775599'::character varying,
  "desc" text COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "name" varchar(512) COLLATE "pg_catalog"."default" NOT NULL,
  "is_leadership" bool NOT NULL DEFAULT false,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "sync_id" int4 NOT NULL,
  "company_id" uuid NOT NULL,
  "badge_url" varchar(255) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "first_day_of_week" int2 DEFAULT 1
)
;
ALTER TABLE "public"."teams" OWNER TO "postgres";
COMMENT ON COLUMN "public"."teams"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."teams"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for teams_on_data_fields
-- ----------------------------
DROP TABLE IF EXISTS "public"."teams_on_data_fields";
CREATE TABLE "public"."teams_on_data_fields" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "team_id" uuid NOT NULL,
  "data_field_id" uuid NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "sync_id" int4 NOT NULL,
  "company_id" uuid NOT NULL
)
;
ALTER TABLE "public"."teams_on_data_fields" OWNER TO "postgres";
COMMENT ON COLUMN "public"."teams_on_data_fields"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."teams_on_data_fields"."sync_id" IS '@omit create,update,delete';
COMMENT ON TABLE "public"."teams_on_data_fields" IS 'pivot:team';

-- ----------------------------
-- Table structure for teams_on_rocks
-- ----------------------------
DROP TABLE IF EXISTS "public"."teams_on_rocks";
CREATE TABLE "public"."teams_on_rocks" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "team_id" uuid NOT NULL,
  "rock_id" uuid NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "sync_id" int4 NOT NULL,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "company_id" uuid NOT NULL
)
;
ALTER TABLE "public"."teams_on_rocks" OWNER TO "postgres";
COMMENT ON COLUMN "public"."teams_on_rocks"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."teams_on_rocks"."sync_id" IS '@omit create,update,delete';
COMMENT ON TABLE "public"."teams_on_rocks" IS 'pivot:team';

-- ----------------------------
-- Table structure for testimonials
-- ----------------------------
DROP TABLE IF EXISTS "public"."testimonials";
CREATE TABLE "public"."testimonials" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "testimonial" text COLLATE "pg_catalog"."default" NOT NULL,
  "published" bool NOT NULL DEFAULT false,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "sync_id" int4 NOT NULL,
  "company_id" uuid NOT NULL
)
;
ALTER TABLE "public"."testimonials" OWNER TO "postgres";

-- ----------------------------
-- Table structure for todo_external_sync_infos
-- ----------------------------
DROP TABLE IF EXISTS "public"."todo_external_sync_infos";
CREATE TABLE "public"."todo_external_sync_infos" (
  "id" uuid NOT NULL,
  "external_sync_info" text COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "sync_id" int4 NOT NULL,
  "company_id" uuid NOT NULL,
  "updated_at" timestamptz(6) NOT NULL,
  "external_sync_updated_at" timestamptz(6) NOT NULL
)
;
ALTER TABLE "public"."todo_external_sync_infos" OWNER TO "postgres";

-- ----------------------------
-- Table structure for todo_files
-- ----------------------------
DROP TABLE IF EXISTS "public"."todo_files";
CREATE TABLE "public"."todo_files" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "todo_id" uuid NOT NULL,
  "uploaded_file_url" text COLLATE "pg_catalog"."default" NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "company_id" uuid NOT NULL,
  "sync_id" int4 NOT NULL DEFAULT 1
)
;
ALTER TABLE "public"."todo_files" OWNER TO "postgres";
COMMENT ON COLUMN "public"."todo_files"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."todo_files"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for todo_statuses
-- ----------------------------
DROP TABLE IF EXISTS "public"."todo_statuses";
CREATE TABLE "public"."todo_statuses" (
  "id" varchar(255) COLLATE "pg_catalog"."default" NOT NULL DEFAULT gen_random_uuid(),
  "built_in" bool NOT NULL DEFAULT false,
  "color" varchar(7) COLLATE "pg_catalog"."default" NOT NULL DEFAULT '#888888'::character varying,
  "name" varchar(255) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "order" int4 NOT NULL DEFAULT 20000,
  "type" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "sync_id" int4 NOT NULL,
  "company_id" uuid NOT NULL
)
;
ALTER TABLE "public"."todo_statuses" OWNER TO "postgres";
COMMENT ON COLUMN "public"."todo_statuses"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."todo_statuses"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for todos
-- ----------------------------
DROP TABLE IF EXISTS "public"."todos";
CREATE TABLE "public"."todos" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "desc" text COLLATE "pg_catalog"."default" NOT NULL,
  "name" varchar(512) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "priority_no" int4 NOT NULL,
  "status_updated_at" timestamptz(6) NOT NULL,
  "team_id" uuid NOT NULL,
  "todo_status_id" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "type" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "sync_id" int4 NOT NULL,
  "company_id" uuid NOT NULL,
  "meeting_id" uuid,
  "due_date" date,
  "order" int4 NOT NULL DEFAULT 5000,
  "user_id" uuid
)
;
ALTER TABLE "public"."todos" OWNER TO "postgres";
COMMENT ON COLUMN "public"."todos"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."todos"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for translation_suggestion_statuses
-- ----------------------------
DROP TABLE IF EXISTS "public"."translation_suggestion_statuses";
CREATE TABLE "public"."translation_suggestion_statuses" (
  "id" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "name" varchar(50) COLLATE "pg_catalog"."default" NOT NULL,
  "order" int4 NOT NULL DEFAULT 20000,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying
)
;
ALTER TABLE "public"."translation_suggestion_statuses" OWNER TO "postgres";

-- ----------------------------
-- Table structure for translation_suggestions
-- ----------------------------
DROP TABLE IF EXISTS "public"."translation_suggestions";
CREATE TABLE "public"."translation_suggestions" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "source_language" varchar(10) COLLATE "pg_catalog"."default" NOT NULL,
  "target_language" varchar(10) COLLATE "pg_catalog"."default" NOT NULL,
  "translation_key" text COLLATE "pg_catalog"."default" NOT NULL,
  "suggested_translation" text COLLATE "pg_catalog"."default" NOT NULL,
  "translation_suggestion_status_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'PENDING'::character varying,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
)
;
ALTER TABLE "public"."translation_suggestions" OWNER TO "postgres";

-- ----------------------------
-- Table structure for user_api_keys
-- ----------------------------
DROP TABLE IF EXISTS "public"."user_api_keys";
CREATE TABLE "public"."user_api_keys" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "name" varchar(50) COLLATE "pg_catalog"."default" NOT NULL,
  "key" varchar(50) COLLATE "pg_catalog"."default" NOT NULL,
  "label" varchar(255) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_used_at" timestamptz(6),
  "revoked" bool NOT NULL DEFAULT false
)
;
ALTER TABLE "public"."user_api_keys" OWNER TO "postgres";
COMMENT ON COLUMN "public"."user_api_keys"."key" IS '@omit';

-- ----------------------------
-- Table structure for user_permissions
-- ----------------------------
DROP TABLE IF EXISTS "public"."user_permissions";
CREATE TABLE "public"."user_permissions" (
  "id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT gen_random_uuid(),
  "desc" varchar(255) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::text,
  "display_order" int2 DEFAULT 9999,
  "name" varchar(255) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "sync_id" int4 NOT NULL,
  "level" int2 NOT NULL DEFAULT 20000
)
;
ALTER TABLE "public"."user_permissions" OWNER TO "postgres";
COMMENT ON COLUMN "public"."user_permissions"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."user_permissions"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for user_reactions
-- ----------------------------
DROP TABLE IF EXISTS "public"."user_reactions";
CREATE TABLE "public"."user_reactions" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "comment_id" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "reactions" text COLLATE "pg_catalog"."default" NOT NULL DEFAULT '[]'::text,
  "company_id" uuid NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sync_id" int4 NOT NULL
)
;
ALTER TABLE "public"."user_reactions" OWNER TO "postgres";
COMMENT ON COLUMN "public"."user_reactions"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."user_reactions"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for user_statuses
-- ----------------------------
DROP TABLE IF EXISTS "public"."user_statuses";
CREATE TABLE "public"."user_statuses" (
  "id" varchar(255) COLLATE "pg_catalog"."default" NOT NULL DEFAULT gen_random_uuid(),
  "built_in" bool NOT NULL DEFAULT false,
  "name" varchar(255) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "order" int4 NOT NULL DEFAULT 20000,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "sync_id" int4 NOT NULL,
  "company_id" uuid NOT NULL
)
;
ALTER TABLE "public"."user_statuses" OWNER TO "postgres";
COMMENT ON COLUMN "public"."user_statuses"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."user_statuses"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for users
-- ----------------------------
DROP TABLE IF EXISTS "public"."users";
CREATE TABLE "public"."users" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "avatar" varchar(255) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "desc" text COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "email" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "first_name" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "invite_was_sent" bool NOT NULL DEFAULT false,
  "job_title" varchar(255) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "language_id" varchar(2) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'en'::character varying,
  "last_name" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "user_name" varchar COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "user_permission_id" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "user_status_id" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "sync_id" int4 NOT NULL,
  "company_id" uuid NOT NULL,
  "first_day_of_week" int2 NOT NULL DEFAULT 1,
  "time_zone" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'Europe/Dublin'::character varying,
  "integration_google_calendar_setup" bool NOT NULL DEFAULT false,
  "integration_google_calendar_tokens" text COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::text,
  "integration_microsoft_calendar_setup" bool NOT NULL DEFAULT false,
  "integration_microsoft_calendar_tokens" text COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::text,
  "show_welcome_message" bool NOT NULL DEFAULT true,
  "color" varchar(7) COLLATE "pg_catalog"."default"
)
;
ALTER TABLE "public"."users" OWNER TO "postgres";
COMMENT ON COLUMN "public"."users"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."users"."sync_id" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."users"."integration_google_calendar_tokens" IS '@omit';
COMMENT ON COLUMN "public"."users"."integration_microsoft_calendar_tokens" IS '@omit';

-- ----------------------------
-- Table structure for users_on_teams
-- ----------------------------
DROP TABLE IF EXISTS "public"."users_on_teams";
CREATE TABLE "public"."users_on_teams" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "team_id" uuid NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "sync_id" int4 NOT NULL,
  "company_id" uuid NOT NULL
)
;
ALTER TABLE "public"."users_on_teams" OWNER TO "postgres";
COMMENT ON COLUMN "public"."users_on_teams"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."users_on_teams"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for vision_core_focus_types
-- ----------------------------
DROP TABLE IF EXISTS "public"."vision_core_focus_types";
CREATE TABLE "public"."vision_core_focus_types" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "cascade_all" bool NOT NULL DEFAULT false,
  "desc" text COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::text,
  "name" varchar(512) COLLATE "pg_catalog"."default" NOT NULL,
  "vision_id" uuid,
  "type" varchar(50) COLLATE "pg_catalog"."default" NOT NULL,
  "src" varchar(5000) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::text,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "sync_id" int4 NOT NULL,
  "company_id" uuid NOT NULL,
  "core_focus_name" varchar(255) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::text
)
;
ALTER TABLE "public"."vision_core_focus_types" OWNER TO "postgres";
COMMENT ON COLUMN "public"."vision_core_focus_types"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."vision_core_focus_types"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for vision_core_value_details
-- ----------------------------
DROP TABLE IF EXISTS "public"."vision_core_value_details";
CREATE TABLE "public"."vision_core_value_details" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "cascade_all" bool NOT NULL DEFAULT false,
  "desc" varchar(5000) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::text,
  "name" varchar(512) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "type" varchar(255) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "vision_core_value_id" uuid NOT NULL,
  "position" int2 NOT NULL DEFAULT 20000,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "sync_id" int4 NOT NULL,
  "company_id" uuid NOT NULL
)
;
ALTER TABLE "public"."vision_core_value_details" OWNER TO "postgres";
COMMENT ON COLUMN "public"."vision_core_value_details"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."vision_core_value_details"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for vision_core_values
-- ----------------------------
DROP TABLE IF EXISTS "public"."vision_core_values";
CREATE TABLE "public"."vision_core_values" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "cascade_all" bool NOT NULL DEFAULT false,
  "name" varchar(512) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "vision_id" uuid,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "sync_id" int4 NOT NULL,
  "company_id" uuid NOT NULL
)
;
ALTER TABLE "public"."vision_core_values" OWNER TO "postgres";
COMMENT ON COLUMN "public"."vision_core_values"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."vision_core_values"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for vision_display_layouts
-- ----------------------------
DROP TABLE IF EXISTS "public"."vision_display_layouts";
CREATE TABLE "public"."vision_display_layouts" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "comp" varchar(50) COLLATE "pg_catalog"."default" NOT NULL,
  "layout" varchar(50) COLLATE "pg_catalog"."default" NOT NULL,
  "page" varchar(50) COLLATE "pg_catalog"."default" NOT NULL,
  "srno" int4 NOT NULL,
  "vision_id" uuid,
  "user_id" uuid NOT NULL,
  "visibility" varchar(50) COLLATE "pg_catalog"."default" NOT NULL,
  "w" int4 NOT NULL,
  "h" int4 NOT NULL,
  "x" int4 NOT NULL,
  "y" int4 NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "sync_id" int4 NOT NULL,
  "company_id" uuid NOT NULL,
  "custom_focus_ids" text COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::text
)
;
ALTER TABLE "public"."vision_display_layouts" OWNER TO "postgres";
COMMENT ON COLUMN "public"."vision_display_layouts"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."vision_display_layouts"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for vision_goal_details
-- ----------------------------
DROP TABLE IF EXISTS "public"."vision_goal_details";
CREATE TABLE "public"."vision_goal_details" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "name" varchar(512) COLLATE "pg_catalog"."default" NOT NULL,
  "position" int4 NOT NULL DEFAULT 2000,
  "status" bool NOT NULL DEFAULT true,
  "vision_three_year_goal_id" uuid NOT NULL,
  "vision_id" uuid,
  "type" varchar(50) COLLATE "pg_catalog"."default" NOT NULL,
  "desc" text COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::text,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "sync_id" int4 NOT NULL,
  "company_id" uuid NOT NULL
)
;
ALTER TABLE "public"."vision_goal_details" OWNER TO "postgres";
COMMENT ON COLUMN "public"."vision_goal_details"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."vision_goal_details"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for vision_goal_doc_details
-- ----------------------------
DROP TABLE IF EXISTS "public"."vision_goal_doc_details";
CREATE TABLE "public"."vision_goal_doc_details" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "vision_goal_detail_id" uuid NOT NULL,
  "fileName" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "position" int2 NOT NULL DEFAULT 20000,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL,
  "sync_id" int4 NOT NULL,
  "company_id" uuid NOT NULL,
  "file_url" varchar(255) COLLATE "pg_catalog"."default" NOT NULL
)
;
ALTER TABLE "public"."vision_goal_doc_details" OWNER TO "postgres";
COMMENT ON COLUMN "public"."vision_goal_doc_details"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."vision_goal_doc_details"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for vision_histories
-- ----------------------------
DROP TABLE IF EXISTS "public"."vision_histories";
CREATE TABLE "public"."vision_histories" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "name" varchar(512) COLLATE "pg_catalog"."default" NOT NULL,
  "team_id" uuid NOT NULL,
  "vision_id" uuid,
  "user_id" uuid NOT NULL,
  "vision_history_comments" text COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::text,
  "vision_history_core_focus_types" text COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::text,
  "vision_history_core_value_details" text COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::text,
  "vision_history_core_values" text COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::text,
  "vision_history_display_layouts" text COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::text,
  "vision_history_data_fields" text COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::text,
  "vision_history_data_values" text COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::text,
  "vision_history_goal_details" text COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::text,
  "vision_history_issues" text COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::text,
  "vision_history_issue_values" text COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::text,
  "vision_history_kpis_on_three_year_goals" text COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::text,
  "vision_history_goal_doc_details" text COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::text,
  "vision_history_market_strategies" text COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::text,
  "vision_history_market_strategies_doc_details" text COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::text,
  "vision_history_market_strategies_unique_details" text COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::text,
  "vision_history_profit_revenue_details" text COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::text,
  "vision_history_rocks" text COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::text,
  "vision_history_three_year_goals" text COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::text,
  "position" int2 NOT NULL DEFAULT 20000,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "sync_id" int4 NOT NULL,
  "company_id" uuid NOT NULL,
  "is_current_version" int4 NOT NULL DEFAULT 0
)
;
ALTER TABLE "public"."vision_histories" OWNER TO "postgres";
COMMENT ON COLUMN "public"."vision_histories"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."vision_histories"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for vision_issues
-- ----------------------------
DROP TABLE IF EXISTS "public"."vision_issues";
CREATE TABLE "public"."vision_issues" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "cascade_all" bool NOT NULL DEFAULT false,
  "name" varchar(512) COLLATE "pg_catalog"."default" NOT NULL,
  "vision_id" uuid,
  "team_id" uuid NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "sync_id" int4 NOT NULL,
  "company_id" uuid NOT NULL
)
;
ALTER TABLE "public"."vision_issues" OWNER TO "postgres";
COMMENT ON COLUMN "public"."vision_issues"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."vision_issues"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for vision_kpis_on_three_year_goals
-- ----------------------------
DROP TABLE IF EXISTS "public"."vision_kpis_on_three_year_goals";
CREATE TABLE "public"."vision_kpis_on_three_year_goals" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "data_field_id" uuid NOT NULL,
  "data_val" varchar(255) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::character varying,
  "vision_three_year_goal_id" uuid NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "sync_id" int4 NOT NULL,
  "company_id" uuid NOT NULL
)
;
ALTER TABLE "public"."vision_kpis_on_three_year_goals" OWNER TO "postgres";
COMMENT ON COLUMN "public"."vision_kpis_on_three_year_goals"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."vision_kpis_on_three_year_goals"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for vision_market_strategies
-- ----------------------------
DROP TABLE IF EXISTS "public"."vision_market_strategies";
CREATE TABLE "public"."vision_market_strategies" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "cascade_all" bool NOT NULL DEFAULT false,
  "guarantee" varchar(512) COLLATE "pg_catalog"."default" NOT NULL,
  "guarantee_desc" varchar(5000) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::text,
  "ideal_customer" varchar(512) COLLATE "pg_catalog"."default" NOT NULL,
  "ideal_customer_desc" varchar(5000) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::text,
  "name" varchar(512) COLLATE "pg_catalog"."default" NOT NULL,
  "proven_process" varchar(512) COLLATE "pg_catalog"."default" NOT NULL,
  "proven_process_desc" varchar(5000) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::text,
  "vision_id" uuid,
  "unique_value_proposition" varchar(5000) COLLATE "pg_catalog"."default" NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "sync_id" int4 NOT NULL,
  "company_id" uuid NOT NULL,
  "show_proven_process" bool NOT NULL DEFAULT true,
  "show_guarantee" bool NOT NULL DEFAULT true,
  "is_custom" int4 NOT NULL DEFAULT 0
)
;
ALTER TABLE "public"."vision_market_strategies" OWNER TO "postgres";
COMMENT ON COLUMN "public"."vision_market_strategies"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."vision_market_strategies"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for vision_market_strategies_doc_details
-- ----------------------------
DROP TABLE IF EXISTS "public"."vision_market_strategies_doc_details";
CREATE TABLE "public"."vision_market_strategies_doc_details" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "vision_market_strategy_id" uuid NOT NULL,
  "fileName" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "position" int2 NOT NULL DEFAULT 20000,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "sync_id" int4 NOT NULL,
  "company_id" uuid NOT NULL,
  "file_url" varchar(255) COLLATE "pg_catalog"."default" NOT NULL
)
;
ALTER TABLE "public"."vision_market_strategies_doc_details" OWNER TO "postgres";
COMMENT ON COLUMN "public"."vision_market_strategies_doc_details"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."vision_market_strategies_doc_details"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for vision_market_strategies_unique_details
-- ----------------------------
DROP TABLE IF EXISTS "public"."vision_market_strategies_unique_details";
CREATE TABLE "public"."vision_market_strategies_unique_details" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "vision_market_strategy_id" uuid NOT NULL,
  "name" varchar(512) COLLATE "pg_catalog"."default" NOT NULL,
  "desc" varchar(5000) COLLATE "pg_catalog"."default" NOT NULL,
  "position" int2 NOT NULL DEFAULT 20000,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "sync_id" int4 NOT NULL,
  "company_id" uuid NOT NULL
)
;
ALTER TABLE "public"."vision_market_strategies_unique_details" OWNER TO "postgres";
COMMENT ON COLUMN "public"."vision_market_strategies_unique_details"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."vision_market_strategies_unique_details"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for vision_profit_revenue_details
-- ----------------------------
DROP TABLE IF EXISTS "public"."vision_profit_revenue_details";
CREATE TABLE "public"."vision_profit_revenue_details" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "vision_three_year_goal_id" uuid NOT NULL,
  "vision_id" uuid,
  "entity" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "type" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "value" varchar(255) COLLATE "pg_catalog"."default" NOT NULL,
  "desc" varchar(5000) COLLATE "pg_catalog"."default" NOT NULL DEFAULT ''::text,
  "position" int2 NOT NULL DEFAULT 20000,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL,
  "sync_id" int4 NOT NULL,
  "company_id" uuid NOT NULL
)
;
ALTER TABLE "public"."vision_profit_revenue_details" OWNER TO "postgres";
COMMENT ON COLUMN "public"."vision_profit_revenue_details"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."vision_profit_revenue_details"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for vision_three_year_goals
-- ----------------------------
DROP TABLE IF EXISTS "public"."vision_three_year_goals";
CREATE TABLE "public"."vision_three_year_goals" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "cascade_all" bool NOT NULL DEFAULT false,
  "future_date" date NOT NULL,
  "name" varchar(512) COLLATE "pg_catalog"."default" NOT NULL,
  "vision_id" uuid,
  "type" varchar(50) COLLATE "pg_catalog"."default" NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "sync_id" int4 NOT NULL,
  "company_id" uuid NOT NULL
)
;
ALTER TABLE "public"."vision_three_year_goals" OWNER TO "postgres";
COMMENT ON COLUMN "public"."vision_three_year_goals"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."vision_three_year_goals"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Table structure for visions
-- ----------------------------
DROP TABLE IF EXISTS "public"."visions";
CREATE TABLE "public"."visions" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "team_id" uuid NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL,
  "state_id" varchar(50) COLLATE "pg_catalog"."default" NOT NULL DEFAULT 'ACTIVE'::character varying,
  "sync_id" int4 NOT NULL,
  "company_id" uuid NOT NULL,
  "is_leadership" bool NOT NULL DEFAULT false
)
;
ALTER TABLE "public"."visions" OWNER TO "postgres";
COMMENT ON COLUMN "public"."visions"."updated_at" IS '@omit create,update,delete';
COMMENT ON COLUMN "public"."visions"."sync_id" IS '@omit create,update,delete';

-- ----------------------------
-- Function structure for allcompaniesforuser
-- ----------------------------
DROP FUNCTION IF EXISTS "public"."allcompaniesforuser"("user_email" text);
CREATE FUNCTION "public"."allcompaniesforuser"("user_email" text)
  RETURNS "pg_catalog"."_uuid" AS $BODY$
DECLARE
    company_ids UUID[];
BEGIN
    -- Query to fetch company IDs for the given email
    SELECT ARRAY_AGG(c.id)
    INTO company_ids
    FROM users u
    JOIN companies c ON c.id = u.company_id
    WHERE u.email = user_email;

    -- Return the array of company IDs
    RETURN company_ids;
END;
$BODY$
  LANGUAGE plpgsql VOLATILE SECURITY DEFINER
  COST 100;
ALTER FUNCTION "public"."allcompaniesforuser"("user_email" text) OWNER TO "postgres";

-- ----------------------------
-- Function structure for copy_meeting_agendas
-- ----------------------------
DROP FUNCTION IF EXISTS "public"."copy_meeting_agendas"("source_team_id" uuid, "target_team_id" uuid, "lang_code" varchar);
CREATE FUNCTION "public"."copy_meeting_agendas"("source_team_id" uuid, "target_team_id" uuid, "lang_code" varchar='en'::character varying)
  RETURNS "pg_catalog"."void" AS $BODY$
DECLARE
    target_company_id uuid;
    new_agenda_id uuid;
    new_section_id uuid;
    agenda_record meeting_agendas%ROWTYPE;
    section_record meeting_agenda_sections%ROWTYPE;
  	final_name TEXT;
    final_desc TEXT;
    final_section_name TEXT;
    final_section_desc TEXT;
BEGIN
    -- Get the company_id for the target team
    SELECT company_id INTO target_company_id
    FROM teams
    WHERE id = target_team_id;

    -- Ensure the target team exists and has a valid company_id
    IF target_company_id IS NULL THEN
        RAISE EXCEPTION 'Invalid target team ID';
    END IF;

    -- Loop through all active, built-in meeting agendas for the source team
    FOR agenda_record IN
        SELECT *
        FROM meeting_agendas
        WHERE team_id = source_team_id
          AND built_in = true
          AND state_id = 'ACTIVE'
    LOOP
		-- Translate agenda name and description
		SELECT get_translated_text(agenda_record.name, lang_code) INTO final_name;
		SELECT get_translated_text(agenda_record.desc, lang_code) INTO final_desc;

        -- Insert the copied meeting agenda for the target team, with copied_from_meeting_agenda_id set to source agenda id
        INSERT INTO meeting_agendas (
            built_in, "desc", meeting_agenda_status_id, meeting_repeats_id,
            name, team_id, created_at, updated_at, state_id, sync_id,
            company_id, copied_from_meeting_agenda_id, meeting_agenda_type_id
        )
        VALUES (
            agenda_record.built_in, final_desc, agenda_record.meeting_agenda_status_id,
            agenda_record.meeting_repeats_id, final_name, target_team_id,
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, agenda_record.state_id,
            agenda_record.sync_id, target_company_id, agenda_record.id,
            agenda_record.meeting_agenda_type_id
        )
        RETURNING id INTO new_agenda_id;

        -- Loop through all active sections associated with the current agenda
        FOR section_record IN
            SELECT *
            FROM meeting_agenda_sections
            WHERE meeting_agenda_id = agenda_record.id
              AND state_id = 'ACTIVE'
        LOOP

		-- Translate section name and description
		SELECT get_translated_text(section_record.name, lang_code) INTO final_section_name;
		SELECT get_translated_text(section_record.desc, lang_code) INTO final_section_desc;

            -- Insert the copied section for the new agenda
            INSERT INTO meeting_agenda_sections (
                "desc", duration, embed_url, meeting_agenda_id, name, "order",
                type, visible, created_at, updated_at, state_id, sync_id, company_id
            )
            VALUES (
                final_section_desc, section_record.duration, section_record.embed_url, new_agenda_id,
                final_section_name, section_record."order", section_record.type,
                section_record.visible, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
                section_record.state_id, section_record.sync_id, target_company_id
            )
            RETURNING id INTO new_section_id;
        END LOOP;
    END LOOP;
END;
$BODY$
  LANGUAGE plpgsql VOLATILE SECURITY DEFINER
  COST 100;
ALTER FUNCTION "public"."copy_meeting_agendas"("source_team_id" uuid, "target_team_id" uuid, "lang_code" varchar) OWNER TO "postgres";

-- ----------------------------
-- Function structure for copy_meeting_agendas
-- ----------------------------
DROP FUNCTION IF EXISTS "public"."copy_meeting_agendas"("source_team_id" uuid, "target_team_id" uuid);
CREATE FUNCTION "public"."copy_meeting_agendas"("source_team_id" uuid, "target_team_id" uuid)
  RETURNS "pg_catalog"."void" AS $BODY$
DECLARE
    target_company_id uuid;
    new_agenda_id uuid;
    new_section_id uuid;
    agenda_record meeting_agendas%ROWTYPE;
    section_record meeting_agenda_sections%ROWTYPE;
BEGIN
    -- Get the company_id for the target team
    SELECT company_id INTO target_company_id
    FROM teams
    WHERE id = target_team_id;

    -- Ensure the target team exists and has a valid company_id
    IF target_company_id IS NULL THEN
        RAISE EXCEPTION 'Invalid target team ID';
    END IF;

    -- Loop through all active, built-in meeting agendas for the source team
    FOR agenda_record IN
        SELECT *
        FROM meeting_agendas
        WHERE team_id = source_team_id
          AND built_in = true
          AND state_id = 'ACTIVE'
    LOOP
        -- Insert the copied meeting agenda for the target team, with copied_from_meeting_agenda_id set to source agenda id
        INSERT INTO meeting_agendas (
            built_in, "desc", meeting_agenda_status_id, meeting_repeats_id,
            name, team_id, created_at, updated_at, state_id, sync_id, company_id, copied_from_meeting_agenda_id
        )
        VALUES (
            agenda_record.built_in, agenda_record.desc, agenda_record.meeting_agenda_status_id,
            agenda_record.meeting_repeats_id, agenda_record.name, target_team_id,
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, agenda_record.state_id,
            agenda_record.sync_id, target_company_id, agenda_record.id 
        )
        RETURNING id INTO new_agenda_id;

        -- Loop through all active sections associated with the current agenda
        FOR section_record IN
            SELECT *
            FROM meeting_agenda_sections
            WHERE meeting_agenda_id = agenda_record.id
              AND state_id = 'ACTIVE'
        LOOP
            -- Insert the copied section for the new agenda
            INSERT INTO meeting_agenda_sections (
                "desc", duration, embed_url, meeting_agenda_id, name, "order",
                type, visible, created_at, updated_at, state_id, sync_id, company_id
            )
            VALUES (
                section_record.desc, section_record.duration, section_record.embed_url, new_agenda_id,
                section_record.name, section_record."order", section_record.type,
                section_record.visible, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
                section_record.state_id, section_record.sync_id, target_company_id
            )
            RETURNING id INTO new_section_id;
        END LOOP;
    END LOOP;
END;
$BODY$
  LANGUAGE plpgsql VOLATILE SECURITY DEFINER
  COST 100;
ALTER FUNCTION "public"."copy_meeting_agendas"("source_team_id" uuid, "target_team_id" uuid) OWNER TO "postgres";

-- ----------------------------
-- Function structure for current_company_id
-- ----------------------------
DROP FUNCTION IF EXISTS "public"."current_company_id"();
CREATE FUNCTION "public"."current_company_id"()
  RETURNS "pg_catalog"."uuid" AS $BODY$
   SELECT nullif(current_setting('session.companyId', true), null)::uuid;
$BODY$
  LANGUAGE sql STABLE
  COST 100;
ALTER FUNCTION "public"."current_company_id"() OWNER TO "postgres";

-- ----------------------------
-- Function structure for current_email
-- ----------------------------
DROP FUNCTION IF EXISTS "public"."current_email"();
CREATE FUNCTION "public"."current_email"()
  RETURNS "pg_catalog"."text" AS $BODY$
   SELECT nullif(current_setting('session.email', true), '');
$BODY$
  LANGUAGE sql STABLE
  COST 100;
ALTER FUNCTION "public"."current_email"() OWNER TO "postgres";

-- ----------------------------
-- Function structure for current_permission_id
-- ----------------------------
DROP FUNCTION IF EXISTS "public"."current_permission_id"();
CREATE FUNCTION "public"."current_permission_id"()
  RETURNS "pg_catalog"."text" AS $BODY$
   SELECT nullif(current_setting('session.permissionId', true), '')::text;
$BODY$
  LANGUAGE sql STABLE
  COST 100;
ALTER FUNCTION "public"."current_permission_id"() OWNER TO "postgres";

-- ----------------------------
-- Function structure for current_sync_id
-- ----------------------------
DROP FUNCTION IF EXISTS "public"."current_sync_id"();
CREATE FUNCTION "public"."current_sync_id"()
  RETURNS "pg_catalog"."int4" AS $BODY$
    SELECT "sync_id" FROM public."sync" WHERE company_id = current_setting('session.companyId', true)::uuid
$BODY$
  LANGUAGE sql STABLE
  COST 100;
ALTER FUNCTION "public"."current_sync_id"() OWNER TO "postgres";

-- ----------------------------
-- Function structure for current_user_id
-- ----------------------------
DROP FUNCTION IF EXISTS "public"."current_user_id"();
CREATE FUNCTION "public"."current_user_id"()
  RETURNS "pg_catalog"."text" AS $BODY$
   SELECT nullif(current_setting('session.userId', true), '')::uuid;
$BODY$
  LANGUAGE sql STABLE
  COST 100;
ALTER FUNCTION "public"."current_user_id"() OWNER TO "postgres";

-- ----------------------------
-- Function structure for extract_mentions
-- ----------------------------
DROP FUNCTION IF EXISTS "public"."extract_mentions"("text_input" text);
CREATE FUNCTION "public"."extract_mentions"("text_input" text)
  RETURNS "pg_catalog"."_uuid" AS $BODY$
DECLARE
    matches UUID[];
BEGIN
    -- Collect all data-id matches and cast them to UUID
    SELECT ARRAY_AGG(m[1]::UUID)
    INTO matches
    FROM regexp_matches(
                 text_input,
                 '<mention[^>]*data-id="([^"]+)"[^>]*></mention>',
                 'g'
         ) AS m;

    -- Return empty array if no matches
    IF matches IS NULL THEN
        RETURN ARRAY[]::UUID[];
    END IF;

    RETURN matches;
END;
$BODY$
  LANGUAGE plpgsql IMMUTABLE STRICT
  COST 100;
ALTER FUNCTION "public"."extract_mentions"("text_input" text) OWNER TO "postgres";

-- ----------------------------
-- Function structure for get_translated_text
-- ----------------------------
DROP FUNCTION IF EXISTS "public"."get_translated_text"("en_text_input" varchar, "language_code" varchar);
CREATE FUNCTION "public"."get_translated_text"("en_text_input" varchar, "language_code" varchar)
  RETURNS "pg_catalog"."text" AS $BODY$
DECLARE
    translated_value TEXT;
    sql_query TEXT;
BEGIN
    IF language_code IS NULL OR trim(language_code) = '' OR language_code = 'en' THEN
        RETURN en_text_input;
    END IF;

    sql_query := format(
        'SELECT %I FROM service_api_translations WHERE id = $1 LIMIT 1',
        language_code
    );

    EXECUTE sql_query INTO translated_value USING en_text_input;

    IF translated_value IS NULL OR translated_value = '' THEN
        RETURN en_text_input;
    END IF;

    RETURN translated_value;
END;
$BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;
ALTER FUNCTION "public"."get_translated_text"("en_text_input" varchar, "language_code" varchar) OWNER TO "postgres";

-- ----------------------------
-- Function structure for getandinclastsyncid
-- ----------------------------
DROP FUNCTION IF EXISTS "public"."getandinclastsyncid"();
CREATE FUNCTION "public"."getandinclastsyncid"()
  RETURNS TABLE("sync_id" int4) AS $BODY$
WITH updated_sync AS (
  -- Attempt to update the sync_id for the current company
  UPDATE public."sync" 
  SET "sync_id" = EXTRACT(EPOCH FROM now())::int, "updated_at" = now()
  WHERE "company_id" = current_company_id()
    AND current_company_id() IS NOT NULL
  RETURNING "sync_id"
),
inserted_sync AS (
  -- If no row was updated, insert a new row with sync_id based on current timestamp
  INSERT INTO public."sync" ("sync_id", "company_id")
  SELECT EXTRACT(EPOCH FROM now())::int, current_company_id()
  WHERE current_company_id() IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public."sync" WHERE "company_id" = current_company_id()
    )
  RETURNING "sync_id"
)
-- Return the updated or inserted sync_id
SELECT "sync_id" FROM updated_sync
UNION ALL
SELECT "sync_id" FROM inserted_sync;
$BODY$
  LANGUAGE sql VOLATILE
  COST 100
  ROWS 1000;
ALTER FUNCTION "public"."getandinclastsyncid"() OWNER TO "postgres";

-- ----------------------------
-- Function structure for getlastsyncid
-- ----------------------------
DROP FUNCTION IF EXISTS "public"."getlastsyncid"();
CREATE FUNCTION "public"."getlastsyncid"()
  RETURNS TABLE("sync_id" int4) AS $BODY$
WITH updated_sync AS (
  -- Attempt to update the sync_id for the current company
  UPDATE public."sync"
  SET "sync_id" = "sync_id" + 1, "updated_at" = now()
  WHERE "company_id" = current_company_id()
    AND current_company_id() IS NOT NULL
  RETURNING "sync_id"
),
inserted_sync AS (
  -- If no row was updated, insert a new row with sync_id = 1
  INSERT INTO public."sync" ("sync_id", "company_id")
  SELECT 1, current_company_id()
  WHERE current_company_id() IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public."sync" WHERE "company_id" = current_company_id()
    )
  RETURNING "sync_id"
)
-- Return the updated or inserted sync_id
SELECT "sync_id" FROM updated_sync
UNION ALL
SELECT "sync_id" FROM inserted_sync;
$BODY$
  LANGUAGE sql VOLATILE
  COST 100
  ROWS 1000;
ALTER FUNCTION "public"."getlastsyncid"() OWNER TO "postgres";

-- ----------------------------
-- Function structure for normalize_jsonb
-- ----------------------------
DROP FUNCTION IF EXISTS "public"."normalize_jsonb"("keys" _text, "data" jsonb);
CREATE FUNCTION "public"."normalize_jsonb"("keys" _text, "data" jsonb)
  RETURNS "pg_catalog"."jsonb" AS $BODY$
    SELECT COALESCE(
        jsonb_object_agg(key, value),
        '{}'::jsonb
    )
    FROM jsonb_each(data)
    WHERE key = ANY (keys);
$BODY$
  LANGUAGE sql IMMUTABLE
  COST 100;
ALTER FUNCTION "public"."normalize_jsonb"("keys" _text, "data" jsonb) OWNER TO "postgres";

-- ----------------------------
-- Function structure for notify_to_sync_updates
-- ----------------------------
DROP FUNCTION IF EXISTS "public"."notify_to_sync_updates"("old_data" jsonb, "new_data" jsonb, "table_name" name, "user_id" uuid);
CREATE FUNCTION "public"."notify_to_sync_updates"("old_data" jsonb, "new_data" jsonb, "table_name" name, "user_id" uuid)
  RETURNS "pg_catalog"."void" AS $BODY$
    DECLARE
        payload JSONB;
        text_field varchar(255);
        field_keys varchar(255)[];
    BEGIN

        -- Declare list of fields to include in the payload
        field_keys := ARRAY['reactions', 'mentions', 'type', 'object_id', 'comment_id', 'id'];
        
        -- Decide which text field to use
        IF new_data ? 'desc' THEN
            text_field := 'desc';
        ELSIF new_data ? 'text' THEN
            text_field := 'text';
        END IF;

        IF text_field IS NOT NULL THEN
            new_data := jsonb_set(new_data, ARRAY['mentions'], to_jsonb(extract_mentions(new_data->>text_field)), true);

            old_data := jsonb_set(old_data, ARRAY['mentions'], to_jsonb(extract_mentions(old_data->>text_field)), true);
        end if;

        payload := json_build_object(
            'old_data', normalize_jsonb(field_keys, old_data),
            'new_data', normalize_jsonb(field_keys, new_data),
            'table_name', table_name,
            'entity_id', new_data->>'id',
            'user_id', user_id,
            'company_id', new_data->>'company_id'
        );

        -- Safety net - send pg_notify the payload if its under ~8KB
        IF length(payload::text) <= 7900 THEN
            PERFORM pg_notify('sync_updates', payload::text);
        END IF;
    end;
    $BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;
ALTER FUNCTION "public"."notify_to_sync_updates"("old_data" jsonb, "new_data" jsonb, "table_name" name, "user_id" uuid) OWNER TO "postgres";

-- ----------------------------
-- Function structure for prevent_update_on_user_columns
-- ----------------------------
DROP FUNCTION IF EXISTS "public"."prevent_update_on_user_columns"();
CREATE FUNCTION "public"."prevent_update_on_user_columns"()
  RETURNS "pg_catalog"."trigger" AS $BODY$
BEGIN
  IF NEW.id != OLD.id THEN
    RAISE EXCEPTION 'Update blocked';
  END IF;
	IF NEW.user_permission_id != OLD.user_permission_id THEN
    RAISE EXCEPTION 'Update blocked';
  END IF;
	IF NEW.user_status_id != OLD.user_status_id THEN
    RAISE EXCEPTION 'Update blocked';
  END IF;
  RETURN NEW;
END;
$BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;
ALTER FUNCTION "public"."prevent_update_on_user_columns"() OWNER TO "postgres";

-- ----------------------------
-- Function structure for remove_deleted_data
-- ----------------------------
DROP FUNCTION IF EXISTS "public"."remove_deleted_data"();
CREATE FUNCTION "public"."remove_deleted_data"()
  RETURNS "pg_catalog"."void" AS $BODY$
DECLARE
    table_name text;
BEGIN
    -- Get all tables that have a state_id column
    FOR table_name IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'state_id' 
        AND table_schema = 'public'
    LOOP
        -- Execute dynamic SQL to delete rows with state_id = 'DELETED' from each table
        EXECUTE format('DELETE FROM public.%I WHERE state_id = ''DELETED''', table_name);
    END LOOP;
END;
$BODY$
  LANGUAGE plpgsql VOLATILE SECURITY DEFINER
  COST 100;
ALTER FUNCTION "public"."remove_deleted_data"() OWNER TO "postgres";

-- ----------------------------
-- Function structure for test
-- ----------------------------
DROP FUNCTION IF EXISTS "public"."test"();
CREATE FUNCTION "public"."test"()
  RETURNS "pg_catalog"."_uuid" AS $BODY$BEGIN
  -- Routine body goes here...
		RETURN ARRAY['41801e54-549f-48a4-ac04-2825400dcca8'::uuid, '00000000-0000-0000-0000-000000000001'::uuid];
END
$BODY$
  LANGUAGE plpgsql VOLATILE SECURITY DEFINER
  COST 100;
ALTER FUNCTION "public"."test"() OWNER TO "postgres";

-- ----------------------------
-- Function structure for trg_handle_user_updates
-- ----------------------------
DROP FUNCTION IF EXISTS "public"."trg_handle_user_updates"();
CREATE FUNCTION "public"."trg_handle_user_updates"()
  RETURNS "pg_catalog"."trigger" AS $BODY$
BEGIN
    -- Clear integration_google_calendar_tokens if integration_google_calendar_setup is set to false
    IF NEW.integration_google_calendar_setup = false THEN
        NEW.integration_google_calendar_tokens := '';
    END IF;
		
    IF NEW.integration_microsoft_calendar_setup = false THEN
        NEW.integration_microsoft_calendar_tokens := '';
    END IF;

    RETURN NEW;
END;
$BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;
ALTER FUNCTION "public"."trg_handle_user_updates"() OWNER TO "postgres";

-- ----------------------------
-- Function structure for trigger_copy_meeting_agendas
-- ----------------------------
DROP FUNCTION IF EXISTS "public"."trigger_copy_meeting_agendas"();
CREATE FUNCTION "public"."trigger_copy_meeting_agendas"()
  RETURNS "pg_catalog"."trigger" AS $BODY$
DECLARE
    source_team_id uuid;
    lang_code TEXT;
    current_user_id uuid;
BEGIN
    -- Get the current user ID from the session variable
    current_user_id := current_setting('custom.current_user_id', true)::uuid;

    -- Determine the source team ID based on the is_leadership flag
    IF NEW.is_leadership THEN
        source_team_id := '00000000-0000-0000-1111-000000000001'::uuid;
        -- Get language from current user
        SELECT language_id INTO lang_code FROM users WHERE id = current_user_id::uuid;
    ELSE
        source_team_id := '00000000-0000-0000-1111-000000000101'::uuid;
        -- Get the language code from default user seed while company creations
        SELECT language_id INTO lang_code FROM users WHERE id = current_setting('session.userId')::uuid;
    END IF;

    -- Call the copy_meeting_agendas function with the determined source team ID and the new team's ID
    PERFORM copy_meeting_agendas(source_team_id, NEW.id, lang_code);

    -- Return the NEW record (required for AFTER triggers)
    RETURN NEW;
END;
$BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;
ALTER FUNCTION "public"."trigger_copy_meeting_agendas"() OWNER TO "postgres";

-- ----------------------------
-- Function structure for update_company_lastsyncid_dateupdate
-- ----------------------------
DROP FUNCTION IF EXISTS "public"."update_company_lastsyncid_dateupdate"();
CREATE FUNCTION "public"."update_company_lastsyncid_dateupdate"()
  RETURNS "pg_catalog"."trigger" AS $BODY$
DECLARE
    last_sync_id INT; -- Variable to store the result of getLastSyncId()
BEGIN
    -- Always update the `updated_at` field
    NEW.updated_at = now();

    -- Get the value of getLastSyncId() and store it in a variable
    last_sync_id := EXTRACT(EPOCH FROM now())::int;

    -- Update `sync_id` only if `last_sync_id` is not NULL
    IF last_sync_id IS NOT NULL THEN
        NEW."sync_id" = last_sync_id;
    END IF;

    -- Check if company_id is present and update the sync table
    IF NEW.id IS NOT NULL THEN
        UPDATE sync
        SET sync_id = last_sync_id,
            updated_at = now()
        WHERE company_id = NEW.id;
    END IF;

    RETURN NEW;
END;
$BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;
ALTER FUNCTION "public"."update_company_lastsyncid_dateupdate"() OWNER TO "postgres";

-- ----------------------------
-- Function structure for update_lastsyncid_dateupdate
-- ----------------------------
DROP FUNCTION IF EXISTS "public"."update_lastsyncid_dateupdate"();
CREATE FUNCTION "public"."update_lastsyncid_dateupdate"()
  RETURNS "pg_catalog"."trigger" AS $BODY$
DECLARE
    last_sync_id INT;
    user_id UUID;
BEGIN
    -- Always update the `updated_at` field
    NEW.updated_at = now();
    user_id := current_setting('session.userId', true)::uuid;

    -- Generate a new sync id
    last_sync_id := EXTRACT(EPOCH FROM now())::int;

    -- Update `sync_id`
    IF last_sync_id IS NOT NULL THEN
        NEW.sync_id = last_sync_id;
    END IF;

    -- Update sync table if company_id is present
    IF NEW.company_id IS NOT NULL THEN
        UPDATE sync
        SET sync_id = last_sync_id,
            updated_at = now()
        WHERE company_id = NEW.company_id;
    END IF;

    -- Only notify if company_id and user_id are set
    IF NEW.company_id IS NOT NULL AND user_id IS NOT NULL THEN
        BEGIN
            PERFORM notify_to_sync_updates(to_jsonb(OLD.*), to_jsonb(NEW.*), TG_TABLE_NAME, user_id);
        EXCEPTION
            WHEN OTHERS THEN
                -- Log the exception without interrupting the main transaction
                RAISE WARNING 'notify_to_sync_updates failed: % (SQLSTATE %)', SQLERRM, SQLSTATE;
        END;
    END IF;

    RETURN NEW;
END;
$BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;
ALTER FUNCTION "public"."update_lastsyncid_dateupdate"() OWNER TO "postgres";

-- ----------------------------
-- Function structure for update_stripe_sub_lastsyncid_dateupdate
-- ----------------------------
DROP FUNCTION IF EXISTS "public"."update_stripe_sub_lastsyncid_dateupdate"();
CREATE FUNCTION "public"."update_stripe_sub_lastsyncid_dateupdate"()
  RETURNS "pg_catalog"."trigger" AS $BODY$
DECLARE
    last_sync_id INT; 
    lu_company_id UUID;
BEGIN
    -- Always update the `updated_at` field
    NEW.updated_at := now();

    -- Generate a new sync ID based on the current timestamp
    last_sync_id := EXTRACT(EPOCH FROM now())::INT;

    -- Get the company_id from stripe_customers table
    SELECT company_id INTO lu_company_id 
    FROM stripe_customers 
    WHERE stripe_customer_id = NEW.stripe_customer_id;
		
		NEW.company_id = lu_company_id;

    -- Update `sync_id`
    NEW.sync_id := last_sync_id;

    -- If we found a matching company_id, update the sync table
    IF lu_company_id IS NOT NULL THEN
        UPDATE sync
        SET sync_id = last_sync_id,
            updated_at = now()
        WHERE company_id = lu_company_id;
    END IF;

    RETURN NEW;
END;
$BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;
ALTER FUNCTION "public"."update_stripe_sub_lastsyncid_dateupdate"() OWNER TO "postgres";

-- ----------------------------
-- Function structure for users_prevent_update_on_columns
-- ----------------------------
DROP FUNCTION IF EXISTS "public"."users_prevent_update_on_columns"();
CREATE FUNCTION "public"."users_prevent_update_on_columns"()
  RETURNS "pg_catalog"."trigger" AS $BODY$
BEGIN
  -- Skip all checks if current user is not app_user
  IF current_user != 'app_user' THEN
    RETURN NEW;
  END IF;

  -- NO CHANGE ALLOWED FOR THESE:
  IF NEW.id != OLD.id THEN
    RAISE EXCEPTION 'ID can not be changed';
  END IF;
  IF NEW.email != OLD.email THEN
    RAISE EXCEPTION 'Email can not be changed';
  END IF;
  IF NEW.created_at != OLD.created_at THEN
    RAISE EXCEPTION 'created_at can not be changed';
  END IF;
  IF NEW.company_id != OLD.company_id THEN
    RAISE EXCEPTION 'company_id can not be changed';
  END IF;
  IF NEW.sync_id != OLD.sync_id THEN
    RAISE EXCEPTION 'sync_id can not be changed';
  END IF;
  -- user_permission_id - ONLY MANAGER+ and NOT SELF and SPECIAL MANAGER LEVEL CHECKS
  IF NEW.user_permission_id != OLD.user_permission_id THEN
    IF current_setting('session.permissionId', true) NOT IN ('ADMIN', 'OWNER', 'IMPLEMENTER', 'PRACTICEMANAGER', 'MANAGER')
      OR OLD.id = current_setting('session.userId', true)::uuid
      THEN
      RAISE EXCEPTION 'Update blocked';
    END IF;
    -- Managers can't make higher levels OR move higher levels to lower levels
    IF current_setting('session.permissionId', true) = 'MANAGER' THEN
      if OLD.user_permission_id NOT IN ('TEAMMEMBER','OBSERVER') OR NEW.user_permission_id IN ('ADMIN', 'OWNER', 'IMPLEMENTER', 'PRACTICEMANAGER', 'MANAGER') THEN
        RAISE EXCEPTION 'Update blocked - permissionId';
      END IF;
    END IF;
  END IF;
  -- invite_was_sent - ONLY MANAGER+ and NOT SELF
  IF NEW.user_permission_id != OLD.user_permission_id THEN
    IF current_setting('session.permissionId', true) NOT IN ('ADMIN', 'OWNER', 'IMPLEMENTER', 'PRACTICEMANAGER', 'MANAGER')
      OR OLD.id = current_setting('session.userId', true)::uuid
      THEN
      RAISE EXCEPTION 'Update blocked - user_permission_id';
    END IF;
  END IF;
  -- user_status_id - ONLY MANAGER+ and NOT SELF
  IF NEW.user_status_id != OLD.user_status_id THEN
    IF current_setting('session.permissionId', true) NOT IN ('ADMIN', 'OWNER', 'IMPLEMENTER', 'PRACTICEMANAGER', 'MANAGER')
      OR OLD.id = current_setting('session.userId', true)::uuid
      THEN
      RAISE EXCEPTION 'Update blocked - user_status_id';
    END IF;
  END IF;
  RETURN NEW;
END;
$BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;
ALTER FUNCTION "public"."users_prevent_update_on_columns"() OWNER TO "postgres";

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
SELECT setval('"public"."eos_implementers_stage_id_seq"', 1, false);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."help_content_id_seq"
OWNED BY "public"."help_content"."id";
SELECT setval('"public"."help_content_id_seq"', 14, true);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."help_content_tips_id_seq"
OWNED BY "public"."help_content_tips"."id";
SELECT setval('"public"."help_content_tips_id_seq"', 83, true);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."roadmap_item_votes_id_seq"
OWNED BY "public"."roadmap_item_votes"."id";
SELECT setval('"public"."roadmap_item_votes_id_seq"', 174, true);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."roadmap_items_id_seq"
OWNED BY "public"."roadmap_items"."id";
SELECT setval('"public"."roadmap_items_id_seq"', 106, true);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."roadmap_phases_id_seq"
OWNED BY "public"."roadmap_phases"."id";
SELECT setval('"public"."roadmap_phases_id_seq"', 4, true);

-- ----------------------------
-- Triggers structure for table comment_files
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_dateupdate_comment_files" BEFORE INSERT OR UPDATE ON "public"."comment_files"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Primary Key structure for table comment_files
-- ----------------------------
ALTER TABLE "public"."comment_files" ADD CONSTRAINT "comment_files_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table comments
-- ----------------------------
CREATE INDEX "comments_company_id_idx" ON "public"."comments" USING btree (
  "company_id" "pg_catalog"."uuid_ops" ASC NULLS LAST,
  "sync_id" "pg_catalog"."int4_ops" ASC NULLS LAST
);
CREATE INDEX "comments_user_id_idx" ON "public"."comments" USING btree (
  "user_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table comments
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_dateupdate_comments" BEFORE INSERT OR UPDATE ON "public"."comments"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Primary Key structure for table comments
-- ----------------------------
ALTER TABLE "public"."comments" ADD CONSTRAINT "comments_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table companies
-- ----------------------------
CREATE INDEX "companies_id_idx" ON "public"."companies" USING btree (
  "id" "pg_catalog"."uuid_ops" ASC NULLS LAST,
  "sync_id" "pg_catalog"."int4_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table companies
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_dateupdate_companies" BEFORE INSERT OR UPDATE ON "public"."companies"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_company_lastsyncid_dateupdate"();

-- ----------------------------
-- Uniques structure for table companies
-- ----------------------------
ALTER TABLE "public"."companies" ADD CONSTRAINT "companies_company_code_key" UNIQUE ("code");
ALTER TABLE "public"."companies" ADD CONSTRAINT "companies_previous_company_code_key" UNIQUE ("previous_code");

-- ----------------------------
-- Checks structure for table companies
-- ----------------------------
ALTER TABLE "public"."companies" ADD CONSTRAINT "companies_subscription_state_check" CHECK (subscription_state::text = ANY (ARRAY['NORMAL'::character varying::text, 'SPONSORED'::character varying::text, 'SPONSORED-IMPLEMENTER'::character varying::text, 'NO-PURCHASE-INTENT'::character varying::text]));
ALTER TABLE "public"."companies" ADD CONSTRAINT "companies_name_display_order_check" CHECK (name_display_order::text = ANY (ARRAY['WESTERN'::character varying::text, 'EASTERN'::character varying::text]));

-- ----------------------------
-- Primary Key structure for table companies
-- ----------------------------
ALTER TABLE "public"."companies" ADD CONSTRAINT "companies_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table dashboard_layout_designs
-- ----------------------------
CREATE INDEX "dashboard_layout_designs_company_id_idx" ON "public"."dashboard_layout_designs" USING btree (
  "company_id" "pg_catalog"."uuid_ops" ASC NULLS LAST,
  "sync_id" "pg_catalog"."int4_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table dashboard_layout_designs
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_dateupdate_layout_designs" BEFORE INSERT OR UPDATE ON "public"."dashboard_layout_designs"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Primary Key structure for table dashboard_layout_designs
-- ----------------------------
ALTER TABLE "public"."dashboard_layout_designs" ADD CONSTRAINT "layoutDesigns_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table dashboard_layout_displays
-- ----------------------------
CREATE INDEX "dashboard_layout_displays_company_id_idx" ON "public"."dashboard_layout_displays" USING btree (
  "company_id" "pg_catalog"."uuid_ops" ASC NULLS LAST,
  "sync_id" "pg_catalog"."int4_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table dashboard_layout_displays
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_dateupdate_layout_displays" BEFORE INSERT OR UPDATE ON "public"."dashboard_layout_displays"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Primary Key structure for table dashboard_layout_displays
-- ----------------------------
ALTER TABLE "public"."dashboard_layout_displays" ADD CONSTRAINT "dashboard_layout_displays_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table data_field_statuses
-- ----------------------------
CREATE INDEX "data_field_statuses_company_id_idx" ON "public"."data_field_statuses" USING btree (
  "company_id" "pg_catalog"."uuid_ops" ASC NULLS LAST,
  "sync_id" "pg_catalog"."int4_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table data_field_statuses
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_dateupdate_data_statuses" BEFORE INSERT OR UPDATE ON "public"."data_field_statuses"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Primary Key structure for table data_field_statuses
-- ----------------------------
ALTER TABLE "public"."data_field_statuses" ADD CONSTRAINT "dataStatuses_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table data_fields
-- ----------------------------
CREATE INDEX "data_fields_company_id_idx" ON "public"."data_fields" USING btree (
  "company_id" "pg_catalog"."uuid_ops" ASC NULLS LAST,
  "sync_id" "pg_catalog"."int4_ops" ASC NULLS LAST
);
CREATE INDEX "data_fields_user_id_idx" ON "public"."data_fields" USING btree (
  "user_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table data_fields
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_dateupdate_data" BEFORE INSERT OR UPDATE ON "public"."data_fields"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Primary Key structure for table data_fields
-- ----------------------------
ALTER TABLE "public"."data_fields" ADD CONSTRAINT "dataStatuses_copy1_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table data_values
-- ----------------------------
CREATE INDEX "data_values_company_id_idx" ON "public"."data_values" USING btree (
  "company_id" "pg_catalog"."uuid_ops" ASC NULLS LAST,
  "sync_id" "pg_catalog"."int4_ops" ASC NULLS LAST
);
CREATE INDEX "data_values_data_field_id_idx" ON "public"."data_values" USING btree (
  "data_field_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);
CREATE UNIQUE INDEX "data_values_data_field_id_start_date_uindex" ON "public"."data_values" USING btree (
  "data_field_id" "pg_catalog"."uuid_ops" ASC NULLS LAST,
  "start_date" "pg_catalog"."date_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table data_values
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_dateupdate_data_values" BEFORE INSERT OR UPDATE ON "public"."data_values"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Primary Key structure for table data_values
-- ----------------------------
ALTER TABLE "public"."data_values" ADD CONSTRAINT "datavalues_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table del_del_users_on_todos
-- ----------------------------
CREATE INDEX "users_on_todos_company_id_idx" ON "public"."del_del_users_on_todos" USING btree (
  "company_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);
CREATE INDEX "users_on_todos_todo_id_idx" ON "public"."del_del_users_on_todos" USING btree (
  "todo_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);
CREATE INDEX "users_on_todos_user_id_idx" ON "public"."del_del_users_on_todos" USING btree (
  "user_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table del_del_users_on_todos
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_dateupdate_users_on_todos" BEFORE INSERT OR UPDATE ON "public"."del_del_users_on_todos"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Uniques structure for table del_del_users_on_todos
-- ----------------------------
ALTER TABLE "public"."del_del_users_on_todos" ADD CONSTRAINT "users_on_todos_user_id_todo_id_key" UNIQUE ("user_id", "todo_id");

-- ----------------------------
-- Primary Key structure for table del_del_users_on_todos
-- ----------------------------
ALTER TABLE "public"."del_del_users_on_todos" ADD CONSTRAINT "users_on_todos_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table eos_implementers
-- ----------------------------
CREATE UNIQUE INDEX "eos_implementers_email_unique_idx" ON "public"."eos_implementers" USING btree (
  lower(email) COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
) WHERE email <> ''::text;

-- ----------------------------
-- Primary Key structure for table eos_implementers
-- ----------------------------
ALTER TABLE "public"."eos_implementers" ADD CONSTRAINT "eos_implementers_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Uniques structure for table eos_implementers_stage
-- ----------------------------
ALTER TABLE "public"."eos_implementers_stage" ADD CONSTRAINT "eos_implementers_stage_name_key" UNIQUE ("name");

-- ----------------------------
-- Primary Key structure for table eos_implementers_stage
-- ----------------------------
ALTER TABLE "public"."eos_implementers_stage" ADD CONSTRAINT "eos_implementers_stage_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table external_lookup_cache
-- ----------------------------
CREATE INDEX "idx_external_lookup_cache_lookup" ON "public"."external_lookup_cache" USING btree (
  "app_type" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST,
  "company_id" "pg_catalog"."uuid_ops" ASC NULLS LAST,
  "internal_type" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST,
  "internal_id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);
CREATE INDEX "idx_external_lookup_cache_lookup_key" ON "public"."external_lookup_cache" USING btree (
  "app_type" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST,
  "company_id" "pg_catalog"."uuid_ops" ASC NULLS LAST,
  "internal_type" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST,
  "lookup_key" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);

-- ----------------------------
-- Uniques structure for table external_lookup_cache
-- ----------------------------
ALTER TABLE "public"."external_lookup_cache" ADD CONSTRAINT "external_lookup_cache_app_type_company_id_internal_type_int_key" UNIQUE ("app_type", "company_id", "internal_type", "internal_id");

-- ----------------------------
-- Primary Key structure for table external_lookup_cache
-- ----------------------------
ALTER TABLE "public"."external_lookup_cache" ADD CONSTRAINT "external_lookup_cache_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table headline_statuses
-- ----------------------------
CREATE INDEX "headline_statuses_company_id_idx" ON "public"."headline_statuses" USING btree (
  "company_id" "pg_catalog"."uuid_ops" ASC NULLS LAST,
  "sync_id" "pg_catalog"."int4_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table headline_statuses
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_dateupdate_headline_statuses" BEFORE INSERT OR UPDATE ON "public"."headline_statuses"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Primary Key structure for table headline_statuses
-- ----------------------------
ALTER TABLE "public"."headline_statuses" ADD CONSTRAINT "headlineStatuses_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table headlines
-- ----------------------------
CREATE INDEX "headlines_company_id_idx" ON "public"."headlines" USING btree (
  "company_id" "pg_catalog"."uuid_ops" ASC NULLS LAST,
  "sync_id" "pg_catalog"."int4_ops" ASC NULLS LAST,
  "state_id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table headlines
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_dateupdate_headlines" BEFORE INSERT OR UPDATE ON "public"."headlines"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Primary Key structure for table headlines
-- ----------------------------
ALTER TABLE "public"."headlines" ADD CONSTRAINT "tags_copy1_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Uniques structure for table help_content
-- ----------------------------
ALTER TABLE "public"."help_content" ADD CONSTRAINT "help_content_route_key_key" UNIQUE ("route_key");

-- ----------------------------
-- Primary Key structure for table help_content
-- ----------------------------
ALTER TABLE "public"."help_content" ADD CONSTRAINT "help_content_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Uniques structure for table help_content_tips
-- ----------------------------
ALTER TABLE "public"."help_content_tips" ADD CONSTRAINT "help_content_tips_help_content_id_display_order_key" UNIQUE ("help_content_id", "display_order");

-- ----------------------------
-- Primary Key structure for table help_content_tips
-- ----------------------------
ALTER TABLE "public"."help_content_tips" ADD CONSTRAINT "help_content_tips_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table issue_files
-- ----------------------------
ALTER TABLE "public"."issue_files" ADD CONSTRAINT "issue_files_pk" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table issue_statuses
-- ----------------------------
CREATE INDEX "issue_statuses_company_id_idx" ON "public"."issue_statuses" USING btree (
  "company_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);
CREATE UNIQUE INDEX "issuestatuses_pkey" ON "public"."issue_statuses" USING btree (
  "id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST,
  "sync_id" "pg_catalog"."int4_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table issue_statuses
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_dateupdate_issue_statuses" BEFORE INSERT OR UPDATE ON "public"."issue_statuses"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Primary Key structure for table issue_statuses
-- ----------------------------
ALTER TABLE "public"."issue_statuses" ADD CONSTRAINT "issueStatuses_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table issues
-- ----------------------------
CREATE INDEX "issues_company_id_sync_id_idx" ON "public"."issues" USING btree (
  "company_id" "pg_catalog"."uuid_ops" ASC NULLS LAST,
  "sync_id" "pg_catalog"."int4_ops" ASC NULLS LAST
);
CREATE INDEX "issues_team_id_idx" ON "public"."issues" USING btree (
  "team_id" "pg_catalog"."uuid_ops" ASC NULLS LAST,
  "priority_no" "pg_catalog"."int4_ops" ASC NULLS LAST
);
CREATE INDEX "issues_user_id_idx" ON "public"."issues" USING btree (
  "user_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table issues
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_dateupdate_issues" BEFORE INSERT OR UPDATE ON "public"."issues"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Primary Key structure for table issues
-- ----------------------------
ALTER TABLE "public"."issues" ADD CONSTRAINT "issues_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table languages
-- ----------------------------
CREATE INDEX "languages_sync_id_idx" ON "public"."languages" USING btree (
  "sync_id" "pg_catalog"."int4_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table languages
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_dateupdate_languages" BEFORE INSERT OR UPDATE ON "public"."languages"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Primary Key structure for table languages
-- ----------------------------
ALTER TABLE "public"."languages" ADD CONSTRAINT "tags_copy1_pkey1" PRIMARY KEY ("id");

-- ----------------------------
-- Triggers structure for table last_logins
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_dateupdate_last_logins" BEFORE INSERT OR UPDATE ON "public"."last_logins"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Primary Key structure for table last_logins
-- ----------------------------
ALTER TABLE "public"."last_logins" ADD CONSTRAINT "last_login_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table market_strategies_value
-- ----------------------------
CREATE INDEX "market_strategies_value_company_id_idx" ON "public"."market_strategies_value" USING btree (
  "company_id" "pg_catalog"."uuid_ops" ASC NULLS LAST,
  "sync_id" "pg_catalog"."int4_ops" ASC NULLS LAST
);
CREATE INDEX "market_strategies_value_team_id_idx" ON "public"."market_strategies_value" USING btree (
  "team_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table market_strategies_value
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_dateupdate_market_strategies_value" BEFORE INSERT OR UPDATE ON "public"."market_strategies_value"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Primary Key structure for table market_strategies_value
-- ----------------------------
ALTER TABLE "public"."market_strategies_value" ADD CONSTRAINT "marketstrategiesvalue_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table meeting_agenda_sections
-- ----------------------------
CREATE INDEX "meeting_agenda_sections_company_id_sync_id_idx" ON "public"."meeting_agenda_sections" USING btree (
  "company_id" "pg_catalog"."uuid_ops" ASC NULLS LAST,
  "sync_id" "pg_catalog"."int4_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table meeting_agenda_sections
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_dateupdate_meeting_agenda_sections" BEFORE INSERT OR UPDATE ON "public"."meeting_agenda_sections"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Primary Key structure for table meeting_agenda_sections
-- ----------------------------
ALTER TABLE "public"."meeting_agenda_sections" ADD CONSTRAINT "meeting_agenda_sections_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table meeting_agenda_statuses
-- ----------------------------
CREATE INDEX "meeting_agenda_statuses_company_id_idx" ON "public"."meeting_agenda_statuses" USING btree (
  "company_id" "pg_catalog"."uuid_ops" ASC NULLS LAST,
  "sync_id" "pg_catalog"."int4_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table meeting_agenda_statuses
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_dateupdate_meeting_agenda_statuses" BEFORE INSERT OR UPDATE ON "public"."meeting_agenda_statuses"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Primary Key structure for table meeting_agenda_statuses
-- ----------------------------
ALTER TABLE "public"."meeting_agenda_statuses" ADD CONSTRAINT "meeting_agenda_statuses_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table meeting_agenda_types
-- ----------------------------
CREATE INDEX "meeting_agenda_types_company_id_idx" ON "public"."meeting_agenda_types" USING btree (
  "company_id" "pg_catalog"."uuid_ops" ASC NULLS LAST,
  "sync_id" "pg_catalog"."int4_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table meeting_agenda_types
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_dateupdate_meeting_agenda_types" BEFORE INSERT OR UPDATE ON "public"."meeting_agenda_types"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Primary Key structure for table meeting_agenda_types
-- ----------------------------
ALTER TABLE "public"."meeting_agenda_types" ADD CONSTRAINT "meeting_agenda_types_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table meeting_agendas
-- ----------------------------
CREATE INDEX "meeting_agendas_company_id_sync_id_idx" ON "public"."meeting_agendas" USING btree (
  "company_id" "pg_catalog"."uuid_ops" ASC NULLS LAST,
  "sync_id" "pg_catalog"."int4_ops" ASC NULLS LAST
);
CREATE INDEX "meeting_agendas_meeting_agenda_status_id_idx" ON "public"."meeting_agendas" USING btree (
  "meeting_agenda_status_id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table meeting_agendas
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_dateupdate_meeting_agendas" BEFORE INSERT OR UPDATE ON "public"."meeting_agendas"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Primary Key structure for table meeting_agendas
-- ----------------------------
ALTER TABLE "public"."meeting_agendas" ADD CONSTRAINT "meeting_agendas_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table meeting_external_sync_infos
-- ----------------------------
CREATE INDEX "meeting_external_sync_infos_company_id_idx" ON "public"."meeting_external_sync_infos" USING btree (
  "company_id" "pg_catalog"."uuid_ops" ASC NULLS LAST,
  "sync_id" "pg_catalog"."int4_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table meeting_external_sync_infos
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_dateupdate_mesi" BEFORE INSERT OR UPDATE ON "public"."meeting_external_sync_infos"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Primary Key structure for table meeting_external_sync_infos
-- ----------------------------
ALTER TABLE "public"."meeting_external_sync_infos" ADD CONSTRAINT "meeting_external_syncs_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table meeting_info_statuses
-- ----------------------------
CREATE INDEX "meeting_info_statuses_company_id_idx" ON "public"."meeting_info_statuses" USING btree (
  "company_id" "pg_catalog"."uuid_ops" ASC NULLS LAST,
  "sync_id" "pg_catalog"."int4_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table meeting_info_statuses
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_dateupdate_meeting_info_statuses" BEFORE INSERT OR UPDATE ON "public"."meeting_info_statuses"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Primary Key structure for table meeting_info_statuses
-- ----------------------------
ALTER TABLE "public"."meeting_info_statuses" ADD CONSTRAINT "meeting_info_statuses_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table meeting_infos
-- ----------------------------
CREATE INDEX "idx_meeting_infos_team_id" ON "public"."meeting_infos" USING btree (
  "team_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);
CREATE INDEX "meeting_infos_company_id_idx" ON "public"."meeting_infos" USING btree (
  "company_id" "pg_catalog"."uuid_ops" ASC NULLS LAST,
  "sync_id" "pg_catalog"."int4_ops" ASC NULLS LAST
);
CREATE INDEX "meeting_infos_meeting_agenda_id_idx" ON "public"."meeting_infos" USING btree (
  "meeting_agenda_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);
CREATE INDEX "meeting_infos_owner_user_id_idx" ON "public"."meeting_infos" USING btree (
  "owner_user_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table meeting_infos
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_dateupdate_meeting_info" BEFORE INSERT OR UPDATE ON "public"."meeting_infos"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Primary Key structure for table meeting_infos
-- ----------------------------
ALTER TABLE "public"."meeting_infos" ADD CONSTRAINT "meeting_info_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table meeting_ratings
-- ----------------------------
CREATE INDEX "meeting_ratings_company_id_sync_id_idx" ON "public"."meeting_ratings" USING btree (
  "company_id" "pg_catalog"."uuid_ops" ASC NULLS LAST,
  "sync_id" "pg_catalog"."int4_ops" ASC NULLS LAST
);
CREATE INDEX "meeting_ratings_meeting_id_idx" ON "public"."meeting_ratings" USING btree (
  "meeting_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);
CREATE INDEX "meeting_ratings_user_id_idx" ON "public"."meeting_ratings" USING btree (
  "user_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table meeting_ratings
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_dateupdate_meeting_ratings" BEFORE INSERT OR UPDATE ON "public"."meeting_ratings"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Uniques structure for table meeting_ratings
-- ----------------------------
ALTER TABLE "public"."meeting_ratings" ADD CONSTRAINT "meeting_ratings_meeting_id_user_id_key" UNIQUE ("meeting_id", "user_id");

-- ----------------------------
-- Checks structure for table meeting_ratings
-- ----------------------------
ALTER TABLE "public"."meeting_ratings" ADD CONSTRAINT "meeting_ratings_rating_check1" CHECK (rating >= 0 AND rating <= 10);

-- ----------------------------
-- Primary Key structure for table meeting_ratings
-- ----------------------------
ALTER TABLE "public"."meeting_ratings" ADD CONSTRAINT "meeting_ratings_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table meeting_repeats
-- ----------------------------
CREATE INDEX "meeting_repeats_sync_id_idx" ON "public"."meeting_repeats" USING btree (
  "sync_id" "pg_catalog"."int4_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table meeting_repeats
-- ----------------------------
ALTER TABLE "public"."meeting_repeats" ADD CONSTRAINT "meeting_repeats_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Triggers structure for table meeting_section_infos
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_dateupdate_meeting_section_infos" BEFORE INSERT OR UPDATE ON "public"."meeting_section_infos"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Primary Key structure for table meeting_section_infos
-- ----------------------------
ALTER TABLE "public"."meeting_section_infos" ADD CONSTRAINT "meeting_section_infos_pk" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table meeting_statuses
-- ----------------------------
CREATE INDEX "meeting_statuses_company_id_idx" ON "public"."meeting_statuses" USING btree (
  "company_id" "pg_catalog"."uuid_ops" ASC NULLS LAST,
  "sync_id" "pg_catalog"."int4_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table meeting_statuses
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_dateupdate_meeting_statuses" BEFORE INSERT OR UPDATE ON "public"."meeting_statuses"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Primary Key structure for table meeting_statuses
-- ----------------------------
ALTER TABLE "public"."meeting_statuses" ADD CONSTRAINT "meeting_statuses_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table meeting_summary_emails
-- ----------------------------
CREATE INDEX "idx_meeting_summary_emails_meeting_id" ON "public"."meeting_summary_emails" USING btree (
  "meeting_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);

-- ----------------------------
-- Checks structure for table meeting_summary_emails
-- ----------------------------
ALTER TABLE "public"."meeting_summary_emails" ADD CONSTRAINT "chk_review_status" CHECK (review_status::text = ANY (ARRAY['Not reviewed'::character varying::text, 'Reviewed - ok'::character varying::text, 'Reviewed - flagged'::character varying::text]));

-- ----------------------------
-- Primary Key structure for table meeting_summary_emails
-- ----------------------------
ALTER TABLE "public"."meeting_summary_emails" ADD CONSTRAINT "meeting_summary_emails_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table meetings
-- ----------------------------
CREATE INDEX "idx_meetings_company_id" ON "public"."meetings" USING btree (
  "company_id" "pg_catalog"."uuid_ops" ASC NULLS LAST,
  "sync_id" "pg_catalog"."int4_ops" ASC NULLS LAST
);
CREATE INDEX "idx_meetings_meeting_info_id" ON "public"."meetings" USING btree (
  "meeting_info_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);
CREATE INDEX "meetings_date_state_id_company_id_idx" ON "public"."meetings" USING btree (
  "date" "pg_catalog"."timestamptz_ops" ASC NULLS LAST,
  "state_id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST,
  "company_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table meetings
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_dateupdate_meetings" BEFORE INSERT OR UPDATE ON "public"."meetings"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Checks structure for table meetings
-- ----------------------------
ALTER TABLE "public"."meetings" ADD CONSTRAINT "meetings_average_rating_check" CHECK (average_rating >= 0 AND average_rating <= 10);

-- ----------------------------
-- Primary Key structure for table meetings
-- ----------------------------
ALTER TABLE "public"."meetings" ADD CONSTRAINT "meetings_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table milestone_statuses
-- ----------------------------
ALTER TABLE "public"."milestone_statuses" ADD CONSTRAINT "milestone_statuses_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Triggers structure for table milestones
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_dateupdate_milestones" BEFORE INSERT OR UPDATE ON "public"."milestones"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Primary Key structure for table milestones
-- ----------------------------
ALTER TABLE "public"."milestones" ADD CONSTRAINT "rock_milestones_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table notifications
-- ----------------------------
CREATE UNIQUE INDEX "notifications_actor_id_user_id_entity_id_uindex" ON "public"."notifications" USING btree (
  "actor_id" "pg_catalog"."uuid_ops" ASC NULLS LAST,
  "user_id" "pg_catalog"."uuid_ops" ASC NULLS LAST,
  "entity_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table notifications
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_dateupdate_notifications" BEFORE INSERT OR UPDATE ON "public"."notifications"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Primary Key structure for table notifications
-- ----------------------------
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table org_chart_roles_responsibilities
-- ----------------------------
CREATE INDEX "org_chart_roles_responsibilities_company_id_sync_id_idx" ON "public"."org_chart_roles_responsibilities" USING btree (
  "company_id" "pg_catalog"."uuid_ops" ASC NULLS LAST,
  "sync_id" "pg_catalog"."int4_ops" ASC NULLS LAST
);
CREATE INDEX "org_chart_roles_responsibilities_org_chart_seat_id_idx" ON "public"."org_chart_roles_responsibilities" USING btree (
  "org_chart_seat_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table org_chart_roles_responsibilities
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_org_chart_roles_responsibilities" BEFORE INSERT OR UPDATE ON "public"."org_chart_roles_responsibilities"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Primary Key structure for table org_chart_roles_responsibilities
-- ----------------------------
ALTER TABLE "public"."org_chart_roles_responsibilities" ADD CONSTRAINT "org_chart_roles_responsibilities_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table org_chart_seat_docs
-- ----------------------------
CREATE INDEX "org_chart_seat_docs_company_id_idx" ON "public"."org_chart_seat_docs" USING btree (
  "company_id" "pg_catalog"."uuid_ops" ASC NULLS LAST,
  "sync_id" "pg_catalog"."int4_ops" ASC NULLS LAST
);
CREATE INDEX "org_chart_seat_docs_org_chart_seat_id_idx" ON "public"."org_chart_seat_docs" USING btree (
  "org_chart_seat_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table org_chart_seat_docs
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_org_chart_seat_docs" BEFORE INSERT OR UPDATE ON "public"."org_chart_seat_docs"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Primary Key structure for table org_chart_seat_docs
-- ----------------------------
ALTER TABLE "public"."org_chart_seat_docs" ADD CONSTRAINT "org_chart_seat_docs_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table org_chart_seats
-- ----------------------------
CREATE INDEX "org_chart_seats_company_id_idx" ON "public"."org_chart_seats" USING btree (
  "company_id" "pg_catalog"."uuid_ops" ASC NULLS LAST,
  "sync_id" "pg_catalog"."int4_ops" ASC NULLS LAST
);
CREATE INDEX "org_chart_seats_parent_id_order_idx" ON "public"."org_chart_seats" USING btree (
  "parent_id" "pg_catalog"."uuid_ops" ASC NULLS LAST,
  "order" "pg_catalog"."int4_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table org_chart_seats
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_org_chart_seats" BEFORE INSERT OR UPDATE ON "public"."org_chart_seats"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Primary Key structure for table org_chart_seats
-- ----------------------------
ALTER TABLE "public"."org_chart_seats" ADD CONSTRAINT "org_chart_seats_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table org_chart_shared_users
-- ----------------------------
CREATE INDEX "org_chart_shared_users_company_id_idx" ON "public"."org_chart_shared_users" USING btree (
  "company_id" "pg_catalog"."uuid_ops" ASC NULLS LAST,
  "sync_id" "pg_catalog"."int4_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table org_chart_shared_users
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_org_chart_shared_users" BEFORE INSERT OR UPDATE ON "public"."org_chart_shared_users"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Primary Key structure for table org_chart_shared_users
-- ----------------------------
ALTER TABLE "public"."org_chart_shared_users" ADD CONSTRAINT "org_chart_shared_users_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table org_charts
-- ----------------------------
CREATE INDEX "org_charts_sync_id_company_id_idx" ON "public"."org_charts" USING btree (
  "sync_id" "pg_catalog"."int4_ops" ASC NULLS LAST,
  "company_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);
CREATE INDEX "org_charts_user_id_idx" ON "public"."org_charts" USING btree (
  "user_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table org_charts
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_org_chart" BEFORE INSERT OR UPDATE ON "public"."org_charts"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Primary Key structure for table org_charts
-- ----------------------------
ALTER TABLE "public"."org_charts" ADD CONSTRAINT "org_charts_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table org_checkup_answers
-- ----------------------------
CREATE UNIQUE INDEX "unique_question_per_checkup_draft" ON "public"."org_checkup_answers" USING btree (
  "org_checkup_id" "pg_catalog"."uuid_ops" ASC NULLS LAST,
  "question_number" "pg_catalog"."int4_ops" ASC NULLS LAST,
  "created_by_user_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
) WHERE is_final = false AND state_id::text = 'ACTIVE'::text;
CREATE UNIQUE INDEX "unique_question_per_checkup_final" ON "public"."org_checkup_answers" USING btree (
  "org_checkup_id" "pg_catalog"."uuid_ops" ASC NULLS LAST,
  "question_number" "pg_catalog"."int4_ops" ASC NULLS LAST
) WHERE is_final = true AND state_id::text = 'ACTIVE'::text;

-- ----------------------------
-- Triggers structure for table org_checkup_answers
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_org_checkup_answers" BEFORE INSERT OR UPDATE ON "public"."org_checkup_answers"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Checks structure for table org_checkup_answers
-- ----------------------------
ALTER TABLE "public"."org_checkup_answers" ADD CONSTRAINT "org_checkup_answers_question_number_check" CHECK (question_number >= 1 AND question_number <= 20);
ALTER TABLE "public"."org_checkup_answers" ADD CONSTRAINT "org_checkup_answers_score_check" CHECK (score >= 1 AND score <= 5);

-- ----------------------------
-- Primary Key structure for table org_checkup_answers
-- ----------------------------
ALTER TABLE "public"."org_checkup_answers" ADD CONSTRAINT "org_checkup_answers_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table org_checkup_statuses
-- ----------------------------
ALTER TABLE "public"."org_checkup_statuses" ADD CONSTRAINT "org_checkup_statuses_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table org_checkups
-- ----------------------------
CREATE INDEX "org_checkups_company_id_idx" ON "public"."org_checkups" USING btree (
  "company_id" "pg_catalog"."uuid_ops" ASC NULLS LAST,
  "sync_id" "pg_catalog"."int4_ops" ASC NULLS LAST,
  "state_id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table org_checkups
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_org_checkups" BEFORE INSERT OR UPDATE ON "public"."org_checkups"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Checks structure for table org_checkups
-- ----------------------------
ALTER TABLE "public"."org_checkups" ADD CONSTRAINT "org_checkups_total_score_check" CHECK (total_score::numeric >= 0::numeric AND total_score::numeric <= 100::numeric);

-- ----------------------------
-- Primary Key structure for table org_checkups
-- ----------------------------
ALTER TABLE "public"."org_checkups" ADD CONSTRAINT "org_checkups_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table partner_companies
-- ----------------------------
CREATE UNIQUE INDEX "partner_companies_company_id_idx" ON "public"."partner_companies" USING btree (
  "company_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table partner_companies
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_dateupdate_partner_companies" BEFORE INSERT OR UPDATE ON "public"."partner_companies"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Primary Key structure for table partner_companies
-- ----------------------------
ALTER TABLE "public"."partner_companies" ADD CONSTRAINT "partner_companies_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table partners
-- ----------------------------
CREATE UNIQUE INDEX "partners_company_id_idx" ON "public"."partners" USING btree (
  "company_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);
CREATE UNIQUE INDEX "partners_email_idx" ON "public"."partners" USING btree (
  "email" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);
CREATE UNIQUE INDEX "partners_partnerstack_partner_key_idx" ON "public"."partners" USING btree (
  "partnerstack_partner_key" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);
CREATE UNIQUE INDEX "partners_user_id_idx" ON "public"."partners" USING btree (
  "user_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table partners
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_dateupdate_partners" BEFORE INSERT OR UPDATE ON "public"."partners"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Primary Key structure for table partners
-- ----------------------------
ALTER TABLE "public"."partners" ADD CONSTRAINT "partners_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table people_analyzer_session_statuses
-- ----------------------------
CREATE INDEX "people_analyzer_session_statuses_company_id_idx" ON "public"."people_analyzer_session_statuses" USING btree (
  "company_id" "pg_catalog"."uuid_ops" ASC NULLS LAST,
  "sync_id" "pg_catalog"."int4_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table people_analyzer_session_statuses
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_people_analyzer_session_statuses" BEFORE INSERT OR UPDATE ON "public"."people_analyzer_session_statuses"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Primary Key structure for table people_analyzer_session_statuses
-- ----------------------------
ALTER TABLE "public"."people_analyzer_session_statuses" ADD CONSTRAINT "people_analyzer_session_statuses_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table people_analyzer_session_users
-- ----------------------------
CREATE INDEX "people_analyzer_session_users_company_id_idx" ON "public"."people_analyzer_session_users" USING btree (
  "company_id" "pg_catalog"."uuid_ops" ASC NULLS LAST,
  "sync_id" "pg_catalog"."int4_ops" ASC NULLS LAST,
  "state_id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table people_analyzer_session_users
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_people_analyzer_session_users" BEFORE INSERT OR UPDATE ON "public"."people_analyzer_session_users"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Primary Key structure for table people_analyzer_session_users
-- ----------------------------
ALTER TABLE "public"."people_analyzer_session_users" ADD CONSTRAINT "people_analyzer_session_users_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table people_analyzer_session_users_scores
-- ----------------------------
CREATE INDEX "people_analyzer_session_users_scores_company_id_idx" ON "public"."people_analyzer_session_users_scores" USING btree (
  "company_id" "pg_catalog"."uuid_ops" ASC NULLS LAST,
  "sync_id" "pg_catalog"."int4_ops" ASC NULLS LAST,
  "state_id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table people_analyzer_session_users_scores
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_people_analyzer_session_users_scores" BEFORE INSERT OR UPDATE ON "public"."people_analyzer_session_users_scores"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Primary Key structure for table people_analyzer_session_users_scores
-- ----------------------------
ALTER TABLE "public"."people_analyzer_session_users_scores" ADD CONSTRAINT "people_analyzer_session_users_scores_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table people_analyzer_sessions
-- ----------------------------
CREATE INDEX "people_analyzer_sessions_company_id_idx" ON "public"."people_analyzer_sessions" USING btree (
  "company_id" "pg_catalog"."uuid_ops" ASC NULLS LAST,
  "sync_id" "pg_catalog"."int4_ops" ASC NULLS LAST,
  "state_id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table people_analyzer_sessions
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_people_analyzer_sessions" BEFORE INSERT OR UPDATE ON "public"."people_analyzer_sessions"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Primary Key structure for table people_analyzer_sessions
-- ----------------------------
ALTER TABLE "public"."people_analyzer_sessions" ADD CONSTRAINT "people_analyzer_sessions_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Triggers structure for table previous_platforms
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_dateupdate_previous_platforms" BEFORE INSERT OR UPDATE ON "public"."previous_platforms"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Primary Key structure for table previous_platforms
-- ----------------------------
ALTER TABLE "public"."previous_platforms" ADD CONSTRAINT "previous_platforms_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table related_items
-- ----------------------------
CREATE UNIQUE INDEX "related_items_symmetric_unique" ON "public"."related_items" USING btree (
  LEAST(item_id, related_item_id) "pg_catalog"."uuid_ops" ASC NULLS LAST,
  GREATEST(item_id, related_item_id) "pg_catalog"."uuid_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table related_items
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_dateupdate_related_items" BEFORE INSERT OR UPDATE ON "public"."related_items"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Checks structure for table related_items
-- ----------------------------
ALTER TABLE "public"."related_items" ADD CONSTRAINT "no_self_relation" CHECK (item_id <> related_item_id);

-- ----------------------------
-- Primary Key structure for table related_items
-- ----------------------------
ALTER TABLE "public"."related_items" ADD CONSTRAINT "related_items_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table relation_types
-- ----------------------------
ALTER TABLE "public"."relation_types" ADD CONSTRAINT "relation_types_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Uniques structure for table roadmap_item_votes
-- ----------------------------
ALTER TABLE "public"."roadmap_item_votes" ADD CONSTRAINT "roadmap_item_votes_roadmap_item_id_user_email_key" UNIQUE ("roadmap_item_id", "user_email");

-- ----------------------------
-- Primary Key structure for table roadmap_item_votes
-- ----------------------------
ALTER TABLE "public"."roadmap_item_votes" ADD CONSTRAINT "roadmap_item_votes_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table roadmap_items
-- ----------------------------
CREATE INDEX "roadmap_items_phase_id_idx" ON "public"."roadmap_items" USING btree (
  "phase_id" "pg_catalog"."int4_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table roadmap_items
-- ----------------------------
ALTER TABLE "public"."roadmap_items" ADD CONSTRAINT "roadmap_items_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table roadmap_phases
-- ----------------------------
ALTER TABLE "public"."roadmap_phases" ADD CONSTRAINT "roadmap_phases_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table rock_files
-- ----------------------------
ALTER TABLE "public"."rock_files" ADD CONSTRAINT "rock_files_pk" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table rock_statuses
-- ----------------------------
CREATE INDEX "rock_statuses_sync_id_company_id_idx" ON "public"."rock_statuses" USING btree (
  "sync_id" "pg_catalog"."int4_ops" ASC NULLS LAST,
  "company_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table rock_statuses
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_dateupdate_rock_statuses" BEFORE INSERT OR UPDATE ON "public"."rock_statuses"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Primary Key structure for table rock_statuses
-- ----------------------------
ALTER TABLE "public"."rock_statuses" ADD CONSTRAINT "rock_statuses_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table rocks
-- ----------------------------
CREATE INDEX "rocks_company_id_idx" ON "public"."rocks" USING btree (
  "company_id" "pg_catalog"."uuid_ops" ASC NULLS LAST,
  "due_date" "pg_catalog"."date_ops" ASC NULLS LAST,
  "state_id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);
CREATE INDEX "rocks_user_id_idx" ON "public"."rocks" USING btree (
  "user_id" "pg_catalog"."uuid_ops" ASC NULLS LAST,
  "due_date" "pg_catalog"."date_ops" ASC NULLS LAST,
  "state_id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table rocks
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_dateupdate_rocks" BEFORE INSERT OR UPDATE ON "public"."rocks"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Primary Key structure for table rocks
-- ----------------------------
ALTER TABLE "public"."rocks" ADD CONSTRAINT "rocks_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table states
-- ----------------------------
CREATE INDEX "states_company_id_idx" ON "public"."states" USING btree (
  "company_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table states
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_dateupdate_states" BEFORE INSERT OR UPDATE ON "public"."states"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Primary Key structure for table states
-- ----------------------------
ALTER TABLE "public"."states" ADD CONSTRAINT "states_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table stripe_customers
-- ----------------------------
CREATE UNIQUE INDEX "stripe_companies_stripe_customer_id_idx" ON "public"."stripe_customers" USING btree (
  "stripe_customer_id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);
CREATE UNIQUE INDEX "stripe_customers_company_id_idx" ON "public"."stripe_customers" USING btree (
  "company_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table stripe_customers
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_dateupdate_stripe_customers" BEFORE INSERT OR UPDATE ON "public"."stripe_customers"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Primary Key structure for table stripe_customers
-- ----------------------------
ALTER TABLE "public"."stripe_customers" ADD CONSTRAINT "stripe_companies_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Triggers structure for table stripe_subscriptions
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_dateupdate_stripe_subs" BEFORE INSERT OR UPDATE ON "public"."stripe_subscriptions"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_stripe_sub_lastsyncid_dateupdate"();

-- ----------------------------
-- Primary Key structure for table stripe_subscriptions
-- ----------------------------
ALTER TABLE "public"."stripe_subscriptions" ADD CONSTRAINT "stripe_subscriptions_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table swot_items
-- ----------------------------
CREATE INDEX "swot_items_company_id_idx" ON "public"."swot_items" USING btree (
  "company_id" "pg_catalog"."uuid_ops" ASC NULLS LAST,
  "sync_id" "pg_catalog"."int4_ops" ASC NULLS LAST,
  "state_id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table swot_items
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_swot_items" BEFORE INSERT OR UPDATE ON "public"."swot_items"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Primary Key structure for table swot_items
-- ----------------------------
ALTER TABLE "public"."swot_items" ADD CONSTRAINT "swot_items_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table sync
-- ----------------------------
CREATE INDEX "sync_sync_id_updated_at_company_id_idx" ON "public"."sync" USING btree (
  "sync_id" "pg_catalog"."int4_ops" ASC NULLS LAST,
  "updated_at" "pg_catalog"."timestamptz_ops" ASC NULLS LAST,
  "company_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table sync
-- ----------------------------
ALTER TABLE "public"."sync" ADD CONSTRAINT "lastSyncId_pkey" PRIMARY KEY ("company_id");

-- ----------------------------
-- Indexes structure for table tags
-- ----------------------------
CREATE INDEX "tags_company_id_idx" ON "public"."tags" USING btree (
  "company_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table tags
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_dateupdate_tags" BEFORE INSERT OR UPDATE ON "public"."tags"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Primary Key structure for table tags
-- ----------------------------
ALTER TABLE "public"."tags" ADD CONSTRAINT "tags_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table teams
-- ----------------------------
CREATE INDEX "teams_company_id_idx" ON "public"."teams" USING btree (
  "company_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);
CREATE UNIQUE INDEX "teams_name_company_id_idx" ON "public"."teams" USING btree (
  "name" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST,
  "company_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table teams
-- ----------------------------
CREATE TRIGGER "teams_after_insert_trigger" AFTER INSERT ON "public"."teams"
FOR EACH ROW
EXECUTE PROCEDURE "public"."trigger_copy_meeting_agendas"();
CREATE TRIGGER "update_lastsyncid_dateupdate_teams" BEFORE INSERT OR UPDATE ON "public"."teams"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Primary Key structure for table teams
-- ----------------------------
ALTER TABLE "public"."teams" ADD CONSTRAINT "headlines_copy1_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Triggers structure for table teams_on_data_fields
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_dateupdate_teams_on_data_fields" BEFORE INSERT OR UPDATE ON "public"."teams_on_data_fields"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Uniques structure for table teams_on_data_fields
-- ----------------------------
ALTER TABLE "public"."teams_on_data_fields" ADD CONSTRAINT "teams_on_data_fields_unique_team_id_data_field_id" UNIQUE ("data_field_id", "team_id");

-- ----------------------------
-- Primary Key structure for table teams_on_data_fields
-- ----------------------------
ALTER TABLE "public"."teams_on_data_fields" ADD CONSTRAINT "teams_on_data_fields_pk" PRIMARY KEY ("id");

-- ----------------------------
-- Triggers structure for table teams_on_rocks
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_dateupdate_teams_on_rocks" BEFORE INSERT OR UPDATE ON "public"."teams_on_rocks"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Uniques structure for table teams_on_rocks
-- ----------------------------
ALTER TABLE "public"."teams_on_rocks" ADD CONSTRAINT "teams_on_rocks_unique_team_id_data_field_id" UNIQUE ("rock_id", "team_id");

-- ----------------------------
-- Primary Key structure for table teams_on_rocks
-- ----------------------------
ALTER TABLE "public"."teams_on_rocks" ADD CONSTRAINT "teams_on_rocks_pk" PRIMARY KEY ("id");

-- ----------------------------
-- Triggers structure for table testimonials
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_dateupdate_testimonials" BEFORE INSERT OR UPDATE ON "public"."testimonials"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Primary Key structure for table testimonials
-- ----------------------------
ALTER TABLE "public"."testimonials" ADD CONSTRAINT "testimonials_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table todo_external_sync_infos
-- ----------------------------
CREATE INDEX "todo_external_sync_infos_company_id_idx" ON "public"."todo_external_sync_infos" USING btree (
  "company_id" "pg_catalog"."uuid_ops" ASC NULLS LAST,
  "sync_id" "pg_catalog"."int4_ops" ASC NULLS LAST
);
CREATE UNIQUE INDEX "todo_external_syncs_pkey" ON "public"."todo_external_sync_infos" USING btree (
  "id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table todo_external_sync_infos
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_dateupdate_todo_external_sync_infos" BEFORE INSERT OR UPDATE ON "public"."todo_external_sync_infos"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Primary Key structure for table todo_external_sync_infos
-- ----------------------------
ALTER TABLE "public"."todo_external_sync_infos" ADD CONSTRAINT "todo_external_sync_infos_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table todo_files
-- ----------------------------
ALTER TABLE "public"."todo_files" ADD CONSTRAINT "todo_files_pk" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table todo_statuses
-- ----------------------------
CREATE INDEX "todo_statuses_company_id_idx" ON "public"."todo_statuses" USING btree (
  "company_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table todo_statuses
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_dateupdate_todo_statuses" BEFORE INSERT OR UPDATE ON "public"."todo_statuses"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Primary Key structure for table todo_statuses
-- ----------------------------
ALTER TABLE "public"."todo_statuses" ADD CONSTRAINT "todo_statuses_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table todos
-- ----------------------------
CREATE INDEX "todos_company_id_idx" ON "public"."todos" USING btree (
  "company_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);
CREATE INDEX "todos_team_id_idx" ON "public"."todos" USING btree (
  "team_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);
CREATE INDEX "todos_user_id_idx" ON "public"."todos" USING btree (
  "user_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table todos
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_dateupdate_todos" BEFORE INSERT OR UPDATE ON "public"."todos"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Primary Key structure for table todos
-- ----------------------------
ALTER TABLE "public"."todos" ADD CONSTRAINT "todos_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Uniques structure for table translation_suggestion_statuses
-- ----------------------------
ALTER TABLE "public"."translation_suggestion_statuses" ADD CONSTRAINT "translation_suggestion_statuses_id_key" UNIQUE ("id");

-- ----------------------------
-- Uniques structure for table user_api_keys
-- ----------------------------
ALTER TABLE "public"."user_api_keys" ADD CONSTRAINT "user_api_keys_full_key_unique" UNIQUE ("name", "key");

-- ----------------------------
-- Checks structure for table user_api_keys
-- ----------------------------
ALTER TABLE "public"."user_api_keys" ADD CONSTRAINT "user_api_keys_key_format" CHECK (key::text ~ '^[A-Za-z0-9]{40}$'::text);
ALTER TABLE "public"."user_api_keys" ADD CONSTRAINT "user_api_keys_name_format" CHECK (name::text ~ '^[a-z_]+$'::text);

-- ----------------------------
-- Primary Key structure for table user_api_keys
-- ----------------------------
ALTER TABLE "public"."user_api_keys" ADD CONSTRAINT "user_api_keys_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Primary Key structure for table user_permissions
-- ----------------------------
ALTER TABLE "public"."user_permissions" ADD CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table user_reactions
-- ----------------------------
CREATE INDEX "user_reactions_user_id_idx" ON "public"."user_reactions" USING btree (
  "user_id" "pg_catalog"."uuid_ops" ASC NULLS LAST,
  "comment_id" COLLATE "pg_catalog"."default" "pg_catalog"."varchar_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table user_reactions
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_user_reactions" BEFORE INSERT OR UPDATE ON "public"."user_reactions"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Primary Key structure for table user_reactions
-- ----------------------------
ALTER TABLE "public"."user_reactions" ADD CONSTRAINT "user_reactions_pk" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table user_statuses
-- ----------------------------
CREATE INDEX "user_statuses_company_id_idx" ON "public"."user_statuses" USING btree (
  "company_id" "pg_catalog"."uuid_ops" ASC NULLS LAST,
  "order" "pg_catalog"."int4_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table user_statuses
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_dateupdate_user_statuses" BEFORE INSERT OR UPDATE ON "public"."user_statuses"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Primary Key structure for table user_statuses
-- ----------------------------
ALTER TABLE "public"."user_statuses" ADD CONSTRAINT "headlineStatuses_copy1_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table users
-- ----------------------------
CREATE UNIQUE INDEX "users_email_company_id_idx" ON "public"."users" USING btree (
  "email" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST,
  "company_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);
CREATE INDEX "users_state_id_company_id_idx" ON "public"."users" USING btree (
  "state_id" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST,
  "company_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table users
-- ----------------------------
CREATE TRIGGER "trigger_users_beforeinsertorupdate" BEFORE INSERT OR UPDATE ON "public"."users"
FOR EACH ROW
EXECUTE PROCEDURE "public"."trg_handle_user_updates"();
CREATE TRIGGER "trigger_users_prevent_update_on_columns" BEFORE UPDATE ON "public"."users"
FOR EACH ROW
EXECUTE PROCEDURE "public"."users_prevent_update_on_columns"();
CREATE TRIGGER "update_lastsyncid_dateupdate_users" BEFORE INSERT OR UPDATE ON "public"."users"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Primary Key structure for table users
-- ----------------------------
ALTER TABLE "public"."users" ADD CONSTRAINT "teams_copy1_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table users_on_teams
-- ----------------------------
CREATE INDEX "users_on_teams_company_id_idx" ON "public"."users_on_teams" USING btree (
  "company_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);
CREATE INDEX "users_on_teams_team_id_idx" ON "public"."users_on_teams" USING btree (
  "team_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);
CREATE INDEX "users_on_teams_user_id_idx" ON "public"."users_on_teams" USING btree (
  "user_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table users_on_teams
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_dateupdate_users_on_teams" BEFORE INSERT OR UPDATE ON "public"."users_on_teams"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Uniques structure for table users_on_teams
-- ----------------------------
ALTER TABLE "public"."users_on_teams" ADD CONSTRAINT "users_on_teams_user_id_team_id_key" UNIQUE ("user_id", "team_id");

-- ----------------------------
-- Primary Key structure for table users_on_teams
-- ----------------------------
ALTER TABLE "public"."users_on_teams" ADD CONSTRAINT "users_on_teams_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table vision_core_focus_types
-- ----------------------------
CREATE INDEX "vision_core_focus_types_company_id_idx" ON "public"."vision_core_focus_types" USING btree (
  "company_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);
CREATE INDEX "vision_core_focus_types_vision_id_idx" ON "public"."vision_core_focus_types" USING btree (
  "vision_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table vision_core_focus_types
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_dateupdate_core_focus_types" BEFORE INSERT OR UPDATE ON "public"."vision_core_focus_types"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Primary Key structure for table vision_core_focus_types
-- ----------------------------
ALTER TABLE "public"."vision_core_focus_types" ADD CONSTRAINT "coreFocusTypes_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table vision_core_value_details
-- ----------------------------
CREATE INDEX "vision_core_value_details_company_id_idx" ON "public"."vision_core_value_details" USING btree (
  "company_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);
CREATE INDEX "vision_core_value_details_vision_core_value_id_idx" ON "public"."vision_core_value_details" USING btree (
  "vision_core_value_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table vision_core_value_details
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_dateupdate_core_focus_data" BEFORE INSERT OR UPDATE ON "public"."vision_core_value_details"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Primary Key structure for table vision_core_value_details
-- ----------------------------
ALTER TABLE "public"."vision_core_value_details" ADD CONSTRAINT "visionCoreValueDetails_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table vision_core_values
-- ----------------------------
CREATE INDEX "vision_core_values_company_id_idx" ON "public"."vision_core_values" USING btree (
  "company_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);
CREATE INDEX "vision_core_values_vision_id_idx" ON "public"."vision_core_values" USING btree (
  "vision_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table vision_core_values
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_dateupdate_core_values" BEFORE INSERT OR UPDATE ON "public"."vision_core_values"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Primary Key structure for table vision_core_values
-- ----------------------------
ALTER TABLE "public"."vision_core_values" ADD CONSTRAINT "coreValues_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table vision_display_layouts
-- ----------------------------
CREATE INDEX "vision_display_layouts_company_id_idx" ON "public"."vision_display_layouts" USING btree (
  "company_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);
CREATE INDEX "vision_display_layouts_user_id_idx" ON "public"."vision_display_layouts" USING btree (
  "user_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);
CREATE INDEX "vision_display_layouts_vision_id_idx" ON "public"."vision_display_layouts" USING btree (
  "vision_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table vision_display_layouts
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_vision_display_layout" BEFORE INSERT OR UPDATE ON "public"."vision_display_layouts"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Primary Key structure for table vision_display_layouts
-- ----------------------------
ALTER TABLE "public"."vision_display_layouts" ADD CONSTRAINT "visionDisplayLayout_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table vision_goal_details
-- ----------------------------
CREATE INDEX "vision_goal_details_company_id_idx" ON "public"."vision_goal_details" USING btree (
  "company_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);
CREATE INDEX "vision_goal_details_vision_three_year_goal_id_idx" ON "public"."vision_goal_details" USING btree (
  "vision_three_year_goal_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table vision_goal_details
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_dateupdate_goal_details" BEFORE INSERT OR UPDATE ON "public"."vision_goal_details"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Primary Key structure for table vision_goal_details
-- ----------------------------
ALTER TABLE "public"."vision_goal_details" ADD CONSTRAINT "visionGoalsDetails_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table vision_goal_doc_details
-- ----------------------------
CREATE INDEX "vision_goal_doc_details_company_id_idx" ON "public"."vision_goal_doc_details" USING btree (
  "company_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);
CREATE INDEX "vision_goal_doc_details_vision_goal_detail_id_idx" ON "public"."vision_goal_doc_details" USING btree (
  "vision_goal_detail_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table vision_goal_doc_details
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_dateupdate_vision_goal_doc_details" BEFORE INSERT OR UPDATE ON "public"."vision_goal_doc_details"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Primary Key structure for table vision_goal_doc_details
-- ----------------------------
ALTER TABLE "public"."vision_goal_doc_details" ADD CONSTRAINT "vision_goal_doc_details_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table vision_histories
-- ----------------------------
CREATE INDEX "vision_histories_company_id_idx" ON "public"."vision_histories" USING btree (
  "company_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);
CREATE INDEX "vision_histories_team_id_idx" ON "public"."vision_histories" USING btree (
  "team_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);
CREATE INDEX "vision_histories_user_id_idx" ON "public"."vision_histories" USING btree (
  "user_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table vision_histories
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_vision_histories" BEFORE INSERT OR UPDATE ON "public"."vision_histories"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Primary Key structure for table vision_histories
-- ----------------------------
ALTER TABLE "public"."vision_histories" ADD CONSTRAINT "vision_histories_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table vision_issues
-- ----------------------------
CREATE INDEX "vision_issues_company_id_idx" ON "public"."vision_issues" USING btree (
  "company_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);
CREATE INDEX "vision_issues_team_id_idx" ON "public"."vision_issues" USING btree (
  "team_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table vision_issues
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_vision_issues" BEFORE INSERT OR UPDATE ON "public"."vision_issues"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Primary Key structure for table vision_issues
-- ----------------------------
ALTER TABLE "public"."vision_issues" ADD CONSTRAINT "vision_issues_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table vision_kpis_on_three_year_goals
-- ----------------------------
CREATE INDEX "vision_kpis_on_three_year_goals_company_id_idx" ON "public"."vision_kpis_on_three_year_goals" USING btree (
  "company_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);
CREATE INDEX "vision_kpis_on_three_year_goals_data_field_id_idx" ON "public"."vision_kpis_on_three_year_goals" USING btree (
  "data_field_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);
CREATE INDEX "vision_kpis_on_three_year_goals_vision_three_year_goal_id_idx" ON "public"."vision_kpis_on_three_year_goals" USING btree (
  "vision_three_year_goal_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table vision_kpis_on_three_year_goals
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_dateupdate_kipOnThreeYearGoals" BEFORE INSERT OR UPDATE ON "public"."vision_kpis_on_three_year_goals"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Primary Key structure for table vision_kpis_on_three_year_goals
-- ----------------------------
ALTER TABLE "public"."vision_kpis_on_three_year_goals" ADD CONSTRAINT "kpis_on_three_year_goals_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table vision_market_strategies
-- ----------------------------
CREATE INDEX "vision_market_strategies_company_id_idx" ON "public"."vision_market_strategies" USING btree (
  "company_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);
CREATE INDEX "vision_market_strategies_vision_id_idx" ON "public"."vision_market_strategies" USING btree (
  "vision_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table vision_market_strategies
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_dateupdate_market_strategies" BEFORE INSERT OR UPDATE ON "public"."vision_market_strategies"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Primary Key structure for table vision_market_strategies
-- ----------------------------
ALTER TABLE "public"."vision_market_strategies" ADD CONSTRAINT "market_strategies_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table vision_market_strategies_doc_details
-- ----------------------------
CREATE INDEX "vision_market_strategies_doc__vision_market_strategy_id_pos_idx" ON "public"."vision_market_strategies_doc_details" USING btree (
  "vision_market_strategy_id" "pg_catalog"."uuid_ops" ASC NULLS LAST,
  "position" "pg_catalog"."int2_ops" ASC NULLS LAST
);
CREATE INDEX "vision_market_strategies_doc_details_company_id_idx" ON "public"."vision_market_strategies_doc_details" USING btree (
  "company_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table vision_market_strategies_doc_details
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_dateupdate_vision_market_strategies_doc_detai" BEFORE INSERT OR UPDATE ON "public"."vision_market_strategies_doc_details"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Primary Key structure for table vision_market_strategies_doc_details
-- ----------------------------
ALTER TABLE "public"."vision_market_strategies_doc_details" ADD CONSTRAINT "vision_market_strategies_doc_details_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table vision_market_strategies_unique_details
-- ----------------------------
CREATE INDEX "vision_market_strategies_uniq_vision_market_strategy_id_pos_idx" ON "public"."vision_market_strategies_unique_details" USING btree (
  "vision_market_strategy_id" "pg_catalog"."uuid_ops" ASC NULLS LAST,
  "position" "pg_catalog"."int2_ops" ASC NULLS LAST
);
CREATE INDEX "vision_market_strategies_unique_details_company_id_idx" ON "public"."vision_market_strategies_unique_details" USING btree (
  "company_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table vision_market_strategies_unique_details
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_dateupdate_vision_market_strategies_unique_de" BEFORE INSERT OR UPDATE ON "public"."vision_market_strategies_unique_details"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Primary Key structure for table vision_market_strategies_unique_details
-- ----------------------------
ALTER TABLE "public"."vision_market_strategies_unique_details" ADD CONSTRAINT "vision_market_strategies_unique_details_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table vision_profit_revenue_details
-- ----------------------------
CREATE INDEX "vision_profit_revenue_details_company_id_idx" ON "public"."vision_profit_revenue_details" USING btree (
  "company_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);
CREATE INDEX "vision_profit_revenue_details_vision_id_idx" ON "public"."vision_profit_revenue_details" USING btree (
  "vision_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table vision_profit_revenue_details
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_dateupdate_vision_profit_revenue_details" BEFORE INSERT OR UPDATE ON "public"."vision_profit_revenue_details"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Primary Key structure for table vision_profit_revenue_details
-- ----------------------------
ALTER TABLE "public"."vision_profit_revenue_details" ADD CONSTRAINT "vision_profit_revenue_details_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Indexes structure for table vision_three_year_goals
-- ----------------------------
CREATE INDEX "vision_three_year_goals_company_id_idx" ON "public"."vision_three_year_goals" USING btree (
  "company_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);
CREATE INDEX "vision_three_year_goals_vision_id_idx" ON "public"."vision_three_year_goals" USING btree (
  "vision_id" "pg_catalog"."uuid_ops" ASC NULLS LAST
);

-- ----------------------------
-- Triggers structure for table vision_three_year_goals
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_three_year_goals" BEFORE INSERT OR UPDATE ON "public"."vision_three_year_goals"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Primary Key structure for table vision_three_year_goals
-- ----------------------------
ALTER TABLE "public"."vision_three_year_goals" ADD CONSTRAINT "threeYearsGoals_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Triggers structure for table visions
-- ----------------------------
CREATE TRIGGER "update_lastsyncid_dateupdate_vision" BEFORE INSERT OR UPDATE ON "public"."visions"
FOR EACH ROW
EXECUTE PROCEDURE "public"."update_lastsyncid_dateupdate"();

-- ----------------------------
-- Uniques structure for table visions
-- ----------------------------
ALTER TABLE "public"."visions" ADD CONSTRAINT "vision_team_id_unique_key" UNIQUE ("team_id");

-- ----------------------------
-- Primary Key structure for table visions
-- ----------------------------
ALTER TABLE "public"."visions" ADD CONSTRAINT "vision_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Foreign Keys structure for table comment_files
-- ----------------------------
ALTER TABLE "public"."comment_files" ADD CONSTRAINT "comment_files_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "public"."comments" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."comment_files" ADD CONSTRAINT "comment_files_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."comment_files" ADD CONSTRAINT "comment_files_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "public"."states" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table comments
-- ----------------------------
ALTER TABLE "public"."comments" ADD CONSTRAINT "comments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."comments" ADD CONSTRAINT "comments_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "public"."states" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."comments" ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table companies
-- ----------------------------
ALTER TABLE "public"."companies" ADD CONSTRAINT "previous_platform_fkey" FOREIGN KEY ("previous_platform_id") REFERENCES "public"."previous_platforms" ("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- ----------------------------
-- Foreign Keys structure for table dashboard_layout_designs
-- ----------------------------
ALTER TABLE "public"."dashboard_layout_designs" ADD CONSTRAINT "layoutDesigns_userId_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."dashboard_layout_designs" ADD CONSTRAINT "layout_designs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."dashboard_layout_designs" ADD CONSTRAINT "layout_designs_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "public"."states" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table dashboard_layout_displays
-- ----------------------------
ALTER TABLE "public"."dashboard_layout_displays" ADD CONSTRAINT "dashboard_layout_displays_layoutDesignId_fkey" FOREIGN KEY ("layoutDesignId") REFERENCES "public"."dashboard_layout_designs" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table data_field_statuses
-- ----------------------------
ALTER TABLE "public"."data_field_statuses" ADD CONSTRAINT "dataStatuses_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "public"."states" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."data_field_statuses" ADD CONSTRAINT "data_statuses_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table data_fields
-- ----------------------------
ALTER TABLE "public"."data_fields" ADD CONSTRAINT "dataStatuses_copy1_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "public"."states" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."data_fields" ADD CONSTRAINT "data_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."data_fields" ADD CONSTRAINT "data_data_status_id_fkey" FOREIGN KEY ("data_field_status_id") REFERENCES "public"."data_field_statuses" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."data_fields" ADD CONSTRAINT "data_fields_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table data_values
-- ----------------------------
ALTER TABLE "public"."data_values" ADD CONSTRAINT "data_values_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."data_values" ADD CONSTRAINT "data_values_data_field_id_fkey" FOREIGN KEY ("data_field_id") REFERENCES "public"."data_fields" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."data_values" ADD CONSTRAINT "data_values_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "public"."states" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table del_del_users_on_todos
-- ----------------------------
ALTER TABLE "public"."del_del_users_on_todos" ADD CONSTRAINT "users_on_todos_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."del_del_users_on_todos" ADD CONSTRAINT "users_on_todos_todo_id_fkey" FOREIGN KEY ("todo_id") REFERENCES "public"."todos" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."del_del_users_on_todos" ADD CONSTRAINT "users_on_todos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table external_lookup_cache
-- ----------------------------
ALTER TABLE "public"."external_lookup_cache" ADD CONSTRAINT "external_lookup_cache_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- ----------------------------
-- Foreign Keys structure for table headline_statuses
-- ----------------------------
ALTER TABLE "public"."headline_statuses" ADD CONSTRAINT "headlineStatuses_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "public"."states" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."headline_statuses" ADD CONSTRAINT "headline_statuses_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table headlines
-- ----------------------------
ALTER TABLE "public"."headlines" ADD CONSTRAINT "headlines_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."headlines" ADD CONSTRAINT "headlines_headlineStatus_id_fkey" FOREIGN KEY ("headline_status_id") REFERENCES "public"."headline_statuses" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."headlines" ADD CONSTRAINT "headlines_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."headlines" ADD CONSTRAINT "headlines_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "public"."states" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."headlines" ADD CONSTRAINT "headlines_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."headlines" ADD CONSTRAINT "headlines_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table help_content_tips
-- ----------------------------
ALTER TABLE "public"."help_content_tips" ADD CONSTRAINT "help_content_tips_help_content_id_fkey" FOREIGN KEY ("help_content_id") REFERENCES "public"."help_content" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- ----------------------------
-- Foreign Keys structure for table issue_files
-- ----------------------------
ALTER TABLE "public"."issue_files" ADD CONSTRAINT "issue_files_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."issue_files" ADD CONSTRAINT "issue_files_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."issues" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- ----------------------------
-- Foreign Keys structure for table issue_statuses
-- ----------------------------
ALTER TABLE "public"."issue_statuses" ADD CONSTRAINT "issueStatuses_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "public"."states" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."issue_statuses" ADD CONSTRAINT "issue_statuses_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table issues
-- ----------------------------
ALTER TABLE "public"."issues" ADD CONSTRAINT "issues_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."issues" ADD CONSTRAINT "issues_issuestatus_id_fkey" FOREIGN KEY ("issue_status_id") REFERENCES "public"."issue_statuses" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."issues" ADD CONSTRAINT "issues_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."issues" ADD CONSTRAINT "issues_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "public"."states" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."issues" ADD CONSTRAINT "issues_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."issues" ADD CONSTRAINT "issues_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table market_strategies_value
-- ----------------------------
ALTER TABLE "public"."market_strategies_value" ADD CONSTRAINT "market_strategies_value_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."market_strategies_value" ADD CONSTRAINT "marketstrategiesvalue_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "public"."states" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."market_strategies_value" ADD CONSTRAINT "marketstrategiesvalue_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table meeting_agenda_sections
-- ----------------------------
ALTER TABLE "public"."meeting_agenda_sections" ADD CONSTRAINT "meeting_agenda_sections_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."meeting_agenda_sections" ADD CONSTRAINT "meeting_agenda_sections_meeting_agenda_id_fkey" FOREIGN KEY ("meeting_agenda_id") REFERENCES "public"."meeting_agendas" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."meeting_agenda_sections" ADD CONSTRAINT "meeting_agenda_sections_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "public"."states" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table meeting_agenda_statuses
-- ----------------------------
ALTER TABLE "public"."meeting_agenda_statuses" ADD CONSTRAINT "meeting_agenda_statuses_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."meeting_agenda_statuses" ADD CONSTRAINT "meeting_agenda_statuses_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "public"."states" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table meeting_agenda_types
-- ----------------------------
ALTER TABLE "public"."meeting_agenda_types" ADD CONSTRAINT "meeting_agenda_types_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."meeting_agenda_types" ADD CONSTRAINT "meeting_agenda_types_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "public"."states" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table meeting_agendas
-- ----------------------------
ALTER TABLE "public"."meeting_agendas" ADD CONSTRAINT "meeting_agendas_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."meeting_agendas" ADD CONSTRAINT "meeting_agendas_facilitator_users_id_fk" FOREIGN KEY ("facilitator_user_id") REFERENCES "public"."users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."meeting_agendas" ADD CONSTRAINT "meeting_agendas_meeting_agenda_status_id_fkey" FOREIGN KEY ("meeting_agenda_status_id") REFERENCES "public"."meeting_agenda_statuses" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."meeting_agendas" ADD CONSTRAINT "meeting_agendas_meeting_agenda_type_id_fkey" FOREIGN KEY ("meeting_agenda_type_id") REFERENCES "public"."meeting_agenda_types" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."meeting_agendas" ADD CONSTRAINT "meeting_agendas_meeting_repeats_id_fkey" FOREIGN KEY ("meeting_repeats_id") REFERENCES "public"."meeting_repeats" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."meeting_agendas" ADD CONSTRAINT "meeting_agendas_scribe_users_id_fk" FOREIGN KEY ("scribe_user_id") REFERENCES "public"."users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."meeting_agendas" ADD CONSTRAINT "meeting_agendas_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "public"."states" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."meeting_agendas" ADD CONSTRAINT "meeting_agendas_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table meeting_external_sync_infos
-- ----------------------------
ALTER TABLE "public"."meeting_external_sync_infos" ADD CONSTRAINT "meeting_external_sync_infos_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."meeting_external_sync_infos" ADD CONSTRAINT "meeting_external_sync_infos_meeting_id_fkey" FOREIGN KEY ("id") REFERENCES "public"."meetings" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table meeting_info_statuses
-- ----------------------------
ALTER TABLE "public"."meeting_info_statuses" ADD CONSTRAINT "meeting_info_statuses_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."meeting_info_statuses" ADD CONSTRAINT "meeting_info_statuses_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "public"."states" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table meeting_infos
-- ----------------------------
ALTER TABLE "public"."meeting_infos" ADD CONSTRAINT "meeting_info_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."meeting_infos" ADD CONSTRAINT "meeting_info_meeting_info_status_id_fkey" FOREIGN KEY ("meeting_info_status_id") REFERENCES "public"."meeting_info_statuses" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."meeting_infos" ADD CONSTRAINT "meeting_info_meeting_repeats_id_fkey" FOREIGN KEY ("meeting_repeats_id") REFERENCES "public"."meeting_repeats" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."meeting_infos" ADD CONSTRAINT "meeting_info_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "public"."states" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."meeting_infos" ADD CONSTRAINT "meeting_info_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."meeting_infos" ADD CONSTRAINT "meeting_infos_meeting_agenda_id_fkey" FOREIGN KEY ("meeting_agenda_id") REFERENCES "public"."meeting_agendas" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."meeting_infos" ADD CONSTRAINT "meeting_infos_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table meeting_ratings
-- ----------------------------
ALTER TABLE "public"."meeting_ratings" ADD CONSTRAINT "meeting_ratings_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."meeting_ratings" ADD CONSTRAINT "meeting_ratings_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."meeting_ratings" ADD CONSTRAINT "meeting_ratings_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "public"."states" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."meeting_ratings" ADD CONSTRAINT "meeting_ratings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table meeting_section_infos
-- ----------------------------
ALTER TABLE "public"."meeting_section_infos" ADD CONSTRAINT "meeting_section_infos_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."meeting_section_infos" ADD CONSTRAINT "meeting_section_infos_meeting_agenda_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."meeting_agenda_sections" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."meeting_section_infos" ADD CONSTRAINT "meeting_section_infos_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- ----------------------------
-- Foreign Keys structure for table meeting_statuses
-- ----------------------------
ALTER TABLE "public"."meeting_statuses" ADD CONSTRAINT "meeting_statuses_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."meeting_statuses" ADD CONSTRAINT "meeting_statuses_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "public"."states" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table meeting_summary_emails
-- ----------------------------
ALTER TABLE "public"."meeting_summary_emails" ADD CONSTRAINT "meeting_summary_emails_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- ----------------------------
-- Foreign Keys structure for table meetings
-- ----------------------------
ALTER TABLE "public"."meetings" ADD CONSTRAINT "meetings_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."meetings" ADD CONSTRAINT "meetings_facilitator_users_id_fk" FOREIGN KEY ("facilitator_user_id") REFERENCES "public"."users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."meetings" ADD CONSTRAINT "meetings_meeting_agenda_sections_id_fk" FOREIGN KEY ("facilitator_section_id") REFERENCES "public"."meeting_agenda_sections" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."meetings" ADD CONSTRAINT "meetings_meeting_status_id_fkey" FOREIGN KEY ("meeting_status_id") REFERENCES "public"."meeting_statuses" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."meetings" ADD CONSTRAINT "meetings_scribe_users_id_fk" FOREIGN KEY ("scribe_user_id") REFERENCES "public"."users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."meetings" ADD CONSTRAINT "meetings_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "public"."states" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table milestones
-- ----------------------------
ALTER TABLE "public"."milestones" ADD CONSTRAINT "milestones_todo_status_id_fkey" FOREIGN KEY ("milestone_status_id") REFERENCES "public"."milestone_statuses" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."milestones" ADD CONSTRAINT "rock_milestones_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."milestones" ADD CONSTRAINT "rock_milestones_rock_id_fkey" FOREIGN KEY ("rock_id") REFERENCES "public"."rocks" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."milestones" ADD CONSTRAINT "rock_milestones_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "public"."states" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."milestones" ADD CONSTRAINT "rock_milestones_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table notifications
-- ----------------------------
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_actors_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table org_chart_roles_responsibilities
-- ----------------------------
ALTER TABLE "public"."org_chart_roles_responsibilities" ADD CONSTRAINT "org_chart_roles_responsibilities_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."org_chart_roles_responsibilities" ADD CONSTRAINT "org_chart_roles_responsibilities_org_chart_seat_id_fkey" FOREIGN KEY ("org_chart_seat_id") REFERENCES "public"."org_chart_seats" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."org_chart_roles_responsibilities" ADD CONSTRAINT "org_chart_roles_responsibilities_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "public"."states" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table org_chart_seat_docs
-- ----------------------------
ALTER TABLE "public"."org_chart_seat_docs" ADD CONSTRAINT "org_chart_seat_docs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."org_chart_seat_docs" ADD CONSTRAINT "org_chart_seat_docs_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "public"."states" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table org_chart_seats
-- ----------------------------
ALTER TABLE "public"."org_chart_seats" ADD CONSTRAINT "org_chart_seats_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."org_chart_seats" ADD CONSTRAINT "org_chart_seats_org_chart_id_fkey" FOREIGN KEY ("org_chart_id") REFERENCES "public"."org_charts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."org_chart_seats" ADD CONSTRAINT "org_chart_seats_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "public"."states" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table org_chart_shared_users
-- ----------------------------
ALTER TABLE "public"."org_chart_shared_users" ADD CONSTRAINT "org_chart_shared_users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."org_chart_shared_users" ADD CONSTRAINT "org_chart_shared_users_org_chart_id_fkey" FOREIGN KEY ("org_chart_id") REFERENCES "public"."org_charts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."org_chart_shared_users" ADD CONSTRAINT "org_chart_shared_users_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "public"."states" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."org_chart_shared_users" ADD CONSTRAINT "org_chart_shared_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table org_charts
-- ----------------------------
ALTER TABLE "public"."org_charts" ADD CONSTRAINT "org_charts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."org_charts" ADD CONSTRAINT "org_charts_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "public"."states" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."org_charts" ADD CONSTRAINT "org_charts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table org_checkup_answers
-- ----------------------------
ALTER TABLE "public"."org_checkup_answers" ADD CONSTRAINT "org_checkup_answers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "public"."org_checkup_answers" ADD CONSTRAINT "org_checkup_answers_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "public"."org_checkup_answers" ADD CONSTRAINT "org_checkup_answers_org_checkup_id_fkey" FOREIGN KEY ("org_checkup_id") REFERENCES "public"."org_checkups" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- ----------------------------
-- Foreign Keys structure for table org_checkup_statuses
-- ----------------------------
ALTER TABLE "public"."org_checkup_statuses" ADD CONSTRAINT "org_checkup_statuses_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "public"."states" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table org_checkups
-- ----------------------------
ALTER TABLE "public"."org_checkups" ADD CONSTRAINT "org_checkups_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."org_checkups" ADD CONSTRAINT "org_checkups_copy_org_checkup_stat_fkey" FOREIGN KEY ("org_checkup_status_id") REFERENCES "public"."org_checkup_statuses" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."org_checkups" ADD CONSTRAINT "org_checkups_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."org_checkups" ADD CONSTRAINT "org_checkups_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "public"."states" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table partner_companies
-- ----------------------------
ALTER TABLE "public"."partner_companies" ADD CONSTRAINT "partner_companies_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."partner_companies" ADD CONSTRAINT "partner_companies_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "public"."partners" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- ----------------------------
-- Foreign Keys structure for table partners
-- ----------------------------
ALTER TABLE "public"."partners" ADD CONSTRAINT "partners_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."partners" ADD CONSTRAINT "partners_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- ----------------------------
-- Foreign Keys structure for table people_analyzer_session_statuses
-- ----------------------------
ALTER TABLE "public"."people_analyzer_session_statuses" ADD CONSTRAINT "people_analyzer_session_statuses_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."people_analyzer_session_statuses" ADD CONSTRAINT "people_analyzer_session_statuses_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "public"."states" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table people_analyzer_session_users
-- ----------------------------
ALTER TABLE "public"."people_analyzer_session_users" ADD CONSTRAINT "people_analyzer_session_users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."people_analyzer_session_users" ADD CONSTRAINT "people_analyzer_session_users_session_id_fkey" FOREIGN KEY ("people_analyzer_session_id") REFERENCES "public"."people_analyzer_sessions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."people_analyzer_session_users" ADD CONSTRAINT "people_analyzer_session_users_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "public"."states" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."people_analyzer_session_users" ADD CONSTRAINT "people_analyzer_session_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table people_analyzer_session_users_scores
-- ----------------------------
ALTER TABLE "public"."people_analyzer_session_users_scores" ADD CONSTRAINT "people_analyzer_session_users_scores_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."people_analyzer_session_users_scores" ADD CONSTRAINT "people_analyzer_session_users_scores_people_analyzer_session_us" FOREIGN KEY ("people_analyzer_session_user_id") REFERENCES "public"."people_analyzer_session_users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."people_analyzer_session_users_scores" ADD CONSTRAINT "people_analyzer_session_users_scores_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "public"."states" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table people_analyzer_sessions
-- ----------------------------
ALTER TABLE "public"."people_analyzer_sessions" ADD CONSTRAINT "people_analyzer_sessions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."people_analyzer_sessions" ADD CONSTRAINT "people_analyzer_sessions_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."people_analyzer_sessions" ADD CONSTRAINT "people_analyzer_sessions_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "public"."states" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."people_analyzer_sessions" ADD CONSTRAINT "people_analyzer_sessions_status_id_fkey" FOREIGN KEY ("people_analyzer_session_status_id") REFERENCES "public"."people_analyzer_session_statuses" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table related_items
-- ----------------------------
ALTER TABLE "public"."related_items" ADD CONSTRAINT "related_items_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."related_items" ADD CONSTRAINT "related_items_item_type_relation_types_id_fkey" FOREIGN KEY ("item_type") REFERENCES "public"."relation_types" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."related_items" ADD CONSTRAINT "related_items_related_item_type_relation_types_id_fkey" FOREIGN KEY ("related_item_type") REFERENCES "public"."relation_types" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table roadmap_item_votes
-- ----------------------------
ALTER TABLE "public"."roadmap_item_votes" ADD CONSTRAINT "roadmap_item_votes_roadmap_item_id_fkey" FOREIGN KEY ("roadmap_item_id") REFERENCES "public"."roadmap_items" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- ----------------------------
-- Foreign Keys structure for table roadmap_items
-- ----------------------------
ALTER TABLE "public"."roadmap_items" ADD CONSTRAINT "roadmap_items_phase_id_fkey" FOREIGN KEY ("phase_id") REFERENCES "public"."roadmap_phases" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- ----------------------------
-- Foreign Keys structure for table rock_files
-- ----------------------------
ALTER TABLE "public"."rock_files" ADD CONSTRAINT "rock_files_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."rock_files" ADD CONSTRAINT "rock_files_rocks_id_fk" FOREIGN KEY ("rock_id") REFERENCES "public"."rocks" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- ----------------------------
-- Foreign Keys structure for table rock_statuses
-- ----------------------------
ALTER TABLE "public"."rock_statuses" ADD CONSTRAINT "rock_statuses_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."rock_statuses" ADD CONSTRAINT "rock_statuses_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "public"."states" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table rocks
-- ----------------------------
ALTER TABLE "public"."rocks" ADD CONSTRAINT "rocks_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."rocks" ADD CONSTRAINT "rocks_rock_status_id_fkey" FOREIGN KEY ("rock_status_id") REFERENCES "public"."rock_statuses" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."rocks" ADD CONSTRAINT "rocks_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "public"."states" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."rocks" ADD CONSTRAINT "rocks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table states
-- ----------------------------
ALTER TABLE "public"."states" ADD CONSTRAINT "states_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table stripe_customers
-- ----------------------------
ALTER TABLE "public"."stripe_customers" ADD CONSTRAINT "stripe_companies_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- ----------------------------
-- Foreign Keys structure for table stripe_subscriptions
-- ----------------------------
ALTER TABLE "public"."stripe_subscriptions" ADD CONSTRAINT "stripe_subscriptions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."stripe_subscriptions" ADD CONSTRAINT "stripe_subscriptions_stripe_customer_id_fkey" FOREIGN KEY ("stripe_customer_id") REFERENCES "public"."stripe_customers" ("stripe_customer_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table swot_items
-- ----------------------------
ALTER TABLE "public"."swot_items" ADD CONSTRAINT "swot_items_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."swot_items" ADD CONSTRAINT "swot_items_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "public"."states" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."swot_items" ADD CONSTRAINT "swot_items_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table sync
-- ----------------------------
ALTER TABLE "public"."sync" ADD CONSTRAINT "lastsyncids_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
COMMENT ON CONSTRAINT "lastsyncids_company_id_fkey" ON "public"."sync" IS '@foreignSingleFieldName companyId';

-- ----------------------------
-- Foreign Keys structure for table tags
-- ----------------------------
ALTER TABLE "public"."tags" ADD CONSTRAINT "tags_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."tags" ADD CONSTRAINT "tags_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "public"."states" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table teams
-- ----------------------------
ALTER TABLE "public"."teams" ADD CONSTRAINT "teams_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."teams" ADD CONSTRAINT "teams_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "public"."states" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table teams_on_data_fields
-- ----------------------------
ALTER TABLE "public"."teams_on_data_fields" ADD CONSTRAINT "teams_on_data_fields_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."teams_on_data_fields" ADD CONSTRAINT "teams_on_data_fields_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- ----------------------------
-- Foreign Keys structure for table teams_on_rocks
-- ----------------------------
ALTER TABLE "public"."teams_on_rocks" ADD CONSTRAINT "teams_on_rocks_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."teams_on_rocks" ADD CONSTRAINT "teams_on_rocks_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- ----------------------------
-- Foreign Keys structure for table testimonials
-- ----------------------------
ALTER TABLE "public"."testimonials" ADD CONSTRAINT "testimonials_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."testimonials" ADD CONSTRAINT "testimonials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table todo_external_sync_infos
-- ----------------------------
ALTER TABLE "public"."todo_external_sync_infos" ADD CONSTRAINT "todo_external_sync_infos_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."todo_external_sync_infos" ADD CONSTRAINT "todo_external_sync_infos_id_fkey" FOREIGN KEY ("id") REFERENCES "public"."todos" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table todo_files
-- ----------------------------
ALTER TABLE "public"."todo_files" ADD CONSTRAINT "todo_files_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."todo_files" ADD CONSTRAINT "todo_files_todos_id_fk" FOREIGN KEY ("todo_id") REFERENCES "public"."todos" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- ----------------------------
-- Foreign Keys structure for table todo_statuses
-- ----------------------------
ALTER TABLE "public"."todo_statuses" ADD CONSTRAINT "todo_statuses_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."todo_statuses" ADD CONSTRAINT "todo_statuses_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "public"."states" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table todos
-- ----------------------------
ALTER TABLE "public"."todos" ADD CONSTRAINT "todos_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."todos" ADD CONSTRAINT "todos_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."todos" ADD CONSTRAINT "todos_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "public"."states" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."todos" ADD CONSTRAINT "todos_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."todos" ADD CONSTRAINT "todos_todo_status_id_fkey" FOREIGN KEY ("todo_status_id") REFERENCES "public"."todo_statuses" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."todos" ADD CONSTRAINT "todos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table user_api_keys
-- ----------------------------
ALTER TABLE "public"."user_api_keys" ADD CONSTRAINT "user_api_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- ----------------------------
-- Foreign Keys structure for table user_reactions
-- ----------------------------
ALTER TABLE "public"."user_reactions" ADD CONSTRAINT "user_reactions_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comments" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."user_reactions" ADD CONSTRAINT "user_reactions_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE "public"."user_reactions" ADD CONSTRAINT "user_reactions_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- ----------------------------
-- Foreign Keys structure for table user_statuses
-- ----------------------------
ALTER TABLE "public"."user_statuses" ADD CONSTRAINT "user_statuses_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."user_statuses" ADD CONSTRAINT "user_statuses_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "public"."states" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table users
-- ----------------------------
ALTER TABLE "public"."users" ADD CONSTRAINT "users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."users" ADD CONSTRAINT "users_language_id_fkey" FOREIGN KEY ("language_id") REFERENCES "public"."languages" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."users" ADD CONSTRAINT "users_permission_id_fkey" FOREIGN KEY ("user_permission_id") REFERENCES "public"."user_permissions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."users" ADD CONSTRAINT "users_userStatus_id_fkey" FOREIGN KEY ("user_status_id") REFERENCES "public"."user_statuses" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table users_on_teams
-- ----------------------------
ALTER TABLE "public"."users_on_teams" ADD CONSTRAINT "users_on_teams_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "public"."users_on_teams" ADD CONSTRAINT "users_on_teams_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."users_on_teams" ADD CONSTRAINT "users_on_teams_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table vision_core_focus_types
-- ----------------------------
ALTER TABLE "public"."vision_core_focus_types" ADD CONSTRAINT "core_focus_types_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."vision_core_focus_types" ADD CONSTRAINT "core_focus_types_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "public"."states" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."vision_core_focus_types" ADD CONSTRAINT "core_focus_types_vision_id_fkey" FOREIGN KEY ("vision_id") REFERENCES "public"."visions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table vision_core_value_details
-- ----------------------------
ALTER TABLE "public"."vision_core_value_details" ADD CONSTRAINT "vision_core_value_details_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."vision_core_value_details" ADD CONSTRAINT "vision_core_value_details_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "public"."states" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."vision_core_value_details" ADD CONSTRAINT "vision_core_value_details_vision_core_value_id_fkey" FOREIGN KEY ("vision_core_value_id") REFERENCES "public"."vision_core_values" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table vision_core_values
-- ----------------------------
ALTER TABLE "public"."vision_core_values" ADD CONSTRAINT "coreValues_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "public"."states" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."vision_core_values" ADD CONSTRAINT "coreValues_vision_id_fkey" FOREIGN KEY ("vision_id") REFERENCES "public"."visions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."vision_core_values" ADD CONSTRAINT "core_values_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table vision_display_layouts
-- ----------------------------
ALTER TABLE "public"."vision_display_layouts" ADD CONSTRAINT "visionDisplayLayout_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."vision_display_layouts" ADD CONSTRAINT "visionDisplayLayout_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "public"."states" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."vision_display_layouts" ADD CONSTRAINT "visionDisplayLayout_userId_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."vision_display_layouts" ADD CONSTRAINT "visionDisplayLayout_visionId_fkey" FOREIGN KEY ("vision_id") REFERENCES "public"."visions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table vision_goal_details
-- ----------------------------
ALTER TABLE "public"."vision_goal_details" ADD CONSTRAINT "goalsData_companyId_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."vision_goal_details" ADD CONSTRAINT "goalsData_three_years_goal_id_fkey" FOREIGN KEY ("vision_three_year_goal_id") REFERENCES "public"."vision_three_year_goals" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table vision_goal_doc_details
-- ----------------------------
ALTER TABLE "public"."vision_goal_doc_details" ADD CONSTRAINT "vision_goal_doc_details_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."vision_goal_doc_details" ADD CONSTRAINT "vision_goal_doc_details_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "public"."states" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."vision_goal_doc_details" ADD CONSTRAINT "vision_goal_doc_details_vision_goal_detail_id_fkey" FOREIGN KEY ("vision_goal_detail_id") REFERENCES "public"."vision_goal_details" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table vision_histories
-- ----------------------------
ALTER TABLE "public"."vision_histories" ADD CONSTRAINT "vision_histories_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "public"."states" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."vision_histories" ADD CONSTRAINT "vision_histories_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."vision_histories" ADD CONSTRAINT "vision_histories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."vision_histories" ADD CONSTRAINT "vision_histories_vision_id_fkey" FOREIGN KEY ("vision_id") REFERENCES "public"."visions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table vision_issues
-- ----------------------------
ALTER TABLE "public"."vision_issues" ADD CONSTRAINT "vision_issues_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."vision_issues" ADD CONSTRAINT "vision_issues_company_id_fkey1" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."vision_issues" ADD CONSTRAINT "vision_issues_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "public"."states" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."vision_issues" ADD CONSTRAINT "vision_issues_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."vision_issues" ADD CONSTRAINT "vision_issues_vision_id_fkey" FOREIGN KEY ("vision_id") REFERENCES "public"."visions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table vision_kpis_on_three_year_goals
-- ----------------------------
ALTER TABLE "public"."vision_kpis_on_three_year_goals" ADD CONSTRAINT "kpis_on_three_year_goals_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."vision_kpis_on_three_year_goals" ADD CONSTRAINT "kpis_on_three_year_goals_data_id_fkey" FOREIGN KEY ("data_field_id") REFERENCES "public"."data_fields" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."vision_kpis_on_three_year_goals" ADD CONSTRAINT "kpis_on_three_year_goals_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "public"."states" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table vision_market_strategies
-- ----------------------------
ALTER TABLE "public"."vision_market_strategies" ADD CONSTRAINT "market_strategies_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."vision_market_strategies" ADD CONSTRAINT "market_strategies_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "public"."states" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."vision_market_strategies" ADD CONSTRAINT "market_strategies_vision_id_fkey" FOREIGN KEY ("vision_id") REFERENCES "public"."visions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table vision_market_strategies_doc_details
-- ----------------------------
ALTER TABLE "public"."vision_market_strategies_doc_details" ADD CONSTRAINT "vision_market_strategies_doc_details_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."vision_market_strategies_doc_details" ADD CONSTRAINT "vision_market_strategies_doc_details_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "public"."states" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."vision_market_strategies_doc_details" ADD CONSTRAINT "vision_market_strategies_docs_da_vision_market_strategy_id_fkey" FOREIGN KEY ("vision_market_strategy_id") REFERENCES "public"."vision_market_strategies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table vision_market_strategies_unique_details
-- ----------------------------
ALTER TABLE "public"."vision_market_strategies_unique_details" ADD CONSTRAINT "vision_market_strategies_unique__vision_market_strategy_id_fkey" FOREIGN KEY ("vision_market_strategy_id") REFERENCES "public"."vision_market_strategies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."vision_market_strategies_unique_details" ADD CONSTRAINT "vision_market_strategies_unique_details_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."vision_market_strategies_unique_details" ADD CONSTRAINT "vision_market_strategies_unique_details_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "public"."states" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table vision_profit_revenue_details
-- ----------------------------
ALTER TABLE "public"."vision_profit_revenue_details" ADD CONSTRAINT "vision_profit_revenue_details_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."vision_profit_revenue_details" ADD CONSTRAINT "vision_profit_revenue_details_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "public"."states" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."vision_profit_revenue_details" ADD CONSTRAINT "vision_profit_revenue_details_vision_id_fkey" FOREIGN KEY ("vision_id") REFERENCES "public"."visions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."vision_profit_revenue_details" ADD CONSTRAINT "vision_profit_revenue_details_vision_three_year_goals_id_fkey" FOREIGN KEY ("vision_three_year_goal_id") REFERENCES "public"."vision_three_year_goals" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table vision_three_year_goals
-- ----------------------------
ALTER TABLE "public"."vision_three_year_goals" ADD CONSTRAINT "threeYearsGoals_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "public"."states" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."vision_three_year_goals" ADD CONSTRAINT "threeYearsGoals_vision_id_fkey" FOREIGN KEY ("vision_id") REFERENCES "public"."visions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."vision_three_year_goals" ADD CONSTRAINT "three_years_goals_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------
-- Foreign Keys structure for table visions
-- ----------------------------
ALTER TABLE "public"."visions" ADD CONSTRAINT "vision_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."visions" ADD CONSTRAINT "vision_state_id_fkey" FOREIGN KEY ("state_id") REFERENCES "public"."states" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."visions" ADD CONSTRAINT "vision_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
