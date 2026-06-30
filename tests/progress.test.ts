import { describe, it, expect } from "vitest";
import {
  calcProgress,
  deriveProjectStatus,
  type PointStatus,
} from "@/lib/constants";

const mk = (...statuses: PointStatus[]) => statuses.map((status) => ({ status }));

describe("calcProgress", () => {
  it("retorna 0 para lista vazia", () => {
    expect(calcProgress([])).toEqual({ total: 0, done: 0, pct: 0 });
  });

  it("conta feito e nao_possivel como auditados; iniciado e pendente não", () => {
    const r = calcProgress(mk("feito", "nao_possivel", "iniciado", "pendente"));
    expect(r.total).toBe(4);
    expect(r.done).toBe(2);
    expect(r.pct).toBe(50);
  });

  it("100% quando todos auditados", () => {
    expect(calcProgress(mk("feito", "nao_possivel")).pct).toBe(100);
  });

  it("0% quando nenhum auditado", () => {
    expect(calcProgress(mk("pendente", "iniciado")).pct).toBe(0);
  });

  it("arredonda corretamente (2 de 3 = 67%)", () => {
    expect(calcProgress(mk("feito", "feito", "pendente")).pct).toBe(67);
  });
});

describe("deriveProjectStatus", () => {
  it("0% → a_iniciar", () => {
    expect(deriveProjectStatus(0)).toBe("a_iniciar");
  });
  it("entre 1 e 99 → em_revisao", () => {
    expect(deriveProjectStatus(1)).toBe("em_revisao");
    expect(deriveProjectStatus(50)).toBe("em_revisao");
    expect(deriveProjectStatus(99)).toBe("em_revisao");
  });
  it("100% → concluido", () => {
    expect(deriveProjectStatus(100)).toBe("concluido");
  });
});
