import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
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

/* ── Acessos externos (compartilhamento por link tokenizado) ──
   Representa "a FG liberou acesso a UM projeto para a pessoa X". O ator
   externo não passa por Google OAuth — logo, não tem linha em `users`. O
   token bruto NUNCA é persistido (só o hash sha256). Nunca deletamos a
   linha: revogar apenas seta `revokedAt`, para os pontos criados por esse
   ator continuarem resolvíveis (nome de exibição na trilha de auditoria). */
export const projectShares = pgTable(
  "project_shares",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    displayName: text("display_name").notNull(),
    // Texto livre — referência interna da FG. NUNCA usado para autenticação.
    contactNote: text("contact_note"),
    // sha256(token) em hex. O token bruto só existe no momento da criação.
    tokenHash: text("token_hash").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.email),
    // null = ativo. Revogação é soft-delete (preserva a autoria dos pontos).
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [index("idx_project_shares_project").on(t.projectId)]
);

/* ── Pontos por projeto (criados manualmente por auditoria) ── */
export const projectPoints = pgTable(
  "project_points",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
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
    // Campo polimórfico: e-mail FG (users.email) OU project_shares.id.
    // Sem FK — os dois espaços de valores são disjuntos (e-mail vs UUID) e
    // um ator externo pode ser o último editor de um ponto que ele criou.
    createdBy: text("created_by"),
    // Discriminador barato p/ o filtro de visibilidade e a tag "Qa Cliente"
    // (evita JOIN no caminho quente). Todo ponto legado nasce como false.
    createdByIsExternal: boolean("created_by_is_external")
      .default(false)
      .notNull(),
    // Somente exibição ("Atualizado por X"). Sem FK — pode ser um share.id.
    updatedBy: text("updated_by"),
  },
  (t) => [
    index("idx_project_points_project").on(t.projectId),
    index("idx_project_points_status").on(t.projectId, t.status),
  ]
);

/* ── Relations (para a query API do Drizzle) ──────────────── */
export const projectsRelations = relations(projects, ({ many, one }) => ({
  points: many(projectPoints),
  shares: many(projectShares),
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
}));

export const projectSharesRelations = relations(projectShares, ({ one }) => ({
  project: one(projects, {
    fields: [projectShares.projectId],
    references: [projects.id],
  }),
}));

/* ── Tipos inferidos ──────────────────────────────────────── */
export type User = typeof users.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type ProjectPoint = typeof projectPoints.$inferSelect;
export type NewProjectPoint = typeof projectPoints.$inferInsert;
export type ProjectShare = typeof projectShares.$inferSelect;
export type NewProjectShare = typeof projectShares.$inferInsert;
