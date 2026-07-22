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
