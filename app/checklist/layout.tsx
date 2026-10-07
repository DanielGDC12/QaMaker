import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { UserBadge } from "@/components/layout/UserBadge";
import { MainNav } from "@/components/layout/MainNav";
import { getFGUser } from "@/lib/auth-guard";

/** Aba "Checklist FG" — FG-only (o proxy já barra o externo; isto é a 2ª camada). */
export default async function ChecklistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getFGUser();
  if (!user) redirect("/login");

  return (
    <>
      <Header nav={<MainNav />} right={<UserBadge user={user} />} />
      {children}
    </>
  );
}
