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
          <span className={styles.mark} aria-hidden />
          <span className={styles.word}>
            QA <strong>Maker</strong>
          </span>
        </div>
        {right && <div className={styles.right}>{right}</div>}
      </div>
    </header>
  );
}
