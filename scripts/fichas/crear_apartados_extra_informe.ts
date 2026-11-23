// Pasantía con ficha (entrega W3): columna para los capítulos de texto que la ficha agrega al documento final.
// Idempotente. Solo base de desarrollo (o --confirmo-base-principal).
// Uso: npx tsx --env-file=.env.local scripts/fichas/crear_apartados_extra_informe.ts
import { sql } from "drizzle-orm";
import { db } from "../../src/lib/db";
import { exigirBaseDesarrollo } from "./guardia";

async function run() {
  exigirBaseDesarrollo("crear_apartados_extra_informe");
  await db.execute(sql`ALTER TABLE "informes_mensuales" ADD COLUMN IF NOT EXISTS "apartados_extra" jsonb;`);
  console.log("Columna informes_mensuales.apartados_extra lista.");
}

run().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
