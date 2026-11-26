// Entrega C1 (specs/CONFIGURACION_COHORTE.md): crea las tablas cohorte_facultades, cohorte_participantes y
// cohorte_config_bitacora (src/lib/schema.ts). Solo agrega tablas nuevas. Se puede ejecutar más de una vez.
// Uso: npx tsx --env-file=.env.local scripts/crear_configuracion_cohorte.ts
import { sql } from "drizzle-orm";
import { db } from "../src/lib/db";
import { exigirBaseDesarrollo } from "./fichas/guardia";

async function run() {
  exigirBaseDesarrollo("crear_configuracion_cohorte");

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "cohorte_facultades" (
      "id" serial PRIMARY KEY NOT NULL,
      "periodo_id" integer NOT NULL REFERENCES "periodos"("id") ON DELETE CASCADE,
      "facultad_id" integer NOT NULL REFERENCES "facultades"("id") ON DELETE CASCADE,
      "administracion" varchar(20) DEFAULT 'central' NOT NULL,
      "admin_facultad_id" integer REFERENCES "usuarios"("id") ON DELETE SET NULL,
      "coordinacion" varchar(20) DEFAULT 'general' NOT NULL,
      "admin_coordina" boolean DEFAULT false NOT NULL,
      "actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
      CONSTRAINT "cohorte_facultades_unica" UNIQUE ("periodo_id", "facultad_id"),
      CONSTRAINT "cohorte_facultades_admin_check" CHECK ("administracion" IN ('central', 'facultad')),
      CONSTRAINT "cohorte_facultades_coord_check" CHECK ("coordinacion" IN ('sin_coordinador', 'general', 'por_carrera'))
    );
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "cohorte_participantes" (
      "id" serial PRIMARY KEY NOT NULL,
      "periodo_id" integer NOT NULL REFERENCES "periodos"("id") ON DELETE CASCADE,
      "facultad_id" integer NOT NULL REFERENCES "facultades"("id") ON DELETE CASCADE,
      "usuario_id" integer NOT NULL REFERENCES "usuarios"("id") ON DELETE CASCADE,
      "funcion" varchar(20) NOT NULL,
      "carreras" jsonb DEFAULT '[]'::jsonb NOT NULL,
      "activo" boolean DEFAULT true NOT NULL,
      CONSTRAINT "cohorte_participantes_unica" UNIQUE ("periodo_id", "facultad_id", "usuario_id", "funcion"),
      CONSTRAINT "cohorte_participantes_funcion_check" CHECK ("funcion" IN ('coordinador', 'asesor'))
    );
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "cohorte_participantes_periodo_idx" ON "cohorte_participantes" ("periodo_id");`);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "cohorte_config_bitacora" (
      "id" serial PRIMARY KEY NOT NULL,
      "periodo_id" integer NOT NULL REFERENCES "periodos"("id") ON DELETE CASCADE,
      "facultad_id" integer REFERENCES "facultades"("id") ON DELETE SET NULL,
      "admin_id" integer REFERENCES "usuarios"("id"),
      "cambios" jsonb NOT NULL,
      "justificacion" text,
      "fecha" timestamp with time zone DEFAULT now() NOT NULL
    );
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "cohorte_config_bitacora_periodo_idx" ON "cohorte_config_bitacora" ("periodo_id");`);

  console.log("Tablas de configuración de cohorte listas.");
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
