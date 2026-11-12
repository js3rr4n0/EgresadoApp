// Entrega I5 (investigación): informe final por capítulos. Versiones de cada capítulo (solo se agregan), estado del
// informe y firmas de la versión final. Solo agrega; se puede ejecutar más de una vez.
// Uso: npx tsx --env-file=.env.local scripts/fichas/crear_informe_final_ficha.ts
import { sql } from "drizzle-orm";
import { db } from "../../src/lib/db";
import { exigirBaseDesarrollo } from "./guardia";

async function run() {
  exigirBaseDesarrollo("crear_informe_final_ficha");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "versiones_capitulo" (
      "id" serial PRIMARY KEY,
      "propuesta_id" integer NOT NULL REFERENCES "propuestas"("id") ON DELETE CASCADE,
      "espacio_id" varchar(64) NOT NULL,
      "numero" integer NOT NULL,
      "contenido" text NOT NULL,
      "autor_id" integer REFERENCES "usuarios"("id"),
      "automatica" boolean NOT NULL DEFAULT false,
      "creado_en" timestamp with time zone NOT NULL DEFAULT now(),
      CONSTRAINT "versiones_capitulo_numero" UNIQUE ("propuesta_id", "espacio_id", "numero")
    );
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "versiones_capitulo_propuesta_idx" ON "versiones_capitulo" ("propuesta_id");`);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "informes_finales_ficha" (
      "id" serial PRIMARY KEY,
      "propuesta_id" integer NOT NULL UNIQUE REFERENCES "propuestas"("id") ON DELETE CASCADE,
      "estado" varchar(20) NOT NULL DEFAULT 'redactando',
      "capitulos" jsonb NOT NULL DEFAULT '{}'::jsonb,
      "huella_final" text,
      "entregado_en" timestamp with time zone,
      "aprobado_en" timestamp with time zone,
      "comentario_final" text,
      "revisado_por" integer REFERENCES "usuarios"("id"),
      "actualizado_en" timestamp with time zone NOT NULL DEFAULT now(),
      CONSTRAINT "informes_finales_ficha_estado_check" CHECK ("estado" IN ('redactando', 'entregado', 'aprobado'))
    );
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "ratificaciones_informe_final" (
      "id" serial PRIMARY KEY,
      "propuesta_id" integer NOT NULL REFERENCES "propuestas"("id") ON DELETE CASCADE,
      "usuario_id" integer NOT NULL REFERENCES "usuarios"("id") ON DELETE CASCADE,
      "huella_firmada" text NOT NULL,
      "momento" timestamp with time zone NOT NULL DEFAULT now(),
      CONSTRAINT "ratificaciones_informe_final_propuesta_usuario" UNIQUE ("propuesta_id", "usuario_id")
    );
  `);
  console.log("Tablas del informe final listas.");
}

run()
  .then(() => { process.exitCode = 0; })
  .catch((e) => { console.error(e); process.exitCode = 1; });
