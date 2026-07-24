import { NextResponse } from "next/server";
import { getShareByTokenHash } from "@/lib/db/queries";
import {
  EXTERNAL_SHARE_MAX_AGE_SECONDS,
  externalShareCookieName,
  sha256Hex,
  signExternalShareToken,
} from "@/lib/external-share-token";

/**
 * Redenção do link de acesso externo. Runtime Node (precisa do banco para o
 * hash-lookup do token — o Edge não tem acesso ao DB por causa do lazy-db).
 *
 * Fluxo: hash(token) → busca share ATIVO → seta cookie assinado (escopado ao
 * projeto) → redireciona ao board. Idempotente: reabrir o mesmo link
 * simplesmente re-emite o cookie (uso multi-dispositivo é intencional).
 */
export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const origin = new URL(request.url).origin;

  const share = token
    ? await getShareByTokenHash(await sha256Hex(token))
    : null;

  if (!share) {
    return NextResponse.redirect(
      new URL("/acesso-restrito?motivo=link", origin)
    );
  }

  const exp = Math.floor(Date.now() / 1000) + EXTERNAL_SHARE_MAX_AGE_SECONDS;
  const signed = await signExternalShareToken({
    shareId: share.id,
    projectId: share.projectId,
    exp,
  });

  const res = NextResponse.redirect(
    new URL(`/projetos/${share.projectId}`, origin)
  );
  res.cookies.set({
    name: externalShareCookieName(share.projectId),
    value: signed,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: EXTERNAL_SHARE_MAX_AGE_SECONDS,
  });
  return res;
}
