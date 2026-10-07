"use server";

import { revalidatePath } from "next/cache";
import { requireFGUser } from "@/lib/auth-guard";
import {
  listChecklistTemplate,
  addChecklistTemplateItem,
  updateChecklistTemplateItem,
  deleteChecklistTemplateItem,
  swapChecklistTemplateOrder,
} from "@/lib/db/queries";
import {
  parseChecklistItem,
  sameChecklistTitle,
  findSwapNeighbor,
} from "@/lib/checklist-template";

/*
 * Edição do Checklist FG (template dos itens fixos). SOMENTE FG — todas as
 * actions chamam requireFGUser. Alterações valem só para projetos criados
 * depois: `createProject` copia o template, não referencia.
 */

export interface ChecklistActionState {
  error?: string;
  ok?: boolean;
}

function readItem(formData: FormData) {
  return parseChecklistItem({
    category: String(formData.get("category") ?? ""),
    title: String(formData.get("title") ?? ""),
    subtitle: String(formData.get("subtitle") ?? ""),
  });
}

/** Já existe outro item com este título? (evita duplicar o mesmo ponto) */
async function isDuplicateTitle(title: string, exceptId?: string) {
  const items = await listChecklistTemplate();
  return items.some(
    (i) => i.id !== exceptId && sameChecklistTitle(i.title, title)
  );
}

export async function addChecklistItemAction(
  formData: FormData
): Promise<ChecklistActionState> {
  try {
    const user = await requireFGUser();
    const parsed = readItem(formData);
    if (!parsed.ok) return { error: parsed.error };
    if (await isDuplicateTitle(parsed.value.title))
      return { error: "Já existe um item com este título." };

    await addChecklistTemplateItem(parsed.value, user.email);
    revalidatePath("/checklist");
    return { ok: true };
  } catch {
    return { error: "Não foi possível adicionar o item." };
  }
}

export async function updateChecklistItemAction(
  id: string,
  formData: FormData
): Promise<ChecklistActionState> {
  try {
    const user = await requireFGUser();
    const parsed = readItem(formData);
    if (!parsed.ok) return { error: parsed.error };
    if (await isDuplicateTitle(parsed.value.title, id))
      return { error: "Já existe um item com este título." };

    const row = await updateChecklistTemplateItem(id, parsed.value, user.email);
    if (!row) return { error: "Item não encontrado." };
    revalidatePath("/checklist");
    return { ok: true };
  } catch {
    return { error: "Não foi possível salvar o item." };
  }
}

export async function deleteChecklistItemAction(
  id: string
): Promise<ChecklistActionState> {
  try {
    await requireFGUser();
    await deleteChecklistTemplateItem(id);
    revalidatePath("/checklist");
    return { ok: true };
  } catch {
    return { error: "Não foi possível excluir o item." };
  }
}

/** Sobe/desce o item dentro da sua página (troca com o vizinho da mesma página). */
export async function moveChecklistItemAction(
  id: string,
  direction: "up" | "down"
): Promise<ChecklistActionState> {
  try {
    await requireFGUser();
    const items = await listChecklistTemplate();
    const item = items.find((i) => i.id === id);
    const neighbor = findSwapNeighbor(items, id, direction);
    if (!item || !neighbor) return { ok: true }; // já está na ponta

    await swapChecklistTemplateOrder(item, neighbor);
    revalidatePath("/checklist");
    return { ok: true };
  } catch {
    return { error: "Não foi possível reordenar o item." };
  }
}
