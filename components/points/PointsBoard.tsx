"use client";

import { useOptimistic, startTransition, useState } from "react";
import { ProgressBar } from "@/components/ui";
import { PointCard } from "./PointCard";
import { Toast } from "@/components/ui/Toast";
import { calcProgress, CATEGORIES, type PointStatus } from "@/lib/constants";
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

  const { pct, done, total } = calcProgress(points);

  // Agrupa por página (categoria) na ordem canônica; dentro de cada página,
  // mantém a ordem de criação (display_order).
  const ordered = [...points].sort(
    (a, b) =>
      catOrder(a.category) - catOrder(b.category) ||
      a.displayOrder - b.displayOrder
  );

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
          <span className={styles.bigPct}>{pct}%</span>
          <span className={styles.count}>
            {done} de {total} pontos auditados
          </span>
        </div>
        <ProgressBar value={pct} size="lg" />
      </header>

      <div className={styles.list}>
        {ordered.map((point, i) => {
          const showCategory =
            i === 0 || ordered[i - 1].category !== point.category;
          // FG age em tudo; externo só nos pontos que ele mesmo criou.
          const isOwnPoint =
            viewerType === "fg"
              ? true
              : point.createdByIsExternal && point.createdBy === currentShareId;
          return (
            <div key={point.id}>
              {showCategory && (
                <h2 className={styles.category}>{point.category}</h2>
              )}
              <PointCard
                point={point}
                number={i + 1}
                pending={pendingId === point.id}
                viewerType={viewerType}
                isOwnPoint={isOwnPoint}
                onStatusChange={(status) => changeStatus(point.id, status)}
                onDelete={() => removePoint(point.id)}
              />
            </div>
          );
        })}
      </div>

      {error && <Toast message={error} onDismiss={() => setError(null)} />}
    </>
  );
}
