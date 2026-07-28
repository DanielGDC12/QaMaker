"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { headers } from "next/headers";
import { del } from "@vercel/blob";
import {
  requireFGUser,
  requireProjectActor,
  AccessDeniedError,
  type Actor,
} from "@/lib/auth-guard";
import {
  getProjectPoint,
  getMaxDisplayOrder,
  addProjectPoint,
  updateProjectPoint,
  deleteProjectPoint,
  deleteProject,
  listPointComments,
  addPointComment,
  getPointComment,
  deletePointComment,
  setProjectResponsible,
  userExists,
  getProjectProgress,
  getProjectName,
  type PointCommentView,
} from "@/lib/db/queries";
import type { ProjectPoint } from "@/lib/db/schema";
import { notifyResponsible } from "@/lib/slack";
import {
  appOriginFromHeaders,
  pointStatusChangedMessage,
  newPointMessage,
  projectCompletedMessage,
} from "@/lib/slack-messages";
import {
  POINT_STATUSES,
  DONE_STATUSES,
  CATEGORIES,
  type PointStatus,
  type Category,
} from "@/lib/constants";

export interface AddPointState {
  error?: string;
  ok?: boolean;
  pointId?: string;
}

/** Identificador do ator para gravação (e-mail FG ou share.id externo). */
function actorId(actor: Actor): string {
  return actor.type === "fg" ? actor.email : actor.shareId;
}

/** Nome de exibição do ator para as notificações (e-mail FG ou nome externo). */
function actorLabel(actor: Actor): string {
  return actor.type === "fg" ? actor.email : actor.displayName;
}

/**
 * E-mail do ator, se FG — usado como `skipEmail` para não notificar o
 * responsável sobre a própria ação. Ator externo nunca é responsável → null.
 */
function actorEmail(actor: Actor): string | null {
  return actor.type === "fg" ? actor.email : null;
}

/**
 * Garante que o ator pode MUTAR este ponto. FG pode tudo; externo só os
 * pontos que ele mesmo criou. Também confere que o ponto é do projeto.
 * Lança AccessDeniedError se não puder.
 */
function assertCanMutate(
  actor: Actor,
  point: ProjectPoint | null,
  projectId: string
): asserts point is ProjectPoint {
  if (!point || point.projectId !== projectId) throw new AccessDeniedError();
  if (actor.type === "external") {
    if (!point.createdByIsExternal || point.createdBy !== actor.shareId) {
      throw new AccessDeniedError();
    }
  }
}

/**
 * Cria um ponto de QA no projeto, escolhendo a página (categoria). O ponto
 * entra no fim da lista da sua página (display_order = maior atual + 1).
 * A imagem de erro é opcional e já vem enviada (URL do Blob) — o upload é
 * feito no cliente antes de chamar esta action, para a criação ser atômica.
 * Retorna o `pointId` criado. Permitido para FG e ator externo.
 */
export async function addPoint(
  projectId: string,
  formData: FormData
): Promise<AddPointState> {
  const actor = await requireProjectActor(projectId);

  const category = String(formData.get("category") ?? "") as Category;
  const title = String(formData.get("title") ?? "").trim();
  const subtitle = String(formData.get("subtitle") ?? "").trim();
  const rawImage = String(formData.get("errorImageUrl") ?? "").trim();
  // Só aceitamos URL de Blob (https) vinda do nosso próprio endpoint de upload.
  const errorImageUrl = rawImage.startsWith("https://") ? rawImage : null;

  if (!CATEGORIES.includes(category)) return { error: "Página inválida." };
  if (!title) return { error: "Informe o título do ponto." };
  if (title.length > 200) return { error: "Título muito longo." };

  const nextOrder = (await getMaxDisplayOrder(projectId)) + 1;

  const point = await addProjectPoint(
    projectId,
    {
      category,
      title,
      subtitle: subtitle || null,
      displayOrder: nextOrder,
      errorImageUrl,
    },
    { id: actorId(actor), isExternal: actor.type === "external" }
  );

  // Notifica o responsável (best-effort, após a resposta).
  const origin = appOriginFromHeaders(await headers());
  const projectName = (await getProjectName(projectId)) ?? "Projeto";
  after(() =>
    notifyResponsible(
      projectId,
      newPointMessage({
        origin,
        projectId,
        projectName,
        actorName: actorLabel(actor),
        pointTitle: title,
      }),
      { skipEmail: actorEmail(actor) }
    )
  );

  revalidatePath(`/projetos/${projectId}`);
  return { ok: true, pointId: point.id };
}

