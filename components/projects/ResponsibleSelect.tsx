"use client";

import { useState, useTransition } from "react";
import { Toast } from "@/components/ui/Toast";
import { setResponsibleAction } from "@/app/projetos/[id]/actions";
import styles from "./ResponsibleSelect.module.css";

interface Props {
  projectId: string;
  /** E-mail do responsável atual (null = sem responsável). */
  value: string | null;
  /** Usuários FG disponíveis para atribuição. */
  users: { email: string; name: string }[];
}

/**
 * Seletor de responsável pelo projeto (FG-only — só renderizado para FG).
 * Atualiza otimisticamente e reverte se a action falhar.
 */
export function ResponsibleSelect({ projectId, value, users }: Props) {
  const [current, setCurrent] = useState(value ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onChange(email: string) {
    const previous = current;
    setCurrent(email); // otimista
    startTransition(async () => {
      const res = await setResponsibleAction(projectId, email);
      if (res.error) {
        setCurrent(previous); // reverte
        setError(res.error);
      }
    });
  }

  return (
    <>
      <div className={styles.wrap} data-pending={pending ? "" : undefined}>
        <svg
          className={styles.icon}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
        >
          <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="2" />
          <path
            d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        <select
          className={styles.select}
          value={current}
          disabled={pending}
          aria-label="Responsável pelo projeto"
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Sem responsável</option>
          {users.map((u) => (
            <option key={u.email} value={u.email}>
              {u.name}
            </option>
          ))}
        </select>
        <svg
          className={styles.caret}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
        >
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      {error && (
        <Toast message={error} variant="error" onDismiss={() => setError(null)} />
      )}
    </>
  );
}
