ALTER TABLE IF EXISTS "template_points" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE IF EXISTS "template_points" CASCADE;--> statement-breakpoint
ALTER TABLE "project_points" DROP CONSTRAINT IF EXISTS "project_points_template_point_id_template_points_id_fk";
--> statement-breakpoint
ALTER TABLE "project_points" DROP COLUMN IF EXISTS "template_point_id";
