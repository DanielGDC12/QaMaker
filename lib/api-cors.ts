import { NextResponse } from "next/server";

/**
 * CORS para os endpoints `/api/ext/*` consumidos pela extensão de navegador.
 *
 * A autenticação é por token no header `Authorization` (não usa cookies), então
 * `Access-Control-Allow-Origin: *` é seguro — não há credenciais de sessão em
 * jogo e a origem `chrome-extension://<id>` não é previsível.
 */
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Max-Age": "86400",
};

/** Aplica os headers de CORS a uma resposta já pronta. */
export function withCors<T extends NextResponse>(res: T): T {
  for (const [k, v] of Object.entries(CORS_HEADERS)) res.headers.set(k, v);
  return res;
}

/** JSON + CORS em uma tacada. */
export function corsJson(body: unknown, init?: ResponseInit): NextResponse {
  return withCors(NextResponse.json(body, init));
}

/** Resposta ao preflight `OPTIONS`. */
export function corsPreflight(): NextResponse {
  return withCors(new NextResponse(null, { status: 204 }));
}
