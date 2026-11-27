// R6 (specs/REDACTAR_PROPUESTA_AJUSTES.md): confirmación de que el líder revisó el documento antes de enviar.
// Guarda la huella de la versión revisada; si la propuesta cambia después, la confirmación deja de valer.
// Tabla aparte para no tocar «propuestas». Se puede ejecutar más de una vez.
// Uso: npx tsx --env-file=.env.local scripts/crear_revision_propuesta.ts
import { sql } from "drizzle-orm";
import { db } from "../src/lib/db";
import { exigirBaseDesarrollo } from "./fichas/guardia";

async function run() {
  exigirBaseDesarrollo("crear_revision_propuesta");
  await db.execute(
    sql.raw(`CREATE TABLE IF NOT EXISTS "revisiones_propuesta" (
      "propuesta_id" integer PRIMARY KEY REFERENCES "propuestas"("id") ON DELETE CASCADE,
      "huella" text NOT NULL,
      "confirmada_en" timestamp with time zone NOT NULL DEFAULT now(),
      "confirmada_por" integer REFERENCES "usuarios"("id")
    )`),
  );
  console.log("Tabla de la revisión del documento lista.");
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
