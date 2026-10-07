import { CATEGORIES, type Category } from "@/lib/constants";

/**
 * Checklist FG — regras do template dos itens fixos (tabela
 * `checklist_template_items`, editada na aba /checklist). Funções puras,
 * compartilhadas entre a action e os testes.
 */

/** Mesmo limite do `addPoint`: o item vira um ponto de projeto. */
export const CHECKLIST_TITLE_MAX = 200;
export const CHECKLIST_SUBTITLE_MAX = 1000;

export interface ChecklistItemInput {
  category: Category;
  title: string;
  subtitle: string | null;
}

export type ParsedChecklistItem =
  | { ok: true; value: ChecklistItemInput }
  | { ok: false; error: string };

/** Valida e normaliza (trim; descrição vazia → null) os campos de um item. */
export function parseChecklistItem(raw: {
  category: string;
  title: string;
  subtitle: string;
}): ParsedChecklistItem {
  const category = raw.category as Category;
  const title = raw.title.trim();
  const subtitle = raw.subtitle.trim();

  if (!CATEGORIES.includes(category))
    return { ok: false, error: "Página inválida." };
  if (!title) return { ok: false, error: "Informe o título do item." };
  if (title.length > CHECKLIST_TITLE_MAX)
    return { ok: false, error: "Título muito longo (máximo 200 caracteres)." };
  if (subtitle.length > CHECKLIST_SUBTITLE_MAX)
    return {
      ok: false,
      error: "Descrição muito longa (máximo 1000 caracteres).",
    };

  return { ok: true, value: { category, title, subtitle: subtitle || null } };
}

/** Compara títulos ignorando caixa e espaços nas pontas (evita item duplicado). */
export function sameChecklistTitle(a: string, b: string): boolean {
  return a.trim().toLocaleLowerCase("pt-BR") === b.trim().toLocaleLowerCase("pt-BR");
}

interface OrderedItem {
  id: string;
  category: string;
  displayOrder: number;
}

/**
 * Vizinho com quem o item troca de `display_order` ao subir/descer. A ordem é
 * global, mas o board agrupa por página — então o vizinho é o anterior/próximo
 * DA MESMA página, pulando itens de outras. `null` = já está na ponta (ou id
 * desconhecido).
 */
export function findSwapNeighbor<T extends OrderedItem>(
  items: readonly T[],
  id: string,
  direction: "up" | "down"
): T | null {
  const item = items.find((i) => i.id === id);
  if (!item) return null;

  const sameCategory = items
    .filter((i) => i.category === item.category)
    .sort((a, b) => a.displayOrder - b.displayOrder);
  const index = sameCategory.findIndex((i) => i.id === id);
  const neighbor = sameCategory[direction === "up" ? index - 1 : index + 1];
  return neighbor ?? null;
}
