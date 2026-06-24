import { auth } from "@/auth";
import { isAgenciaFGEmail } from "@/lib/auth-domain";

export interface FGUser {
  email: string;
  name: string;
  image?: string | null;
}

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

export class AccessDeniedError extends Error {
  constructor() {
    super("Acesso restrito a membros da Agência FG.");
    this.name = "AccessDeniedError";
  }
}
