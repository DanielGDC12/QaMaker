import { eq, asc, desc, sql, and } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "./index";
import { projects, projectPoints, projectShares, users } from "./schema";
import type { PointStatus, Category } from "@/lib/constants";
import type { Actor } from "@/lib/auth-guard";

/* ── Usuários ─────────────────────────────────────────────── */
export async function upsertUser(u: {
  email: string;
  name: string;
  avatarUrl?: string | null;
}) {
  await db
    .insert(users)
    .values({ email: u.email, name: u.name, avatarUrl: u.avatarUrl ?? null })
    .onConflictDoUpdate({
      target: users.email,
      set: { name: u.name, avatarUrl: u.avatarUrl ?? null },
    });
}

/* ── Projetos: lista com progresso agregado ───────────────── */
export interface ProjectWithProgress {
  id: string;
  name: string;
  createdAt: Date;
  createdBy: string;
  total: number;
  done: number;
  pct: number;
}

export async function listProjectsWithProgress(): Promise<
  ProjectWithProgress[]
> {
  const doneFilter = sql<number>`count(*) filter (where ${projectPoints.status} in ('feito','nao_possivel'))`;
  const totalCount = sql<number>`count(${projectPoints.id})`;

  const rows = await db
    .select({
      id: projects.id,
      name: projects.name,
      createdAt: projects.createdAt,
      createdBy: projects.createdBy,
      total: totalCount,
      done: doneFilter,
    })
    .from(projects)
    .leftJoin(projectPoints, eq(projectPoints.projectId, projects.id))
    .groupBy(projects.id)
    .orderBy(desc(projects.createdAt));

  return rows.map((r) => {
    const total = Number(r.total);
    const done = Number(r.done);
    return {
      ...r,
      total,
      done,
      pct: total === 0 ? 0 : Math.round((done / total) * 100),
    };
  });
}

/* ── Projeto individual + pontos ──────────────────────────── */
export async function getProject(id: string) {
  const [row] = await db.select().from(projects).where(eq(projects.id, id));
  return row ?? null;
}

export async function getProjectPoint(pointId: string) {
  const [row] = await db
    .select()
    .from(projectPoints)
    .where(eq(projectPoints.id, pointId));
  return row ?? null;
}

/**
 * Ponto enriquecido com o nome de exibição do autor/editor quando for um
 * ator externo (resolvido via JOIN com project_shares). Para atores FG, os
 * campos *DisplayName vêm null (a UI cai no e-mail).
 */
export type ProjectPointWithActor = typeof projectPoints.$inferSelect & {
  createdByDisplayName: string | null;
  updatedByDisplayName: string | null;
};

/**
 * Pontos de um projeto, filtrados por ator:
 * - FG vê tudo;
 * - externo vê SÓ pontos criados por atores externos (de qualquer share do
 *   projeto — não só os próprios; a restrição de "só os próprios" vale para
 *   editar/excluir, não para visualizar).
 *
 * `created_by`/`updated_by` são polimórficos (e-mail FG ou share.id uuid);
 * o cast `::text` no JOIN permite casar o uuid do share sem erro de tipo
 * (e-mails simplesmente não casam com nenhum uuid → DisplayName null).
 */
export async function getProjectPoints(
  projectId: string,
  actor: Actor
): Promise<ProjectPointWithActor[]> {
  const createdByShare = alias(projectShares, "created_by_share");
  const updatedByShare = alias(projectShares, "updated_by_share");

  return db
    .select({
      id: projectPoints.id,
      projectId: projectPoints.projectId,
      category: projectPoints.category,
      title: projectPoints.title,
      subtitle: projectPoints.subtitle,
      displayOrder: projectPoints.displayOrder,
      status: projectPoints.status,
      errorImageUrl: projectPoints.errorImageUrl,
      notes: projectPoints.notes,
      updatedAt: projectPoints.updatedAt,
      createdBy: projectPoints.createdBy,
      createdByIsExternal: projectPoints.createdByIsExternal,
      updatedBy: projectPoints.updatedBy,
      createdByDisplayName: createdByShare.displayName,
      updatedByDisplayName: updatedByShare.displayName,
    })
    .from(projectPoints)
    .leftJoin(
      createdByShare,
      sql`${projectPoints.createdBy} = ${createdByShare.id}::text`
    )
    .leftJoin(
      updatedByShare,
      sql`${projectPoints.updatedBy} = ${updatedByShare.id}::text`
    )
    .where(
      actor.type === "fg"
        ? eq(projectPoints.projectId, projectId)
        : and(
            eq(projectPoints.projectId, projectId),
            eq(projectPoints.createdByIsExternal, true)
          )
    )
    .orderBy(asc(projectPoints.displayOrder));
}

