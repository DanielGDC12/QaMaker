"use client";

import { useOptimistic, startTransition, useState, type DragEvent } from "react";
import { ProgressBar, Pill } from "@/components/ui";
import { PointCard } from "./PointCard";
import { StatusDropdown } from "./StatusDropdown";
import { Toast } from "@/components/ui/Toast";
import {
  calcProgress,
  CATEGORIES,
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

type View = "kanban" | "lista";

/** Ordem das colunas do Kanban (status). */
const COLUMN_ORDER: readonly PointStatus[] = [
  "pendente",
  "iniciado",
  "feito",
  "nao_possivel",
];

/** Índice da página na ordem canônica; desconhecidas vão para o fim. */
function catOrder(cat: string) {
  const i = CATEGORIES.indexOf(cat as (typeof CATEGORIES)[number]);
  return i === -1 ? CATEGORIES.length : i;
}

const whenFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

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
  const [activeCategory, setActiveCategory] = useState<string>("todos");
  const [view, setView] = useState<View>("kanban");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<PointStatus | null>(null);

  const { pct, done, total } = calcProgress(points);

  // Ordem canônica (página → display_order): base para numeração estável e
  // para a ordem dos cards dentro de cada coluna.
  const ordered = [...points].sort(
    (a, b) =>
      catOrder(a.category) - catOrder(b.category) ||
      a.displayOrder - b.displayOrder
  );
  // Numeração estável: não muda quando o card troca de coluna/status.
  const numberOf = new Map(ordered.map((p, i) => [p.id, i + 1]));

  // Categorias presentes, na ordem canônica — viram os chips de filtro.
  const categories = CATEGORIES.filter((cat) =>
    ordered.some((p) => p.category === cat)
  );

  // Busca ativa → pesquisa em tudo (ignora o chip). Sem busca → filtra pelo chip.
  const normalizedQuery = query.trim().toLowerCase();
  const visiblePoints = normalizedQuery
    ? ordered.filter((p) =>
        `${p.category} ${p.title} ${p.subtitle ?? ""}`
          .toLowerCase()
          .includes(normalizedQuery)
      )
    : activeCategory === "todos"
      ? ordered
      : ordered.filter((p) => p.category === activeCategory);

  function canEditPoint(point: ProjectPointWithActor) {
    // FG age em tudo; externo só nos pontos que ele mesmo criou.
    return viewerType === "fg"
      ? true
      : point.createdByIsExternal && point.createdBy === currentShareId;
  }

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

  // ── Drag & drop: mover card entre colunas = mudar status ─────────────
  function onCardDragStart(pointId: string) {
    setDraggingId(pointId);
  }
  function onCardDragEnd() {
    setDraggingId(null);
    setDragOverStatus(null);
  }
  function onColumnDragOver(e: DragEvent, status: PointStatus) {
    if (!draggingId) return; // só reage a arraste de card
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverStatus !== status) setDragOverStatus(status);
  }
  function onColumnDrop(e: DragEvent, status: PointStatus) {
    e.preventDefault();
    const id = draggingId;
    setDraggingId(null);
    setDragOverStatus(null);
    if (!id) return;
    const point = points.find((p) => p.id === id);
    // Só persiste se mudou de status e o ator pode editar este ponto.
    if (point && point.status !== status && canEditPoint(point)) {
      changeStatus(id, status);
    }
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
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
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

      <div className={styles.controls}>
        <div
          className={`${styles.chips} ${
            normalizedQuery ? styles.chipsDisabled : ""
          }`}
          role="tablist"
          aria-label="Filtrar por página"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeCategory === "todos"}
            disabled={!!normalizedQuery}
            className={`${styles.chip} ${
              activeCategory === "todos" ? styles.chipActive : ""
            }`}
            onClick={() => setActiveCategory("todos")}
          >
            Todos
            <span className={styles.chipCount}>{ordered.length}</span>
          </button>
          {categories.map((cat) => {
            const catTotal = ordered.filter((p) => p.category === cat).length;
            return (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={cat === activeCategory}
                disabled={!!normalizedQuery}
                className={`${styles.chip} ${
                  cat === activeCategory ? styles.chipActive : ""
                }`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
                <span className={styles.chipCount}>{catTotal}</span>
              </button>
            );
          })}
        </div>

        <div className={styles.viewToggle} role="group" aria-label="Modo de visualização">
          <button
            type="button"
            className={`${styles.viewBtn} ${
              view === "kanban" ? styles.viewBtnActive : ""
            }`}
            aria-pressed={view === "kanban"}
            onClick={() => setView("kanban")}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
              <rect x="3" y="3" width="7" height="18" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              <rect x="14" y="3" width="7" height="11" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            </svg>
            Kanban
          </button>
          <button
            type="button"
            className={`${styles.viewBtn} ${
              view === "lista" ? styles.viewBtnActive : ""
            }`}
            aria-pressed={view === "lista"}
            onClick={() => setView("lista")}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Lista
          </button>
        </div>
      </div>

      {visiblePoints.length === 0 ? (
        <div className={styles.emptyAll}>
          {normalizedQuery
            ? "Nenhum ponto encontrado com os filtros atuais."
            : "Nenhum ponto de QA nesta página ainda."}
        </div>
      ) : view === "kanban" ? (
        <div className={styles.board}>
          {COLUMN_ORDER.map((status) => {
            const meta = POINT_STATUS_META[status];
            const cards = visiblePoints.filter((p) => p.status === status);
            const isOver = dragOverStatus === status && draggingId !== null;
            return (
              <section
                key={status}
                className={`${styles.column} ${isOver ? styles.columnOver : ""}`}
                onDragOver={(e) => onColumnDragOver(e, status)}
                onDrop={(e) => onColumnDrop(e, status)}
              >
                <div className={styles.columnHead}>
                  <span
                    className={styles.columnDot}
                    style={{ background: meta.color }}
                  />
                  <span className={styles.columnLabel}>{meta.label}</span>
                  <span className={styles.columnCount}>{cards.length}</span>
                </div>
                <div className={styles.columnBody}>
                  {cards.map((point) => {
                    const editable = canEditPoint(point);
                    return (
                      <PointCard
                        key={point.id}
                        point={point}
                        number={numberOf.get(point.id) ?? 0}
                        pending={pendingId === point.id}
                        viewerType={viewerType}
                        isOwnPoint={editable}
                        canDrag={editable}
                        dragging={draggingId === point.id}
                        onDragStart={() => onCardDragStart(point.id)}
                        onDragEnd={onCardDragEnd}
                        onStatusChange={(s) => changeStatus(point.id, s)}
                        onDelete={() => removePoint(point.id)}
                      />
                    );
                  })}
                  {cards.length === 0 && (
                    <div className={styles.columnEmpty}>
                      {draggingId ? "Solte aqui" : "Sem pontos"}
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className={styles.listWrap}>
          <div className={styles.listHead}>
            <span>#</span>
            <span>Ponto</span>
            <span>Página</span>
            <span>Status</span>
            <span>Atualização</span>
            <span />
          </div>
          {visiblePoints.map((point) => {
            const editable = canEditPoint(point);
            const meta = POINT_STATUS_META[point.status];
            const updatedBy =
              point.updatedByDisplayName ?? point.updatedBy?.split("@")[0];
            return (
              <div key={point.id} className={styles.listRow}>
                <span className={styles.listNum}>
                  {String(numberOf.get(point.id) ?? 0).padStart(2, "0")}
                </span>
                <div className={styles.listPoint}>
                  <span className={styles.listTitle}>{point.title}</span>
                  {point.subtitle && (
                    <span className={styles.listDesc}>{point.subtitle}</span>
                  )}
                </div>
                <span>
                  <Pill
                    label={point.category}
                    color="var(--fg-vermelho)"
                    weak="var(--bordo-weak)"
                    dot={false}
                  />
                </span>
                <span>
                  {editable ? (
                    <StatusDropdown
                      value={point.status}
                      pending={pendingId === point.id}
                      onChange={(s) => changeStatus(point.id, s)}
                    />
                  ) : (
                    <Pill label={meta.label} color={meta.color} weak={meta.weak} />
                  )}
                </span>
                <span className={styles.listWhen}>
                  {updatedBy ? `${updatedBy} · ${whenFmt.format(new Date(point.updatedAt))}` : "—"}
                </span>
                <span>
                  {editable && (
                    <button
                      type="button"
                      className={styles.listDel}
                      onClick={() => removePoint(point.id)}
                      aria-label="Excluir ponto"
                      title="Excluir ponto"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path
                          d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m2 0v12a1 1 0 01-1 1H8a1 1 0 01-1-1V7"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {error && <Toast message={error} onDismiss={() => setError(null)} />}
    </>
  );
}
