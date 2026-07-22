"use server";

import { revalidatePath } from "next/cache";
import { requireFGUser } from "@/lib/auth-guard";
import { generateApiToken, hashApiToken } from "@/lib/api-token";
import { createApiToken, revokeApiToken } from "@/lib/db/queries";

export interface CreateTokenState {
  error?: string;
  /** Token em claro — retornado UMA única vez para o usuário copiar. */
  token?: string;
  label?: string;
}

/**
 * Gera um token de API pessoal. O valor em claro só existe nesta resposta —
 * o banco guarda apenas o hash. Se o usuário perder, precisa gerar outro.
 */
export async function createTokenAction(
  _prev: CreateTokenState,
  formData: FormData
): Promise<CreateTokenState> {
  const user = await requireFGUser();

  const label = String(formData.get("label") ?? "").trim();
  if (!label) return { error: "Dê um nome ao token (ex.: 'Meu Chrome')." };
  if (label.length > 60)
    return { error: "Nome muito longo (máximo 60 caracteres)." };

  const token = generateApiToken();
  await createApiToken({
    email: user.email,
    tokenHash: hashApiToken(token),
    label,
  });

  revalidatePath("/configuracoes");
  return { token, label };
}

/** Revoga um token do próprio usuário (imediato e irreversível). */
export async function revokeTokenAction(id: string) {
  const user = await requireFGUser();
  await revokeApiToken(id, user.email);
  revalidatePath("/configuracoes");
}
