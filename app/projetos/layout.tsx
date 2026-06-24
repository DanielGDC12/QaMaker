import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { UserBadge } from "@/components/layout/UserBadge";
import { getFGUser } from "@/lib/auth-guard";

export default async function ProjetosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getFGUser();
  if (!user) redirect("/login");

  return (
    <>
      <Header right={<UserBadge user={user} />} />
      {children}
    </>
  );
}
