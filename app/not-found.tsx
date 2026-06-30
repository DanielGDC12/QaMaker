import Link from "next/link";
import { Button } from "@/components/ui";
import styles from "./status-page.module.css";

export default function NotFound() {
  return (
    <main className={styles.wrap}>
      <div className={styles.card}>
        <span className={styles.code}>404</span>
        <h1 className={styles.title}>Página não encontrada</h1>
        <p className={styles.text}>
          O projeto ou recurso que você procura não existe ou foi removido.
        </p>
        <Link href="/projetos">
          <Button variant="primary">Voltar aos projetos</Button>
        </Link>
      </div>
    </main>
  );
}
