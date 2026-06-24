import { StatusDropdown } from "./StatusDropdown";
import { ImageSlot } from "./ImageSlot";
import type { PointStatus } from "@/lib/constants";
import type { ProjectPoint } from "@/lib/db/schema";
import styles from "./PointCard.module.css";

interface Props {
  point: ProjectPoint;
  number: number;
  pending?: boolean;
  onStatusChange: (status: PointStatus) => void;
}

export function PointCard({ point, number, pending, onStatusChange }: Props) {
  return (
    <article className={styles.card}>
      <ImageSlot
        projectId={point.projectId}
        pointId={point.id}
        initialUrl={point.errorImageUrl}
      />

      <div className={styles.body}>
        <div className={styles.meta}>
          <span className={styles.num}>{String(number).padStart(2, "0")}</span>
          <span className={styles.tag}>{point.category}</span>
        </div>
        <h3 className={styles.title}>{point.title}</h3>
        {point.subtitle && <p className={styles.subtitle}>{point.subtitle}</p>}
      </div>

      <div className={styles.status}>
        <StatusDropdown
          value={point.status}
          pending={pending}
          onChange={onStatusChange}
        />
      </div>
    </article>
  );
}
