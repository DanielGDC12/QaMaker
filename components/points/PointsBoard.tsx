"use client";

import { useOptimistic, startTransition, useState } from "react";
import { ProgressBar } from "@/components/ui";
import { PointCard } from "./PointCard";
import { Toast } from "@/components/ui/Toast";
import { calcProgress, type PointStatus } from "@/lib/constants";
import type { ProjectPoint } from "@/lib/db/schema";
import { updatePointStatus } from "@/app/projetos/[id]/actions";
import styles from "./PointsBoard.module.css";

interface Props {
  projectId: string;
  initialPoints: ProjectPoint[];
}

type Patch = { id: string; status: PointStatus };

export function PointsBoard({ projectId, initialPoints }: Props) {
  const [points, setOptimistic] = useOptimistic(
    initialPoints,
    (state: ProjectPoint[], patch: Patch) =>
      state.map((p) => (p.id === patch.id ? { ...p, status: patch.status } : p))
  );
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { pct, done, total } = calcProgress(points);

  function changeStatus(pointId: string, status: PointStatus) {
    setError(null);
    startTransition(async () => {
      setOptimistic({ id: pointId, status });
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

  // Agrupa por categoria mantendo a ordem; numeração global por display_order.
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
        {points.map((point, i) => {
          const showCategory =
            i === 0 || points[i - 1].category !== point.category;
          return (
            <div key={point.id}>
              {showCategory && (
                <h2 className={styles.category}>{point.category}</h2>
              )}
              <PointCard
                point={point}
                number={i + 1}
                pending={pendingId === point.id}
                onStatusChange={(status) => changeStatus(point.id, status)}
              />
            </div>
          );
        })}
      </div>

      {error && <Toast message={error} onDismiss={() => setError(null)} />}
    </>
  );
}
