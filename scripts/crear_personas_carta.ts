// R5 (specs/REDACTAR_PROPUESTA_AJUSTES.md): firmantes y supervisor de la carta de aceptación.
//   - cartas_aceptacion: firmantes elegidos, supervisor elegido y «sin supervisor empresarial» con su motivo.
//   - solicitudes_empresa: nuevo tipo «carta» (firmantes o supervisor nuevos, o sin supervisor, para que la
//     administración los valide).
// Solo agrega columnas y amplía una restricción; se puede ejecutar más de una vez.
// Uso: npx tsx --env-file=.env.local scripts/crear_personas_carta.ts
import { sql } from "drizzle-orm";
import { db } from "../src/lib/db";
import { exigirBaseDesarrollo } from "./fichas/guardia";

async function run() {
  exigirBaseDesarrollo("crear_personas_carta");
  await db.execute(sql.raw(`ALTER TABLE "cartas_aceptacion" ADD COLUMN IF NOT EXISTS "firmante_ids" jsonb`));
  await db.execute(sql.raw(`ALTER TABLE "cartas_aceptacion" ADD COLUMN IF NOT EXISTS "supervisor_id" integer`));
  await db.execute(sql.raw(`ALTER TABLE "cartas_aceptacion" ADD COLUMN IF NOT EXISTS "sin_supervisor" boolean NOT NULL DEFAULT false`));
  await db.execute(sql.raw(`ALTER TABLE "cartas_aceptacion" ADD COLUMN IF NOT EXISTS "motivo_sin_supervisor" text`));
  await db.execute(sql.raw(`ALTER TABLE "solicitudes_empresa" DROP CONSTRAINT IF EXISTS "tipo_solicitud_check"`));
  await db.execute(
    sql.raw(`ALTER TABLE "solicitudes_empresa" ADD CONSTRAINT "tipo_solicitud_check" CHECK ("tipo" IN ('nueva', 'actualizacion', 'modificacion', 'datos_alumno', 'carta'))`),
  );
  console.log("Firmantes y supervisor de la carta listos.");
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
