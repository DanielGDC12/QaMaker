"use client";

import { useEffect } from "react";
import styles from "./Toast.module.css";

interface Props {
  message: string;
  variant?: "error" | "success";
  onDismiss: () => void;
  /** ms até sumir sozinho; 0 desativa. */
  duration?: number;
}

export function Toast({
  message,
  variant = "error",
  onDismiss,
  duration = 4000,
}: Props) {
  useEffect(() => {
    if (duration <= 0) return;
    const t = setTimeout(onDismiss, duration);
    return () => clearTimeout(t);
  }, [duration, onDismiss]);

  return (
    <div className={styles.toast} role="status">
      <span className={`${styles.icon} ${styles[variant]}`} aria-hidden>
        {variant === "success" ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M20 6L9 17l-5-5"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
            <path
              d="M12 8v4m0 4h.01"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          </svg>
        )}
      </span>
      <span className={styles.msg}>{message}</span>
      <button
        type="button"
        className={styles.close}
        onClick={onDismiss}
        aria-label="Fechar"
      >
        ✕
      </button>
    </div>
  );
}
