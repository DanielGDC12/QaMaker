import Link from "next/link";
import { listProjectsWithProgress } from "@/lib/db/queries";
import { ProjectRow } from "@/components/projects/ProjectRow";
import { NewProjectButton } from "@/components/projects/NewProjectButton";
import { deriveProjectStatus, PROJECT_STATUS_META, type ProjectStatus } from "@/lib/constants";
import styles from "./projetos.module.css";

export const metadata = { title: "Projetos · QA Maker" };

// Sempre renderiza com dados frescos (lista muda a cada auditoria).
export const dynamic = "force-dynamic";

const TABS: { key: ProjectStatus | "todos"; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "a_iniciar", label: PROJECT_STATUS_META.a_iniciar.label },
  { key: "em_revisao", label: PROJECT_STATUS_META.em_revisao.label },
  { key: "concluido", label: PROJECT_STATUS_META.concluido.label },
];

export default async function ProjetosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const activeTab = TABS.some((t) => t.key === status) ? (status as ProjectStatus | "todos") : "todos";

  const allProjects = await listProjectsWithProgress();
  const withStatus = allProjects.map((p) => ({ ...p, status: deriveProjectStatus(p.pct) }));
  const projects =
    activeTab === "todos" ? withStatus : withStatus.filter((p) => p.status === activeTab);

  return (
    <main className={styles.main}>
      <div className={styles.head}>
        <div>
          <p className={styles.eyebrow}>Auditorias de QA</p>
          <h1 className={styles.title}>Projetos</h1>
        </div>
        <div className={styles.headActions}>
          <NewProjectButton />
        </div>
      </div>

      {allProjects.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyMark} aria-hidden>
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </span>
          <h2 className={styles.emptyTitle}>Nenhum projeto ainda</h2>
          <p className={styles.emptyText}>
            Crie o primeiro projeto para começar uma auditoria. Depois é só
            adicionar os pontos de QA de cada página.
          </p>
          <NewProjectButton />
        </div>
      ) : (
        <>
          <div className={styles.tabs} role="tablist">
            {TABS.map((tab) => {
              const count =
                tab.key === "todos"
                  ? withStatus.length
                  : withStatus.filter((p) => p.status === tab.key).length;
              const isActive = tab.key === activeTab;
              return (
                <Link
                  key={tab.key}
                  href={tab.key === "todos" ? "/projetos" : `/projetos?status=${tab.key}`}
                  role="tab"
                  aria-selected={isActive}
                  className={isActive ? `${styles.tab} ${styles.tabActive}` : styles.tab}
                >
                  {tab.label}
                  <span className={styles.tabCount}>{count}</span>
                </Link>
              );
            })}
          </div>

          {projects.length === 0 ? (
            <div className={styles.emptyFiltered}>
              Nenhum projeto com esse status.
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
        </>
      )}
    </main>
  );
}
