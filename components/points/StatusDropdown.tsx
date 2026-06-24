"use client";

import {
  POINT_STATUS_META,
  SELECTABLE_STATUSES,
  type PointStatus,
} from "@/lib/constants";
import styles from "./StatusDropdown.module.css";

interface Props {
  value: PointStatus;
  pending?: boolean;
  onChange: (status: PointStatus) => void;
}

export function StatusDropdown({ value, pending, onChange }: Props) {
  const meta = POINT_STATUS_META[value];
  const isPendente = value === "pendente";

  return (
    <div className={styles.wrap} data-pending={pending ? "" : undefined}>
      <span className={styles.dot} style={{ background: meta.color }} />
      <select
        className={styles.select}
        value={isPendente ? "" : value}
        disabled={pending}
        aria-label="Status do ponto"
        onChange={(e) => onChange(e.target.value as PointStatus)}
        style={{ color: meta.color }}
      >
        {isPendente && (
          <option value="" disabled>
            Definir status…
          </option>
        )}
        {SELECTABLE_STATUSES.map((s) => (
          <option key={s} value={s}>
            {POINT_STATUS_META[s].label}
          </option>
        ))}
      </select>
      <svg
        className={styles.caret}
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
  );
}
