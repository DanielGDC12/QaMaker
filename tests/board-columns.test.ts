import { describe, it, expect } from "vitest";
import {
  BOARD_COLUMN_ORDER,
  CHECKLIST_COLUMN,
  POINT_STATUSES,
  boardColumnOf,
  boardColumnMeta,
  statusForDrop,
  type BoardColumn,
  type PointStatus,
} from "@/lib/constants";

/** Ponto do checklist padrão (cópia do template checklist_template_items). */
const checklist = (status: PointStatus) => ({ status, isDefault: true });
/** Ponto criado à mão (UI, extensão ou ator externo). */
const avulso = (status: PointStatus) => ({ status, isDefault: false });

const STATUS_COLUMNS = BOARD_COLUMN_ORDER.filter(
  (c): c is PointStatus => c !== CHECKLIST_COLUMN
);

describe("colunas do board", () => {
  it("o checklist é a primeira coluna, seguida de todos os status", () => {
    expect(BOARD_COLUMN_ORDER[0]).toBe(CHECKLIST_COLUMN);
    expect([...STATUS_COLUMNS].sort()).toEqual([...POINT_STATUSES].sort());
  });

  it("toda coluna tem label e cor", () => {
    for (const c of BOARD_COLUMN_ORDER) {
      const meta = boardColumnMeta(c);
      expect(meta.label.trim()).not.toBe("");
      expect(meta.color).toMatch(/^var\(--/);
    }
  });

  it("ponto do checklist fica retido enquanto não é auditado", () => {
    expect(boardColumnOf(checklist("pendente"))).toBe(CHECKLIST_COLUMN);
    expect(boardColumnOf(checklist("iniciado"))).toBe(CHECKLIST_COLUMN);
  });

  it("ponto do checklist sai da coluna ao ser auditado", () => {
    expect(boardColumnOf(checklist("feito"))).toBe("feito");
    expect(boardColumnOf(checklist("nao_possivel"))).toBe("nao_possivel");
  });

  it("ponto avulso sempre segue o próprio status", () => {
    for (const s of POINT_STATUSES) {
      expect(boardColumnOf(avulso(s))).toBe(s);
    }
  });
});

describe("movimento de cards (drop)", () => {
  it("checklist só pode ser solto nas colunas de conclusão", () => {
    expect(statusForDrop(checklist("pendente"), "feito")).toBe("feito");
    expect(statusForDrop(checklist("pendente"), "nao_possivel")).toBe(
      "nao_possivel"
    );
    expect(statusForDrop(checklist("pendente"), "iniciado")).toBeNull();
    expect(statusForDrop(checklist("iniciado"), "pendente")).toBeNull();
    expect(statusForDrop(checklist("iniciado"), "iniciado")).toBeNull();
  });

  it("soltar um ponto auditado de volta no checklist reabre como pendente", () => {
    expect(statusForDrop(checklist("feito"), CHECKLIST_COLUMN)).toBe("pendente");
    expect(statusForDrop(checklist("nao_possivel"), CHECKLIST_COLUMN)).toBe(
      "pendente"
    );
  });

  it("ponto avulso nunca entra na coluna do checklist", () => {
    for (const s of POINT_STATUSES) {
      expect(statusForDrop(avulso(s), CHECKLIST_COLUMN)).toBeNull();
    }
  });

  it("ponto avulso circula livremente entre as colunas de status", () => {
    for (const from of POINT_STATUSES) {
      for (const to of STATUS_COLUMNS) {
        expect(statusForDrop(avulso(from), to)).toBe(from === to ? null : to);
      }
    }
  });

  it("soltar na própria coluna nunca dispara mudança", () => {
    const points = [...POINT_STATUSES].flatMap((s) => [
      checklist(s),
      avulso(s),
    ]);
    for (const p of points) {
      expect(statusForDrop(p, boardColumnOf(p))).toBeNull();
    }
  });

  it("o status resultante de um drop é sempre um status válido", () => {
    const columns: BoardColumn[] = [...BOARD_COLUMN_ORDER];
    const points = [...POINT_STATUSES].flatMap((s) => [
      checklist(s),
      avulso(s),
    ]);
    for (const p of points) {
      for (const c of columns) {
        const next = statusForDrop(p, c);
        if (next !== null) expect(POINT_STATUSES).toContain(next);
      }
    }
  });
});
