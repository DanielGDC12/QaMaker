"use client";

import { useState } from "react";
import { StatusDropdown } from "./StatusDropdown";
import { ImageSlot } from "./ImageSlot";
import { POINT_STATUS_META, type PointStatus } from "@/lib/constants";
import type { ProjectPointWithActor } from "@/lib/db/queries";
import styles from "./PointCard.module.css";

interface Props {
  point: ProjectPointWithActor;
  number: number;
  pending?: boolean;
  viewerType: "fg" | "external";
  /** true se o visitante pode editar/excluir este ponto (FG, ou dono externo). */
  isOwnPoint: boolean;
  onStatusChange: (status: PointStatus) => void;
  onDelete: () => void;
}

const whenFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function formatWhen(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return whenFmt.format(date);
}

export function PointCard({
  point,
  number,
  pending,
  viewerType,
  isOwnPoint,
  onStatusChange,
  onDelete,
}: Props) {
  const [confirming, setConfirming] = useState(false);

  // Somente leitura: externo vendo um ponto que NÃO é dele.
  const readOnly = viewerType === "external" && !isOwnPoint;
  // Tag "Qa Cliente": marcador interno da FG — o externo nunca a vê.
  const showQaCliente = viewerType === "fg" && point.createdByIsExternal;
  // Nome de exibição para a trilha de auditoria (externo → nome do share).
  const updatedByLabel =
    point.updatedByDisplayName ?? point.updatedBy?.split("@")[0];
  const statusMeta = POINT_STATUS_META[point.status];

  return (
    <article className={styles.card}>
      <ImageSlot
        projectId={point.projectId}
        pointId={point.id}
        initialUrl={point.errorImageUrl}
        readOnly={readOnly}
      />

      <div className={styles.body}>
        <div className={styles.meta}>
          <span className={styles.num}>{String(number).padStart(2, "0")}</span>
          <span className={styles.tag}>{point.category}</span>
          {showQaCliente && (
            <span className={styles.qaCliente} title="Ponto criado pelo cliente">
              Qa Cliente
            </span>
          )}

          {readOnly ? null : confirming ? (
            <span className={styles.confirm}>
              <span className={styles.confirmLabel}>Excluir este ponto?</span>
              <button
                type="button"
                className={styles.confirmYes}
                onClick={onDelete}
              >
                Excluir
              </button>
              <button
                type="button"
                className={styles.confirmNo}
                onClick={() => setConfirming(false)}
              >
                Cancelar
              </button>
            </span>
          ) : (
            <button
              type="button"
              className={styles.del}
              onClick={() => setConfirming(true)}
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
        </div>
        <h3 className={styles.title}>{point.title}</h3>
        {point.subtitle && <p className={styles.subtitle}>{point.subtitle}</p>}
        {updatedByLabel && (
          <p className={styles.audit} title={updatedByLabel}>
            Atualizado por {updatedByLabel} · {formatWhen(point.updatedAt)}
          </p>
        )}
      </div>

      <div className={styles.status}>
        {readOnly ? (
          <span className={styles.statusStatic} style={{ color: statusMeta.color }}>
            <span
              className={styles.statusDot}
              style={{ background: statusMeta.color }}
            />
            {statusMeta.label}
          </span>
        ) : (
          <StatusDropdown
            value={point.status}
            pending={pending}
            onChange={onStatusChange}
          />
        )}
      </div>
    </article>
  );
}
