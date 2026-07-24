import Link from "next/link";
import { ProgressBar, Pill } from "@/components/ui";
import { deriveProjectStatus, PROJECT_STATUS_META } from "@/lib/constants";
import type { ProjectWithProgress } from "@/lib/db/queries";
import styles from "./ProjectRow.module.css";

const dateFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function ProjectRow({ project }: { project: ProjectWithProgress }) {
  const status = deriveProjectStatus(project.pct);
  const meta = PROJECT_STATUS_META[status];
  const count = `${project.total} ${project.total === 1 ? "ponto" : "pontos"}`;

  return (
    <Link href={`/projetos/${project.id}`} className={styles.row}>
      <div className={styles.info}>
        <span className={styles.name}>{project.name}</span>
        <span className={styles.meta}>
          {count} · criado em {dateFmt.format(new Date(project.createdAt))}
        </span>
      </div>
      <div className={styles.progress}>
        <ProgressBar value={project.pct} />
        <span className={styles.pct}>{project.pct}%</span>
      </div>
      <div className={styles.badge}>
        <Pill label={meta.label} color={meta.color} weak={meta.weak} dot={false} />
      </div>
      <svg
        className={styles.chevron}
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
      >
        <path
          d="M9 6l6 6-6 6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </Link>
  );
}
