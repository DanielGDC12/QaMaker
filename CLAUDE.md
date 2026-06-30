@AGENTS.md

# QA Maker — contexto do projeto

Ferramenta interna da Agência FG para auditorias de QA em lojas de e-commerce.
Workspace único compartilhado (sem papéis em v1). Idioma: PT-BR. Desktop, 1440px.

## Stack
Next.js 16 (App Router) · React 19 · Drizzle ORM + Neon (driver HTTP serverless)
· Auth.js v5 (Google OAuth) · Vercel Blob · vitest. Deploy na Vercel.

## Decisões não-óbvias (não quebrar)
- **Next 16: middleware virou `proxy.ts`** na raiz (export `proxy`/default). Não
  crie `middleware.ts`. `params` de páginas é **assíncrono** (`Promise`).
- **Mutações = Server Actions**; leitura = Server Components. Único route handler
  de dados é o upload (`app/api/upload`). Não criar API REST paralela.
- **Auth com config dividida**: `auth.config.ts` é edge-safe (sem DB, usado pelo
  `proxy.ts`); `auth.ts` é Node e faz upsert do usuário via `events.signIn`.
- **Restrição de domínio `@agenciafg.com.br`** é checada em 3 camadas: callback
  `signIn`, `proxy.ts` (401 p/ API, redirect p/ páginas) e `requireFGUser()` em
  toda action/route handler. Fonte única: `lib/auth-domain.ts`. Não usar claim `hd`.
- **`lib/db/index.ts` é lazy** (proxy memoizado) → `next build` não exige env.
- **Progresso**: status `feito` e `nao_possivel` contam; `pendente`/`iniciado`
  não. Lógica em `lib/constants.ts` (`calcProgress`, `deriveProjectStatus`).
- Cada novo projeto **copia** o template master (`template_points`) para
  `project_points` independentes. Editar o template não afeta projetos existentes.

## Comandos
- `npm run dev` · `npm run build` · `npm test` (vitest)
- `npm run db:generate` (migração a partir do schema) · `db:migrate` · `db:seed`
  (idempotente; `FORCE=1` recria) · `db:studio`

## Env (.env.local — ver .env.example)
`DATABASE_URL` (Neon, pooled) · `AUTH_SECRET` · `AUTH_GOOGLE_ID` ·
`AUTH_GOOGLE_SECRET` · `BLOB_READ_WRITE_TOKEN`. No Google OAuth, redirect URI =
`<origin>/api/auth/callback/google`.

## Pendências do plano
Conteúdo real do template master (seed atual em `lib/db/seed-data.ts` é
provisório, 19 pontos), domínio de deploy e plano Vercel — ver perguntas abertas
do plano de implementação.
