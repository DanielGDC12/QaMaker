ALTER TABLE "project_points" ADD COLUMN "is_default" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- Backfill: marca como checklist padrão os pontos já existentes cujo título
-- bate com DEFAULT_PROJECT_POINTS (lista congelada no momento desta migração).
-- Pontos criados à mão pela FG, pela extensão ou por ator externo ficam false.
UPDATE "project_points" SET "is_default" = true
WHERE "created_by_is_external" = false
  AND "created_via_extension" = false
  AND "title" IN (
    'Validar um pedido e verificar se caiu no fluxo do cliente.',
    'Checkout está correto com cores e logo do cliente?',
    'Todos meios de pagamento ok?',
    'Todos meios de envio ok?',
    'Desktop - Banners da Home estão direcionando para as páginas correspondentes?',
    'Mobile - Banners da Home estão direcionando para as páginas correspondentes?',
    'Analisar se tamanho da imagem de produtos para mobile está intríseco, causando pixelação da imagem.',
    'Google Search Console.',
    'Redirect 301 foram feitos? (Caso migração).',
    'Subiu a planilha de 301 na plataforma?',
    'URL canônica.',
    'Title de SEO da Home está ok?',
    'Title de SEO das Categorias está ok?',
    'Indexação das Páginas, páginas com listas',
    'Conteúdos Gerais > SEO > Padrão + Páginas (padrão, inicial, categorias, marcas…)',
    'Ajustar o ALT nas imagens e banners são indispensaveis, visto que os buscadores não visualizam imagens. Use sempre textos claros, curtos e únicos.',
    'Desktop - Layout front está ok nas principais páginas? (home, listagem, pesquisa, pdp, carrinho).',
    'Mobile - Layout front está ok nas principais páginas? (home, listagem, pesquisa, pdp, carrinho).',
    'Os links do rodapé estão direcionando para as páginas correspondentes?',
    'Os Links do Topo estão direcionando para as páginas correspondentes?',
    'Tag de GA instalada? GA está contabilizando visitas?',
    'Tags de GTM instaladas?',
    'Tags de Funil de conversão ok?',
    'Validação do Recaptcha.',
    'Login Google.',
    'Favicon está ok?',
    'Manual de edição de banners e conteúdo está feito?',
    'Todas páginas de conteúdo foram desenvolvidas?',
    'Existem scripts de ferramentas terceiras? Foram instalados?',
    'E-mail recuperador de senha. Página recuperador de senha no padrão da loja.',
    'LINKS COM ERROS',
    'Ficou alguma observação em aberto para resolver?'
  );
