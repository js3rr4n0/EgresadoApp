// Entrega I3 (investigación): firmas del equipo sobre el protocolo y el plan de trabajo antes de enviarlos al asesor.
// Una fila por integrante y propuesta. Solo agrega; se puede ejecutar más de una vez.
// Uso: npx tsx --env-file=.env.local scripts/fichas/crear_ratificaciones_plan.ts
import { sql } from "drizzle-orm";
import { db } from "../../src/lib/db";
import { exigirBaseDesarrollo } from "./guardia";

async function run() {
  exigirBaseDesarrollo("crear_ratificaciones_plan");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "ratificaciones_plan" (
      "id" serial PRIMARY KEY,
      "propuesta_id" integer NOT NULL REFERENCES "propuestas"("id") ON DELETE CASCADE,
      "usuario_id" integer NOT NULL REFERENCES "usuarios"("id") ON DELETE CASCADE,
      "huella_firmada" text NOT NULL,
      "momento" timestamp with time zone NOT NULL DEFAULT now(),
      CONSTRAINT "ratificaciones_plan_propuesta_usuario" UNIQUE ("propuesta_id", "usuario_id")
    );
  `);
  console.log("Tabla ratificaciones_plan lista.");
}

run()
  .then(() => { process.exitCode = 0; })
  .catch((e) => { console.error(e); process.exitCode = 1; });
