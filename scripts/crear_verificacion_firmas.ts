// A4 (specs/REVISAR_PROPUESTA_ADMIN.md): registro de «Firmas verificadas» de la carta de aceptación (quién y cuándo).
// Guarda una huella de la carta y de las personas elegidas: si cambian, la verificación deja de valer.
// Se puede ejecutar más de una vez.
// Uso: npx tsx --env-file=.env.local scripts/crear_verificacion_firmas.ts
import { sql } from "drizzle-orm";
import { db } from "../src/lib/db";
import { exigirBaseDesarrollo } from "./fichas/guardia";

async function run() {
  exigirBaseDesarrollo("crear_verificacion_firmas");
  await db.execute(
    sql.raw(`CREATE TABLE IF NOT EXISTS "verificaciones_firmas" (
      "propuesta_id" integer PRIMARY KEY REFERENCES "propuestas"("id") ON DELETE CASCADE,
      "huella" text NOT NULL,
      "verificada_por" integer REFERENCES "usuarios"("id"),
      "verificada_en" timestamp with time zone NOT NULL DEFAULT now()
    )`),
  );
  console.log("Tabla de verificación de firmas lista.");
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
