import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireFGUser, AccessDeniedError } from "@/lib/auth-guard";
import { validateImageFile } from "@/lib/image";

export async function POST(request: Request) {
  try {
    await requireFGUser(); // defesa em profundidade (proxy já protege)

    const form = await request.formData();
    const file = form.get("file");
    const projectId = String(form.get("projectId") ?? "");
    const pointId = String(form.get("pointId") ?? "");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Arquivo ausente." },
        { status: 400 }
      );
    }
    if (!projectId || !pointId) {
      return NextResponse.json(
        { error: "Projeto/ponto ausente." },
        { status: 400 }
      );
    }

    // Validação server-side (nunca confiar só no cliente).
    const check = validateImageFile({ type: file.type, size: file.size });
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: 413 });
    }

    const ext = file.type.split("/")[1] ?? "bin";
    const pathname = `projetos/${projectId}/pontos/${pointId}/${Date.now()}.${ext}`;

    const blob = await put(pathname, file, {
      access: "public",
      contentType: file.type,
    });

    return NextResponse.json({ url: blob.url });
  } catch (err) {
    if (err instanceof AccessDeniedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error("Falha no upload:", err);
    return NextResponse.json(
      { error: "Falha ao enviar a imagem." },
      { status: 500 }
    );
  }
}
