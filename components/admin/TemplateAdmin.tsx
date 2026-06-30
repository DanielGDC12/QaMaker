"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { CATEGORIES } from "@/lib/constants";
import type { TemplatePoint } from "@/lib/db/schema";
import {
  createTemplatePointAction,
  editTemplatePointAction,
  removeTemplatePointAction,
  type FormState,
} from "@/app/admin/template/actions";
import styles from "./TemplateAdmin.module.css";

const initial: FormState = {};

export function TemplateAdmin({
  initialPoints,
}: {
  initialPoints: TemplatePoint[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <>
      <AddForm />

      <div className={styles.count}>
        {initialPoints.length} ponto(s) no template
      </div>

      <ul className={styles.list}>
        {initialPoints.map((p, i) =>
          editingId === p.id ? (
            <li key={p.id}>
              <EditRow point={p} onDone={() => setEditingId(null)} />
            </li>
          ) : (
            <li key={p.id} className={styles.row}>
              <span className={styles.num}>{String(i + 1).padStart(2, "0")}</span>
              <span className={styles.tag}>{p.category}</span>
              <div className={styles.text}>
                <span className={styles.rowTitle}>{p.title}</span>
                {p.subtitle && (
                  <span className={styles.rowSub}>{p.subtitle}</span>
                )}
              </div>
              <div className={styles.rowActions}>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setEditingId(p.id)}
                >
                  Editar
                </Button>
                <form action={removeTemplatePointAction}>
                  <input type="hidden" name="id" value={p.id} />
                  <Button size="sm" variant="danger" type="submit">
                    Excluir
                  </Button>
                </form>
              </div>
            </li>
          )
        )}
      </ul>
    </>
  );
}

/* ── Campos compartilhados ────────────────────────────────── */
function Fields({ point }: { point?: TemplatePoint }) {
  return (
    <>
      <select
        name="category"
        className={styles.input}
        defaultValue={point?.category ?? CATEGORIES[0]}
        aria-label="Categoria"
      >
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <input
        name="title"
        className={styles.input}
        placeholder="Título do ponto"
        defaultValue={point?.title ?? ""}
        maxLength={200}
        autoComplete="off"
      />
      <input
        name="subtitle"
        className={styles.input}
        placeholder="Descrição (o que verificar)"
        defaultValue={point?.subtitle ?? ""}
        autoComplete="off"
      />
    </>
  );
}

/* ── Adicionar ────────────────────────────────────────────── */
function AddForm() {
  const [state, action, pending] = useActionState(
    createTemplatePointAction,
    initial
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} action={action} className={styles.addForm}>
      <Fields />
      <Button type="submit" variant="primary" disabled={pending}>
        {pending ? "Adicionando…" : "Adicionar"}
      </Button>
      {state.error && <p className={styles.err}>{state.error}</p>}
    </form>
  );
}

/* ── Editar (inline) ──────────────────────────────────────── */
function EditRow({
  point,
  onDone,
}: {
  point: TemplatePoint;
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState(
    editTemplatePointAction,
    initial
  );

  useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok, onDone]);

  return (
    <form action={action} className={styles.editForm}>
      <input type="hidden" name="id" value={point.id} />
      <Fields point={point} />
      <div className={styles.rowActions}>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" variant="primary" disabled={pending}>
          {pending ? "Salvando…" : "Salvar"}
        </Button>
      </div>
      {state.error && <p className={styles.err}>{state.error}</p>}
    </form>
  );
}
