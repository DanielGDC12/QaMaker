import styles from "./ProgressBar.module.css";

interface ProgressBarProps {
  /** 0–100 */
  value: number;
  size?: "md" | "lg";
  /** Cor da barra; padrão é o gradiente de marca FG. Verde quando concluído. */
  color?: string;
}

export function ProgressBar({ value, size = "md", color }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, value));
  const fill = color ?? (pct >= 100 ? "var(--status-feito)" : "var(--fg-gradient)");
  return (
    <div
      className={`${styles.track} ${styles[size]}`}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={styles.fill}
        style={{ width: `${pct}%`, background: fill }}
      />
    </div>
  );
}
