import { describe, it, expect } from "vitest";
import {
  MEDIA_LIMITS,
  baseMediaType,
  extensionMediaPrefix,
  isVideoUrl,
  mediaExtension,
  validateMedia,
} from "@/lib/media";

describe("validateMedia", () => {
  it("aceita GIF, WebM e MP4 dentro do limite", () => {
    expect(validateMedia({ type: "image/gif", size: 1000 }).ok).toBe(true);
    expect(validateMedia({ type: "video/webm", size: 1000 }).ok).toBe(true);
    expect(validateMedia({ type: "video/mp4", size: 1000 }).ok).toBe(true);
  });

  it("ignora parâmetros de codec e normaliza o tipo", () => {
    const r = validateMedia({ type: "video/webm;codecs=vp9", size: 1000 });
    expect(r).toEqual({ ok: true, type: "video/webm" });
  });

  it("rejeita imagens estáticas e outros tipos", () => {
    expect(validateMedia({ type: "image/png", size: 1000 }).ok).toBe(false);
    expect(validateMedia({ type: "video/quicktime", size: 1000 }).ok).toBe(false);
  });

  it("rejeita arquivo vazio ou acima do limite do tipo", () => {
    expect(validateMedia({ type: "video/webm", size: 0 }).ok).toBe(false);
    const r = validateMedia({
      type: "image/gif",
      size: MEDIA_LIMITS["image/gif"] + 1,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/10 MB/);
  });

  it("aceita exatamente no limite", () => {
    expect(
      validateMedia({ type: "video/mp4", size: MEDIA_LIMITS["video/mp4"] }).ok
    ).toBe(true);
  });
});

describe("helpers de mídia", () => {
  it("baseMediaType remove parâmetros", () => {
    expect(baseMediaType("Video/MP4; codecs=avc1")).toBe("video/mp4");
  });

  it("mediaExtension e extensionMediaPrefix", () => {
    expect(mediaExtension("video/webm")).toBe("webm");
    expect(extensionMediaPrefix("abc")).toBe("projetos/abc/extensao/");
  });

  it("isVideoUrl olha só a extensão do caminho", () => {
    const base = "https://x.public.blob.vercel-storage.com/projetos/p/extensao/";
    expect(isVideoUrl(`${base}1.webm`)).toBe(true);
    expect(isVideoUrl(`${base}1.MP4?download=1`)).toBe(true);
    expect(isVideoUrl(`${base}1.gif`)).toBe(false);
    expect(isVideoUrl(`${base}1.png`)).toBe(false);
    expect(isVideoUrl("blob:https://app/123")).toBe(false);
    expect(isVideoUrl(null)).toBe(false);
    expect(isVideoUrl("não é url")).toBe(false);
  });
});
