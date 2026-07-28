import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// A camada Slack lê SLACK_BOT_TOKEN sob demanda (dentro de botToken()), então
// basta definir/remover o env antes de cada teste. Testamos apenas as funções
// puras de HTTP (lookupSlackIdByEmail, postDM) — as que tocam o banco
// (resolveSlackId, notifyResponsible) são wrappers finos sobre elas.
const { lookupSlackIdByEmail, postDM } = await import("@/lib/slack");

/** Cria uma Response-like mínima para o mock de fetch. */
function jsonResponse(body: unknown) {
  return { json: async () => body } as unknown as Response;
}

describe("lib/slack — lookupSlackIdByEmail", () => {
  beforeEach(() => {
    process.env.SLACK_BOT_TOKEN = "xoxb-test-token";
  });
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.SLACK_BOT_TOKEN;
  });

  it("retorna null quando não há token configurado (feature desligada)", async () => {
    delete process.env.SLACK_BOT_TOKEN;
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    expect(await lookupSlackIdByEmail("a@agenciafg.com.br")).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled(); // nem chega a bater na API
  });

  it("resolve o Slack ID a partir do e-mail", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ ok: true, user: { id: "U123" } })
    );
    expect(await lookupSlackIdByEmail("a@agenciafg.com.br")).toBe("U123");
  });

  it("retorna null quando o Slack responde erro (users_not_found)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ ok: false, error: "users_not_found" })
    );
    expect(await lookupSlackIdByEmail("x@agenciafg.com.br")).toBeNull();
  });

  it("não lança em falha de rede — retorna null", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down"));
    await expect(lookupSlackIdByEmail("a@agenciafg.com.br")).resolves.toBeNull();
  });
});

describe("lib/slack — postDM", () => {
  beforeEach(() => {
    process.env.SLACK_BOT_TOKEN = "xoxb-test-token";
  });
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.SLACK_BOT_TOKEN;
  });

  it("abre a conversa e posta a mensagem (happy path)", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({ ok: true, channel: { id: "D42" } }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));

    const ok = await postDM("U123", { text: "olá" });
    expect(ok).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    // 1ª chamada: conversations.open com o usuário alvo
    const [openUrl, openInit] = fetchSpy.mock.calls[0];
    expect(String(openUrl)).toContain("conversations.open");
    expect(JSON.parse(String(openInit?.body))).toMatchObject({ users: "U123" });

    // 2ª chamada: chat.postMessage no canal aberto
    const [postUrl, postInit] = fetchSpy.mock.calls[1];
    expect(String(postUrl)).toContain("chat.postMessage");
    expect(JSON.parse(String(postInit?.body))).toMatchObject({
      channel: "D42",
      text: "olá",
    });
  });

  it("não posta se conversations.open falhar", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({ ok: false, error: "cannot_dm_bot" }));

    expect(await postDM("U123", { text: "olá" })).toBe(false);
    expect(fetchSpy).toHaveBeenCalledTimes(1); // não tentou postar
  });

  it("retorna false sem token (não bate na API)", async () => {
    delete process.env.SLACK_BOT_TOKEN;
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    expect(await postDM("U123", { text: "olá" })).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("não lança em falha de rede — retorna false", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("boom"));
    await expect(postDM("U123", { text: "olá" })).resolves.toBe(false);
  });
});
