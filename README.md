# QA Maker

Ferramenta interna da **Agência FG** para auditorias de qualidade (QA) em lojas
de e-commerce de clientes. A equipe cria um projeto (loja), adiciona pontos de QA
por página, marca o status de cada um e anexa o print de erros encontrados.

## Stack

- **Next.js 16** (App Router) + **React 19**
- **Neon** (Postgres serverless) com **Drizzle ORM** (driver HTTP)
- **Auth.js v5** — login só com Google, restrito ao domínio `@agenciafg.com.br`
- **Vercel Blob** — armazenamento dos prints de erro
- **Vitest** — testes unitários
- Deploy na **Vercel**

## Setup local

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Crie o `.env.local` a partir do modelo e preencha (ver detalhes abaixo):

   ```bash
   cp .env.example .env.local
   ```

3. Aplique o schema no banco:

   ```bash
   npm run db:migrate
   ```

4. Rode o app:

   ```bash
   npm run dev
   ```

   Acesse http://localhost:3000 e entre com uma conta `@agenciafg.com.br`.

## Variáveis de ambiente

| Variável | Onde obter |
|---|---|
| `DATABASE_URL` | Connection string **pooled** do Neon (`...-pooler...?sslmode=require`) |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google Cloud Console → Credenciais → ID OAuth (Aplicativo da Web) |
| `BLOB_READ_WRITE_TOKEN` | Painel Vercel → Storage → Blob |

No Google OAuth, cadastre a origem (`http://localhost:3000`) e o redirect URI
`http://localhost:3000/api/auth/callback/google` (e os equivalentes de produção).

## Comandos

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm test` | Testes unitários (vitest) |
| `npm run db:generate` | Gera migração a partir do schema Drizzle |
| `npm run db:migrate` | Aplica migrações pendentes |
| `npm run db:studio` | Drizzle Studio |

## Estrutura

```
app/            rotas (projetos, projetos/[id], login, api/*)
components/     ui/ (primitivos) · layout/ · projects/ · points/
lib/            constants (status/progresso) · auth-domain · auth-guard · image · db/
auth.config.ts  auth.ts  proxy.ts   (Auth.js + gate de domínio)
drizzle/        migrações SQL
tests/          testes unitários
```

Convenções de código e decisões de arquitetura: ver [CLAUDE.md](CLAUDE.md).
