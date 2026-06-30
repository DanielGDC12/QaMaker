"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui";
import styles from "./status-page.module.css";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className={styles.wrap}>
      <div className={styles.card}>
        <span className={styles.code}>Ops</span>
        <h1 className={styles.title}>Algo deu errado</h1>
        <p className={styles.text}>
          Ocorreu um erro inesperado. Tente novamente; se persistir, avise o
          time.
        </p>
        <Button variant="primary" onClick={reset}>
          Tentar novamente
        </Button>
      </div>
    </main>
  );
}
