import { signIn } from "@/auth";
import { FG_DOMAIN } from "@/lib/auth-domain";
import { Button } from "@/components/ui";
import { FgMark } from "@/components/layout/FgMark";
import styles from "./login.module.css";

export const metadata = { title: "Entrar · QA Maker" };

export default function LoginPage() {
  async function entrar() {
    "use server";
    await signIn("google", { redirectTo: "/projetos" });
  }

  return (
    <main className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <FgMark size={30} className={styles.mark} />
          <span className={styles.word}>QA Maker</span>
        </div>
        <h1 className={styles.title}>Auditorias de qualidade da Agência FG</h1>
        <p className={styles.lead}>
          Acesso exclusivo para contas <code>{FG_DOMAIN}</code>.
        </p>
        <form action={entrar}>
          <Button type="submit" variant="primary" className={styles.cta}>
            Entrar com Google
          </Button>
        </form>
      </div>
    </main>
  );
}
