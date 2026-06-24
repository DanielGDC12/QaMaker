import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { POINT_STATUSES } from "@/lib/constants";

/** Enum de status do ponto — alinhado a lib/constants.ts (fonte única). */
export const pointStatusEnum = pgEnum("point_status", POINT_STATUSES);

/* ── Usuários (derivados do Google, sem senha) ────────────── */
export const users = pgTable("users", {
  email: text("email").primaryKey(),
  name: text("name").notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/* ── Template master (lista padrão de pontos de QA) ───────── */
export const templatePoints = pgTable(
  "template_points",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    category: text("category").notNull(),
    title: text("title").notNull(),
    subtitle: text("subtitle"),
    displayOrder: integer("display_order").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("idx_template_points_order").on(t.displayOrder)]
);

/* ── Projetos (lojas) ─────────────────────────────────────── */
export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.email),
  },
  (t) => [index("idx_projects_created_by").on(t.createdBy)]
);

/* ── Pontos por projeto (cópia independente do template) ──── */
export const projectPoints = pgTable(
  "project_points",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    // Rastreabilidade de origem; nulo se o ponto for criado manualmente.
    templatePointId: uuid("template_point_id").references(
      () => templatePoints.id,
      { onDelete: "set null" }
    ),
    category: text("category").notNull(),
    title: text("title").notNull(),
    subtitle: text("subtitle"),
    displayOrder: integer("display_order").notNull(),
    status: pointStatusEnum("status").default("pendente").notNull(),
    errorImageUrl: text("error_image_url"),
    notes: text("notes"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedBy: text("updated_by").references(() => users.email),
  },
  (t) => [
    index("idx_project_points_project").on(t.projectId),
    index("idx_project_points_status").on(t.projectId, t.status),
  ]
);

/* ── Relations (para a query API do Drizzle) ──────────────── */
export const projectsRelations = relations(projects, ({ many, one }) => ({
  points: many(projectPoints),
  creator: one(users, {
    fields: [projects.createdBy],
    references: [users.email],
  }),
}));

export const projectPointsRelations = relations(projectPoints, ({ one }) => ({
  project: one(projects, {
    fields: [projectPoints.projectId],
    references: [projects.id],
  }),
  templatePoint: one(templatePoints, {
    fields: [projectPoints.templatePointId],
    references: [templatePoints.id],
  }),
}));

/* ── Tipos inferidos ──────────────────────────────────────── */
export type User = typeof users.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type TemplatePoint = typeof templatePoints.$inferSelect;
export type ProjectPoint = typeof projectPoints.$inferSelect;
export type NewProjectPoint = typeof projectPoints.$inferInsert;
