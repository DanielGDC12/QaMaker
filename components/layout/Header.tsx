import { FgMark } from "./FgMark";
import styles from "./Header.module.css";

interface HeaderProps {
  /** Conteúdo opcional alinhado à direita (ex.: avatar do usuário, botão sair). */
  right?: React.ReactNode;
}

export function Header({ right }: HeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <FgMark size={26} className={styles.mark} />
          <span className={styles.divider} aria-hidden />
          <span className={styles.word}>QA Maker</span>
        </div>
        {right && <div className={styles.right}>{right}</div>}
      </div>
    </header>
  );
}
