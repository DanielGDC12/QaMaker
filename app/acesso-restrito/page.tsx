import Link from "next/link";
import { FG_DOMAIN } from "@/lib/auth-domain";
import { Button } from "@/components/ui";
import styles from "./restrito.module.css";

export const metadata = { title: "Acesso restrito · QA Maker" };

export default async function AcessoRestritoPage({
  searchParams,
}: {
  searchParams: Promise<{ motivo?: string }>;
}) {
  const { motivo } = await searchParams;
  // "link" = convidado externo com link inválido/expirado/revogado.
  const isLinkIssue = motivo === "link";

  return (
    <main className={styles.wrap}>
      <div className={styles.card}>
        <span className={styles.badge}>Acesso restrito</span>
        {isLinkIssue ? (
          <>
            <h1 className={styles.title}>Link de acesso inválido</h1>
            <p className={styles.lead}>
              Este link de acesso não é mais válido — ele pode ter expirado ou
              sido revogado. Peça um novo link à equipe da Agência FG.
            </p>
          </>
        ) : (
          <>
            <h1 className={styles.title}>Esta conta não tem acesso</h1>
            <p className={styles.lead}>
              O QA Maker é exclusivo para membros da Agência FG. Entre com uma
              conta Google terminada em <code>{FG_DOMAIN}</code>.
            </p>
            <Link href="/login">
              <Button variant="primary" className={styles.cta}>
                Tentar com outra conta
              </Button>
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
