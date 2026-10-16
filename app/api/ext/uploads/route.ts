import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";
import { requireApiToken } from "@/lib/api-guard";
import { AccessDeniedError } from "@/lib/auth-guard";
import { corsJson, corsPreflight } from "@/lib/api-cors";
import {
  MEDIA_LIMITS,
  extensionMediaPrefix,
  mediaExtension,
  validateMedia,
} from "@/lib/media";
import { getProject } from "@/lib/db/queries";

export const runtime = "nodejs";

/** Janela para o upload começar depois de emitido o token. */
const TOKEN_TTL_MS = 10 * 60 * 1000;

export function OPTIONS() {
  return corsPreflight();
}

/**
 * Emite um token de cliente do Vercel Blob para a extensão subir uma gravação
 * (GIF/vídeo) direto do navegador — o arquivo não passa por esta função, que
 * tem o corpo limitado a 4,5 MB na Vercel. O token só vale para o `pathname`
 * devolvido, com o tipo e o tamanho máximo do arquivo declarado.
 * O card é criado depois em `/api/ext/cards` com `mediaUrl`.
 */
export async function POST(request: Request) {
  try {
    await requireApiToken(request);

    const body = await request.json().catch(() => null);
    const projectId = String(body?.projectId ?? "").trim();
    const contentType = String(body?.contentType ?? "");
    const size = Number(body?.size ?? 0);

    if (!projectId) {
      return corsJson({ error: "Projeto ausente." }, { status: 400 });
    }

    const check = validateMedia({ type: contentType, size });
    if (!check.ok) {
      return corsJson({ error: check.error }, { status: 413 });
    }

    const project = await getProject(projectId);
    if (!project) {
      return corsJson({ error: "Projeto não encontrado." }, { status: 404 });
    }

    const pathname = `${extensionMediaPrefix(projectId)}${Date.now()}.${mediaExtension(check.type)}`;
    const clientToken = await generateClientTokenFromReadWriteToken({
      pathname,
      allowedContentTypes: [check.type],
      maximumSizeInBytes: MEDIA_LIMITS[check.type],
      validUntil: Date.now() + TOKEN_TTL_MS,
    });

    return corsJson({ clientToken, pathname, contentType: check.type });
  } catch (err) {
    if (err instanceof AccessDeniedError) {
      return corsJson({ error: err.message }, { status: 401 });
    }
    console.error("Falha em /api/ext/uploads:", err);
    return corsJson({ error: "Falha ao preparar o envio." }, { status: 500 });
  }
}
