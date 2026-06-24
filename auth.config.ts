import Google from "next-auth/providers/google";
import type { NextAuthConfig } from "next-auth";
import { isAgenciaFGEmail } from "@/lib/auth-domain";

/**
 * Configuração edge-safe do Auth.js — SEM acesso a banco.
 * Importada pelo proxy.ts (edge) e estendida por auth.ts (node + DB).
 */
export const authConfig = {
  providers: [Google],
  pages: {
    signIn: "/login",
    error: "/acesso-restrito",
  },
  session: { strategy: "jwt" },
  callbacks: {
    // ① Restrição de domínio no callback OAuth (rejeita não-FG).
    signIn({ account, profile }) {
      if (account?.provider !== "google") return false;
      return isAgenciaFGEmail(profile?.email);
    },
    // ② Propaga e-mail/nome/avatar para o JWT (usado na verificação por request).
    jwt({ token, profile }) {
      if (profile?.email) token.email = profile.email;
      if (profile?.name) token.name = profile.name;
      if (typeof profile?.picture === "string") token.picture = profile.picture;
      return token;
    },
    session({ session, token }) {
      if (token.email) session.user.email = token.email;
      if (token.name) session.user.name = token.name;
      if (typeof token.picture === "string") session.user.image = token.picture;
      return session;
    },
  },
} satisfies NextAuthConfig;
