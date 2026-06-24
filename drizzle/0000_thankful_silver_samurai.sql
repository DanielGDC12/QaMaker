CREATE TYPE "public"."point_status" AS ENUM('pendente', 'feito', 'iniciado', 'nao_possivel');--> statement-breakpoint
CREATE TABLE "project_points" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"template_point_id" uuid,
	"category" text NOT NULL,
	"title" text NOT NULL,
	"subtitle" text,
	"display_order" integer NOT NULL,
	"status" "point_status" DEFAULT 'pendente' NOT NULL,
	"error_image_url" text,
	"notes" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "template_points" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" text NOT NULL,
	"title" text NOT NULL,
	"subtitle" text,
	"display_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"email" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_points" ADD CONSTRAINT "project_points_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_points" ADD CONSTRAINT "project_points_template_point_id_template_points_id_fk" FOREIGN KEY ("template_point_id") REFERENCES "public"."template_points"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_points" ADD CONSTRAINT "project_points_updated_by_users_email_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("email") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_users_email_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("email") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_project_points_project" ON "project_points" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_project_points_status" ON "project_points" USING btree ("project_id","status");--> statement-breakpoint
CREATE INDEX "idx_projects_created_by" ON "projects" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_template_points_order" ON "template_points" USING btree ("display_order");