// A2 (specs/REVISAR_PROPUESTA_ADMIN.md): rechazos por requisitos que hacen la administración o el coordinador antes de
// asignar. Guarda los motivos marcados, el mensaje al egresado y quién rechazó. Se puede ejecutar más de una vez.
// Uso: npx tsx --env-file=.env.local scripts/crear_rechazos_propuesta.ts
import { sql } from "drizzle-orm";
import { db } from "../src/lib/db";
import { exigirBaseDesarrollo } from "./fichas/guardia";

async function run() {
  exigirBaseDesarrollo("crear_rechazos_propuesta");
  await db.execute(
    sql.raw(`CREATE TABLE IF NOT EXISTS "rechazos_propuesta" (
      "id" serial PRIMARY KEY,
      "propuesta_id" integer NOT NULL REFERENCES "propuestas"("id") ON DELETE CASCADE,
      "motivos" jsonb NOT NULL,
      "mensaje" text NOT NULL,
      "rechazado_por" integer REFERENCES "usuarios"("id"),
      "funcion" varchar(20) NOT NULL,
      "estado_anterior" varchar(30) NOT NULL,
      "creado_en" timestamp with time zone NOT NULL DEFAULT now()
    )`),
  );
  await db.execute(sql.raw(`CREATE INDEX IF NOT EXISTS "rechazos_propuesta_propuesta_idx" ON "rechazos_propuesta" ("propuesta_id")`));
  console.log("Tabla de rechazos por requisitos lista.");
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
