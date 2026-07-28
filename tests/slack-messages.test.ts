import { describe, it, expect } from "vitest";
import {
  appOriginFromHeaders,
  pointStatusChangedMessage,
  newPointMessage,
  projectCompletedMessage,
} from "@/lib/slack-messages";

const base = {
  origin: "https://qa.example.com",
  projectId: "p-1",
  projectName: "Loja X",
  actorName: "ana@agenciafg.com.br",
};

describe("appOriginFromHeaders", () => {
  it("prioriza x-forwarded-host + proto (atrás do proxy)", () => {
    const h = new Headers({
      "x-forwarded-host": "qa.example.com",
      "x-forwarded-proto": "https",
      host: "internal:3000",
    });
    expect(appOriginFromHeaders(h)).toBe("https://qa.example.com");
  });

  it("cai no host quando não há x-forwarded-host", () => {
    const h = new Headers({ host: "localhost:3000" });
    expect(appOriginFromHeaders(h)).toBe("https://localhost:3000");
  });
});

describe("builders de mensagem", () => {
  it("status inclui o link do projeto e o rótulo do status", () => {
    const msg = pointStatusChangedMessage({
      ...base,
      pointTitle: "Botão quebrado",
      status: "feito",
    });
    expect(msg.text).toContain("Feito");
    expect(msg.text).toContain("Loja X");
    // o link do projeto aparece em algum bloco
    expect(JSON.stringify(msg.blocks)).toContain(
      "https://qa.example.com/projetos/p-1"
    );
  });

  it("novo ponto marca origem da extensão quando aplicável", () => {
    const msg = newPointMessage({
      ...base,
      pointTitle: "Erro no checkout",
      viaExtension: true,
    });
    expect(JSON.stringify(msg.blocks)).toContain("via extensão");
    expect(msg.text).toContain("Erro no checkout");
  });

  it("conclusão tem texto de 100%", () => {
    const msg = projectCompletedMessage(base);
    expect(msg.text).toContain("100%");
    expect(JSON.stringify(msg.blocks)).toContain("concluído");
  });

  it("sem origin, omite o bloco de link (não gera link quebrado)", () => {
    const msg = projectCompletedMessage({ ...base, origin: "" });
    expect(JSON.stringify(msg.blocks)).not.toContain("Abrir projeto");
  });
});
