import { config } from "dotenv";
config({ path: ".env.local" });

import { db, templatePoints } from "@/lib/db";
import { TEMPLATE_SEED } from "@/lib/db/seed-data";

/**
 * Semeia o template master.
 * Idempotente: pula se já houver pontos, salvo se FORCE=1 (limpa e recria).
 *
 *   npm run db:seed          # só semeia se vazio
 *   FORCE=1 npm run db:seed  # limpa e recria
 */
async function main() {
  const existing = await db.select().from(templatePoints);

  if (existing.length > 0 && process.env.FORCE !== "1") {
    console.log(
      `Template já tem ${existing.length} ponto(s). Use FORCE=1 para recriar.`
    );
    return;
  }

  if (existing.length > 0) {
    await db.delete(templatePoints);
    console.log(`Removidos ${existing.length} ponto(s) antigos.`);
  }

  const rows = TEMPLATE_SEED.map((p, i) => ({
    category: p.category,
    title: p.title,
    subtitle: p.subtitle,
    displayOrder: i + 1,
  }));

  await db.insert(templatePoints).values(rows);
  console.log(`Template semeado com ${rows.length} pontos.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Falha ao semear:", err);
    process.exit(1);
  });
