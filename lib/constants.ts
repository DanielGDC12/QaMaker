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
