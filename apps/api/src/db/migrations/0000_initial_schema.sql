CREATE TYPE "public"."indicator_type_enum" AS ENUM('indice', 'subindice', 'indicador');--> statement-breakpoint
CREATE TYPE "public"."road_type_enum" AS ENUM('federal', 'estadual');--> statement-breakpoint
CREATE TYPE "public"."indicator_level_enum" AS ENUM('index', 'subindex', 'indicator');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'gt_member');--> statement-breakpoint
CREATE TABLE "workgroups" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"icon" text,
	"color" text,
	"geometry_type" text NOT NULL,
	"active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "geometries_agua_doce" (
	"id" text PRIMARY KEY NOT NULL,
	"workgroup_id" text NOT NULL,
	"name" text NOT NULL,
	"geometry" text NOT NULL,
	"properties" text,
	"simplified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "hydrobasins_geometries" (
	"hybas_id" text PRIMARY KEY NOT NULL,
	"geometry" geometry(MultiPolygon, 4326) NOT NULL,
	"simplified_geometry" geometry(MultiPolygon, 4326),
	"properties" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "municipality_geometries" (
	"codigo" text PRIMARY KEY NOT NULL,
	"municipio" text NOT NULL,
	"geometry" geometry(MultiPolygon, 4326) NOT NULL,
	"simplified_geometry" geometry(MultiPolygon, 4326),
	"properties" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "indicator_hierarchy" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workgroup_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"type" "indicator_type_enum" NOT NULL,
	"parent_id" uuid,
	"order" integer DEFAULT 0 NOT NULL,
	"unit" text,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "indicator_hierarchy_parent_check" CHECK (
        (
          "indicator_hierarchy"."type" = 'indice'::indicator_type_enum AND "indicator_hierarchy"."parent_id" IS NULL
        )
        OR (
          "indicator_hierarchy"."type" <> 'indice'::indicator_type_enum AND "indicator_hierarchy"."parent_id" IS NOT NULL
        )
      )
);
--> statement-breakpoint
CREATE TABLE "indicator_values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"indicator_id" uuid NOT NULL,
	"hybas_id" text NOT NULL,
	"value" numeric(14, 6) NOT NULL,
	"normalized_value" numeric(6, 4),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "indicator_values_normalized_value_range" CHECK (
      "indicator_values"."normalized_value" IS NULL OR
      ("indicator_values"."normalized_value" >= 0 AND "indicator_values"."normalized_value" <= 1)
    )
);
--> statement-breakpoint
CREATE TABLE "health_indicator_values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"indicator_id" uuid NOT NULL,
	"codigo_municipio" text NOT NULL,
	"value" numeric(14, 6) NOT NULL,
	"normalized_value" numeric(6, 4),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "health_indicator_values_normalized_value_range" CHECK (
        "health_indicator_values"."normalized_value" IS NULL OR
        ("health_indicator_values"."normalized_value" >= 0 AND "health_indicator_values"."normalized_value" <= 1)
      )
);
--> statement-breakpoint
CREATE TABLE "coastal_indicator_values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"indicator_id" uuid NOT NULL,
	"codigo_municipio" text NOT NULL,
	"value" numeric(14, 6) NOT NULL,
	"normalized_value" numeric(6, 4),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coastal_indicator_values_normalized_value_range" CHECK (
        "coastal_indicator_values"."normalized_value" IS NULL OR
        ("coastal_indicator_values"."normalized_value" >= 0 AND "coastal_indicator_values"."normalized_value" <= 1)
      )
);
--> statement-breakpoint
CREATE TABLE "indicators" (
	"id" text PRIMARY KEY NOT NULL,
	"workgroup_id" text NOT NULL,
	"parent_id" text,
	"name" text NOT NULL,
	"description" text,
	"unit" text,
	"type" text NOT NULL,
	"order" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "geometries_transportes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workgroup_id" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(50),
	"road_type" "road_type_enum" NOT NULL,
	"geometry" geometry(LineString, 4326) NOT NULL,
	"length_km" numeric(10, 2),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "indicators_transportes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workgroup_id" text NOT NULL,
	"parent_id" uuid,
	"name" varchar(255) NOT NULL,
	"description" text,
	"unit" varchar(50),
	"level" "indicator_level_enum" NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "indicator_data" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"geometry_id" uuid NOT NULL,
	"indicator_id" uuid NOT NULL,
	"value" numeric(10, 4) NOT NULL,
	"normalized_value" numeric(5, 4),
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "export_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workgroup_id" text NOT NULL,
	"indicator_id" uuid NOT NULL,
	"format" text NOT NULL,
	"user_ip" text NOT NULL,
	"records_count" integer NOT NULL,
	"file_size_bytes" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"workgroup_id" text,
	"role" "user_role" DEFAULT 'gt_member' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "staging_uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"workgroup_id" varchar(50) NOT NULL,
	"indicator_id" uuid NOT NULL,
	"filename" varchar(255) NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "upload_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"workgroup_id" text NOT NULL,
	"filename" varchar(255) NOT NULL,
	"file_size_bytes" bigint NOT NULL,
	"mime_type" varchar(100),
	"status" varchar(20) NOT NULL,
	"features_count" integer,
	"indicators_loaded" integer,
	"errors" jsonb,
	"stats" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "upload_logs_status_check" CHECK ("upload_logs"."status" in ('processing', 'validating', 'completed', 'failed', 'committed', 'cancelled', 'expired'))
);
--> statement-breakpoint
CREATE TABLE "comite_aggregations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"comite_nome" text NOT NULL,
	"indicator_id" uuid NOT NULL,
	"mean_value" numeric(10, 4) NOT NULL,
	"count" integer NOT NULL,
	"min_value" numeric(10, 4) NOT NULL,
	"max_value" numeric(10, 4) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "geometries_agua_doce" ADD CONSTRAINT "geometries_agua_doce_workgroup_id_workgroups_id_fk" FOREIGN KEY ("workgroup_id") REFERENCES "public"."workgroups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indicator_hierarchy" ADD CONSTRAINT "indicator_hierarchy_workgroup_id_workgroups_id_fk" FOREIGN KEY ("workgroup_id") REFERENCES "public"."workgroups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indicator_hierarchy" ADD CONSTRAINT "indicator_hierarchy_parent_id_indicator_hierarchy_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."indicator_hierarchy"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indicator_values" ADD CONSTRAINT "indicator_values_indicator_id_indicator_hierarchy_id_fk" FOREIGN KEY ("indicator_id") REFERENCES "public"."indicator_hierarchy"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "indicator_values" ADD CONSTRAINT "indicator_values_hybas_id_hydrobasins_geometries_hybas_id_fk" FOREIGN KEY ("hybas_id") REFERENCES "public"."hydrobasins_geometries"("hybas_id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "health_indicator_values" ADD CONSTRAINT "health_indicator_values_indicator_id_indicator_hierarchy_id_fk" FOREIGN KEY ("indicator_id") REFERENCES "public"."indicator_hierarchy"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "health_indicator_values" ADD CONSTRAINT "health_indicator_values_codigo_municipio_municipality_geometries_codigo_fk" FOREIGN KEY ("codigo_municipio") REFERENCES "public"."municipality_geometries"("codigo") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "coastal_indicator_values" ADD CONSTRAINT "coastal_indicator_values_indicator_id_indicator_hierarchy_id_fk" FOREIGN KEY ("indicator_id") REFERENCES "public"."indicator_hierarchy"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "coastal_indicator_values" ADD CONSTRAINT "coastal_indicator_values_codigo_municipio_municipality_geometries_codigo_fk" FOREIGN KEY ("codigo_municipio") REFERENCES "public"."municipality_geometries"("codigo") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "indicators" ADD CONSTRAINT "indicators_workgroup_id_workgroups_id_fk" FOREIGN KEY ("workgroup_id") REFERENCES "public"."workgroups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indicators" ADD CONSTRAINT "indicators_parent_id_indicators_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."indicators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geometries_transportes" ADD CONSTRAINT "geometries_transportes_workgroup_id_workgroups_id_fk" FOREIGN KEY ("workgroup_id") REFERENCES "public"."workgroups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indicators_transportes" ADD CONSTRAINT "indicators_transportes_workgroup_id_workgroups_id_fk" FOREIGN KEY ("workgroup_id") REFERENCES "public"."workgroups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indicators_transportes" ADD CONSTRAINT "indicators_transportes_parent_id_indicators_transportes_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."indicators_transportes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indicator_data" ADD CONSTRAINT "indicator_data_geometry_id_geometries_transportes_id_fk" FOREIGN KEY ("geometry_id") REFERENCES "public"."geometries_transportes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indicator_data" ADD CONSTRAINT "indicator_data_indicator_id_indicators_transportes_id_fk" FOREIGN KEY ("indicator_id") REFERENCES "public"."indicators_transportes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "export_logs" ADD CONSTRAINT "export_logs_workgroup_id_workgroups_id_fk" FOREIGN KEY ("workgroup_id") REFERENCES "public"."workgroups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_workgroup_id_workgroups_id_fk" FOREIGN KEY ("workgroup_id") REFERENCES "public"."workgroups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_logs" ADD CONSTRAINT "upload_logs_user_id_admin_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."admin_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_logs" ADD CONSTRAINT "upload_logs_workgroup_id_workgroups_id_fk" FOREIGN KEY ("workgroup_id") REFERENCES "public"."workgroups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comite_aggregations" ADD CONSTRAINT "comite_aggregations_indicator_id_indicator_hierarchy_id_fk" FOREIGN KEY ("indicator_id") REFERENCES "public"."indicator_hierarchy"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_hydrobasins_geometry" ON "hydrobasins_geometries" USING gist ("geometry");--> statement-breakpoint
CREATE INDEX "idx_hydrobasins_simplified_geometry" ON "hydrobasins_geometries" USING gist ("simplified_geometry");--> statement-breakpoint
CREATE INDEX "idx_municipality_geometry" ON "municipality_geometries" USING gist ("geometry");--> statement-breakpoint
CREATE INDEX "idx_municipality_simplified_geometry" ON "municipality_geometries" USING gist ("simplified_geometry");--> statement-breakpoint
CREATE INDEX "idx_municipality_municipio" ON "municipality_geometries" USING btree ("municipio");--> statement-breakpoint
CREATE UNIQUE INDEX "indicator_hierarchy_code_unique" ON "indicator_hierarchy" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "indicator_values_indicator_hybas_unique" ON "indicator_values" USING btree ("indicator_id","hybas_id");--> statement-breakpoint
CREATE INDEX "idx_health_indicator_municipio" ON "health_indicator_values" USING btree ("indicator_id","codigo_municipio");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_health_indicator_municipio" ON "health_indicator_values" USING btree ("indicator_id","codigo_municipio");--> statement-breakpoint
CREATE INDEX "idx_coastal_indicator_municipio" ON "coastal_indicator_values" USING btree ("indicator_id","codigo_municipio");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_coastal_indicator_municipio" ON "coastal_indicator_values" USING btree ("indicator_id","codigo_municipio");--> statement-breakpoint
CREATE UNIQUE INDEX "indicator_data_geometry_indicator_unique" ON "indicator_data" USING btree ("geometry_id","indicator_id");--> statement-breakpoint
CREATE INDEX "idx_export_logs_workgroup" ON "export_logs" USING btree ("workgroup_id");--> statement-breakpoint
CREATE INDEX "idx_export_logs_created_at" ON "export_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_upload_logs_user_id" ON "upload_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_upload_logs_status" ON "upload_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_upload_logs_created_at" ON "upload_logs" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "comite_aggregations_comite_indicator_unique" ON "comite_aggregations" USING btree ("comite_nome","indicator_id");--> statement-breakpoint
CREATE INDEX "idx_comite_aggregations_comite" ON "comite_aggregations" USING btree ("comite_nome");--> statement-breakpoint
CREATE INDEX "idx_comite_aggregations_indicator" ON "comite_aggregations" USING btree ("indicator_id");--> statement-breakpoint
ALTER TABLE "geometries_transportes" ADD CONSTRAINT "geometries_transportes_code_key" UNIQUE ("code");--> statement-breakpoint
CREATE INDEX "idx_geometries_transportes_geometry" ON "geometries_transportes" USING gist ("geometry");--> statement-breakpoint
CREATE INDEX "idx_geometries_transportes_workgroup" ON "geometries_transportes" USING btree ("workgroup_id");--> statement-breakpoint
CREATE INDEX "idx_geometries_transportes_road_type" ON "geometries_transportes" USING btree ("road_type");--> statement-breakpoint
CREATE INDEX "idx_indicator_data_indicator_id" ON "indicator_data" USING btree ("indicator_id");--> statement-breakpoint
CREATE INDEX "idx_indicator_data_geometry_id" ON "indicator_data" USING btree ("geometry_id");--> statement-breakpoint
CREATE INDEX "idx_indicators_transportes_workgroup" ON "indicators_transportes" USING btree ("workgroup_id");--> statement-breakpoint
CREATE INDEX "idx_indicators_transportes_parent" ON "indicators_transportes" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "idx_indicators_transportes_level" ON "indicators_transportes" USING btree ("level");