import Link from "next/link";
import { listTemplatePoints } from "@/lib/db/queries";
import { TemplateAdmin } from "@/components/admin/TemplateAdmin";
import styles from "./template.module.css";

export const metadata = { title: "Template master · QA Maker" };
export const dynamic = "force-dynamic";

export default async function TemplateAdminPage() {
  const points = await listTemplatePoints();

  return (
    <main className={styles.main}>
      <Link href="/projetos" className={styles.back}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M15 18l-6-6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Voltar
      </Link>

      <p className={styles.eyebrow}>Configuração</p>
      <h1 className={styles.title}>Template master</h1>
      <p className={styles.lead}>
        Checklist-padrão copiado para cada novo projeto. Editar aqui{" "}
        <strong>não altera projetos já criados</strong> — só os próximos.
      </p>

      <TemplateAdmin initialPoints={points} />
    </main>
  );
}
