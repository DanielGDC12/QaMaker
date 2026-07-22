import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireProjectActor, AccessDeniedError } from "@/lib/auth-guard";
import { getProjectPoint } from "@/lib/db/queries";
import { validateImageFile } from "@/lib/image";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const projectId = String(form.get("projectId") ?? "");
    const pointId = String(form.get("pointId") ?? "");

    if (!projectId) {
      return NextResponse.json({ error: "Projeto ausente." }, { status: 400 });
    }

    // Autoriza FG OU ator externo do projeto (o proxy deixa /api/upload
    // passar; a checagem real por projeto é aqui).
    const actor = await requireProjectActor(projectId);

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Arquivo ausente." }, { status: 400 });
    }

    // Editando a imagem de um ponto EXISTENTE → aplica a mesma regra de posse
    // do setPointImage. (Sem pointId = imagem de um ponto ainda não criado.)
    if (pointId) {
      const point = await getProjectPoint(pointId);
      if (!point || point.projectId !== projectId) {
        return NextResponse.json(
          { error: "Ponto inválido." },
          { status: 400 }
        );
      }
      if (
        actor.type === "external" &&
        (!point.createdByIsExternal || point.createdBy !== actor.shareId)
      ) {
        throw new AccessDeniedError();
      }
    }

    // Validação server-side (nunca confiar só no cliente).
    const check = validateImageFile({ type: file.type, size: file.size });
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: 413 });
    }

    const ext = file.type.split("/")[1] ?? "bin";
    // Sem pointId (upload feito na criação do ponto) → segmento "novos".
    const seg = pointId || "novos";
    const pathname = `projetos/${projectId}/pontos/${seg}/${Date.now()}.${ext}`;

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
