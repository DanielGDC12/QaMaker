"use client";

import { useEffect, useState, useTransition } from "react";
import { StatusDropdown } from "./StatusDropdown";
import { POINT_STATUS_META, type PointStatus } from "@/lib/constants";
import type { ProjectPointWithActor, PointCommentView } from "@/lib/db/queries";
import {
  getPointCommentsAction,
  addCommentAction,
  deleteCommentAction,
} from "@/app/projetos/[id]/actions";
import styles from "./PointDetailModal.module.css";

const whenFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const rtf = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
/** Tempo relativo curto (ex.: "há 3 horas"); cai para data absoluta se antigo. */
function relTime(d: Date | string): string {
  const date = new Date(d);
  const diffSec = Math.round((date.getTime() - Date.now()) / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 60) return "agora";
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
  if (abs < 604800) return rtf.format(Math.round(diffSec / 86400), "day");
  return whenFmt.format(date);
}

/** Identidade do visitante atual — para atribuir/apagar comentários. */
export interface Viewer {
  /** e-mail (FG) ou share.id (externo) — casa com `authorId` do comentário. */
  id: string;
  name: string;
  avatar: string | null;
  isExternal: boolean;
}

interface Props {
  point: ProjectPointWithActor;
  number: number;
  pending?: boolean;
  viewerType: "fg" | "external";
  /** Identidade do visitante (autor de novos comentários / dono na exclusão). */
  viewer: Viewer;
  /** true se o visitante pode editar este ponto (FG ou dono externo). */
  editable: boolean;
  onStatusChange: (status: PointStatus) => void;
  onClose: () => void;
}

