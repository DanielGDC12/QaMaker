import { signOutAction } from "@/app/actions/auth";
import type { FGUser } from "@/lib/auth-guard";
import styles from "./UserBadge.module.css";

export function UserBadge({ user }: { user: FGUser }) {
  const initial = (user.name || user.email).trim().charAt(0).toUpperCase();
  return (
    <div className={styles.wrap}>
      <span className={styles.avatar} aria-hidden>
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.image} alt="" className={styles.avatarImg} />
        ) : (
          initial
        )}
      </span>
      <span className={styles.name} title={user.email}>
        {user.name}
      </span>
      <form action={signOutAction}>
        <button type="submit" className={styles.signout}>
          Sair
        </button>
      </form>
    </div>
  );
}
