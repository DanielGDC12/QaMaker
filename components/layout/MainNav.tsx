"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./MainNav.module.css";

/** Abas principais da área FG. O ator externo nunca vê esta navegação. */
const TABS = [
  { href: "/projetos", label: "Projetos" },
  { href: "/checklist", label: "Checklist FG" },
] as const;

export function MainNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav} aria-label="Navegação principal">
      {TABS.map((tab) => {
        const active =
          pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={active ? `${styles.tab} ${styles.tabActive}` : styles.tab}
            aria-current={active ? "page" : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
