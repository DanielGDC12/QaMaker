"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { del } from "@vercel/blob";
import { requireFGUser } from "@/lib/auth-guard";
import {
  getProjectPoint,
  updateProjectPoint,
  deleteProject,
} from "@/lib/db/queries";
import { POINT_STATUSES, type PointStatus } from "@/lib/constants";

/** Altera o status de um ponto. Registra updated_by (trilha de auditoria). */
export async function updatePointStatus(
  projectId: string,
  pointId: string,
  status: PointStatus
) {
  const user = await requireFGUser();
  if (!POINT_STATUSES.includes(status)) {
    throw new Error("Status inválido.");
  }
  await updateProjectPoint(pointId, { status }, user.email);
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
  const user = await requireFGUser();

  const current = await getProjectPoint(pointId);
  const oldUrl = current?.errorImageUrl ?? null;

  await updateProjectPoint(pointId, { errorImageUrl: url }, user.email);

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
