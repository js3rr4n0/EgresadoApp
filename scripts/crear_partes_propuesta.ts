// R3 (specs/REDACTAR_PROPUESTA_AJUSTES.md): agrega a detalles_proyecto las columnas de las partes de problema,
// justificación y alcance. Solo agrega columnas; se puede ejecutar más de una vez.
// Uso: npx tsx --env-file=.env.local scripts/crear_partes_propuesta.ts
import { sql } from "drizzle-orm";
import { db } from "../src/lib/db";
import { exigirBaseDesarrollo } from "./fichas/guardia";

async function run() {
  exigirBaseDesarrollo("crear_partes_propuesta");
  for (const col of ["problema_partes", "justificacion_partes", "alcance_partes"]) {
    await db.execute(sql.raw(`ALTER TABLE "detalles_proyecto" ADD COLUMN IF NOT EXISTS "${col}" jsonb`));
  }
  console.log("Columnas de partes listas.");
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
