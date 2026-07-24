import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  getProject,
  getProjectPoints,
  listSharesForProject,
} from "@/lib/db/queries";
import { requireProjectActor, type Actor } from "@/lib/auth-guard";
import { PointsBoard } from "@/components/points/PointsBoard";
import { AddPointButton } from "@/components/points/AddPointButton";
import { DeleteProjectButton } from "@/components/projects/DeleteProjectButton";
import { ShareManagementPanel } from "@/components/shares/ShareManagementPanel";
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

  // Resolve o ator (FG ou externo). Sessão externa revogada/expirada no meio
  // do caminho cai aqui → mensagem de link inválido.
  let actor: Actor;
  try {
    actor = await requireProjectActor(id);
  } catch {
    redirect("/acesso-restrito?motivo=link");
  }

  const project = await getProject(id);
  if (!project) notFound();

  const isFG = actor.type === "fg";
  const points = await getProjectPoints(id, actor);
  const shares = isFG ? await listSharesForProject(id) : [];

  return (
    <main className={styles.main}>
      {isFG && (
        <nav className={styles.crumb} aria-label="Trilha de navegação">
          <Link href="/projetos" className={styles.crumbLink}>
            Projetos
          </Link>
          <span className={styles.crumbSep} aria-hidden>
            /
          </span>
          <span className={styles.crumbCurrent}>{project.name}</span>
        </nav>
      )}

      <div className={styles.titleRow}>
        <h1 className={styles.title}>{project.name}</h1>
        <div className={styles.actions}>
          {isFG && (
            <ShareManagementPanel projectId={project.id} shares={shares} />
          )}
          <AddPointButton projectId={project.id} />
          {isFG && (
            <DeleteProjectButton
              projectId={project.id}
              projectName={project.name}
            />
          )}
        </div>
      </div>

      {points.length === 0 ? (
        <p className={styles.empty}>
          {isFG
            ? "Este projeto ainda não tem pontos de QA. Use “Novo ponto” para adicionar o primeiro, escolhendo a página de QA."
            : "Ainda não há pontos de QA registrados. Use “Novo ponto” para adicionar o primeiro, escolhendo a página."}
        </p>
      ) : (
        <PointsBoard
          projectId={project.id}
          initialPoints={points}
          viewerType={actor.type}
          currentShareId={actor.type === "external" ? actor.shareId : null}
        />
      )}
    </main>
  );
}
