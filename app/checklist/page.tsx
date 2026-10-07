import { requireFGUser } from "@/lib/auth-guard";
import { listChecklistTemplate } from "@/lib/db/queries";
import { ChecklistEditor } from "@/components/checklist/ChecklistEditor";
import styles from "./checklist.module.css";

export const metadata = { title: "Checklist FG · QA Maker" };

// Lista editável: sempre com dados frescos.
export const dynamic = "force-dynamic";

export default async function ChecklistPage() {
  await requireFGUser();
  const items = await listChecklistTemplate();

  return (
    <main className={styles.main}>
      <header className={styles.head}>
        <p className={styles.eyebrow}>Itens fixos</p>
        <h1 className={styles.title}>Checklist FG</h1>
        <p className={styles.sub}>
          Pontos de QA que todo projeto novo recebe. Alterações aqui valem só
          para projetos criados a partir de agora — auditorias em andamento não
          mudam.
        </p>
      </header>

      <ChecklistEditor
        items={items.map((i) => ({
          id: i.id,
          category: i.category,
          title: i.title,
          subtitle: i.subtitle,
          displayOrder: i.displayOrder,
        }))}
      />
    </main>
  );
}
