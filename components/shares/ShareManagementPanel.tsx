"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui";
import {
  createShare,
  revokeShare,
  type CreateShareState,
} from "@/app/projetos/[id]/share-actions";
import type { ProjectShare } from "@/lib/db/schema";
import styles from "./ShareManagementPanel.module.css";

interface Props {
  projectId: string;
  shares: ProjectShare[];
}

const dateFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function ShareManagementPanel({ projectId, shares }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreateShareState | null>(null);
  const [copied, setCopied] = useState(false);

  const active = shares.filter((s) => !s.revokedAt);

  function open() {
    setError(null);
    setCreated(null);
    setCopied(false);
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
      const fd = new FormData(formRef.current!);
      const displayName = String(fd.get("displayName") ?? "");
      const contactNote = String(fd.get("contactNote") ?? "");
      const result = await createShare(projectId, displayName, contactNote);
      if (result.error) {
        setError(result.error);
        return;
      }
      setCreated(result);
      formRef.current?.reset();
    } catch {
      setError("Não foi possível criar o acesso. Tente novamente.");
    } finally {
      setPending(false);
    }
  }

  async function copyLink() {
    if (!created?.url) return;
    try {
      await navigator.clipboard.writeText(created.url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  // Limpa o estado ao fechar o dialog (Esc/backdrop/Fechar).
  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    const onClose = () => {
      setCreated(null);
      setError(null);
      setCopied(false);
      formRef.current?.reset();
    };
    dlg.addEventListener("close", onClose);
    return () => dlg.removeEventListener("close", onClose);
  }, []);

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

  return (
    <>
      <Button variant="secondary" onClick={open}>
        Acessos do cliente{active.length > 0 ? ` (${active.length})` : ""}
      </Button>

      <dialog ref={dialogRef} className={styles.dialog}>
        {created ? (
          <div className={styles.form}>
            <h3 className={styles.dialogTitle}>Acesso criado</h3>
            <p className={styles.dialogSub}>
              Copie o link abaixo e envie para <strong>{created.displayName}</strong>.
              Por segurança, ele <strong>não será mostrado novamente</strong>.
            </p>
            <div className={styles.linkBox}>
              <code className={styles.link}>{created.url}</code>
            </div>
            <div className={styles.actions}>
              <Button variant="ghost" onClick={close}>
                Fechar
              </Button>
              <Button variant="primary" onClick={copyLink}>
                {copied ? "Copiado!" : "Copiar link"}
              </Button>
            </div>
          </div>
        ) : (
          <div className={styles.form}>
            <h3 className={styles.dialogTitle}>Acessos do cliente</h3>
            <p className={styles.dialogSub}>
              {active.length === 0
                ? "Nenhum acesso externo ativo. Gere um link para o cliente reportar pontos."
                : `${active.length} acesso(s) ativo(s). O cliente vê e cria apenas pontos de QA do cliente.`}
            </p>

            {shares.length > 0 && (
              <ul className={styles.list}>
                {shares.map((s) => (
                  <ShareRow key={s.id} projectId={projectId} share={s} />
                ))}
              </ul>
            )}

            <form
              ref={formRef}
              onSubmit={handleSubmit}
              className={styles.subForm}
            >
              <h4 className={styles.subFormTitle}>Novo acesso</h4>

              <label className={styles.label} htmlFor="share-name">
                Nome / identificação
              </label>
              <input
                id="share-name"
                name="displayName"
                className={styles.input}
                placeholder="Ex.: João — Loja Centro"
                maxLength={120}
                autoComplete="off"
              />

              <label className={styles.label} htmlFor="share-note">
                Observação{" "}
                <span className={styles.optional}>(opcional, interna)</span>
              </label>
              <input
                id="share-note"
                name="contactNote"
                className={styles.input}
                placeholder="Ex.: e-mail/telefone de contato"
                maxLength={300}
                autoComplete="off"
              />

              {error && <p className={styles.err}>{error}</p>}

              <div className={styles.actions}>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={close}
                  disabled={pending}
                >
                  Fechar
                </Button>
                <Button type="submit" variant="primary" disabled={pending}>
                  {pending ? "Gerando…" : "Gerar link"}
                </Button>
              </div>
            </form>
          </div>
        )}
      </dialog>
    </>
  );
}

function ShareRow({
  projectId,
  share,
}: {
  projectId: string;
  share: ProjectShare;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const revoked = Boolean(share.revokedAt);

  function revoke() {
    startTransition(async () => {
      await revokeShare(projectId, share.id);
      setConfirming(false);
    });
  }

  return (
    <li className={styles.row} data-revoked={revoked ? "" : undefined}>
      <div className={styles.rowMain}>
        <span className={styles.rowName}>{share.displayName}</span>
        {share.contactNote && (
          <span className={styles.rowNote}>{share.contactNote}</span>
        )}
      </div>
      <span className={styles.rowDate}>
        {dateFmt.format(new Date(share.createdAt))}
      </span>
      {revoked ? (
        <span className={styles.revokedPill}>Revogado</span>
      ) : confirming ? (
        <span className={styles.confirm}>
          <button
            type="button"
            className={styles.confirmYes}
            onClick={revoke}
            disabled={pending}
          >
            {pending ? "Revogando…" : "Confirmar"}
          </button>
          <button
            type="button"
            className={styles.confirmNo}
            onClick={() => setConfirming(false)}
            disabled={pending}
          >
            Cancelar
          </button>
        </span>
      ) : (
        <button
          type="button"
          className={styles.revoke}
          onClick={() => setConfirming(true)}
        >
          Revogar
        </button>
      )}
    </li>
  );
}
