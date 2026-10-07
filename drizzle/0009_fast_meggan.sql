CREATE TABLE "checklist_template_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" text NOT NULL,
	"title" text NOT NULL,
	"subtitle" text,
	"display_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
ALTER TABLE "project_points" ADD COLUMN "in_figma" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "figma_url" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "admin_url" text;--> statement-breakpoint
-- Seed: o checklist FG sai do código (lib/default-points.ts, removido) e passa
-- a viver nesta tabela, editável na aba /checklist. Lista congelada no
-- momento desta migração, na mesma ordem (display_order 1..32).
INSERT INTO "checklist_template_items" ("category", "title", "subtitle", "display_order") VALUES
  ('Checkout', 'Validar um pedido e verificar se caiu no fluxo do cliente.', NULL, 1),
  ('Checkout', 'Checkout está correto com cores e logo do cliente?', NULL, 2),
  ('Checkout', 'Todos meios de pagamento ok?', NULL, 3),
  ('Checkout', 'Todos meios de envio ok?', NULL, 4),
  ('Home', 'Desktop - Banners da Home estão direcionando para as páginas correspondentes?', NULL, 5),
  ('Home', 'Mobile - Banners da Home estão direcionando para as páginas correspondentes?', NULL, 6),
  ('Produto', 'Analisar se tamanho da imagem de produtos para mobile está intríseco, causando pixelação da imagem.', NULL, 7),
  ('SEO', 'Google Search Console.', NULL, 8),
  ('SEO', 'Redirect 301 foram feitos? (Caso migração).', NULL, 9),
  ('SEO', 'Subiu a planilha de 301 na plataforma?', NULL, 10),
  ('SEO', 'URL canônica.', NULL, 11),
  ('SEO', 'Title de SEO da Home está ok?', NULL, 12),
  ('SEO', 'Title de SEO das Categorias está ok?', NULL, 13),
  ('SEO', 'Indexação das Páginas, páginas com listas', NULL, 14),
  ('SEO', 'Conteúdos Gerais > SEO > Padrão + Páginas (padrão, inicial, categorias, marcas…)', NULL, 15),
  ('SEO', 'Ajustar o ALT nas imagens e banners são indispensaveis, visto que os buscadores não visualizam imagens. Use sempre textos claros, curtos e únicos.', 'Máximo de caracteres 150, contado os espaços.', 16),
  ('Geral', 'Desktop - Layout front está ok nas principais páginas? (home, listagem, pesquisa, pdp, carrinho).', NULL, 17),
  ('Geral', 'Mobile - Layout front está ok nas principais páginas? (home, listagem, pesquisa, pdp, carrinho).', NULL, 18),
  ('Geral', 'Os links do rodapé estão direcionando para as páginas correspondentes?', NULL, 19),
  ('Geral', 'Os Links do Topo estão direcionando para as páginas correspondentes?', NULL, 20),
  ('Geral', 'Tag de GA instalada? GA está contabilizando visitas?', NULL, 21),
  ('Geral', 'Tags de GTM instaladas?', NULL, 22),
  ('Geral', 'Tags de Funil de conversão ok?', NULL, 23),
  ('Geral', 'Validação do Recaptcha.', NULL, 24),
  ('Geral', 'Login Google.', NULL, 25),
  ('Geral', 'Favicon está ok?', NULL, 26),
  ('Geral', 'Manual de edição de banners e conteúdo está feito?', NULL, 27),
  ('Geral', 'Todas páginas de conteúdo foram desenvolvidas?', NULL, 28),
  ('Geral', 'Existem scripts de ferramentas terceiras? Foram instalados?', 'Adicionar nome das ferramentas aqui', 29),
  ('Geral', 'E-mail recuperador de senha. Página recuperador de senha no padrão da loja.', NULL, 30),
  ('Geral', 'LINKS COM ERROS', 'Para identificar págs com erro: https://www.drlinkcheck.com/account/subscriptions/1/projects/3/overview', 31),
  ('Geral', 'Ficou alguma observação em aberto para resolver?', NULL, 32);
