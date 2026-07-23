import { describe, it, expect } from "vitest";
import {
  validateImageFile,
  MAX_IMAGE_BYTES,
} from "@/lib/image";

describe("validateImageFile", () => {
  it("aceita JPEG/PNG/WebP dentro do limite", () => {
    expect(validateImageFile({ type: "image/jpeg", size: 1000 }).ok).toBe(true);
    expect(validateImageFile({ type: "image/png", size: 1000 }).ok).toBe(true);
    expect(validateImageFile({ type: "image/webp", size: 1000 }).ok).toBe(true);
  });

  it("rejeita tipo não suportado", () => {
    const r = validateImageFile({ type: "image/gif", size: 1000 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/JPEG/);
  });

  it("rejeita PDF e outros não-imagem", () => {
    expect(validateImageFile({ type: "application/pdf", size: 1000 }).ok).toBe(
      false
    );
  });

  it("rejeita arquivo acima de 2 MB", () => {
    const r = validateImageFile({ type: "image/png", size: MAX_IMAGE_BYTES + 1 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/2 MB/);
  });

  it("aceita exatamente no limite", () => {
    expect(
      validateImageFile({ type: "image/png", size: MAX_IMAGE_BYTES }).ok
    ).toBe(true);
  });
});
