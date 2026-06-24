import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject, getProjectPoints } from "@/lib/db/queries";
import { PointsBoard } from "@/components/points/PointsBoard";
import styles from "./detalhe.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);
  return { title: project ? `${project.name} · QA Maker` : "Projeto · QA Maker" };
}

export default async function ProjetoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  const points = await getProjectPoints(id);

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

      <h1 className={styles.title}>{project.name}</h1>

      {points.length === 0 ? (
        <p className={styles.empty}>
          Este projeto ainda não tem pontos de QA. O template master estava
          vazio quando o projeto foi criado.
        </p>
      ) : (
        <PointsBoard projectId={project.id} initialPoints={points} />
      )}
    </main>
  );
}
