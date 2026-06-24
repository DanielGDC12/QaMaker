import { eq, asc, desc, sql, and } from "drizzle-orm";
import { db } from "./index";
import {
  projects,
  projectPoints,
  templatePoints,
  users,
} from "./schema";
import type { PointStatus, Category } from "@/lib/constants";

/* ── Usuários ─────────────────────────────────────────────── */
export async function upsertUser(u: {
  email: string;
  name: string;
  avatarUrl?: string | null;
}) {
  await db
    .insert(users)
    .values({ email: u.email, name: u.name, avatarUrl: u.avatarUrl ?? null })
    .onConflictDoUpdate({
      target: users.email,
      set: { name: u.name, avatarUrl: u.avatarUrl ?? null },
    });
}

/* ── Projetos: lista com progresso agregado ───────────────── */
export interface ProjectWithProgress {
  id: string;
  name: string;
  createdAt: Date;
  createdBy: string;
  total: number;
  done: number;
  pct: number;
}

export async function listProjectsWithProgress(): Promise<
  ProjectWithProgress[]
> {
  const doneFilter = sql<number>`count(*) filter (where ${projectPoints.status} in ('feito','nao_possivel'))`;
  const totalCount = sql<number>`count(${projectPoints.id})`;

  const rows = await db
    .select({
      id: projects.id,
      name: projects.name,
      createdAt: projects.createdAt,
      createdBy: projects.createdBy,
      total: totalCount,
      done: doneFilter,
    })
    .from(projects)
    .leftJoin(projectPoints, eq(projectPoints.projectId, projects.id))
    .groupBy(projects.id)
    .orderBy(desc(projects.createdAt));

  return rows.map((r) => {
    const total = Number(r.total);
    const done = Number(r.done);
    return {
      ...r,
      total,
      done,
      pct: total === 0 ? 0 : Math.round((done / total) * 100),
    };
  });
}

/* ── Projeto individual + pontos ──────────────────────────── */
export async function getProject(id: string) {
  const [row] = await db.select().from(projects).where(eq(projects.id, id));
  return row ?? null;
}

export async function getProjectPoint(pointId: string) {
  const [row] = await db
    .select()
    .from(projectPoints)
    .where(eq(projectPoints.id, pointId));
  return row ?? null;
}

export async function getProjectPoints(projectId: string) {
  return db
    .select()
    .from(projectPoints)
    .where(eq(projectPoints.projectId, projectId))
    .orderBy(asc(projectPoints.displayOrder));
}

/* ── Criar projeto copiando o template master (atômico) ───── */
export async function createProjectFromTemplate(
  name: string,
  createdBy: string
): Promise<string> {
  const projectId = crypto.randomUUID();
  const template = await db
    .select()
    .from(templatePoints)
    .orderBy(asc(templatePoints.displayOrder));

  const insertProject = db
    .insert(projects)
    .values({ id: projectId, name, createdBy });

  if (template.length === 0) {
    await insertProject;
    return projectId;
  }

  const pointRows = template.map((t) => ({
    projectId,
    templatePointId: t.id,
    category: t.category,
    title: t.title,
    subtitle: t.subtitle,
    displayOrder: t.displayOrder,
  }));

  // batch = transação única sobre HTTP no driver Neon
  await db.batch([insertProject, db.insert(projectPoints).values(pointRows)]);
  return projectId;
}

/* ── Atualizar um ponto do projeto ────────────────────────── */
export async function updateProjectPoint(
  pointId: string,
  patch: {
    status?: PointStatus;
    errorImageUrl?: string | null;
    notes?: string | null;
  },
  updatedBy: string
) {
  const [row] = await db
    .update(projectPoints)
    .set({ ...patch, updatedBy, updatedAt: new Date() })
    .where(eq(projectPoints.id, pointId))
    .returning();
  return row ?? null;
}

/* ── Adicionar ponto manual a um projeto ──────────────────── */
export async function addProjectPoint(
  projectId: string,
  data: {
    category: Category;
    title: string;
    subtitle?: string | null;
    displayOrder: number;
  },
  updatedBy: string
) {
  const [row] = await db
    .insert(projectPoints)
    .values({ projectId, ...data, updatedBy })
    .returning();
  return row;
}

export async function deleteProjectPoint(pointId: string) {
  const [row] = await db
    .delete(projectPoints)
    .where(eq(projectPoints.id, pointId))
    .returning({ errorImageUrl: projectPoints.errorImageUrl });
  return row ?? null;
}

/* ── Deletar projeto (retorna URLs de imagem para limpar Blob) ── */
export async function deleteProject(projectId: string): Promise<string[]> {
  const imgs = await db
    .select({ url: projectPoints.errorImageUrl })
    .from(projectPoints)
    .where(
      and(
        eq(projectPoints.projectId, projectId),
        // apenas os que têm imagem
        sql`${projectPoints.errorImageUrl} is not null`
      )
    );
  // cascade remove os project_points automaticamente
  await db.delete(projects).where(eq(projects.id, projectId));
  return imgs.map((i) => i.url).filter((u): u is string => Boolean(u));
}

/* ── Template master (CRUD para /admin/template) ──────────── */
export async function listTemplatePoints() {
  return db
    .select()
    .from(templatePoints)
    .orderBy(asc(templatePoints.displayOrder));
}

export async function addTemplatePoint(data: {
  category: Category;
  title: string;
  subtitle?: string | null;
  displayOrder: number;
}) {
  const [row] = await db.insert(templatePoints).values(data).returning();
  return row;
}

export async function updateTemplatePoint(
  id: string,
  patch: Partial<{
    category: Category;
    title: string;
    subtitle: string | null;
    displayOrder: number;
  }>
) {
  const [row] = await db
    .update(templatePoints)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(templatePoints.id, id))
    .returning();
  return row ?? null;
}

export async function deleteTemplatePoint(id: string) {
  await db.delete(templatePoints).where(eq(templatePoints.id, id));
}

/** Reordena vários pontos do template. */
export async function reorderTemplatePoints(
  orders: { id: string; displayOrder: number }[]
) {
  for (const o of orders) {
    await db
      .update(templatePoints)
      .set({ displayOrder: o.displayOrder, updatedAt: new Date() })
      .where(eq(templatePoints.id, o.id));
  }
}
