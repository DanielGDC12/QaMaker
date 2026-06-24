import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { upsertUser } from "@/lib/db/queries";
import { isAgenciaFGEmail } from "@/lib/auth-domain";

/**
 * Instância completa do Auth.js (runtime Node) — inclui persistência do
 * usuário no banco. Usada nos route handlers, server components e na rota
 * /api/auth/[...nextauth]. O proxy (edge) usa apenas authConfig.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  events: {
    // Upsert do usuário após login bem-sucedido (não pode rejeitar o login).
    async signIn({ profile }) {
      if (isAgenciaFGEmail(profile?.email)) {
        await upsertUser({
          email: profile.email,
          name: profile.name ?? profile.email,
          avatarUrl: typeof profile.picture === "string" ? profile.picture : null,
        });
      }
    },
  },
});
