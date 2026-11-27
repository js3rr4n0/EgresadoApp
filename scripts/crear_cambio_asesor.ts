// D8 (specs/COORDINADOR_ASIGNACION.md): solicitudes de cambio de asesor (las pide el egresado líder o el asesor; las
// atiende el coordinador o la administración) y quién resolvió cada solicitud de baja.
// Se puede ejecutar más de una vez.
// Uso: npx tsx --env-file=.env.local scripts/crear_cambio_asesor.ts
import { sql } from "drizzle-orm";
import { db } from "../src/lib/db";
import { exigirBaseDesarrollo } from "./fichas/guardia";

async function run() {
  exigirBaseDesarrollo("crear_cambio_asesor");
  await db.execute(
    sql.raw(`CREATE TABLE IF NOT EXISTS "solicitudes_cambio_asesor" (
      "id" serial PRIMARY KEY,
      "propuesta_id" integer NOT NULL REFERENCES "propuestas"("id") ON DELETE CASCADE,
      "solicitante_id" integer NOT NULL REFERENCES "usuarios"("id") ON DELETE CASCADE,
      "rol_solicitante" varchar(10) NOT NULL CHECK ("rol_solicitante" IN ('egresado', 'asesor')),
      "asesor_actual_id" integer NOT NULL REFERENCES "usuarios"("id") ON DELETE CASCADE,
      "motivo" text NOT NULL,
      "estado" varchar(20) NOT NULL DEFAULT 'pendiente'
        CHECK ("estado" IN ('pendiente', 'esperando_asesor', 'por_reasignar', 'completada', 'rechazada')),
      "nuevo_asesor_id" integer REFERENCES "usuarios"("id") ON DELETE SET NULL,
      "solicitud_asesor_id" integer REFERENCES "solicitudes_asesor"("id") ON DELETE SET NULL,
      "respuesta" text,
      "resuelto_por" integer REFERENCES "usuarios"("id") ON DELETE SET NULL,
      "resuelto_en" timestamp with time zone,
      "creada_en" timestamp with time zone NOT NULL DEFAULT now()
    )`),
  );
  await db.execute(sql.raw(`CREATE INDEX IF NOT EXISTS "solicitudes_cambio_asesor_propuesta_idx" ON "solicitudes_cambio_asesor" ("propuesta_id")`));
  await db.execute(
    sql.raw(`CREATE TABLE IF NOT EXISTS "bajas_resueltas" (
      "solicitud_baja_id" integer PRIMARY KEY REFERENCES "solicitudes_baja"("id") ON DELETE CASCADE,
      "resuelto_por" integer REFERENCES "usuarios"("id") ON DELETE SET NULL
    )`),
  );
  console.log("Tablas de cambio de asesor y de bajas resueltas listas.");
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
