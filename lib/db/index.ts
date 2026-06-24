import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

type DB = ReturnType<typeof createDb>;

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL não definida. Configure em .env.local");
  }
  // Driver HTTP: sem conexão TCP persistente — ideal para funções serverless
  // no Vercel, evitando esgotamento de pool em cold starts.
  return drizzle(neon(url), { schema });
}

let instance: DB | undefined;

/**
 * Cliente Drizzle inicializado sob demanda (lazy). Importar este módulo nunca
 * dispara conexão nem exige env — o erro só ocorre na primeira query real,
 * mantendo o `next build` independente de DATABASE_URL.
 */
export const db = new Proxy({} as DB, {
  get(_target, prop, receiver) {
    if (!instance) instance = createDb();
    const value = Reflect.get(instance, prop, receiver);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

export * from "./schema";
