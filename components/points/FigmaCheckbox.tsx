"use client";

import styles from "./FigmaCheckbox.module.css";

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Texto ao lado do checkbox; sem ele, fica só o rótulo acessível. */
  label?: string;
  disabled?: boolean;
}

/**
 * De/para com o Figma: o item já estava previsto no layout inicial? Marcação
 * interna da FG — quem usa só renderiza este controle para FG.
 */
export function FigmaCheckbox({ checked, onChange, label, disabled }: Props) {
  return (
    <label
      className={styles.wrap}
      title="Item previsto no Figma inicial (de/para)"
    >
      <input
        type="checkbox"
        className={styles.box}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={label ? undefined : "Previsto no Figma inicial"}
      />
      {label && <span className={styles.text}>{label}</span>}
    </label>
  );
}
