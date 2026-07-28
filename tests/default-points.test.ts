import { describe, it, expect } from "vitest";
import { DEFAULT_PROJECT_POINTS } from "@/lib/default-points";
import { CATEGORIES, calcProgress } from "@/lib/constants";

describe("checklist padrão de projeto", () => {
  it("tem pontos e todos com título não vazio", () => {
    expect(DEFAULT_PROJECT_POINTS.length).toBeGreaterThan(0);
    for (const p of DEFAULT_PROJECT_POINTS) {
      expect(p.title.trim()).not.toBe("");
      // O `addPoint` limita a 200 chars; o template segue a mesma regra.
      expect(p.title.length).toBeLessThanOrEqual(200);
    }
  });

  it("usa apenas categorias válidas de CATEGORIES", () => {
    for (const p of DEFAULT_PROJECT_POINTS) {
      expect(CATEGORIES).toContain(p.category);
    }
  });

  it("não repete títulos", () => {
    const titles = DEFAULT_PROJECT_POINTS.map((p) => p.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it("um projeto novo começa 0% (todos os pontos pendentes)", () => {
    const points = DEFAULT_PROJECT_POINTS.map(() => ({
      status: "pendente" as const,
    }));
    expect(calcProgress(points)).toEqual({
      total: DEFAULT_PROJECT_POINTS.length,
      done: 0,
      pct: 0,
    });
  });
});
