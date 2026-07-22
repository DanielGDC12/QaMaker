import { describe, it, expect, beforeAll } from "vitest";

// O segredo é lido sob demanda (dentro de getKey), então basta definir antes
// de chamar as funções — o import não dispara leitura de env.
beforeAll(() => {
  process.env.EXTERNAL_SHARE_COOKIE_SECRET = "test-secret-para-vitest-1234567890";
});

const { signExternalShareToken, verifyExternalShareToken, generateShareToken, sha256Hex } =
  await import("@/lib/external-share-token");

const future = Math.floor(Date.now() / 1000) + 3600;

describe("external share token", () => {
  it("assina e verifica um token válido, retornando o shareId", async () => {
    const token = await signExternalShareToken({
      shareId: "share-1",
      projectId: "proj-1",
      exp: future,
    });
    const result = await verifyExternalShareToken(token, "proj-1");
    expect(result).toEqual({ shareId: "share-1" });
  });

  it("rejeita se o projeto do cookie não bate com o esperado (escopo)", async () => {
    const token = await signExternalShareToken({
      shareId: "share-1",
      projectId: "proj-1",
      exp: future,
    });
    // Mesmo cookie válido, mas apresentado noutro projeto → nega.
    expect(await verifyExternalShareToken(token, "proj-2")).toBeNull();
  });

  it("rejeita token expirado", async () => {
    const token = await signExternalShareToken({
      shareId: "share-1",
      projectId: "proj-1",
      exp: Math.floor(Date.now() / 1000) - 10,
    });
    expect(await verifyExternalShareToken(token, "proj-1")).toBeNull();
  });

  it("rejeita assinatura adulterada", async () => {
    const token = await signExternalShareToken({
      shareId: "share-1",
      projectId: "proj-1",
      exp: future,
    });
    const [body] = token.split(".");
    const tampered = `${body}.assinaturafalsa`;
    expect(await verifyExternalShareToken(tampered, "proj-1")).toBeNull();
  });

  it("rejeita corpo adulterado (escalonar shareId) — assinatura não confere", async () => {
    const token = await signExternalShareToken({
      shareId: "share-1",
      projectId: "proj-1",
      exp: future,
    });
    const [, sig] = token.split(".");
    const forgedBody = Buffer.from(
      JSON.stringify({ shareId: "admin", projectId: "proj-1", exp: future })
    ).toString("base64url");
    expect(await verifyExternalShareToken(`${forgedBody}.${sig}`, "proj-1")).toBeNull();
  });

  it("retorna null para cookie ausente ou malformado", async () => {
    expect(await verifyExternalShareToken(undefined, "proj-1")).toBeNull();
    expect(await verifyExternalShareToken("", "proj-1")).toBeNull();
    expect(await verifyExternalShareToken("lixo", "proj-1")).toBeNull();
  });

  it("gera tokens distintos e um hash sha256 consistente", async () => {
    const a = await generateShareToken();
    const b = await generateShareToken();
    expect(a.token).not.toEqual(b.token);
    expect(a.tokenHash).toEqual(await sha256Hex(a.token));
    expect(a.tokenHash).toHaveLength(64);
  });
});
