import { after } from "next/server";
import { BlobNotFoundError, head, put } from "@vercel/blob";
import { requireApiToken } from "@/lib/api-guard";
import { AccessDeniedError } from "@/lib/auth-guard";
import { corsJson, corsPreflight } from "@/lib/api-cors";
import { validateImageFile } from "@/lib/image";
import { extensionMediaPrefix, validateMedia } from "@/lib/media";
import { CATEGORIES, type Category } from "@/lib/constants";
import { getProject, createExtensionCard } from "@/lib/db/queries";
import { notifyResponsible } from "@/lib/slack";
import { appOriginFromHeaders, newPointMessage } from "@/lib/slack-messages";

export const runtime = "nodejs";

const DEFAULT_CATEGORY: Category = "Geral";

export function OPTIONS() {
  return corsPreflight();
}

/**
 * Cria um "card" (ponto manual) a partir da extensão, via multipart/form-data:
 * título, descrição e OU a imagem já anotada (`image`, marcações achatadas) OU
 * a URL de uma gravação (`mediaUrl`, GIF/vídeo) que a extensão já subiu direto
 * para o Blob com o token de `/api/ext/uploads`.
 */
export async function POST(request: Request) {
  try {
    const caller = await requireApiToken(request);

    const form = await request.formData();
    const file = form.get("image");
    const mediaUrl = String(form.get("mediaUrl") ?? "").trim();
    const projectId = String(form.get("projectId") ?? "").trim();
    const title = String(form.get("title") ?? "").trim();
    const description = String(form.get("description") ?? "").trim();
    const rawCategory = String(form.get("category") ?? "").trim();

    if (!(file instanceof File) && !mediaUrl) {
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

    let errorImageUrl: string;
    if (file instanceof File) {
      const check = validateImageFile({ type: file.type, size: file.size });
      if (!check.ok) {
        return corsJson({ error: check.error }, { status: 413 });
      }

      const ext = file.type.split("/")[1] ?? "png";
      const pathname = `${extensionMediaPrefix(projectId)}${Date.now()}.${ext}`;
      const blob = await put(pathname, file, {
        access: "public",
        contentType: file.type,
      });
      errorImageUrl = blob.url;
    } else {
      // A gravação já está no Blob. O token de upload restringe pasta, tipo e
      // tamanho, mas a URL chega aqui vinda do cliente: confere que é do nosso
      // store, da pasta deste projeto e dentro das regras.
      const meta = await head(mediaUrl).catch((err) => {
        if (err instanceof BlobNotFoundError) return null;
        throw err;
      });
      if (!meta || !meta.pathname.startsWith(extensionMediaPrefix(projectId))) {
        return corsJson({ error: "Gravação não encontrada." }, { status: 400 });
      }
      const check = validateMedia({ type: meta.contentType, size: meta.size });
      if (!check.ok) {
        return corsJson({ error: check.error }, { status: 413 });
      }
      errorImageUrl = meta.url;
    }

    const card = await createExtensionCard(
      projectId,
      {
        category,
        title,
        description: description || null,
        errorImageUrl,
      },
      caller.email
    );

    // Notifica o responsável (best-effort, após a resposta). O autor via
    // extensão é sempre FG → skipEmail evita DM sobre a própria adição.
    const origin = appOriginFromHeaders(request.headers);
    after(() =>
      notifyResponsible(
        projectId,
        newPointMessage({
          origin,
          projectId,
          projectName: project.name,
          actorName: caller.email,
          pointTitle: card.title,
          viaExtension: true,
        }),
        { skipEmail: caller.email }
      )
    );

    return corsJson(
      {
        card: { id: card.id, projectId, title: card.title, imageUrl: errorImageUrl },
      },
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
