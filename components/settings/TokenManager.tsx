"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui";
import {
  createTokenAction,
  revokeTokenAction,
  type CreateTokenState,
} from "@/app/configuracoes/actions";
import styles from "./TokenManager.module.css";

interface TokenRow {
  id: string;
  label: string;
  createdAt: Date;
  lastUsedAt: Date | null;
}

const initialState: CreateTokenState = {};

function fmt(d: Date | null): string {
  if (!d) return "nunca";
  return new Date(d).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function TokenManager({ tokens }: { tokens: TokenRow[] }) {
  const [state, formAction, pending] = useActionState(
    createTokenAction,
    initialState
  );
  const [copied, setCopied] = useState(false);

  async function copy(token: string) {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard indisponível — usuário copia manualmente */
    }
  }

  return (
    <section className={styles.wrap}>
      {/* Criar novo token */}
      <form action={formAction} className={styles.form}>
        <label className={styles.label} htmlFor="token-label">
          Novo token
        </label>
        <div className={styles.formRow}>
          <input
            id="token-label"
            name="label"
            className={styles.input}
            placeholder="Nome do dispositivo (ex.: Chrome do trabalho)"
            maxLength={60}
            autoComplete="off"
          />
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? "Gerando…" : "Gerar token"}
          </Button>
        </div>
        {state.error && <p className={styles.err}>{state.error}</p>}
      </form>

      {/* Token recém-criado (exibido uma única vez) */}
      {state.token && (
        <div className={styles.reveal}>
          <p className={styles.revealTitle}>
            Token criado — copie agora, ele não será exibido novamente.
          </p>
          <div className={styles.revealRow}>
            <code className={styles.code}>{state.token}</code>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => copy(state.token!)}
            >
              {copied ? "Copiado!" : "Copiar"}
            </Button>
          </div>
        </div>
      )}

      {/* Tokens ativos */}
      <div className={styles.list}>
        <h2 className={styles.listTitle}>Tokens ativos</h2>
        {tokens.length === 0 ? (
          <p className={styles.empty}>Nenhum token ativo.</p>
        ) : (
          <ul className={styles.ul}>
            {tokens.map((t) => (
              <li key={t.id} className={styles.item}>
                <div className={styles.meta}>
                  <span className={styles.name}>{t.label}</span>
                  <span className={styles.dates}>
                    Criado em {fmt(t.createdAt)} · Último uso:{" "}
                    {fmt(t.lastUsedAt)}
                  </span>
                </div>
                <form action={revokeTokenAction.bind(null, t.id)}>
                  <Button type="submit" variant="danger" size="sm">
                    Revogar
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
