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
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Sair
        </button>
      </form>
    </div>
  );
}
