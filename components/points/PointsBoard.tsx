"use client";

import { useOptimistic, startTransition, useState } from "react";
import { ProgressBar } from "@/components/ui";
import { PointCard } from "./PointCard";
import { Toast } from "@/components/ui/Toast";
import {
  calcProgress,
  CATEGORIES,
  POINT_STATUSES,
  POINT_STATUS_META,
  type PointStatus,
} from "@/lib/constants";
import type { ProjectPointWithActor } from "@/lib/db/queries";
import { updatePointStatus, deletePoint } from "@/app/projetos/[id]/actions";
import styles from "./PointsBoard.module.css";

interface Props {
  projectId: string;
  initialPoints: ProjectPointWithActor[];
  viewerType: "fg" | "external";
  /** share.id do visitante externo (para decidir posse); null se FG. */
  currentShareId: string | null;
}

type Action =
  | { type: "status"; id: string; status: PointStatus }
  | { type: "delete"; id: string };

/** Índice da página na ordem canônica; desconhecidas vão para o fim. */
function catOrder(cat: string) {
  const i = CATEGORIES.indexOf(cat as (typeof CATEGORIES)[number]);
  return i === -1 ? CATEGORIES.length : i;
}

export function PointsBoard({
  projectId,
  initialPoints,
  viewerType,
  currentShareId,
}: Props) {
  const [points, applyOptimistic] = useOptimistic(
    initialPoints,
    (state: ProjectPointWithActor[], action: Action) =>
      action.type === "delete"
        ? state.filter((p) => p.id !== action.id)
        : state.map((p) =>
            p.id === action.id ? { ...p, status: action.status } : p
          )
  );
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<PointStatus | "all">("all");

  const { pct, done, total } = calcProgress(points);

  // Agrupa por página (categoria) na ordem canônica; dentro de cada página,
  // mantém a ordem de criação (display_order).
  const ordered = [...points].sort(
    (a, b) =>
      catOrder(a.category) - catOrder(b.category) ||
      a.displayOrder - b.displayOrder
  );

  // Categorias presentes, na ordem canônica — viram as abas.
  const categories = CATEGORIES.filter((cat) =>
    ordered.some((p) => p.category === cat)
  );
  const [activeCategory, setActiveCategory] = useState<string>(
    categories[0] ?? ""
  );
  const currentCategory = categories.includes(
    activeCategory as (typeof CATEGORIES)[number]
  )
    ? activeCategory
    : categories[0] ?? "";

  // Com busca ativa, ignora a aba e pesquisa em todas as categorias (tag +
  // título + subtítulo). Sem busca, mantém o filtro pela aba selecionada.
  const normalizedQuery = query.trim().toLowerCase();
  const byCategoryOrSearch = normalizedQuery
    ? ordered.filter((p) =>
        `${p.category} ${p.title} ${p.subtitle ?? ""}`
          .toLowerCase()
          .includes(normalizedQuery)
      )
    : ordered.filter((p) => p.category === currentCategory);
  const visiblePoints =
    statusFilter === "all"
      ? byCategoryOrSearch
      : byCategoryOrSearch.filter((p) => p.status === statusFilter);

  function changeStatus(pointId: string, status: PointStatus) {
    setError(null);
    startTransition(async () => {
      applyOptimistic({ type: "status", id: pointId, status });
      setPendingId(pointId);
      try {
        await updatePointStatus(projectId, pointId, status);
      } catch {
        setError("Não foi possível salvar. Tente novamente.");
      } finally {
        setPendingId(null);
      }
    });
  }

  function removePoint(pointId: string) {
    setError(null);
    startTransition(async () => {
      applyOptimistic({ type: "delete", id: pointId });
      try {
        await deletePoint(projectId, pointId);
      } catch {
        setError("Não foi possível excluir. Tente novamente.");
      }
    });
  }

  return (
    <>
      <header className={styles.head}>
        <div className={styles.headRow}>
          <div className={styles.stats}>
            <span className={styles.bigPct}>{pct}%</span>
            <span className={styles.count}>
              {done} de {total} pontos auditados
            </span>
            <div className={styles.barTrack}>
              <ProgressBar value={pct} size="lg" />
            </div>
          </div>

          <div className={styles.searchWrap}>
            <svg
              className={styles.searchIcon}
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
            >
              <circle
                cx="11"
                cy="11"
                r="7"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M21 21l-4.35-4.35"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Pesquisar por página ou texto do ponto…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Pesquisar pontos"
            />
            {query && (
              <button
                type="button"
                className={styles.searchClear}
                onClick={() => setQuery("")}
                aria-label="Limpar pesquisa"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {normalizedQuery && (
          <p className={styles.searchInfo}>
            {visiblePoints.length}{" "}
            {visiblePoints.length === 1
              ? "ponto encontrado"
              : "pontos encontrados"}{" "}
            para “{query.trim()}”
          </p>
        )}
      </header>

      <div className={styles.tabsRow}>
        <div
          className={`${styles.tabs} ${
            normalizedQuery ? styles.tabsDisabled : ""
          }`}
          role="tablist"
        >
          {categories.map((cat) => {
            const catTotal = ordered.filter((p) => p.category === cat).length;
            return (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={cat === currentCategory}
                disabled={!!normalizedQuery}
                className={`${styles.tab} ${
                  cat === currentCategory ? styles.tabActive : ""
                }`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
                <span className={styles.tabCount}>{catTotal}</span>
              </button>
            );
          })}
        </div>

        <div className={styles.statusFilterWrap}>
          <select
            className={styles.statusFilterSelect}
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as PointStatus | "all")
            }
            aria-label="Filtrar por status"
          >
            <option value="all">Todos os status</option>
            {POINT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {POINT_STATUS_META[s].label}
              </option>
            ))}
          </select>
          <svg
            className={styles.statusFilterCaret}
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <path
              d="M6 9l6 6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      <div className={styles.list}>
        {visiblePoints.map((point) => {
          const number = ordered.indexOf(point) + 1;
          // FG age em tudo; externo só nos pontos que ele mesmo criou.
          const isOwnPoint =
            viewerType === "fg"
              ? true
              : point.createdByIsExternal && point.createdBy === currentShareId;
          return (
            <PointCard
              key={point.id}
              point={point}
              number={number}
              pending={pendingId === point.id}
              viewerType={viewerType}
              isOwnPoint={isOwnPoint}
              onStatusChange={(status) => changeStatus(point.id, status)}
              onDelete={() => removePoint(point.id)}
            />
          );
        })}
      </div>

      {error && <Toast message={error} onDismiss={() => setError(null)} />}
    </>
  );
}