/** Exclui um ponto do projeto, removendo o blob da imagem de erro (se houver). */
export async function deletePoint(projectId: string, pointId: string) {
  const actor = await requireProjectActor(projectId);

  const point = await getProjectPoint(pointId);
  assertCanMutate(actor, point, projectId);

  const removed = await deleteProjectPoint(pointId);

  if (removed?.errorImageUrl) {
    try {
      await del(removed.errorImageUrl);
    } catch {
      // blob órfão não quebra o fluxo; limpeza periódica resolve.
    }
  }
  revalidatePath(`/projetos/${projectId}`);
}

/** Altera o status de um ponto. Registra updated_by (trilha de auditoria). */
export async function updatePointStatus(
  projectId: string,
  pointId: string,
  status: PointStatus
) {
  const actor = await requireProjectActor(projectId);
  if (!POINT_STATUSES.includes(status)) {
    throw new Error("Status inválido.");
  }

  const point = await getProjectPoint(pointId);
  assertCanMutate(actor, point, projectId);

  const previousStatus = point.status;
  await updateProjectPoint(pointId, { status }, actorId(actor));

  // Notificação (best-effort). Só interessa quando o status VIRA "feito" ou
  // "nao_possivel" (não notificamos transições para "iniciado"/"pendente").
  const wasCountable = DONE_STATUSES.includes(previousStatus);
  const isCountable = DONE_STATUSES.includes(status);
  if (status !== previousStatus && isCountable) {
    const origin = appOriginFromHeaders(await headers());
    const projectName = (await getProjectName(projectId)) ?? "Projeto";
    const skipEmail = actorEmail(actor);

    // Este ponto acabou de virar contável e completou o projeto? → conclusão.
    const { total, done } = await getProjectProgress(projectId);
    const justCompleted = !wasCountable && total > 0 && done === total;

    const message = justCompleted
      ? projectCompletedMessage({
          origin,
          projectId,
          projectName,
          actorName: actorLabel(actor),
        })
      : pointStatusChangedMessage({
          origin,
          projectId,
          projectName,
          actorName: actorLabel(actor),
          pointTitle: point.title,
          status,
        });

    after(() => notifyResponsible(projectId, message, { skipEmail }));
  }

  revalidatePath(`/projetos/${projectId}`);
}

/**
 * Persiste (ou remove) a URL da imagem de erro de um ponto.
 * Ao trocar/remover, deleta o blob antigo (best-effort).
 */
export async function setPointImage(
  projectId: string,
  pointId: string,
  url: string | null
) {
  const actor = await requireProjectActor(projectId);

  const current = await getProjectPoint(pointId);
  assertCanMutate(actor, current, projectId);
  const oldUrl = current.errorImageUrl ?? null;

  await updateProjectPoint(pointId, { errorImageUrl: url }, actorId(actor));

  if (oldUrl && oldUrl !== url) {
    try {
      await del(oldUrl);
    } catch {
      // blob órfão não quebra o fluxo; limpeza periódica resolve.
    }
  }
  revalidatePath(`/projetos/${projectId}`);
}

export interface ResponsibleState {
  error?: string;
  ok?: boolean;
}

/**
 * Define ou remove o responsável pelo projeto. String vazia/"" desatribui.
 * SOMENTE FG — nunca use requireProjectActor aqui. Valida que o e-mail é de um
 * usuário FG existente (o seletor só oferece esses, mas revalidamos no servidor).
 */
