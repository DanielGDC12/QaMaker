import { CATEGORIES } from "@/lib/constants";

/**
 * Campos editáveis de um ponto (página, título, descrição) — mesmas regras da
 * criação (`addPoint`). Função pura, compartilhada entre
 * `updatePointDetailsAction` e os testes.
 */

/** Mesmo limite do `addPoint`, da extensão (`/api/ext/cards`) e do checklist FG. */
export const POINT_TITLE_MAX = 200;

/** O que o formulário envia (descrição vazia = sem descrição). */
export interface PointDetailsInput {
  category: string;
  title: string;
  subtitle: string;
}

/** Já normalizado, pronto para gravar. */
export interface PointDetails {
  category: string;
  title: string;
  subtitle: string | null;
}

export type ParsedPointDetails =
  | { ok: true; value: PointDetails }
  | { ok: false; error: string };

/**
 * Valida e normaliza (trim; descrição vazia → null). `currentCategory` é a
 * página atual do ponto: aceita mantê-la mesmo fora de `CATEGORIES` (ponto
 * legado), para a edição de título/descrição não exigir trocar de página.
 */
export function parsePointDetails(
  raw: PointDetailsInput,
  currentCategory?: string
): ParsedPointDetails {
  const category = raw.category;
  const title = raw.title.trim();
  const subtitle = raw.subtitle.trim();

  const knownCategory = (CATEGORIES as readonly string[]).includes(category);
  if (!knownCategory && category !== currentCategory)
    return { ok: false, error: "Página inválida." };
  if (!title) return { ok: false, error: "Informe o título do ponto." };
  if (title.length > POINT_TITLE_MAX)
    return { ok: false, error: "Título muito longo (máximo 200 caracteres)." };

  return { ok: true, value: { category, title, subtitle: subtitle || null } };
}
