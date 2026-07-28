import type { Category } from "@/lib/constants";

/**
 * Checklist padrão da FG — os pontos de QA que todo projeto novo recebe.
 *
 * Fonte única de verdade: mexer aqui muda apenas os projetos criados DEPOIS
 * da alteração (a inserção é uma cópia, não uma referência). Projetos
 * existentes não são retroativamente atualizados — de propósito, para não
 * mexer em auditorias em andamento.
 *
 * A ordem desta lista define o `display_order` dos pontos; o board agrupa por
 * categoria na ordem canônica de `CATEGORIES`.
 */
export interface DefaultPoint {
  category: Category;
  title: string;
  /** Detalhe/observação do ponto (o "o que verificar"). */
  subtitle?: string;
}

export const DEFAULT_PROJECT_POINTS: readonly DefaultPoint[] = [
  /* ── Pedido / Checkout ──────────────────────────────────── */
  {
    category: "Checkout",
    title: "Validar um pedido e verificar se caiu no fluxo do cliente.",
  },
  {
    category: "Checkout",
    title: "Checkout está correto com cores e logo do cliente?",
  },
  { category: "Checkout", title: "Todos meios de pagamento ok?" },
  { category: "Checkout", title: "Todos meios de envio ok?" },

  /* ── Home ───────────────────────────────────────────────── */
  {
    category: "Home",
    title:
      "Desktop - Banners da Home estão direcionando para as páginas correspondentes?",
  },
  {
    category: "Home",
    title:
      "Mobile - Banners da Home estão direcionando para as páginas correspondentes?",
  },

  /* ── Produto ────────────────────────────────────────────── */
  {
    category: "Produto",
    title:
      "Analisar se tamanho da imagem de produtos para mobile está intríseco, causando pixelação da imagem.",
  },

  /* ── SEO ────────────────────────────────────────────────── */
  { category: "SEO", title: "Google Search Console." },
  { category: "SEO", title: "Redirect 301 foram feitos? (Caso migração)." },
  { category: "SEO", title: "Subiu a planilha de 301 na plataforma?" },
  { category: "SEO", title: "URL canônica." },
  { category: "SEO", title: "Title de SEO da Home está ok?" },
  { category: "SEO", title: "Title de SEO das Categorias está ok?" },
  { category: "SEO", title: "Indexação das Páginas, páginas com listas" },
  {
    category: "SEO",
    title:
      "Conteúdos Gerais > SEO > Padrão + Páginas (padrão, inicial, categorias, marcas…)",
  },
  {
    category: "SEO",
    title:
      "Ajustar o ALT nas imagens e banners são indispensaveis, visto que os buscadores não visualizam imagens. Use sempre textos claros, curtos e únicos.",
    subtitle: "Máximo de caracteres 150, contado os espaços.",
  },

  /* ── Geral ──────────────────────────────────────────────── */
  {
    category: "Geral",
    title:
      "Desktop - Layout front está ok nas principais páginas? (home, listagem, pesquisa, pdp, carrinho).",
  },
  {
    category: "Geral",
    title:
      "Mobile - Layout front está ok nas principais páginas? (home, listagem, pesquisa, pdp, carrinho).",
  },
  {
    category: "Geral",
    title: "Os links do rodapé estão direcionando para as páginas correspondentes?",
  },
  {
    category: "Geral",
    title: "Os Links do Topo estão direcionando para as páginas correspondentes?",
  },
  {
    category: "Geral",
    title: "Tag de GA instalada? GA está contabilizando visitas?",
  },
  { category: "Geral", title: "Tags de GTM instaladas?" },
  { category: "Geral", title: "Tags de Funil de conversão ok?" },
  { category: "Geral", title: "Validação do Recaptcha." },
  { category: "Geral", title: "Login Google." },
  { category: "Geral", title: "Favicon está ok?" },
  {
    category: "Geral",
    title: "Manual de edição de banners e conteúdo está feito?",
  },
  { category: "Geral", title: "Todas páginas de conteúdo foram desenvolvidas?" },
  {
    category: "Geral",
    title: "Existem scripts de ferramentas terceiras? Foram instalados?",
    subtitle: "Adicionar nome das ferramentas aqui",
  },
  {
    category: "Geral",
    title:
      "E-mail recuperador de senha. Página recuperador de senha no padrão da loja.",
  },
  {
    category: "Geral",
    title: "LINKS COM ERROS",
    subtitle:
      "Para identificar págs com erro: https://www.drlinkcheck.com/account/subscriptions/1/projects/3/overview",
  },
  { category: "Geral", title: "Ficou alguma observação em aberto para resolver?" },
];
