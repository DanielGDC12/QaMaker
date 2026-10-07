/**
 * Links de referência do projeto (Figma e Admin da loja).
 * Fonte única da validação — usada na criação do projeto e na edição.
 */

/** Limite de tamanho de um link salvo (URLs do Figma são longas). */
export const PROJECT_URL_MAX = 2000;

export type NormalizedUrl =
  | { ok: true; url: string | null }
  | { ok: false; error: string };

/**
 * Normaliza o link digitado: vazio vira `null` (remove o link); sem esquema
 * ganha `https://`. Só aceita http(s) — o valor vai parar num `href`, então
 * `javascript:` e afins nunca passam. Recusa usuário/senha embutidos na URL:
 * credenciais do admin ficam fora do sistema de propósito.
 */
export function normalizeProjectUrl(raw: string): NormalizedUrl {
  const value = raw.trim();
  if (!value) return { ok: true, url: null };
  if (value.length > PROJECT_URL_MAX)
    return { ok: false, error: "Link muito longo." };

  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(value)
    ? value
    : `https://${value}`;

  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return { ok: false, error: "Link inválido." };
  }

  if (url.protocol !== "https:" && url.protocol !== "http:")
    return { ok: false, error: "Use um link http(s)." };
  if (url.username || url.password)
    return { ok: false, error: "Não inclua usuário ou senha no link." };
  // Sem ponto no host é quase sempre erro de digitação ("admin", "figma").
  if (!url.hostname.includes("."))
    return { ok: false, error: "Link inválido." };

  return { ok: true, url: url.href };
}
