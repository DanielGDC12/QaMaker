import { requireApiToken } from "@/lib/api-guard";
import { AccessDeniedError } from "@/lib/auth-guard";
import { corsJson, corsPreflight } from "@/lib/api-cors";
import {
  listProjectsBasic,
  createProjectFromTemplate,
} from "@/lib/db/queries";

export const runtime = "nodejs";

export function OPTIONS() {
  return corsPreflight();
}

/** Lista de projetos (id + nome) para o seletor da extensão. */
export async function GET(request: Request) {
  try {
    await requireApiToken(request);
    const projects = await listProjectsBasic();
    return corsJson({ projects });
  } catch (err) {
    return handleError(err);
  }
}

/** Cria um projeto (copiando o template master, como no fluxo da UI). */
export async function POST(request: Request) {
  try {
    const caller = await requireApiToken(request);

    const body = await request.json().catch(() => null);
    const name = String(body?.name ?? "").trim();
    if (!name) {
      return corsJson({ error: "Informe o nome do projeto." }, { status: 400 });
    }
    if (name.length > 120) {
      return corsJson(
        { error: "Nome muito longo (máximo 120 caracteres)." },
        { status: 400 }
      );
    }

    const id = await createProjectFromTemplate(name, caller.email);
    return corsJson({ project: { id, name } }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}

function handleError(err: unknown) {
  if (err instanceof AccessDeniedError) {
    return corsJson({ error: err.message }, { status: 401 });
  }
  console.error("Falha em /api/ext/projects:", err);
  return corsJson({ error: "Erro interno." }, { status: 500 });
}
