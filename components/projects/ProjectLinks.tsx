"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { PROJECT_URL_MAX } from "@/lib/project-links";
import { setProjectLinksAction } from "@/app/projetos/[id]/actions";
import styles from "./ProjectLinks.module.css";

interface Props {
  projectId: string;
  figmaUrl: string | null;
  adminUrl: string | null;
}

const FigmaIcon = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
    <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="2" />
    <path d="M3 9h18M9 21V9" stroke="currentColor" strokeWidth="2" />
  </svg>
);

const AdminIcon = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M12 3l8 4v5c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V7l8-4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
  </svg>
);

const ExternalIcon = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * Links de referência do projeto (Figma e Admin da loja). FG-only — a página
 * só renderiza este componente para FG. Link vazio vira atalho para adicionar.
 */
export function ProjectLinks({ projectId, figmaUrl, adminUrl }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function open() {
    formRef.current?.reset(); // volta aos valores salvos
    setError(null);
    dialogRef.current?.showModal();
  }
  function close() {
    dialogRef.current?.close();
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const fd = new FormData(e.currentTarget);
      const res = await setProjectLinksAction(
        projectId,
        String(fd.get("figmaUrl") ?? ""),
        String(fd.get("adminUrl") ?? "")
      );
      if (res.error) {
        setError(res.error);
        return;
      }
      close();
    } catch {
      setError("Não foi possível salvar os links.");
    } finally {
      setPending(false);
    }
  }

  // Fecha ao clicar no backdrop.
  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    const onClick = (ev: MouseEvent) => {
      if (ev.target === dlg && !pending) dlg.close();
    };
    dlg.addEventListener("click", onClick);
    return () => dlg.removeEventListener("click", onClick);
  }, [pending]);

  const links = [
    { key: "figma", label: "Figma", url: figmaUrl, icon: FigmaIcon },
    { key: "admin", label: "Admin", url: adminUrl, icon: AdminIcon },
  ];

  return (
    <>
      <div className={styles.row}>
        {links.map((l) =>
          l.url ? (
            <a
              key={l.key}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.link}
              title={l.url}
            >
              {l.icon}
              {l.label}
              {ExternalIcon}
            </a>
          ) : (
            <button
              key={l.key}
              type="button"
              className={styles.linkEmpty}
              onClick={open}
            >
              {l.icon}
              Adicionar {l.label}
            </button>
          )
        )}
        {(figmaUrl || adminUrl) && (
          <button type="button" className={styles.edit} onClick={open}>
            Editar links
          </button>
        )}
      </div>

      <dialog ref={dialogRef} className={styles.dialog}>
        <form ref={formRef} onSubmit={handleSubmit} className={styles.form}>
          <h2 className={styles.title}>Links do projeto</h2>
          <p className={styles.sub}>
            Visíveis só para a FG. Deixe em branco para remover.
          </p>

          <label className={styles.label} htmlFor="project-figma">
            Figma
          </label>
          <input
            id="project-figma"
            name="figmaUrl"
            className={styles.input}
            defaultValue={figmaUrl ?? ""}
            placeholder="https://www.figma.com/design/…"
            maxLength={PROJECT_URL_MAX}
            autoComplete="off"
          />

          <label className={styles.label} htmlFor="project-admin">
            Admin
          </label>
          <input
            id="project-admin"
            name="adminUrl"
            className={styles.input}
            defaultValue={adminUrl ?? ""}
            placeholder="https://loja.com.br/admin"
            maxLength={PROJECT_URL_MAX}
            autoComplete="off"
          />
          <p className={styles.hint}>
            Só o link do painel — não guarde usuário e senha aqui.
          </p>

          {error && <p className={styles.err}>{error}</p>}

          <div className={styles.actions}>
            <Button type="button" variant="ghost" onClick={close} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? "Salvando…" : "Salvar links"}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
