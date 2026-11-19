// Ajustes al protocolo (19-nov-2026): registro de fuentes del trabajo, con sus campos APA 7. Solo agrega; se puede
// ejecutar más de una vez.
// Uso: npx tsx --env-file=.env.local scripts/fichas/crear_fuentes_trabajo.ts
import { sql } from "drizzle-orm";
import { db } from "../../src/lib/db";
import { exigirBaseDesarrollo } from "./guardia";

async function run() {
  exigirBaseDesarrollo("crear_fuentes_trabajo");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "fuentes_trabajo" (
      "id" serial PRIMARY KEY,
      "propuesta_id" integer NOT NULL REFERENCES "propuestas"("id") ON DELETE CASCADE,
      "datos" jsonb NOT NULL,
      "creado_por" integer REFERENCES "usuarios"("id"),
      "creado_en" timestamp with time zone NOT NULL DEFAULT now(),
      "actualizado_en" timestamp with time zone NOT NULL DEFAULT now()
    );
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "fuentes_trabajo_propuesta_idx" ON "fuentes_trabajo" ("propuesta_id")`);
  console.log("Tabla fuentes_trabajo lista.");
}

run()
  .then(() => { process.exitCode = 0; })
  .catch((e) => { console.error(e); process.exitCode = 1; });
