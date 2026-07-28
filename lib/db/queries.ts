import { eq, asc, desc, sql, and, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "./index";
import {
  projects,
  projectPoints,
  projectShares,
  users,
  apiTokens,
  pointComments,
} from "./schema";
import type { PointStatus, Category } from "@/lib/constants";
import { DEFAULT_PROJECT_POINTS } from "@/lib/default-points";
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
  commentCount: number;
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
      createdViaExtension: projectPoints.createdViaExtension,
      updatedBy: projectPoints.updatedBy,
      createdByDisplayName: createdByShare.displayName,
      updatedByDisplayName: updatedByShare.displayName,
      commentCount: sql<number>`(select count(*)::int from ${pointComments} where ${pointComments.pointId} = ${projectPoints.id})`,
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

/* ── Criar projeto já com o checklist padrão ───────────────
   O id é gerado aqui (e não pelo `defaultRandom()` do banco) para que os dois
   inserts caibam num único `db.batch()` — o driver neon-http não suporta
   `db.transaction()`, mas o batch vai numa só requisição transacional, então
   nunca sobra projeto sem pontos (nem pontos sem projeto). */
export async function createProject(
  name: string,
  createdBy: string
): Promise<string> {
  const id = crypto.randomUUID();

  await db.batch([
    db.insert(projects).values({ id, name, createdBy }),
    db.insert(projectPoints).values(
      DEFAULT_PROJECT_POINTS.map((p, i) => ({
        projectId: id,
        category: p.category,
        title: p.title,
        subtitle: p.subtitle ?? null,
        displayOrder: i + 1,
        createdBy,
        createdByIsExternal: false,
        updatedBy: createdBy,
      }))
    ),
  ]);

  return id;
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

/**
 * Maior `display_order` do projeto, ignorando o filtro por ator. Necessário
 * porque o ator externo só *enxerga* os pontos externos: derivar a próxima
 * ordem da lista visível colidiria com os pontos do checklist padrão.
 */
export async function getMaxDisplayOrder(projectId: string): Promise<number> {
  const [row] = await db
    .select({
      max: sql<number | null>`max(${projectPoints.displayOrder})`,
    })
    .from(projectPoints)
    .where(eq(projectPoints.projectId, projectId));
  return Number(row?.max ?? 0);
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

/* ══════════════════════════════════════════════════════════════
   Extensão de navegador (/api/ext/*)
   ══════════════════════════════════════════════════════════════ */

/** Lista simples de projetos (id + nome) para o seletor da extensão. */
export async function listProjectsBasic(): Promise<
  { id: string; name: string }[]
> {
  return db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .orderBy(desc(projects.createdAt));
}

/**
 * Cria um "card" (ponto manual) a partir da extensão, já com imagem e descrição.
 * O autor é sempre um usuário FG (dono do token), logo `isExternal` = false.
 * A descrição vai para `subtitle` (campo que a UI exibe como descrição do ponto).
 * `createdViaExtension` marca a origem para a tag "Extensão". O ponto entra no
 * fim da lista (maior display_order + 1).
 */
export async function createExtensionCard(
  projectId: string,
  data: {
    category: Category;
    title: string;
    description: string | null;
    errorImageUrl: string;
  },
  createdBy: string
) {
  const displayOrder = (await getMaxDisplayOrder(projectId)) + 1;
  const [row] = await db
    .insert(projectPoints)
    .values({
      projectId,
      category: data.category,
      title: data.title,
      subtitle: data.description,
      displayOrder,
      status: "pendente",
      errorImageUrl: data.errorImageUrl,
      createdBy,
      createdByIsExternal: false,
      createdViaExtension: true,
      updatedBy: createdBy,
    })
    .returning();
  return row;
}

/* ── Tokens de API (autenticação da extensão) ─────────────── */

/** Persiste um novo token (recebe já o hash) e retorna o registro. */
export async function createApiToken(data: {
  email: string;
  tokenHash: string;
  label: string;
}) {
  const [row] = await db.insert(apiTokens).values(data).returning();
  return row;
}

/** Tokens ativos de um usuário (revogados ficam de fora). */
export async function listApiTokens(email: string) {
  return db
    .select({
      id: apiTokens.id,
      label: apiTokens.label,
      createdAt: apiTokens.createdAt,
      lastUsedAt: apiTokens.lastUsedAt,
    })
    .from(apiTokens)
    .where(and(eq(apiTokens.email, email), isNull(apiTokens.revokedAt)))
    .orderBy(desc(apiTokens.createdAt));
}

/** Marca um token como revogado (só o dono pode revogar o próprio). */
export async function revokeApiToken(id: string, email: string) {
  await db
    .update(apiTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiTokens.id, id), eq(apiTokens.email, email)));
}

/**
 * Resolve um token (por hash) para o e-mail do dono, se válido e não revogado.
 * Atualiza `lastUsedAt` (best-effort) e retorna o e-mail, ou null.
 */
export async function resolveApiToken(
  tokenHash: string
): Promise<string | null> {
  const [row] = await db
    .select({ id: apiTokens.id, email: apiTokens.email })
    .from(apiTokens)
    .where(and(eq(apiTokens.tokenHash, tokenHash), isNull(apiTokens.revokedAt)));
  if (!row) return null;
  try {
    await db
      .update(apiTokens)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiTokens.id, row.id));
  } catch {
    // atualização de telemetria não deve derrubar a autenticação
  }
  return row.email;
}

/* ── Comentários por ponto ────────────────────────────────── */

/** Comentário já com o nome/avatar do autor resolvido (FG ou externo). */
export interface PointCommentView {
  id: string;
  body: string;
  createdAt: Date;
  authorId: string;
  authorIsExternal: boolean;
  authorName: string;
  authorAvatar: string | null;
}

/** Lista os comentários de um ponto (mais antigos primeiro), com autor. */
export async function listPointComments(
  pointId: string
): Promise<PointCommentView[]> {
  const authorShare = alias(projectShares, "comment_author_share");
  const rows = await db
    .select({
      id: pointComments.id,
      body: pointComments.body,
      createdAt: pointComments.createdAt,
      authorId: pointComments.authorId,
      authorIsExternal: pointComments.authorIsExternal,
      fgName: users.name,
      fgAvatar: users.avatarUrl,
      extName: authorShare.displayName,
    })
    .from(pointComments)
    .leftJoin(users, eq(pointComments.authorId, users.email))
    .leftJoin(authorShare, sql`${pointComments.authorId} = ${authorShare.id}::text`)
    .where(eq(pointComments.pointId, pointId))
    .orderBy(asc(pointComments.createdAt));

  return rows.map((r) => ({
    id: r.id,
    body: r.body,
    createdAt: r.createdAt,
    authorId: r.authorId,
    authorIsExternal: r.authorIsExternal,
    authorName:
      r.extName ?? r.fgName ?? r.authorId.split("@")[0] ?? "Desconhecido",
    authorAvatar: r.authorIsExternal ? null : r.fgAvatar ?? null,
  }));
}

/** Insere um comentário e retorna a linha crua. */
export async function addPointComment(data: {
  pointId: string;
  authorId: string;
  authorIsExternal: boolean;
  body: string;
}) {
  const [row] = await db.insert(pointComments).values(data).returning();
  return row;
}

/** Busca um comentário por id (para checagem de posse na exclusão). */
export async function getPointComment(id: string) {
  const [row] = await db
    .select()
    .from(pointComments)
    .where(eq(pointComments.id, id));
  return row ?? null;
}

/** Exclui um comentário. */
export async function deletePointComment(id: string) {
  await db.delete(pointComments).where(eq(pointComments.id, id));
}
