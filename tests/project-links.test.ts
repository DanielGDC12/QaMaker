import { describe, it, expect } from "vitest";
import { normalizeProjectUrl, PROJECT_URL_MAX } from "@/lib/project-links";

describe("normalizeProjectUrl", () => {
  it("vazio (ou só espaços) remove o link", () => {
    expect(normalizeProjectUrl("")).toEqual({ ok: true, url: null });
    expect(normalizeProjectUrl("   ")).toEqual({ ok: true, url: null });
  });

  it("mantém links http(s) completos", () => {
    expect(
      normalizeProjectUrl("https://www.figma.com/design/abc123/Loja?node-id=1-2")
    ).toEqual({
      ok: true,
      url: "https://www.figma.com/design/abc123/Loja?node-id=1-2",
    });
    expect(normalizeProjectUrl(" http://loja.com.br/admin ")).toEqual({
      ok: true,
      url: "http://loja.com.br/admin",
    });
  });

  it("completa com https:// quando falta o esquema", () => {
    expect(normalizeProjectUrl("loja.myvtex.com/admin")).toEqual({
      ok: true,
      url: "https://loja.myvtex.com/admin",
    });
  });

  it("recusa esquemas que não são http(s) — o valor vai para um href", () => {
    expect(normalizeProjectUrl("javascript:alert(1)").ok).toBe(false);
    expect(normalizeProjectUrl("ftp://arquivos.loja.com.br").ok).toBe(false);
    expect(normalizeProjectUrl("data://text/html,oi").ok).toBe(false);
  });

  it("recusa usuário/senha embutidos (credenciais ficam fora do sistema)", () => {
    expect(normalizeProjectUrl("https://admin:123@loja.com.br/admin")).toEqual({
      ok: false,
      error: "Não inclua usuário ou senha no link.",
    });
  });

  it("recusa texto que não é link", () => {
    expect(normalizeProjectUrl("admin").ok).toBe(false);
    expect(normalizeProjectUrl("link do figma aqui").ok).toBe(false);
  });

  it("recusa links acima do limite", () => {
    const long = `https://figma.com/${"a".repeat(PROJECT_URL_MAX)}`;
    expect(normalizeProjectUrl(long)).toEqual({
      ok: false,
      error: "Link muito longo.",
    });
  });
});
