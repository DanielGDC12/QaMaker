"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { Toast } from "@/components/ui/Toast";
import { CATEGORIES } from "@/lib/constants";
import {
  findSwapNeighbor,
  CHECKLIST_TITLE_MAX,
  CHECKLIST_SUBTITLE_MAX,
} from "@/lib/checklist-template";
import {
  addChecklistItemAction,
  updateChecklistItemAction,
  deleteChecklistItemAction,
  moveChecklistItemAction,
  type ChecklistActionState,
} from "@/app/checklist/actions";
import styles from "./ChecklistEditor.module.css";

export interface ChecklistItemView {
  id: string;
  category: string;
  title: string;
  subtitle: string | null;
  displayOrder: number;
}

type Direction = "up" | "down";

type Action =
  | { type: "delete"; id: string }
  | { type: "move"; id: string; direction: Direction };

/** Mesma troca de posição que o servidor faz — aplicada de forma otimista. */
function reduce(state: ChecklistItemView[], action: Action) {
  if (action.type === "delete") return state.filter((i) => i.id !== action.id);

  const item = state.find((i) => i.id === action.id);
  const neighbor = findSwapNeighbor(state, action.id, action.direction);
  if (!item || !neighbor) return state;
  return state.map((i) =>
    i.id === item.id
      ? { ...i, displayOrder: neighbor.displayOrder }
      : i.id === neighbor.id
        ? { ...i, displayOrder: item.displayOrder }
        : i
  );
}

