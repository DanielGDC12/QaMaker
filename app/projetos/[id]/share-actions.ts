"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireFGUser } from "@/lib/auth-guard";
import { createShareRow, revokeShareRow } from "@/lib/db/queries";
import { generateShareToken } from "@/lib/external-share-token";

/**
 * Ações de gestão de acesso externo. SOMENTE FG — nunca troque por
 * requireProjectActor (um externo jamais pode criar/revogar acessos).
 */

export interface CreateShareState {
  error?: string;
  ok?: boolean;
  /** Link completo, mostrado UMA única vez (o token bruto não é recuperável). */
  url?: string;
  displayName?: string;
}

/** Cria um acesso externo e devolve o link completo (mostrado só uma vez). */
export async function createShare(
  projectId: string,
  displayName: string,
  contactNote?: string | null
): Promise<CreateShareState> {
  const user = await requireFGUser();

  const name = displayName.trim();
  if (!name) return { error: "Informe um nome para identificar o acesso." };
  if (name.length > 120) return { error: "Nome muito longo." };
  const note = (contactNote ?? "").trim();
  if (note.length > 300) return { error: "Observação muito longa." };

  const { token, tokenHash } = await generateShareToken();

  await createShareRow({
    projectId,
    displayName: name,
    contactNote: note || null,
    tokenHash,
    createdBy: user.email,
  });

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  // Em produção a Vercel envia x-forwarded-proto; em dev (localhost) cai p/ http.
  const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const proto = h.get("x-forwarded-proto") ?? (isLocal ? "http" : "https");
  const url = `${proto}://${host}/acesso/${token}`;

  revalidatePath(`/projetos/${projectId}`);
  return { ok: true, url, displayName: name };
}

/** Revoga (soft-delete) um acesso externo. Os pontos criados continuam. */
export async function revokeShare(projectId: string, shareId: string) {
  await requireFGUser();
  await revokeShareRow(shareId);
  revalidatePath(`/projetos/${projectId}`);
}
