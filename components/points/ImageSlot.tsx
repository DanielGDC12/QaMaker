"use client";

import { useRef, useState } from "react";
import { ACCEPT_ATTR, validateImageFile } from "@/lib/image";
import { setPointImage } from "@/app/projetos/[id]/actions";
import styles from "./ImageSlot.module.css";

interface Props {
  projectId: string;
  pointId: string;
  initialUrl: string | null;
}

export function ImageSlot({ projectId, pointId, initialUrl }: Props) {
  const [url, setUrl] = useState<string | null>(initialUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    const check = validateImageFile({ type: file.type, size: file.size });
    if (!check.ok) {
      setError(check.error);
      return;
    }

    setBusy(true);
    const preview = URL.createObjectURL(file);
    setUrl(preview);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("projectId", projectId);
      form.append("pointId", pointId);

      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Falha ao enviar a imagem.");
      }
      const { url: uploadedUrl } = await res.json();
      await setPointImage(projectId, pointId, uploadedUrl);
      setUrl(uploadedUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao enviar a imagem.");
      setUrl(initialUrl);
    } finally {
      URL.revokeObjectURL(preview);
      setBusy(false);
    }
  }

  async function handleRemove() {
    setBusy(true);
    setError(null);
    try {
      await setPointImage(projectId, pointId, null);
      setUrl(null);
    } catch {
      setError("Falha ao remover a imagem.");
    } finally {
      setBusy(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  if (url) {
    return (
      <div className={styles.slot}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="Print do erro" className={styles.preview} />
        {busy && <div className={styles.busy}>Enviando…</div>}
        <button
          type="button"
          className={styles.remove}
          onClick={handleRemove}
          disabled={busy}
          aria-label="Remover imagem"
        >
          Remover
        </button>
        {error && <p className={styles.error}>{error}</p>}
      </div>
    );
  }

  return (
    <div className={styles.col}>
      <button
        type="button"
        className={`${styles.drop} ${dragging ? styles.dropActive : ""}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        disabled={busy}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 16V4m0 0L8 8m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className={styles.dropText}>
          {busy ? "Enviando…" : "Arraste o print ou clique"}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTR}
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
