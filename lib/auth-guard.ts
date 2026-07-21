import { cookies } from "next/headers";
import { auth } from "@/auth";
import { isAgenciaFGEmail } from "@/lib/auth-domain";
import { getShareById } from "@/lib/db/queries";
import {
  externalShareCookieName,
  verifyExternalShareToken,
} from "@/lib/external-share-token";

export interface FGUser {
  email: string;
  name: string;
  image?: string | null;
}

/**
 * Ator autorizado a agir sobre um projeto: ou um membro da FG (acesso total),
 * ou um convidado externo de UM projeto específico (acesso restrito).
 */
export type Actor =
  | { type: "fg"; email: string }
  | {
      type: "external";
      shareId: string;
      projectId: string;
      displayName: string;
    };

/**
 * Verifica a sessão E o domínio FG. Segunda camada de defesa além do proxy:
 * todo route handler e server action deve chamar antes de tocar no banco.
 * Lança erro se inválido (capturado como 401/403 por quem chama).
 */
export async function requireFGUser(): Promise<FGUser> {
  const session = await auth();
  const email = session?.user?.email;
  if (!isAgenciaFGEmail(email)) {
    throw new AccessDeniedError();
  }
  return {
    email,
    name: session!.user?.name ?? email,
    image: session!.user?.image,
  };
}

/** Versão que não lança — retorna null se inválido. */
export async function getFGUser(): Promise<FGUser | null> {
  const session = await auth();
  const email = session?.user?.email;
  if (!isAgenciaFGEmail(email)) return null;
  return {
    email,
    name: session!.user?.name ?? email,
    image: session!.user?.image,
  };
}

/**
 * Resolve o ator autorizado sobre UM projeto. FG (sessão Google válida) tem
 * precedência e acesso total. Senão, tenta o cookie de acesso externo daquele
 * projeto: verifica assinatura/validade (barato) E revalida a revogação no
 * banco (autoritativo, sempre — o cookie sozinho nunca é confiável). Lança
 * AccessDeniedError se nada autorizar.
 */
export async function requireProjectActor(projectId: string): Promise<Actor> {
  const fg = await getFGUser();
  if (fg) return { type: "fg", email: fg.email };

  const store = await cookies();
  const raw = store.get(externalShareCookieName(projectId))?.value;
  const verified = await verifyExternalShareToken(raw, projectId);
  if (!verified) throw new AccessDeniedError();

  const share = await getShareById(verified.shareId);
  // Revogação, projeto trocado ou share inexistente → nega (checagem no banco).
  if (!share || share.projectId !== projectId || share.revokedAt) {
    throw new AccessDeniedError();
  }

  return {
    type: "external",
    shareId: share.id,
    projectId,
    displayName: share.displayName,
  };
}

export class AccessDeniedError extends Error {
  constructor() {
    super("Acesso restrito a membros da Agência FG.");
    this.name = "AccessDeniedError";
  }
}
