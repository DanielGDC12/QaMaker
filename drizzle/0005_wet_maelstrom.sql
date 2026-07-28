CREATE TABLE "point_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"point_id" uuid NOT NULL,
	"author_id" text NOT NULL,
	"author_is_external" boolean DEFAULT false NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "point_comments" ADD CONSTRAINT "point_comments_point_id_project_points_id_fk" FOREIGN KEY ("point_id") REFERENCES "public"."project_points"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_point_comments_point" ON "point_comments" USING btree ("point_id");