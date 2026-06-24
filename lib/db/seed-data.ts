import type { Category } from "@/lib/constants";

/**
 * Template master padrão (seed inicial).
 *
 * ATENÇÃO: este é um conjunto-base provisório para a Fase 0. O conteúdo
 * definitivo deve ser validado com o time da FG (pergunta aberta #1 do plano).
 * Editável depois via /admin/template sem afetar projetos já criados.
 */
export interface TemplateSeedPoint {
  category: Category;
  title: string;
  subtitle: string;
}

export const TEMPLATE_SEED: TemplateSeedPoint[] = [
  // ── PDP (Página de Produto) ──
  {
    category: "PDP",
    title: "Imagens do produto carregam em alta resolução",
    subtitle: "Verificar zoom, galeria e ausência de imagens quebradas.",
  },
  {
    category: "PDP",
    title: "Preço e disponibilidade corretos",
    subtitle: "Preço, parcelamento e estoque conferem com o admin da loja.",
  },
  {
    category: "PDP",
    title: "Variações (cor/tamanho) selecionáveis",
    subtitle: "Trocar variação atualiza preço, imagem e SKU corretamente.",
  },
  {
    category: "PDP",
    title: "Botão 'Comprar' adiciona ao carrinho",
    subtitle: "CTA visível, responsivo e com feedback ao clicar.",
  },

  // ── Carrinho ──
  {
    category: "Carrinho",
    title: "Itens adicionados aparecem no carrinho",
    subtitle: "Quantidade, preço e imagem corretos por item.",
  },
  {
    category: "Carrinho",
    title: "Atualizar quantidade recalcula o total",
    subtitle: "Alterar/remover itens reflete no subtotal imediatamente.",
  },
  {
    category: "Carrinho",
    title: "Cupom de desconto aplica corretamente",
    subtitle: "Cupom válido reduz o total; inválido mostra erro claro.",
  },

  // ── Checkout ──
  {
    category: "Checkout",
    title: "Cálculo de frete por CEP",
    subtitle: "Frete calculado, prazos exibidos e opções selecionáveis.",
  },
  {
    category: "Checkout",
    title: "Formas de pagamento funcionam",
    subtitle: "Cartão, Pix e boleto processam sem erro no fluxo de teste.",
  },
  {
    category: "Checkout",
    title: "Pedido finaliza e gera confirmação",
    subtitle: "Tela/e-mail de confirmação com número do pedido.",
  },
  {
    category: "Checkout",
    title: "Validação de campos do formulário",
    subtitle: "CPF, e-mail e endereço com máscaras e mensagens de erro.",
  },

  // ── SEO ──
  {
    category: "SEO",
    title: "Títulos e meta descriptions presentes",
    subtitle: "Home, categorias e PDPs com tags únicas e relevantes.",
  },
  {
    category: "SEO",
    title: "URLs amigáveis e canônicas",
    subtitle: "Sem parâmetros desnecessários; canonical correto.",
  },
  {
    category: "SEO",
    title: "Sitemap e robots.txt acessíveis",
    subtitle: "Sitemap.xml atualizado e robots sem bloqueios indevidos.",
  },

  // ── Performance ──
  {
    category: "Performance",
    title: "Core Web Vitals dentro do verde",
    subtitle: "LCP, CLS e INP avaliados no PageSpeed/Lighthouse.",
  },
  {
    category: "Performance",
    title: "Imagens otimizadas e lazy-load",
    subtitle: "Formatos modernos (WebP/AVIF) e carregamento sob demanda.",
  },

  // ── Geral ──
  {
    category: "Geral",
    title: "Responsividade mobile",
    subtitle: "Layout sem quebras em 360–414px; toques acessíveis.",
  },
  {
    category: "Geral",
    title: "Links do rodapé e institucionais",
    subtitle: "Políticas, trocas e contato funcionando sem erro 404.",
  },
  {
    category: "Geral",
    title: "Busca interna retorna resultados",
    subtitle: "Termos comuns e com erro de digitação trazem produtos.",
  },
];
