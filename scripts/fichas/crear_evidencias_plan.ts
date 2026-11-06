// Reunión 6-nov-2026: evidencias de cada registro de la ejecución del proyecto (imágenes, documentos PDF o enlaces).
// Una fila por evidencia; se borran con su registro. Solo agrega; se puede ejecutar más de una vez.
// Uso: npx tsx --env-file=.env.local scripts/fichas/crear_evidencias_plan.ts
import { sql } from "drizzle-orm";
import { db } from "../../src/lib/db";
import { exigirBaseDesarrollo } from "./guardia";

async function run() {
  exigirBaseDesarrollo("crear_evidencias_plan");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "evidencias_plan" (
      "id" serial PRIMARY KEY,
      "registro_id" integer NOT NULL REFERENCES "registros_plan"("id") ON DELETE CASCADE,
      "tipo" varchar(10) NOT NULL,
      "url" text NOT NULL,
      "nombre" varchar(255),
      "leyenda" varchar(255) NOT NULL,
      "origen" varchar(10),
      "fuente" jsonb,
      "creado_en" timestamp with time zone NOT NULL DEFAULT now(),
      CONSTRAINT "evidencias_plan_tipo_check" CHECK ("tipo" IN ('imagen', 'documento', 'enlace'))
    );
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "evidencias_plan_registro_idx" ON "evidencias_plan" ("registro_id");`);
  console.log("Tabla evidencias_plan lista.");
}

run()
  .then(() => { process.exitCode = 0; })
  .catch((e) => { console.error(e); process.exitCode = 1; });
