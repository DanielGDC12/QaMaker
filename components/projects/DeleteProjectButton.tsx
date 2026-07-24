"use client";

import { useEffect, useRef, useTransition } from "react";
import { Button } from "@/components/ui";
import { deleteProjectAction } from "@/app/projetos/[id]/actions";
import styles from "./DeleteProjectButton.module.css";

export function DeleteProjectButton({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      await deleteProjectAction(projectId);
    });
  }

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    const onClick = (e: MouseEvent) => {
      if (e.target === dlg && !pending) dlg.close();
    };
    dlg.addEventListener("click", onClick);
    return () => dlg.removeEventListener("click", onClick);
  }, [pending]);

  return (
    <>
      <Button
        variant="danger"
        onClick={() => dialogRef.current?.showModal()}
      >
        Excluir projeto
      </Button>

      <dialog ref={dialogRef} className={styles.dialog}>
        <div className={styles.body}>
          <span className={styles.warnIcon} aria-hidden>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </span>
          <h2 className={styles.title}>Excluir “{projectName}”?</h2>
          <p className={styles.text}>
            Todos os pontos e imagens deste projeto serão removidos
            permanentemente. Esta ação não pode ser desfeita.
          </p>
          <div className={styles.actions}>
            <Button
              variant="ghost"
              onClick={() => dialogRef.current?.close()}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button variant="danger" onClick={confirm} disabled={pending}>
              {pending ? "Excluindo…" : "Excluir permanentemente"}
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
