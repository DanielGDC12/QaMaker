import { createHash, randomBytes } from "node:crypto";

/**
 * Tokens de API pessoais — usados pela extensão de navegador para autenticar
 * nos endpoints `/api/ext/*` (sem cookie de sessão).
 *
 * Só o hash (SHA-256) é persistido; o token em claro é mostrado uma única vez
 * na criação. Formato: `qam_<44 chars base64url>`.
 */

const PREFIX = "qam_";

/** Gera um novo token em claro (não persistir — guardar apenas o hash). */
export function generateApiToken(): string {
  return PREFIX + randomBytes(32).toString("base64url");
}

/** Hash determinístico usado para lookup e armazenamento. */
export function hashApiToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Verificação superficial de formato antes de consultar o banco. */
export function looksLikeApiToken(token: string): boolean {
  return token.startsWith(PREFIX) && token.length > PREFIX.length + 20;
}

/** Prévia segura para exibir na listagem (nunca reconstrói o token). */
export function tokenPreview(): string {
  return `${PREFIX}••••`;
}
