import { put } from "@vercel/blob";
import { requireApiToken } from "@/lib/api-guard";
import { AccessDeniedError } from "@/lib/auth-guard";
import { corsJson, corsPreflight } from "@/lib/api-cors";
import { validateImageFile } from "@/lib/image";
import { CATEGORIES, type Category } from "@/lib/constants";
import { getProject, createExtensionCard } from "@/lib/db/queries";

export const runtime = "nodejs";

const DEFAULT_CATEGORY: Category = "Geral";

export function OPTIONS() {
  return corsPreflight();
}

/**
 * Cria um "card" (ponto manual) a partir da extensão: recebe a imagem já
 * anotada (marcações achatadas), título e descrição via multipart/form-data.
 */
export async function POST(request: Request) {
  try {
    const caller = await requireApiToken(request);

    const form = await request.formData();
    const file = form.get("image");
    const projectId = String(form.get("projectId") ?? "").trim();
    const title = String(form.get("title") ?? "").trim();
    const description = String(form.get("description") ?? "").trim();
    const rawCategory = String(form.get("category") ?? "").trim();

    if (!(file instanceof File)) {
      return corsJson({ error: "Imagem ausente." }, { status: 400 });
    }
    if (!projectId) {
      return corsJson({ error: "Projeto ausente." }, { status: 400 });
    }
    if (!title) {
      return corsJson({ error: "Informe um título." }, { status: 400 });
    }
    if (title.length > 200) {
      return corsJson(
        { error: "Título muito longo (máximo 200 caracteres)." },
        { status: 400 }
      );
    }

    const category: Category = CATEGORIES.includes(rawCategory as Category)
      ? (rawCategory as Category)
      : DEFAULT_CATEGORY;

    const project = await getProject(projectId);
    if (!project) {
      return corsJson({ error: "Projeto não encontrado." }, { status: 404 });
    }

    const check = validateImageFile({ type: file.type, size: file.size });
    if (!check.ok) {
      return corsJson({ error: check.error }, { status: 413 });
    }

    const ext = file.type.split("/")[1] ?? "png";
    const pathname = `projetos/${projectId}/extensao/${Date.now()}.${ext}`;
    const blob = await put(pathname, file, {
      access: "public",
      contentType: file.type,
    });

    const card = await createExtensionCard(
      projectId,
      {
        category,
        title,
        notes: description || null,
        errorImageUrl: blob.url,
      },
      caller.email
    );

    return corsJson(
      { card: { id: card.id, projectId, title: card.title, imageUrl: blob.url } },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof AccessDeniedError) {
      return corsJson({ error: err.message }, { status: 401 });
    }
    console.error("Falha em /api/ext/cards:", err);
    return corsJson({ error: "Falha ao criar o card." }, { status: 500 });
  }
}
