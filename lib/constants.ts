/**
 * Domínio do QA Maker — status de pontos, categorias e status derivado de projeto.
 * Fonte única de verdade para labels (PT-BR) e cores usadas na UI.
 */

/* ── Status de um ponto de QA ─────────────────────────────── */
export const POINT_STATUSES = [
  "pendente",
  "feito",
  "iniciado",
  "nao_possivel",
] as const;

export type PointStatus = (typeof POINT_STATUSES)[number];

/** Status que contam como "auditado" para o cálculo de progresso. */
export const DONE_STATUSES: readonly PointStatus[] = ["feito", "nao_possivel"];

export const POINT_STATUS_META: Record<
  PointStatus,
  { label: string; color: string; weak: string }
> = {
  pendente: { label: "Pendente", color: "var(--faint)", weak: "var(--bordo-weak)" },
  feito: { label: "Feito", color: "var(--status-feito)", weak: "var(--green-weak)" },
  iniciado: { label: "Iniciado", color: "var(--status-iniciado)", weak: "var(--pink-weak)" },
  nao_possivel: {
    label: "Não possível",
    color: "var(--status-nao-possivel)",
    weak: "var(--grey-weak)",
  },
};

/** Opções selecionáveis no dropdown (não inclui "pendente", que é o estado inicial). */
export const SELECTABLE_STATUSES: readonly PointStatus[] = [
  "feito",
  "iniciado",
  "nao_possivel",
];

/* ── Colunas do Kanban ────────────────────────────────────────
   O board NÃO é 1:1 com o status: o checklist padrão da FG
   (`project_points.is_default`, cópia de DEFAULT_PROJECT_POINTS) fica retido
   numa coluna própria — "Checklist FG" — enquanto não for auditado. Só os
   status de conclusão (DONE_STATUSES) tiram o ponto de lá; "iniciado" muda
   apenas o pill do card. Pontos criados à mão nunca entram nessa coluna. */

export const CHECKLIST_COLUMN = "checklist" as const;

/** Uma coluna do board: a do checklist, ou uma coluna de status. */
export type BoardColumn = typeof CHECKLIST_COLUMN | PointStatus;

/** Ordem das colunas do Kanban (o checklist vem primeiro, em destaque). */
export const BOARD_COLUMN_ORDER: readonly BoardColumn[] = [
  CHECKLIST_COLUMN,
  "pendente",
  "iniciado",
  "feito",
  "nao_possivel",
];

export const CHECKLIST_COLUMN_META = {
  label: "Checklist FG",
  color: "var(--fg-vermelho)",
  weak: "var(--bordo-weak)",
};

/** Label/cor de qualquer coluna do board (checklist ou status). */
export function boardColumnMeta(column: BoardColumn) {
  return column === CHECKLIST_COLUMN
    ? CHECKLIST_COLUMN_META
    : POINT_STATUS_META[column];
}

/** Ponto na visão do board — o mínimo para decidir coluna e movimento. */
export interface BoardPoint {
  status: PointStatus;
  isDefault: boolean;
}

/** Em que coluna este ponto aparece. */
export function boardColumnOf(point: BoardPoint): BoardColumn {
  return point.isDefault && !DONE_STATUSES.includes(point.status)
    ? CHECKLIST_COLUMN
    : point.status;
}

/**
 * Status resultante de soltar `point` na coluna `column` — ou `null` quando o
 * movimento é proibido (ou não muda nada). Regras:
 * - ponto do checklist só sai da coluna dele para "feito"/"nao_possivel";
 *   soltar de volta em "Checklist FG" reabre o ponto (volta a "pendente");
 * - ponto criado à mão nunca entra na coluna do checklist.
 */
export function statusForDrop(
  point: BoardPoint,
  column: BoardColumn
): PointStatus | null {
  if (boardColumnOf(point) === column) return null; // já está aqui

  if (column === CHECKLIST_COLUMN) {
    return point.isDefault ? "pendente" : null;
  }
  if (point.isDefault && !DONE_STATUSES.includes(column)) return null;

  return column === point.status ? null : column;
}

/* ── Categorias (tags) dos pontos ─────────────────────────── */
export const CATEGORIES = [
  "Home",
  "Categoria/Departamento",
  "Produto",
  "Prateleira",
  "Carrinho",
  "Checkout",
  "SEO",
  "Performance",
  "Geral",
] as const;

export type Category = (typeof CATEGORIES)[number];

/* ── Status derivado de um projeto ────────────────────────── */
export type ProjectStatus = "a_iniciar" | "em_revisao" | "concluido";

export const PROJECT_STATUS_META: Record<
  ProjectStatus,
  { label: string; color: string; weak: string }
> = {
  a_iniciar: { label: "A iniciar", color: "var(--muted)", weak: "var(--bordo-weak)" },
  em_revisao: { label: "Em revisão", color: "var(--status-iniciado)", weak: "var(--pink-weak)" },
  concluido: { label: "Concluído", color: "var(--status-feito)", weak: "var(--green-weak)" },
};

/* ── Lógica de progresso (compartilhada cliente/servidor) ──── */

/** Percentual (0–100, arredondado) de pontos auditados. */
export function calcProgress(
  points: { status: PointStatus }[]
): { total: number; done: number; pct: number } {
  const total = points.length;
  if (total === 0) return { total: 0, done: 0, pct: 0 };
  const done = points.filter((p) => DONE_STATUSES.includes(p.status)).length;
  return { total, done, pct: Math.round((done / total) * 100) };
}

/** Deriva o status do projeto a partir do percentual de conclusão. */
export function deriveProjectStatus(pct: number): ProjectStatus {
  if (pct <= 0) return "a_iniciar";
  if (pct >= 100) return "concluido";
  return "em_revisao";
}