export function PointDetailModal({
  point,
  number,
  pending,
  viewerType,
  viewer,
  editable,
  onStatusChange,
  onClose,
}: Props) {
  const [comments, setComments] = useState<PointCommentView[] | null>(null);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Fecha com Esc.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Carrega os comentários ao abrir.
  useEffect(() => {
    let alive = true;
    getPointCommentsAction(point.projectId, point.id).then((res) => {
      if (!alive) return;
      if ("ok" in res) setComments(res.comments);
      else setError(res.error);
    });
    return () => {
      alive = false;
    };
  }, [point.projectId, point.id]);

  function submit() {
    const text = body.trim();
    if (!text) return;
    setError(null);

    // Exibição otimista: o comentário aparece na hora, sem esperar o servidor.
    const tempId = `tmp-${Date.now()}`;
    const optimistic: PointCommentView = {
      id: tempId,
      body: text,
      createdAt: new Date(),
      authorId: viewer.id,
      authorIsExternal: viewer.isExternal,
      authorName: viewer.name,
      authorAvatar: viewer.avatar,
    };
    setComments((prev) => [...(prev ?? []), optimistic]);
    setBody("");

    startTransition(async () => {
      const res = await addCommentAction(point.projectId, point.id, text);
      if ("ok" in res) {
        setComments(res.comments); // reconcilia com o servidor (ids reais)
      } else {
        setError(res.error);
        setComments((prev) => prev?.filter((c) => c.id !== tempId) ?? prev);
        setBody(text); // devolve o texto para o usuário reenviar
      }
    });
  }

  function remove(commentId: string) {
    setError(null);
    // Remoção otimista.
    const snapshot = comments;
    setComments((prev) => prev?.filter((c) => c.id !== commentId) ?? prev);

    startTransition(async () => {
      const res = await deleteCommentAction(point.projectId, commentId);
      if ("ok" in res) setComments(res.comments);
      else {
        setError(res.error);
        setComments(snapshot); // reverte
      }
    });
  }

  /** Só o autor apaga o próprio comentário (mesmo id e mesmo espaço FG/externo). */
  function canDelete(c: PointCommentView): boolean {
    return c.authorId === viewer.id && c.authorIsExternal === viewer.isExternal;
  }

  // Ctrl/Cmd+Enter envia.
  function onBodyKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  }

  const meta = POINT_STATUS_META[point.status];
  const showQaCliente = viewerType === "fg" && point.createdByIsExternal;
  const updatedBy =
    point.updatedByDisplayName ?? point.updatedBy?.split("@")[0];

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label={point.title}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className={styles.close}
          onClick={onClose}
          aria-label="Fechar"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>

        {point.errorImageUrl && (
          <a
            href={point.errorImageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.imgLink}
            title="Abrir print em tamanho real"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={point.errorImageUrl}
              alt="Print do erro"
              className={styles.img}
            />
          </a>
        )}

        <div className={styles.metaRow}>
          <span className={styles.num}>#{String(number).padStart(2, "0")}</span>
          <span className={styles.tag}>{point.category}</span>
          {showQaCliente && (
            <span className={styles.qaCliente} title="Ponto criado pelo cliente">
              Qa Cliente
            </span>
          )}
          {point.createdViaExtension && (
            <span className={styles.extensao} title="Card criado pela extensão">
              Extensão
            </span>
          )}
        </div>

        <h2 className={styles.title}>{point.title}</h2>
        <p className={styles.desc}>
          {point.subtitle?.trim() ? point.subtitle : "Sem descrição."}
        </p>

        {updatedBy && (
          <p className={styles.audit}>
            Atualizado por <strong>{updatedBy}</strong> ·{" "}
            {whenFmt.format(new Date(point.updatedAt))}
          </p>
        )}

        {/* ── Comentários ─────────────────────────────────────── */}
        <section className={styles.comments}>
          <h3 className={styles.commentsTitle}>
            Comentários
            {comments && comments.length > 0 && (
              <span className={styles.commentsCount}>{comments.length}</span>
            )}
          </h3>

          {comments === null ? (
            <p className={styles.commentsEmpty}>Carregando…</p>
          ) : comments.length === 0 ? (
            <p className={styles.commentsEmpty}>
              Nenhum comentário ainda. Use para informar ou justificar (ex.: por
              que ficou “Não possível”).
            </p>
          ) : (
            <ul className={styles.commentList}>
              {comments.map((c) => (
                <li key={c.id} className={styles.comment}>
                  <span className={styles.avatar} aria-hidden>
                    {c.authorAvatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.authorAvatar} alt="" className={styles.avatarImg} />
                    ) : (
                      c.authorName.charAt(0).toUpperCase()
                    )}
                  </span>
                  <div className={styles.commentBody}>
                    <div className={styles.commentHead}>
                      <span className={styles.commentAuthor}>{c.authorName}</span>
                      <span className={styles.commentWhen}>
                        {relTime(c.createdAt)}
                      </span>
                      {canDelete(c) && (
                        <button
                          type="button"
                          className={styles.commentDel}
                          onClick={() => remove(c.id)}
                          disabled={isPending}
                          aria-label="Excluir comentário"
                          title="Excluir comentário"
                        >
                          ×
                        </button>
                      )}
                    </div>
                    <p className={styles.commentText}>{c.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className={styles.commentForm}>
            <textarea
              className={styles.commentInput}
              placeholder="Escreva um comentário…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={onBodyKey}
              rows={2}
              maxLength={2000}
            />
            <button
              type="button"
              className={styles.commentSend}
              onClick={submit}
              disabled={isPending || !body.trim()}
            >
              {isPending ? "Enviando…" : "Comentar"}
            </button>
          </div>
          {error && <p className={styles.commentErr}>{error}</p>}
        </section>

        <div className={styles.footer}>
          <span className={styles.footerLabel}>Status</span>
          {editable ? (
            <StatusDropdown
              value={point.status}
              pending={pending}
              onChange={onStatusChange}
            />
          ) : (
            <span
              className={styles.statusStatic}
              style={{ color: meta.color }}
            >
              <span
                className={styles.statusDot}
                style={{ background: meta.color }}
              />
              {meta.label}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
