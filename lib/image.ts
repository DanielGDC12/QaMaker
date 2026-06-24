/** Regras de validação de imagem — compartilhadas cliente e servidor. */

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const ACCEPT_ATTR = ACCEPTED_IMAGE_TYPES.join(",");

export function validateImageFile(
  file: { type: string; size: number }
): { ok: true } | { ok: false; error: string } {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type as never)) {
    return { ok: false, error: "Apenas JPEG, PNG e WebP são aceitos." };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: "Imagem deve ter no máximo 5 MB." };
  }
  return { ok: true };
}
