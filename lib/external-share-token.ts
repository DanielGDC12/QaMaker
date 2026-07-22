/**
 * Token de sessão para o ator externo (acesso via link compartilhado).
 *
 * Assinado com HMAC-SHA256 via **Web Crypto** (`crypto.subtle`), NÃO
 * `node:crypto` — este módulo é importado pelo `proxy.ts`, que roda no Edge
 * Runtime, onde `createHmac`/`Buffer` não existem. Usamos `atob`/`btoa`
 * (APIs Web, presentes tanto no Node quanto no Edge) em vez de `Buffer`.
 *
 * O cookie carrega apenas dados imutáveis (`shareId`, `projectId`, `exp`).
 * Nome do share e revogação NÃO ficam aqui — são sempre reconsultados no
 * banco pela camada Node (`requireProjectActor`). O Edge só verifica
 * assinatura + validade (fast-path), a revogação autoritativa é no banco.
 */

const ENCODER = new TextEncoder();
const DECODER = new TextDecoder();

/** Validade padrão do cookie de acesso externo: 180 dias. */
export const EXTERNAL_SHARE_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

/** Prefixo do nome do cookie — escopo por projeto evita colisão entre acessos. */
export function externalShareCookieName(projectId: string): string {
  return `qam_ext_share_${projectId}`;
}

export type ExternalSharePayload = {
  shareId: string;
  projectId: string;
  /** Expiração em segundos (epoch). */
  exp: number;
};

/**
 * Codifica string UTF-8 em um ArrayBuffer "puro" — o `.subtle` exige
 * `BufferSource` ancorado em ArrayBuffer (não `ArrayBufferLike`), então
 * copiamos os bytes para um buffer novo para satisfazer o tipo.
 */
function encodeUtf8(str: string): ArrayBuffer {
  const view = ENCODER.encode(str);
  const buf = new ArrayBuffer(view.byteLength);
  new Uint8Array(buf).set(view);
  return buf;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(str: string): ArrayBuffer {
  const padded = str
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(str.length + ((4 - (str.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function getKey(): Promise<CryptoKey> {
  const secret = process.env.EXTERNAL_SHARE_COOKIE_SECRET;
  if (!secret) {
    throw new Error(
      "EXTERNAL_SHARE_COOKIE_SECRET não definida. Configure em .env.local"
    );
  }
  return crypto.subtle.importKey(
    "raw",
    encodeUtf8(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

/** Assina um payload → string `body.signature` (base64url) para o cookie. */
export async function signExternalShareToken(
  payload: ExternalSharePayload
): Promise<string> {
  const key = await getKey();
  const body = toBase64Url(new Uint8Array(encodeUtf8(JSON.stringify(payload))));
  const sig = await crypto.subtle.sign("HMAC", key, encodeUtf8(body));
  return `${body}.${toBase64Url(new Uint8Array(sig))}`;
}

/**
 * Verifica assinatura + validade + escopo de projeto do cookie. Retorna o
 * `shareId` se válido, senão `null`. NÃO checa revogação (isso é no banco).
 */
export async function verifyExternalShareToken(
  cookieValue: string | undefined | null,
  expectedProjectId: string
): Promise<{ shareId: string } | null> {
  if (!cookieValue) return null;
  const [body, sig] = cookieValue.split(".");
  if (!body || !sig) return null;

  try {
    const key = await getKey();
    const ok = await crypto.subtle.verify(
      "HMAC",
      key,
      fromBase64Url(sig),
      encodeUtf8(body)
    );
    if (!ok) return null;

    const payload = JSON.parse(
      DECODER.decode(fromBase64Url(body))
    ) as ExternalSharePayload;

    if (payload.projectId !== expectedProjectId) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return { shareId: payload.shareId };
  } catch {
    return null;
  }
}

/** Gera um token bruto de alta entropia (256 bits) e o seu hash sha256 hex. */
export async function generateShareToken(): Promise<{
  token: string;
  tokenHash: string;
}> {
  const raw = new Uint8Array(32);
  crypto.getRandomValues(raw);
  const token = toBase64Url(raw);
  const tokenHash = await sha256Hex(token);
  return { token, tokenHash };
}

/** sha256(input) em hex — usado para armazenar/consultar o token do share. */
export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encodeUtf8(input));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
