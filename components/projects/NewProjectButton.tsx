"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui";
import { createProject, type CreateProjectState } from "@/app/projetos/actions";
import styles from "./NewProjectButton.module.css";

const initialState: CreateProjectState = {};

export function NewProjectButton() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, formAction, pending] = useActionState(
    createProject,
    initialState
  );

  function open() {
    dialogRef.current?.showModal();
    // foco no input após abrir
    requestAnimationFrame(() => inputRef.current?.focus());
  }
  function close() {
    dialogRef.current?.close();
  }

  // Fecha ao clicar no backdrop.
  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    const onClick = (e: MouseEvent) => {
      if (e.target === dlg) dlg.close();
    };
    dlg.addEventListener("click", onClick);
    return () => dlg.removeEventListener("click", onClick);
  }, []);

  return (
    <>
      <Button variant="primary" onClick={open}>
        Novo projeto
      </Button>

      <dialog ref={dialogRef} className={styles.dialog}>
        <form action={formAction} className={styles.form}>
          <h2 className={styles.title}>Novo projeto</h2>
          <p className={styles.sub}>
            Os pontos do checklist-padrão serão copiados para este projeto.
          </p>

          <label className={styles.label} htmlFor="project-name">
            Nome da loja
          </label>
          <input
            ref={inputRef}
            id="project-name"
            name="name"
            className={styles.input}
            placeholder="Ex.: Loja Acme"
            maxLength={120}
            autoComplete="off"
          />
          {state.error && <p className={styles.err}>{state.error}</p>}

          <div className={styles.actions}>
            <Button
              type="button"
              variant="ghost"
              onClick={close}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? "Criando…" : "Criar projeto"}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
