"use server";

import { revalidatePath } from "next/cache";
import { requireFGUser } from "@/lib/auth-guard";
import {
  listTemplatePoints,
  addTemplatePoint,
  updateTemplatePoint,
  deleteTemplatePoint,
} from "@/lib/db/queries";
import { CATEGORIES, type Category } from "@/lib/constants";

export interface FormState {
  error?: string;
  ok?: boolean;
}

function parsePoint(formData: FormData) {
  const category = String(formData.get("category") ?? "") as Category;
  const title = String(formData.get("title") ?? "").trim();
  const subtitle = String(formData.get("subtitle") ?? "").trim();
  if (!CATEGORIES.includes(category)) return { error: "Categoria inválida." };
  if (!title) return { error: "Informe o título do ponto." };
  if (title.length > 200) return { error: "Título muito longo." };
  return { category, title, subtitle: subtitle || null };
}

export async function createTemplatePointAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireFGUser();
  const parsed = parsePoint(formData);
  if ("error" in parsed) return { error: parsed.error };

  const existing = await listTemplatePoints();
  const nextOrder =
    existing.reduce((max, p) => Math.max(max, p.displayOrder), 0) + 1;

  await addTemplatePoint({ ...parsed, displayOrder: nextOrder });
  revalidatePath("/admin/template");
  return { ok: true };
}

export async function editTemplatePointAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireFGUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Ponto inválido." };
  const parsed = parsePoint(formData);
  if ("error" in parsed) return { error: parsed.error };

  await updateTemplatePoint(id, parsed);
  revalidatePath("/admin/template");
  return { ok: true };
}

export async function removeTemplatePointAction(formData: FormData) {
  await requireFGUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await deleteTemplatePoint(id);
  revalidatePath("/admin/template");
}
