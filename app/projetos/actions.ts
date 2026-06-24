"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireFGUser } from "@/lib/auth-guard";
import { createProjectFromTemplate } from "@/lib/db/queries";

export interface CreateProjectState {
  error?: string;
}

/**
 * Cria um projeto copiando o template master como pontos independentes.
 * Verifica sessão + domínio (defesa em profundidade além do proxy).
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

  const id = await createProjectFromTemplate(name, user.email);

  revalidatePath("/projetos");
  redirect(`/projetos/${id}`);
}
