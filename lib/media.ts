/**
 * Mídia gravada pela extensão (GIF e vídeo). Diferente das imagens
 * (`lib/image.ts`), sobe direto do navegador para o Vercel Blob com um token
 * de cliente — por isso os limites passam do teto de 4,5 MB do corpo de
 * requisição das funções da Vercel.
 */

const MB = 1024 * 1024;

export const MEDIA_LIMITS = {
  "image/gif": 10 * MB,
  "video/webm": 50 * MB,
  "video/mp4": 50 * MB,
} as const;

export type MediaType = keyof typeof MEDIA_LIMITS;

const EXTENSIONS: Record<MediaType, string> = {
  "image/gif": "gif",
  "video/webm": "webm",
  "video/mp4": "mp4",
};

/** "video/webm;codecs=vp9" → "video/webm". */
export function baseMediaType(type: string): string {
  return type.split(";")[0].trim().toLowerCase();
}

export function validateMedia(
  file: { type: string; size: number }
): { ok: true; type: MediaType } | { ok: false; error: string } {
  const type = baseMediaType(file.type);
  if (!(type in MEDIA_LIMITS)) {
    return { ok: false, error: "Apenas GIF, WebM e MP4 são aceitos." };
  }
  const limit = MEDIA_LIMITS[type as MediaType];
  if (!(file.size > 0) || file.size > limit) {
    return {
      ok: false,
      error: `Arquivo deve ter no máximo ${limit / MB} MB.`,
    };
  }
  return { ok: true, type: type as MediaType };
}

export function mediaExtension(type: MediaType): string {
  return EXTENSIONS[type];
}

/** Pasta dos arquivos enviados pela extensão para um projeto. */
export function extensionMediaPrefix(projectId: string): string {
  return `projetos/${projectId}/extensao/`;
}

/** A URL do "print" de um ponto aponta para um vídeo (e não uma imagem)? */
export function isVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    return /\.(webm|mp4)$/i.test(new URL(url).pathname);
  } catch {
    return false;
  }
}
