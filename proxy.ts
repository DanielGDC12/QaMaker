import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";
import { isAgenciaFGEmail } from "@/lib/auth-domain";
import {
  externalShareCookieName,
  verifyExternalShareToken,
} from "@/lib/external-share-token";

// Instância edge-safe (sem DB) só para ler/verificar a sessão.
const { auth } = NextAuth(authConfig);

const PUBLIC_PATHS = ["/login", "/acesso-restrito"];
// Prefixos públicos (rota dinâmica). `/acesso/` é a redenção do link externo.
const PUBLIC_PREFIXES = ["/acesso/"];

function isPublic(pathname: string) {
  return (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))
  );
}

export default auth(async (req) => {
  const { pathname, origin } = req.nextUrl;
  const email = req.auth?.user?.email;
  const isFG = isAgenciaFGEmail(email);
  const isApi = pathname.startsWith("/api/");

  // Endpoints da extensão: autenticam por token (não por cookie de sessão).
  // O próprio route handler valida via requireApiToken — o proxy não intervém.
  if (pathname.startsWith("/api/ext")) {
    return NextResponse.next();
  }

  // Rotas de API: nunca redireciona — responde 401 em JSON.
  if (isApi) {
    if (!isFG) {
      // Exceção: o upload é usado também pelo ator externo. A checagem real
      // (cookie por projeto + posse) acontece no próprio handler, pois o
      // projectId vem do corpo multipart, não da URL — inacessível aqui.
      if (pathname.startsWith("/api/upload")) return NextResponse.next();
      return NextResponse.json(
        { error: "Acesso restrito a membros da Agência FG." },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  // FG autenticado tentando ver o login → manda para os projetos.
  if (isFG && pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/projetos", origin));
  }

  // FG tem acesso total às páginas.
  if (isFG) return NextResponse.next();

  // Rotas públicas (login, acesso-restrito, redenção do link) fluem livres.
  if (isPublic(pathname)) return NextResponse.next();

  // Ator externo: só pode entrar em /projetos/{id} do SEU projeto, se
  // portar um cookie de acesso válido (assinatura + validade). A revogação
  // é reconferida no banco na camada Node (requireProjectActor).
  const projectMatch = pathname.match(/^\/projetos\/([^/]+)(?:\/.*)?$/);
  if (projectMatch) {
    const projectId = projectMatch[1];
    const cookieValue = req.cookies.get(
      externalShareCookieName(projectId)
    )?.value;
    const verified = await verifyExternalShareToken(cookieValue, projectId);
    // [DEBUG temporário — remover depois]
    console.log(
      "[proxy] /projetos",
      projectId,
      "temCookie?",
      Boolean(cookieValue),
      "verificado?",
      Boolean(verified),
      "temSegredo?",
      Boolean(process.env.EXTERNAL_SHARE_COOKIE_SECRET)
    );
    if (verified) return NextResponse.next();
  }

  // Qualquer outra coisa (lista de projetos, outro projeto, criar/excluir) →
  // não autenticado/não-FG vai para o login.
  return NextResponse.redirect(new URL("/login", origin));
});

export const config = {
  // Roda em tudo, exceto assets estáticos, imagens otimizadas e a rota
  // interna do Auth.js (/api/auth/*), que precisa fluir livremente.
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
