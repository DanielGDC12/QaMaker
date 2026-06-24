import { listProjectsWithProgress } from "@/lib/db/queries";
import { ProjectRow } from "@/components/projects/ProjectRow";
import { NewProjectButton } from "@/components/projects/NewProjectButton";
import styles from "./projetos.module.css";

export const metadata = { title: "Projetos · QA Maker" };

// Sempre renderiza com dados frescos (lista muda a cada auditoria).
export const dynamic = "force-dynamic";

export default async function ProjetosPage() {
  const projects = await listProjectsWithProgress();

  return (
    <main className={styles.main}>
      <div className={styles.head}>
        <div>
          <p className={styles.eyebrow}>Auditorias de QA</p>
          <h1 className={styles.title}>Projetos</h1>
        </div>
        <NewProjectButton />
      </div>

      {projects.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyMark} aria-hidden />
          <h2 className={styles.emptyTitle}>Nenhum projeto ainda</h2>
          <p className={styles.emptyText}>
            Crie o primeiro projeto para começar uma auditoria. O
            checklist-padrão será copiado automaticamente.
          </p>
          <NewProjectButton />
        </div>
      ) : (
        <ul className={styles.list}>
          {projects.map((p) => (
            <li key={p.id}>
              <ProjectRow project={p} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
