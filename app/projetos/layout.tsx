import { Header } from "@/components/layout/Header";
import { UserBadge } from "@/components/layout/UserBadge";
import { MainNav } from "@/components/layout/MainNav";
import { getFGUser } from "@/lib/auth-guard";

/**
 * Layout compartilhado de `/projetos/*`. NÃO faz gate de acesso aqui: a lista
 * (`/projetos`) é FG-only e trava na própria página; o detalhe
 * (`/projetos/[id]`) também aceita o ator externo (convidado do cliente), que
 * um redirect FG-only neste layout expulsaria para o /login. As abas e o
 * UserBadge/"Sair" só aparecem para FG — o convidado externo vê apenas a marca.
 */
export default async function ProjetosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getFGUser();

  return (
    <>
      <Header
        nav={user ? <MainNav /> : null}
        right={user ? <UserBadge user={user} /> : null}
      />
      {children}
    </>
  );
}
