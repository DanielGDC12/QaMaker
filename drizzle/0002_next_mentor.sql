CREATE TABLE "project_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"display_name" text NOT NULL,
	"contact_note" text,
	"token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "project_shares_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "project_points" DROP CONSTRAINT "project_points_updated_by_users_email_fk";
--> statement-breakpoint
ALTER TABLE "project_points" ADD COLUMN "created_by" text;--> statement-breakpoint
ALTER TABLE "project_points" ADD COLUMN "created_by_is_external" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "project_shares" ADD CONSTRAINT "project_shares_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_shares" ADD CONSTRAINT "project_shares_created_by_users_email_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("email") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_project_shares_project" ON "project_shares" USING btree ("project_id");--> statement-breakpoint
-- Backfill manual (drizzle-kit só faz diff estrutural, não de dados).
-- Pontos legados são todos internos (created_by_is_external já nasce false),
-- então basta copiar updated_by → created_by para preencher a autoria.
-- Limitação: para pontos criados por um FG e depois editados por OUTRO FG,
-- updated_by já foi sobrescrito no momento da edição, então este backfill
-- atribui a criação ao ÚLTIMO editor, não ao autor original. É cosmético —
-- não afeta a feature de acesso externo (que depende de created_by_is_external).
UPDATE "project_points" SET "created_by" = "updated_by" WHERE "created_by" IS NULL;