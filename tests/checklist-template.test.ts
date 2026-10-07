import { describe, it, expect } from "vitest";
import {
  parseChecklistItem,
  sameChecklistTitle,
  findSwapNeighbor,
} from "@/lib/checklist-template";

describe("parseChecklistItem", () => {
  it("normaliza: trim e descrição vazia vira null", () => {
    expect(
      parseChecklistItem({
        category: "SEO",
        title: "  URL canônica.  ",
        subtitle: "   ",
      })
    ).toEqual({
      ok: true,
      value: { category: "SEO", title: "URL canônica.", subtitle: null },
    });
  });

  it("mantém a descrição preenchida", () => {
    const r = parseChecklistItem({
      category: "Geral",
      title: "LINKS COM ERROS",
      subtitle: " Use o drlinkcheck ",
    });
    expect(r).toEqual({
      ok: true,
      value: {
        category: "Geral",
        title: "LINKS COM ERROS",
        subtitle: "Use o drlinkcheck",
      },
    });
  });

  it("recusa página fora de CATEGORIES", () => {
    expect(
      parseChecklistItem({ category: "Blog", title: "x", subtitle: "" })
    ).toEqual({ ok: false, error: "Página inválida." });
  });

  it("exige título e respeita o limite de 200 (igual ao addPoint)", () => {
    expect(
      parseChecklistItem({ category: "Home", title: "   ", subtitle: "" }).ok
    ).toBe(false);
    expect(
      parseChecklistItem({ category: "Home", title: "a".repeat(200), subtitle: "" }).ok
    ).toBe(true);
    expect(
      parseChecklistItem({ category: "Home", title: "a".repeat(201), subtitle: "" }).ok
    ).toBe(false);
  });

  it("limita a descrição a 1000 caracteres", () => {
    expect(
      parseChecklistItem({
        category: "Home",
        title: "ok",
        subtitle: "a".repeat(1001),
      }).ok
    ).toBe(false);
  });
});

describe("sameChecklistTitle", () => {
  it("ignora caixa e espaços nas pontas", () => {
    expect(sameChecklistTitle(" Favicon está ok? ", "favicon ESTÁ ok?")).toBe(true);
    expect(sameChecklistTitle("Favicon está ok?", "Favicon ok?")).toBe(false);
  });
});

describe("findSwapNeighbor", () => {
  // Ordem global intercalando páginas, como no template real.
  const items = [
    { id: "c1", category: "Checkout", displayOrder: 1 },
    { id: "h1", category: "Home", displayOrder: 2 },
    { id: "c2", category: "Checkout", displayOrder: 3 },
    { id: "h2", category: "Home", displayOrder: 4 },
    { id: "c3", category: "Checkout", displayOrder: 5 },
  ];

  it("troca com o vizinho da MESMA página, pulando as outras", () => {
    expect(findSwapNeighbor(items, "c2", "up")?.id).toBe("c1");
    expect(findSwapNeighbor(items, "c2", "down")?.id).toBe("c3");
    expect(findSwapNeighbor(items, "h1", "down")?.id).toBe("h2");
  });

  it("null nas pontas da página", () => {
    expect(findSwapNeighbor(items, "c1", "up")).toBeNull();
    expect(findSwapNeighbor(items, "c3", "down")).toBeNull();
    expect(findSwapNeighbor(items, "h2", "down")).toBeNull();
  });

  it("não depende da ordem do array de entrada", () => {
    const shuffled = [items[4], items[0], items[3], items[2], items[1]];
    expect(findSwapNeighbor(shuffled, "c3", "up")?.id).toBe("c2");
  });

  it("null para id desconhecido", () => {
    expect(findSwapNeighbor(items, "x", "up")).toBeNull();
  });
});
