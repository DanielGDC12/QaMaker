"use client";

import { useEffect } from "react";
import { StatusDropdown } from "./StatusDropdown";
import { POINT_STATUS_META, type PointStatus } from "@/lib/constants";
import type { ProjectPointWithActor } from "@/lib/db/queries";
import styles from "./PointDetailModal.module.css";

const whenFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

interface Props {
  point: ProjectPointWithActor;
  number: number;
  pending?: boolean;
  viewerType: "fg" | "external";
  /** true se o visitante pode editar este ponto (FG ou dono externo). */
  editable: boolean;
  onStatusChange: (status: PointStatus) => void;
  onClose: () => void;
}

export function PointDetailModal({
  point,
  number,
  pending,
  viewerType,
  editable,
  onStatusChange,
  onClose,
}: Props) {
  // Fecha com Esc.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const meta = POINT_STATUS_META[point.status];
  const showQaCliente = viewerType === "fg" && point.createdByIsExternal;
  const updatedBy =
    point.updatedByDisplayName ?? point.updatedBy?.split("@")[0];

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label={point.title}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className={styles.close}
          onClick={onClose}
          aria-label="Fechar"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>

        {point.errorImageUrl && (
          <a
            href={point.errorImageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.imgLink}
            title="Abrir print em tamanho real"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={point.errorImageUrl}
              alt="Print do erro"
              className={styles.img}
            />
          </a>
        )}

        <div className={styles.metaRow}>
          <span className={styles.num}>#{String(number).padStart(2, "0")}</span>
          <span className={styles.tag}>{point.category}</span>
          {showQaCliente && (
            <span className={styles.qaCliente} title="Ponto criado pelo cliente">
              Qa Cliente
            </span>
          )}
        </div>

        <h2 className={styles.title}>{point.title}</h2>
        <p className={styles.desc}>
          {point.subtitle?.trim() ? point.subtitle : "Sem descrição."}
        </p>

        {updatedBy && (
          <p className={styles.audit}>
            Atualizado por <strong>{updatedBy}</strong> ·{" "}
            {whenFmt.format(new Date(point.updatedAt))}
          </p>
        )}

        <div className={styles.footer}>
          <span className={styles.footerLabel}>Status</span>
          {editable ? (
            <StatusDropdown
              value={point.status}
              pending={pending}
              onChange={onStatusChange}
            />
          ) : (
            <span
              className={styles.statusStatic}
              style={{ color: meta.color }}
            >
              <span
                className={styles.statusDot}
                style={{ background: meta.color }}
              />
              {meta.label}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
