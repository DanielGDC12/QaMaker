import { describe, it, expect } from "vitest";
import { isAgenciaFGEmail } from "@/lib/auth-domain";

describe("isAgenciaFGEmail", () => {
  it("aceita e-mails do domínio FG", () => {
    expect(isAgenciaFGEmail("joao@agenciafg.com.br")).toBe(true);
  });

  it("aceita independente de maiúsculas", () => {
    expect(isAgenciaFGEmail("Joao@AgenciaFG.com.br")).toBe(true);
  });

  it("rejeita domínios externos", () => {
    expect(isAgenciaFGEmail("joao@gmail.com")).toBe(false);
  });

  it("rejeita tentativa de subdomínio enganoso", () => {
    expect(isAgenciaFGEmail("hacker@agenciafg.com.br.evil.com")).toBe(false);
  });

  it("rejeita domínio parecido sem o @ (o @ no FG_DOMAIN previne isso)", () => {
    expect(isAgenciaFGEmail("x@notagenciafg.com.br")).toBe(false);
  });

  it("rejeita null, undefined e string vazia", () => {
    expect(isAgenciaFGEmail(null)).toBe(false);
    expect(isAgenciaFGEmail(undefined)).toBe(false);
    expect(isAgenciaFGEmail("")).toBe(false);
  });
});
