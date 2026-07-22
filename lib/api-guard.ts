import { hashApiToken, looksLikeApiToken } from "@/lib/api-token";
import { resolveApiToken } from "@/lib/db/queries";
import { isAgenciaFGEmail } from "@/lib/auth-domain";
import { AccessDeniedError } from "@/lib/auth-guard";

export interface ApiCaller {
  email: string;
}

/**
 * Autentica uma requisição dos endpoints `/api/ext/*` via token pessoal no
 * header `Authorization: Bearer <token>`. É a contraparte de `requireFGUser`
 * para clientes externos (extensão), já que estes não têm cookie de sessão.
 *
 * Lança `AccessDeniedError` (→ 401) se o token faltar, for inválido/revogado,
 * ou pertencer a alguém fora do domínio FG.
 */
export async function requireApiToken(request: Request): Promise<ApiCaller> {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();

  if (!token || !looksLikeApiToken(token)) {
    throw new AccessDeniedError();
  }

  const email = await resolveApiToken(hashApiToken(token));
  if (!email || !isAgenciaFGEmail(email)) {
    throw new AccessDeniedError();
  }

  return { email };
}
