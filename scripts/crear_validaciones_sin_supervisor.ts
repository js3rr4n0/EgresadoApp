// D2 (specs/COORDINADOR_ASIGNACION.md): constancia de la aprobación «sin supervisor empresarial». Al aprobar la
// solicitud de carta que la pide, la administración escribe un mensaje que ven el coordinador y el asesor.
// Se puede ejecutar más de una vez.
// Uso: npx tsx --env-file=.env.local scripts/crear_validaciones_sin_supervisor.ts
import { sql } from "drizzle-orm";
import { db } from "../src/lib/db";
import { exigirBaseDesarrollo } from "./fichas/guardia";

async function run() {
  exigirBaseDesarrollo("crear_validaciones_sin_supervisor");
  await db.execute(
    sql.raw(`CREATE TABLE IF NOT EXISTS "validaciones_sin_supervisor" (
      "solicitud_id" integer PRIMARY KEY REFERENCES "solicitudes_empresa"("id") ON DELETE CASCADE,
      "propuesta_id" integer NOT NULL REFERENCES "propuestas"("id") ON DELETE CASCADE,
      "mensaje" text NOT NULL,
      "validada_por" integer REFERENCES "usuarios"("id"),
      "validada_en" timestamp with time zone NOT NULL DEFAULT now()
    )`),
  );
  await db.execute(sql.raw(`CREATE INDEX IF NOT EXISTS "validaciones_sin_supervisor_propuesta_idx" ON "validaciones_sin_supervisor" ("propuesta_id")`));
  console.log("Tabla de validaciones sin supervisor lista.");
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