export async function setResponsibleAction(
  projectId: string,
  email: string
): Promise<ResponsibleState> {
  try {
    await requireFGUser();

    const value = email.trim() || null;
    if (value && !(await userExists(value))) {
      return { error: "Usuário inválido." };
    }

    await setProjectResponsible(projectId, value);
    revalidatePath(`/projetos/${projectId}`);
    revalidatePath("/projetos");
    return { ok: true };
  } catch {
    return { error: "Não foi possível definir o responsável." };
  }
}

/* ══════════════════════════════════════════════════════════════
   Comentários por ponto (card)
   ══════════════════════════════════════════════════════════════ */

export type CommentsState =
  | { ok: true; comments: PointCommentView[] }
  | { error: string };

/**
 * Garante que o ator pode VER este ponto (e, portanto, seus comentários).
 * FG vê tudo; externo só pontos criados por atores externos. Confere também
 * que o ponto pertence ao projeto.
 */
function assertCanView(
  actor: Actor,
  point: ProjectPoint | null,
  projectId: string
): asserts point is ProjectPoint {
  if (!point || point.projectId !== projectId) throw new AccessDeniedError();
  if (actor.type === "external" && !point.createdByIsExternal) {
    throw new AccessDeniedError();
  }
}

/** Lista os comentários de um ponto (com autor resolvido). */
export async function getPointCommentsAction(
  projectId: string,
  pointId: string
): Promise<CommentsState> {
  try {
    const actor = await requireProjectActor(projectId);
    const point = await getProjectPoint(pointId);
    assertCanView(actor, point, projectId);
    return { ok: true, comments: await listPointComments(pointId) };
  } catch {
    return { error: "Não foi possível carregar os comentários." };
  }
}

/** Adiciona um comentário ao ponto. Retorna a lista atualizada. */
export async function addCommentAction(
  projectId: string,
  pointId: string,
  body: string
): Promise<CommentsState> {
  try {
    const actor = await requireProjectActor(projectId);
    const point = await getProjectPoint(pointId);
    assertCanView(actor, point, projectId);

    const text = body.trim();
    if (!text) return { error: "Escreva um comentário." };
    if (text.length > 2000) return { error: "Comentário muito longo (máx. 2000)." };

    await addPointComment({
      pointId,
      authorId: actorId(actor),
      authorIsExternal: actor.type === "external",
      body: text,
    });

    revalidatePath(`/projetos/${projectId}`);
    return { ok: true, comments: await listPointComments(pointId) };
  } catch {
    return { error: "Não foi possível enviar o comentário." };
  }
}

/**
 * Exclui um comentário — SOMENTE o próprio autor pode (nem FG apaga o de
 * terceiros). Retorna a lista atualizada do ponto.
 */
export async function deleteCommentAction(
  projectId: string,
  commentId: string
): Promise<CommentsState> {
  try {
    const actor = await requireProjectActor(projectId);

    const comment = await getPointComment(commentId);
    if (!comment) return { error: "Comentário não encontrado." };

    const point = await getProjectPoint(comment.pointId);
    assertCanView(actor, point, projectId);

    // Só o autor: id igual E mesmo "espaço" (FG vs externo). E-mails e UUIDs
    // são disjuntos, mas a checagem de isExternal é defesa extra.
    const isAuthor =
      comment.authorId === actorId(actor) &&
      comment.authorIsExternal === (actor.type === "external");
    if (!isAuthor) throw new AccessDeniedError();

    await deletePointComment(commentId);
    revalidatePath(`/projetos/${projectId}`);
    return { ok: true, comments: await listPointComments(comment.pointId) };
  } catch {
    return { error: "Não foi possível excluir o comentário." };
  }
}

/**
 * Exclui o projeto e todos os seus pontos (cascade), removendo os blobs
 * das imagens de erro. Redireciona para a lista ao final.
 * SOMENTE FG — nunca use requireProjectActor aqui.
 */
export async function deleteProjectAction(projectId: string) {
  await requireFGUser();

  const imageUrls = await deleteProject(projectId);

  if (imageUrls.length > 0) {
    try {
      await del(imageUrls);
    } catch {
      // blobs órfãos não quebram a exclusão; limpeza periódica resolve.
    }
  }

  revalidatePath("/projetos");
  redirect("/projetos");
}