/* ── Criar projeto vazio (pontos são adicionados manualmente) ── */
export async function createProject(
  name: string,
  createdBy: string
): Promise<string> {
  const [row] = await db
    .insert(projects)
    .values({ name, createdBy })
    .returning({ id: projects.id });
  return row.id;
}

/* ── Atualizar um ponto do projeto ────────────────────────── */
export async function updateProjectPoint(
  pointId: string,
  patch: {
    status?: PointStatus;
    errorImageUrl?: string | null;
    notes?: string | null;
  },
  updatedBy: string
) {
  const [row] = await db
    .update(projectPoints)
    .set({ ...patch, updatedBy, updatedAt: new Date() })
    .where(eq(projectPoints.id, pointId))
    .returning();
  return row ?? null;
}

/* ── Adicionar ponto manual a um projeto ──────────────────── */
export async function addProjectPoint(
  projectId: string,
  data: {
    category: Category;
    title: string;
    subtitle?: string | null;
    displayOrder: number;
    errorImageUrl?: string | null;
  },
  /** Autor: `id` = e-mail FG ou share.id; `isExternal` marca a origem. */
  author: { id: string; isExternal: boolean }
) {
  const [row] = await db
    .insert(projectPoints)
    .values({
      projectId,
      ...data,
      createdBy: author.id,
      createdByIsExternal: author.isExternal,
      updatedBy: author.id,
    })
    .returning();
  return row;
}

export async function deleteProjectPoint(pointId: string) {
  const [row] = await db
    .delete(projectPoints)
    .where(eq(projectPoints.id, pointId))
    .returning({ errorImageUrl: projectPoints.errorImageUrl });
  return row ?? null;
}

/* ── Acessos externos (project_shares) ────────────────────── */

/** Cria um share já com o token hasheado. Retorna a linha criada. */
export async function createShareRow(data: {
  projectId: string;
  displayName: string;
  contactNote?: string | null;
  tokenHash: string;
  createdBy: string;
}) {
  const [row] = await db
    .insert(projectShares)
    .values({
      projectId: data.projectId,
      displayName: data.displayName,
      contactNote: data.contactNote ?? null,
      tokenHash: data.tokenHash,
      createdBy: data.createdBy,
    })
    .returning();
  return row;
}

/** Busca um share ATIVO pelo hash do token (usado na redenção do link). */
export async function getShareByTokenHash(tokenHash: string) {
  const [row] = await db
    .select()
    .from(projectShares)
    .where(
      and(
        eq(projectShares.tokenHash, tokenHash),
        sql`${projectShares.revokedAt} is null`
      )
    );
  return row ?? null;
}

/** Busca um share por id (usado na re-checagem de revogação por requisição). */
export async function getShareById(id: string) {
  const [row] = await db
    .select()
    .from(projectShares)
    .where(eq(projectShares.id, id));
  return row ?? null;
}

/** Lista os shares de um projeto (ativos e revogados), mais recentes primeiro. */
export async function listSharesForProject(projectId: string) {
  return db
    .select()
    .from(projectShares)
    .where(eq(projectShares.projectId, projectId))
    .orderBy(desc(projectShares.createdAt));
}

/** Revoga (soft-delete) um share. Retorna a linha atualizada (ou null). */
export async function revokeShareRow(shareId: string) {
  const [row] = await db
    .update(projectShares)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(projectShares.id, shareId),
        sql`${projectShares.revokedAt} is null`
      )
    )
    .returning();
  return row ?? null;
}

/* ── Deletar projeto (retorna URLs de imagem para limpar Blob) ── */
export async function deleteProject(projectId: string): Promise<string[]> {
  const imgs = await db
    .select({ url: projectPoints.errorImageUrl })
    .from(projectPoints)
    .where(
      and(
        eq(projectPoints.projectId, projectId),
        // apenas os que têm imagem
        sql`${projectPoints.errorImageUrl} is not null`
      )
    );
  // cascade remove os project_points automaticamente
  await db.delete(projects).where(eq(projects.id, projectId));
  return imgs.map((i) => i.url).filter((u): u is string => Boolean(u));
}
