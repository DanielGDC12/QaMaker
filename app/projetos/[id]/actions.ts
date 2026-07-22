"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { del } from "@vercel/blob";
import {
  requireFGUser,
  requireProjectActor,
  AccessDeniedError,
  type Actor,
} from "@/lib/auth-guard";
import {
  getProjectPoint,
  getProjectPoints,
  addProjectPoint,
  updateProjectPoint,
  deleteProjectPoint,
  deleteProject,
} from "@/lib/db/queries";
import type { ProjectPoint } from "@/lib/db/schema";
import {
  POINT_STATUSES,
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

  const existing = await getProjectPoints(projectId, actor);
  const nextOrder =
    existing.reduce((max, p) => Math.max(max, p.displayOrder), 0) + 1;

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

  await updateProjectPoint(pointId, { status }, actorId(actor));
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
