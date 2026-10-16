import { describe, it, expect } from "vitest";
import { parsePointDetails, POINT_TITLE_MAX } from "@/lib/point-details";

describe("parsePointDetails", () => {
  it("normaliza: trim e descrição vazia vira null", () => {
    expect(
      parsePointDetails({
        category: "Carrinho",
        title: "  Frete não calcula.  ",
        subtitle: "   ",
      })
    ).toEqual({
      ok: true,
      value: { category: "Carrinho", title: "Frete não calcula.", subtitle: null },
    });
  });

  it("mantém a descrição preenchida (com trim)", () => {
    expect(
      parsePointDetails({
        category: "Home",
        title: "Banner",
        subtitle: "  Linha 1\nLinha 2  ",
      })
    ).toEqual({
      ok: true,
      value: { category: "Home", title: "Banner", subtitle: "Linha 1\nLinha 2" },
    });
  });

  it("exige título", () => {
    expect(
      parsePointDetails({ category: "Home", title: "   ", subtitle: "" })
    ).toEqual({ ok: false, error: "Informe o título do ponto." });
  });

  it("limita o título", () => {
    const ok = "a".repeat(POINT_TITLE_MAX);
    expect(
      parsePointDetails({ category: "Home", title: ok, subtitle: "" }).ok
    ).toBe(true);
    expect(
      parsePointDetails({ category: "Home", title: ok + "a", subtitle: "" })
    ).toEqual({ ok: false, error: "Título muito longo (máximo 200 caracteres)." });
  });

  it("recusa página desconhecida", () => {
    expect(
      parsePointDetails({ category: "Blog", title: "X", subtitle: "" })
    ).toEqual({ ok: false, error: "Página inválida." });
  });

  it("aceita manter a página legada do próprio ponto", () => {
    expect(
      parsePointDetails({ category: "Blog", title: "X", subtitle: "" }, "Blog")
    ).toEqual({ ok: true, value: { category: "Blog", title: "X", subtitle: null } });
    // ...mas não trocar para outra página desconhecida.
    expect(
      parsePointDetails({ category: "Outra", title: "X", subtitle: "" }, "Blog")
    ).toEqual({ ok: false, error: "Página inválida." });
  });
});
