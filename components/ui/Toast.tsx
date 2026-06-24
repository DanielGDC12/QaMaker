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
    <div className={`${styles.toast} ${styles[variant]}`} role="status">
      <span>{message}</span>
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
