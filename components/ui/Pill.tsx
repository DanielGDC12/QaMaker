import styles from "./Pill.module.css";

interface PillProps {
  label: string;
  /** Cor de texto/ponto (CSS var ou hex). */
  color: string;
  /** Cor de fundo suave. */
  weak: string;
  /** Mostra o ponto colorido à esquerda. */
  dot?: boolean;
}

export function Pill({ label, color, weak, dot = true }: PillProps) {
  return (
    <span
      className={styles.pill}
      style={{ color, background: weak }}
    >
      {dot && <span className={styles.dot} style={{ background: color }} />}
      {label}
    </span>
  );
}
