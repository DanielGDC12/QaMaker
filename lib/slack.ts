import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, projects } from "@/lib/db/schema";

/**
 * Integração com o Slack via Bot Token (chat.postMessage em DM).
 *
 * Regras de ouro desta camada:
 * - NADA aqui lança para fora. Notificação é best-effort: se o token não
 *   existe, o usuário não tem Slack, ou a rede cai, apenas logamos e seguimos.
 *   Quem chama (Server Actions via `after()`) nunca deve quebrar por causa disto.
 * - O Bot Token (`SLACK_BOT_TOKEN`) é server-only — este módulo só é importado
 *   por Server Actions / route handlers, nunca pelo cliente.
 *
 * Escopos necessários no Slack App: `chat:write` (postar), `im:write` (abrir a
 * DM em conversations.open), `users:read` e `users:read.email` (resolver
 * e-mail → Slack ID).
 */

const SLACK_API = "https://slack.com/api";

function botToken(): string | null {
  return process.env.SLACK_BOT_TOKEN?.trim() || null;
}

/** Mensagem pronta para envio (texto de fallback + blocos opcionais). */
export interface SlackMessage {
  /** Texto simples — fallback e preview de notificação. Obrigatório. */
  text: string;
  /** Block Kit opcional para o corpo rico. */
  blocks?: unknown[];
}

/**
 * Resolve o Slack user ID a partir de um e-mail, direto na API do Slack
 * (`users.lookupByEmail`). Sem cache — o cache fica em `resolveSlackId`.
 * Retorna null se não houver token, o e-mail não existir no workspace, ou
 * qualquer falha. NUNCA lança.
 */
export async function lookupSlackIdByEmail(
  email: string
): Promise<string | null> {
  const token = botToken();
  if (!token) return null;

  try {
    const url = `${SLACK_API}/users.lookupByEmail?email=${encodeURIComponent(email)}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = (await res.json()) as {
      ok: boolean;
      user?: { id: string };
      error?: string;
    };
    if (!data.ok || !data.user?.id) {
      console.warn(`[slack] lookupByEmail falhou (${email}): ${data.error}`);
      return null;
    }
    return data.user.id;
  } catch (err) {
    console.warn(`[slack] lookupByEmail erro de rede (${email})`, err);
    return null;
  }
}

/**
 * Envia uma DM a um usuário do Slack: abre o canal de conversa
 * (`conversations.open`) e posta (`chat.postMessage`). Retorna true se enviou.
 * NUNCA lança.
 */
export async function postDM(
  slackUserId: string,
  message: SlackMessage
): Promise<boolean> {
  const token = botToken();
  if (!token) return false;

  try {
    const openRes = await fetch(`${SLACK_API}/conversations.open`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ users: slackUserId }),
    });
    const open = (await openRes.json()) as {
      ok: boolean;
      channel?: { id: string };
      error?: string;
    };
    if (!open.ok || !open.channel?.id) {
      console.warn(`[slack] conversations.open falhou: ${open.error}`);
      return false;
    }

    const postRes = await fetch(`${SLACK_API}/chat.postMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        channel: open.channel.id,
        text: message.text,
        ...(message.blocks ? { blocks: message.blocks } : {}),
      }),
    });
    const post = (await postRes.json()) as { ok: boolean; error?: string };
    if (!post.ok) {
      console.warn(`[slack] chat.postMessage falhou: ${post.error}`);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[slack] postDM erro de rede", err);
    return false;
  }
}

/**
 * Resolve o Slack ID de um usuário FG com cache em `users.slack_user_id`.
 * Primeiro consulta o cache; se vazio, chama a API e persiste o resultado.
 * NUNCA lança.
 */
export async function resolveSlackId(email: string): Promise<string | null> {
  try {
    const [row] = await db
      .select({ slackUserId: users.slackUserId })
      .from(users)
      .where(eq(users.email, email));
    if (row?.slackUserId) return row.slackUserId;

    const slackId = await lookupSlackIdByEmail(email);
    if (slackId) {
      // Cache best-effort — falha aqui não impede o envio.
      try {
        await db
          .update(users)
          .set({ slackUserId: slackId })
          .where(eq(users.email, email));
      } catch (err) {
        console.warn(`[slack] falha ao cachear slack_user_id (${email})`, err);
      }
    }
    return slackId;
  } catch (err) {
    console.warn(`[slack] resolveSlackId erro (${email})`, err);
    return null;
  }
}

/**
 * Notifica o responsável por um projeto via DM no Slack.
 * - No-op silencioso se o projeto não tem responsável.
 * - `opts.skipEmail`: não notifica quando o responsável é a própria pessoa que
 *   disparou a ação (evita DM sobre a própria alteração).
 * NUNCA lança — projetada para rodar em `after()`.
 */
export async function notifyResponsible(
  projectId: string,
  message: SlackMessage,
  opts?: { skipEmail?: string | null }
): Promise<void> {
  try {
    const [project] = await db
      .select({ responsibleEmail: projects.responsibleEmail })
      .from(projects)
      .where(eq(projects.id, projectId));

    const responsible = project?.responsibleEmail;
    if (!responsible) return; // sem responsável → nada a fazer
    if (opts?.skipEmail && responsible === opts.skipEmail) return; // não notificar a si mesmo

    const slackId = await resolveSlackId(responsible);
    if (!slackId) return;

    await postDM(slackId, message);
  } catch (err) {
    console.warn(`[slack] notifyResponsible erro (${projectId})`, err);
  }
}
