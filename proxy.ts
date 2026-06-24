import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";
import { isAgenciaFGEmail } from "@/lib/auth-domain";

// Instância edge-safe (sem DB) só para ler/verificar a sessão.
const { auth } = NextAuth(authConfig);

const PUBLIC_PATHS = ["/login", "/acesso-restrito"];

export default auth((req) => {
  const { pathname, origin } = req.nextUrl;
  const email = req.auth?.user?.email;
  const isFG = isAgenciaFGEmail(email);
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const isApi = pathname.startsWith("/api/");

  // Rotas de API: nunca redireciona — responde 401 em JSON.
  if (isApi) {
    if (!isFG) {
      return NextResponse.json(
        { error: "Acesso restrito a membros da Agência FG." },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  // Não autenticado/não-FG tentando rota protegida → manda para o login.
  if (!isFG && !isPublic) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  // Já autenticado tentando ver o login → manda para os projetos.
  if (isFG && pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/projetos", origin));
  }

  return NextResponse.next();
});

export const config = {
  // Roda em tudo, exceto assets estáticos, imagens otimizadas e a rota
  // interna do Auth.js (/api/auth/*), que precisa fluir livremente.
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
