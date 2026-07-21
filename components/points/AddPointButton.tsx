"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { CATEGORIES } from "@/lib/constants";
import { ACCEPT_ATTR, validateImageFile } from "@/lib/image";
import { addPoint } from "@/app/projetos/[id]/actions";
import styles from "./AddPointButton.module.css";

export function AddPointButton({ projectId }: { projectId: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  // Revoga a object URL do preview ao trocá-la, limpá-la ou desmontar.
  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  function open() {
    dialogRef.current?.showModal();
    requestAnimationFrame(() => selectRef.current?.focus());
  }
  function close() {
    dialogRef.current?.close();
  }

  function removeFile() {
    setFile(null);
    setPreview(null);
  }

  function clearForm() {
    formRef.current?.reset();
    removeFile();
    setError(null);
  }

  function pickFile(f: File) {
    const check = validateImageFile({ type: f.type, size: f.size });
    if (!check.ok) {
      setError(check.error);
      return;
    }
    setError(null);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;

    setPending(true);
    setError(null);
    try {
      // 1) Upload do print (se houver) — criação fica atômica: o ponto já
      //    nasce com a URL do Blob, sem estado intermediário.
      let uploadedUrl: string | null = null;
      if (file) {
        const up = new FormData();
        up.append("file", file);
        up.append("projectId", projectId);
        const res = await fetch("/api/upload", { method: "POST", body: up });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "Falha ao enviar a imagem.");
        }
        uploadedUrl = (await res.json()).url as string;
      }

      // 2) Cria o ponto. Monta o FormData só com os campos de texto
      //    (o input de arquivo não tem `name`, então não entra aqui).
      const fd = new FormData(formRef.current!);
      if (uploadedUrl) fd.set("errorImageUrl", uploadedUrl);

      const result = await addPoint(projectId, fd);
      if (result.error) {
        setError(result.error);
        return;
      }

      clearForm();
      close();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Falha ao adicionar o ponto."
      );
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

  // Limpa o formulário ao fechar (Cancelar/Esc/backdrop), para não deixar um
  // print preso ao reabrir. Setters e refs são estáveis → anexa uma única vez.
  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    const onClose = () => {
      formRef.current?.reset();
      setFile(null);
      setPreview(null);
      setError(null);
    };
    dlg.addEventListener("close", onClose);
    return () => dlg.removeEventListener("close", onClose);
  }, []);

  return (
    <>
      <Button variant="primary" onClick={open}>
        Novo ponto
      </Button>

      <dialog ref={dialogRef} className={styles.dialog}>
        <form ref={formRef} onSubmit={handleSubmit} className={styles.form}>
          <h2 className={styles.title}>Novo ponto de QA</h2>
          <p className={styles.sub}>
            Escolha a página, dê um título e (opcionalmente) descreva o que
            verificar e anexe um print.
          </p>

          <label className={styles.label} htmlFor="point-category">
            Página de QA
          </label>
          <select
            ref={selectRef}
            id="point-category"
            name="category"
            className={styles.input}
            defaultValue={CATEGORIES[0]}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <label className={styles.label} htmlFor="point-title">
            Título
          </label>
          <input
            id="point-title"
            name="title"
            className={styles.input}
            placeholder="Ex.: Botão 'Comprar' adiciona ao carrinho"
            maxLength={200}
            autoComplete="off"
          />

          <label className={styles.label} htmlFor="point-subtitle">
            Descrição <span className={styles.optional}>(opcional)</span>
          </label>
          <textarea
            id="point-subtitle"
            name="subtitle"
            className={styles.input}
            placeholder="O que verificar neste ponto"
            autoComplete="off"
            style={{resize:"none",height:"80px",boxSizing:"border-box"}}
          />

          <span className={styles.label}>
            Print <span className={styles.optional}>(opcional)</span>
          </span>
          {preview ? (
            <div className={styles.imgPreview}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Print do erro" className={styles.thumb} />
              <button
                type="button"
                className={styles.imgRemove}
                onClick={removeFile}
                disabled={pending}
              >
                Remover
              </button>
            </div>
          ) : (
            <button
              type="button"
              className={`${styles.drop} ${dragging ? styles.dropActive : ""}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(ev) => {
                ev.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(ev) => {
                ev.preventDefault();
                setDragging(false);
                const f = ev.dataTransfer.files?.[0];
                if (f) pickFile(f);
              }}
              disabled={pending}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M12 16V4m0 0L8 8m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className={styles.dropText}>Arraste o print ou clique</span>
            </button>
          )}
          {/* Sem `name`: o arquivo é lido do estado, não vai no FormData da action. */}
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT_ATTR}
            hidden
            onChange={(ev) => {
              const f = ev.target.files?.[0];
              if (f) pickFile(f);
              ev.target.value = "";
            }}
          />

          {error && <p className={styles.err}>{error}</p>}

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
              {pending ? "Adicionando…" : "Adicionar ponto"}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
