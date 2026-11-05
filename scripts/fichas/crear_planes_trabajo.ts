// Entrega P3: plan de trabajo del equipo (proyecto). Una fila por propuesta con el árbol del plan en JSON
// (objetivo general → específicos → macroactividades → actividades → subactividades), cada nodo con id estable,
// responsable y montos por columna. `version` evita que dos integrantes se pisen al guardar.
// Solo agrega; se puede ejecutar más de una vez.
// Uso: npx tsx --env-file=.env.local scripts/fichas/crear_planes_trabajo.ts
import { sql } from "drizzle-orm";
import { db } from "../../src/lib/db";
import { exigirBaseDesarrollo } from "./guardia";

async function run() {
  exigirBaseDesarrollo("crear_planes_trabajo");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "planes_trabajo" (
      "id" serial PRIMARY KEY,
      "propuesta_id" integer NOT NULL UNIQUE REFERENCES "propuestas"("id") ON DELETE CASCADE,
      "ficha_version_id" integer REFERENCES "fichas_versiones"("id"),
      "arbol" jsonb NOT NULL,
      "columnas" smallint NOT NULL,
      "version" integer NOT NULL DEFAULT 1,
      "estado" varchar(20) NOT NULL DEFAULT 'redactando',
      "comentario_asesor" text,
      "enviado_en" timestamp with time zone,
      "revisado_por" integer REFERENCES "usuarios"("id"),
      "revisado_en" timestamp with time zone,
      "actualizado_por" integer REFERENCES "usuarios"("id"),
      "actualizado_en" timestamp with time zone NOT NULL DEFAULT now(),
      CONSTRAINT "planes_trabajo_estado_check" CHECK ("estado" IN ('redactando', 'enviado', 'observado', 'aprobado'))
    );
  `);
  console.log("Tabla planes_trabajo lista.");
}

run()
  .then(() => { process.exitCode = 0; })
  .catch((e) => { console.error(e); process.exitCode = 1; });
