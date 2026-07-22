import { requireFGUser } from "@/lib/auth-guard";
import { listApiTokens } from "@/lib/db/queries";
import { TokenManager } from "@/components/settings/TokenManager";
import styles from "./configuracoes.module.css";

export const metadata = { title: "Configurações · QA Maker" };

export default async function ConfiguracoesPage() {
  const user = await requireFGUser();
  const tokens = await listApiTokens(user.email);

  return (
    <main className={styles.main}>
      <header className={styles.head}>
        <h1 className={styles.title}>Configurações</h1>
        <p className={styles.sub}>
          Tokens de API para a extensão de navegador do QA Maker.
        </p>
      </header>

      <TokenManager tokens={tokens} />
    </main>
  );
}
