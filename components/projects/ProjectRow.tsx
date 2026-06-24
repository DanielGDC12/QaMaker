import Link from "next/link";
import { ProgressBar, Pill } from "@/components/ui";
import { deriveProjectStatus, PROJECT_STATUS_META } from "@/lib/constants";
import type { ProjectWithProgress } from "@/lib/db/queries";
import styles from "./ProjectRow.module.css";

export function ProjectRow({ project }: { project: ProjectWithProgress }) {
  const status = deriveProjectStatus(project.pct);
  const meta = PROJECT_STATUS_META[status];

  return (
    <Link href={`/projetos/${project.id}`} className={styles.row}>
      <div className={styles.main}>
        <span className={styles.name}>{project.name}</span>
        <div className={styles.progress}>
          <ProgressBar value={project.pct} />
          <span className={styles.pct}>{project.pct}%</span>
        </div>
      </div>
      <Pill label={meta.label} color={meta.color} weak={meta.weak} />
      <svg
        className={styles.chevron}
        width="18"
        height="18"
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
