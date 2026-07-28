import { POINT_STATUS_META, type PointStatus } from "@/lib/constants";
import type { SlackMessage } from "@/lib/slack";

/**
 * Builders das mensagens de notificação (Block Kit) enviadas ao responsável.
 * Puro (sem I/O) — recebe tudo pronto, devolve um SlackMessage. Fácil de testar
 * e mantém `lib/slack.ts` só com o transporte.
 */

/**
 * Resolve o origin do app a partir dos headers da requisição (funciona atrás do
 * proxy da Vercel). Deve ser chamado DENTRO do escopo da request (antes do
 * `after()`), pois `headers()` pode não estar disponível no callback diferido.
 */
export function appOriginFromHeaders(h: Headers): string {
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? "https";
  if (host) return `${proto}://${host}`;
  return process.env.AUTH_URL?.replace(/\/$/, "") ?? "";
}

/** Link direto para a página do projeto. */
function projectUrl(origin: string, projectId: string): string {
  return `${origin}/projetos/${projectId}`;
}

/** Bloco de rodapé com o link "Abrir projeto" (ou nada, se não houver origin). */
function linkBlock(origin: string, projectId: string) {
  if (!origin) return [];
  return [
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `<${projectUrl(origin, projectId)}|Abrir projeto →>`,
        },
      ],
    },
  ];
}

function section(text: string) {
  return { type: "section", text: { type: "mrkdwn", text } };
}

interface Base {
  origin: string;
  projectId: string;
  projectName: string;
  actorName: string;
}

/** Status de um ponto mudou para "feito" ou "nao_possivel". */
export function pointStatusChangedMessage(
  p: Base & { pointTitle: string; status: PointStatus }
): SlackMessage {
  const statusLabel = POINT_STATUS_META[p.status].label;
  const text = `“${p.pointTitle}” agora está *${statusLabel}* em ${p.projectName}`;
  return {
    text,
    blocks: [
      section(
        `*${p.projectName}* — status atualizado\n` +
          `“${p.pointTitle}” → *${statusLabel}*\n` +
          `_por ${p.actorName}_`
      ),
      ...linkBlock(p.origin, p.projectId),
    ],
  };
}

/** Um novo ponto foi adicionado ao projeto. */
export function newPointMessage(
  p: Base & { pointTitle: string; viaExtension?: boolean }
): SlackMessage {
  const origem = p.viaExtension ? " _(via extensão)_" : "";
  const text = `Novo ponto em ${p.projectName}: “${p.pointTitle}”`;
  return {
    text,
    blocks: [
      section(
        `*${p.projectName}* — novo ponto${origem}\n` +
          `“${p.pointTitle}”\n` +
          `_por ${p.actorName}_`
      ),
      ...linkBlock(p.origin, p.projectId),
    ],
  };
}

/** O projeto atingiu 100% de pontos auditados. */
export function projectCompletedMessage(p: Base): SlackMessage {
  const text = `🎉 ${p.projectName} foi concluído (100%)`;
  return {
    text,
    blocks: [
      section(
        `🎉 *${p.projectName}* foi *concluído*\n` +
          `Todos os pontos foram auditados.\n` +
          `_último ajuste por ${p.actorName}_`
      ),
      ...linkBlock(p.origin, p.projectId),
    ],
  };
}
