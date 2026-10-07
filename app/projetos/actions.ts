"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireFGUser } from "@/lib/auth-guard";
import { createProject as createProjectRow } from "@/lib/db/queries";
import { normalizeProjectUrl } from "@/lib/project-links";

export interface CreateProjectState {
  error?: string;
}

/**
 * Cria um projeto já com uma cópia do Checklist FG (template editável na aba
 * /checklist) e, opcionalmente, os links de Figma e Admin. Pontos extras são
 * adicionados na página do projeto. Verifica sessão + domínio (defesa em
 * profundidade além do proxy).
 */
export async function createProject(
  _prev: CreateProjectState,
  formData: FormData
): Promise<CreateProjectState> {
  const user = await requireFGUser();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Informe o nome da loja." };
  if (name.length > 120)
    return { error: "Nome muito longo (máximo 120 caracteres)." };

  const figma = normalizeProjectUrl(String(formData.get("figmaUrl") ?? ""));
  if (!figma.ok) return { error: `Figma: ${figma.error}` };
  const admin = normalizeProjectUrl(String(formData.get("adminUrl") ?? ""));
  if (!admin.ok) return { error: `Admin: ${admin.error}` };

  const id = await createProjectRow(name, user.email, {
    figmaUrl: figma.url,
    adminUrl: admin.url,
  });

  revalidatePath("/projetos");
  redirect(`/projetos/${id}`);
}
