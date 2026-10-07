import Image from "next/image";
import Link from "next/link";
import styles from "./Header.module.css";

interface HeaderProps {
  /** Navegação opcional ao lado da marca (abas da área FG). */
  nav?: React.ReactNode;
  /** Conteúdo opcional alinhado à direita (ex.: avatar do usuário, botão sair). */
  right?: React.ReactNode;
}

export function Header({ nav, right }: HeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.start}>
          <Link href="/" className={styles.brand} aria-label="QA Maker — início">
            <Image
              src="/logo.png"
              alt="QA Maker"
              width={1693}
              height={929}
              priority
              className={styles.logo}
            />
          </Link>
          {nav}
        </div>
        {right && <div className={styles.right}>{right}</div>}
      </div>
    </header>
  );
}