function toFormData(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

/**
 * Editor do Checklist FG (template dos itens fixos): adicionar, editar,
 * excluir e reordenar dentro de cada página. Exclusão e reordenação são
 * otimistas; o servidor revalida /checklist e reconcilia.
 */
export function ChecklistEditor({ items: initialItems }: { items: ChecklistItemView[] }) {
  const [items, applyOptimistic] = useOptimistic(initialItems, reduce);
  const [, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function run(action: Action, call: () => Promise<ChecklistActionState>) {
    setError(null);
    startTransition(async () => {
      applyOptimistic(action);
      const res = await call();
      if (res.error) setError(res.error);
    });
  }

  function move(id: string, direction: Direction) {
    run({ type: "move", id, direction }, () =>
      moveChecklistItemAction(id, direction)
    );
  }

  function remove(id: string) {
    setConfirmingId(null);
    run({ type: "delete", id }, () => deleteChecklistItemAction(id));
  }

  // Agrupa por página na ordem canônica — a mesma do board do projeto.
  const groups = CATEGORIES.map((category) => ({
    category,
    items: items
      .filter((i) => i.category === category)
      .sort((a, b) => a.displayOrder - b.displayOrder),
  })).filter((g) => g.items.length > 0);

  return (
    <>
      <AddItemForm />

      <p className={styles.count}>
        {items.length === 1 ? "1 item" : `${items.length} itens`} no checklist
      </p>

      {groups.length === 0 ? (
        <div className={styles.empty}>
          Nenhum item no checklist. Projetos novos vão nascer sem pontos fixos.
        </div>
      ) : (
        <div className={styles.groups}>
          {groups.map((group) => (
            <section key={group.category} className={styles.group}>
              <h2 className={styles.groupHead}>
                {group.category}
                <span className={styles.groupCount}>{group.items.length}</span>
              </h2>
              <ul className={styles.list}>
                {group.items.map((item, index) =>
                  editingId === item.id ? (
                    <EditItemRow
                      key={item.id}
                      item={item}
                      onDone={() => setEditingId(null)}
                    />
                  ) : (
                    <li key={item.id} className={styles.item}>
                      <div className={styles.order}>
                        <button
                          type="button"
                          className={styles.iconBtn}
                          onClick={() => move(item.id, "up")}
                          disabled={index === 0}
                          aria-label="Subir item"
                          title="Subir"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                            <path d="M6 15l6-6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className={styles.iconBtn}
                          onClick={() => move(item.id, "down")}
                          disabled={index === group.items.length - 1}
                          aria-label="Descer item"
                          title="Descer"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </div>

                      <div className={styles.text}>
                        <p className={styles.itemTitle}>{item.title}</p>
                        {item.subtitle && (
                          <p className={styles.itemSub}>{item.subtitle}</p>
                        )}
                      </div>

                      {confirmingId === item.id ? (
                        <span className={styles.confirm}>
                          <span className={styles.confirmLabel}>
                            Excluir este item?
                          </span>
                          <button
                            type="button"
                            className={styles.confirmYes}
                            onClick={() => remove(item.id)}
                          >
                            Excluir
                          </button>
                          <button
                            type="button"
                            className={styles.confirmNo}
                            onClick={() => setConfirmingId(null)}
                          >
                            Cancelar
                          </button>
                        </span>
                      ) : (
                        <div className={styles.rowActions}>
                          <button
                            type="button"
                            className={styles.iconBtn}
                            onClick={() => {
                              setConfirmingId(null);
                              setEditingId(item.id);
                            }}
                            aria-label="Editar item"
                            title="Editar"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
                              <path d="M4 20h4L18.5 9.5a2.1 2.1 0 00-3-3L5 17v3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            className={`${styles.iconBtn} ${styles.danger}`}
                            onClick={() => setConfirmingId(item.id)}
                            aria-label="Excluir item"
                            title="Excluir"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
                              <path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m2 0v12a1 1 0 01-1 1H8a1 1 0 01-1-1V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </li>
                  )
                )}
              </ul>
            </section>
          ))}
        </div>
      )}

      {error && <Toast message={error} onDismiss={() => setError(null)} />}
    </>
  );
}

/** Formulário de novo item. Mantém a página escolhida para cadastrar em sequência. */
function AddItemForm() {
  const titleRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const res = await addChecklistItemAction(
        toFormData({ category, title, subtitle })
      );
      if (res.error) {
        setError(res.error);
        return;
      }
      setTitle("");
      setSubtitle("");
      titleRef.current?.focus();
    });
  }

  return (
    <form className={styles.addCard} onSubmit={handleSubmit}>
      <h2 className={styles.addTitle}>Novo item</h2>
      <div className={styles.addGrid}>
        <label className={styles.field}>
          <span className={styles.label}>Página de QA</span>
          <select
            className={styles.input}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={pending}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className={`${styles.field} ${styles.fieldTitle}`}>
          <span className={styles.label}>
            Título <span className={styles.req}>*</span>
          </span>
          <input
            ref={titleRef}
            className={styles.input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex.: Favicon está ok?"
            maxLength={CHECKLIST_TITLE_MAX}
            autoComplete="off"
            disabled={pending}
          />
        </label>
        <label className={`${styles.field} ${styles.fieldWide}`}>
          <span className={styles.label}>
            Descrição <span className={styles.optional}>(opcional)</span>
          </span>
          <input
            className={styles.input}
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="O que verificar neste ponto"
            maxLength={CHECKLIST_SUBTITLE_MAX}
            autoComplete="off"
            disabled={pending}
          />
        </label>
        <Button type="submit" variant="primary" disabled={pending || !title.trim()}>
          {pending ? "Adicionando…" : "Adicionar item"}
        </Button>
      </div>
      {error && <p className={styles.err}>{error}</p>}
    </form>
  );
}

/** Linha em modo de edição (página, título e descrição). Esc cancela. */
function EditItemRow({
  item,
  onDone,
}: {
  item: ChecklistItemView;
  onDone: () => void;
}) {
  const [category, setCategory] = useState(item.category);
  const [title, setTitle] = useState(item.title);
  const [subtitle, setSubtitle] = useState(item.subtitle ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const res = await updateChecklistItemAction(
        item.id,
        toFormData({ category, title, subtitle })
      );
      if (res.error) setError(res.error);
      else onDone();
    });
  }

  return (
    <li className={`${styles.item} ${styles.itemEditing}`}>
      <form
        className={styles.editForm}
        onSubmit={handleSubmit}
        onKeyDown={(e) => {
          if (e.key === "Escape" && !pending) onDone();
        }}
      >
        <div className={styles.editGrid}>
          <select
            className={styles.input}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={pending}
            aria-label="Página de QA"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            className={styles.input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={CHECKLIST_TITLE_MAX}
            autoComplete="off"
            autoFocus
            disabled={pending}
            aria-label="Título"
          />
        </div>
        <textarea
          className={styles.input}
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          placeholder="Descrição (opcional)"
          maxLength={CHECKLIST_SUBTITLE_MAX}
          rows={2}
          disabled={pending}
          aria-label="Descrição"
        />
        {error && <p className={styles.err}>{error}</p>}
        <div className={styles.editActions}>
          <Button type="button" variant="ghost" size="sm" onClick={onDone} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={pending || !title.trim()}>
            {pending ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </form>
    </li>
  );
}
