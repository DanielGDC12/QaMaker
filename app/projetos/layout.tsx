import { Header } from "@/components/layout/Header";
import { UserBadge } from "@/components/layout/UserBadge";
import { getFGUser } from "@/lib/auth-guard";

/**
 * Layout compartilhado de `/projetos/*`. NÃO faz gate de acesso aqui: a lista
 * (`/projetos`) é FG-only e trava na própria página; o detalhe
 * (`/projetos/[id]`) também aceita o ator externo (convidado do cliente), que
 * um redirect FG-only neste layout expulsaria para o /login. O UserBadge/"Sair"
 * só aparece para FG — o convidado externo vê apenas a marca.
 */
export default async function ProjetosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getFGUser();

  return (
    <>
      <Header right={user ? <UserBadge user={user} /> : null} />
      {children}
    </>
  );
}
