// Entrega V2 (specs/VALORACIONES_EMPRESAS_ASESORES.md): crea la tabla reportes_empresa (src/lib/schema.ts).
// Solo agrega una tabla nueva; no modifica ni borra nada existente. Se puede ejecutar más de una vez.
// Uso: npx tsx --env-file=.env.local scripts/crear_reportes_empresa.ts
import { sql } from "drizzle-orm";
import { db } from "../src/lib/db";
import { exigirBaseDesarrollo } from "./fichas/guardia";

async function run() {
  exigirBaseDesarrollo("crear_reportes_empresa");

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "reportes_empresa" (
      "id" serial PRIMARY KEY NOT NULL,
      "empresa_id" integer NOT NULL REFERENCES "empresas"("id") ON DELETE CASCADE,
      "fecha" date NOT NULL,
      "origen" varchar(20) NOT NULL,
      "propuesta_id" integer REFERENCES "propuestas"("id") ON DELETE SET NULL,
      "descripcion" text NOT NULL,
      "archivo" jsonb,
      "estado" varchar(20) DEFAULT 'vigente' NOT NULL,
      "registrado_por" integer REFERENCES "usuarios"("id"),
      "creado_en" timestamp with time zone DEFAULT now() NOT NULL,
      CONSTRAINT "reportes_empresa_origen_check" CHECK ("origen" IN ('egresado', 'asesor', 'coordinador', 'supervisor', 'otro')),
      CONSTRAINT "reportes_empresa_estado_check" CHECK ("estado" IN ('vigente', 'archivado'))
    );
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "reportes_empresa_empresa_idx" ON "reportes_empresa" ("empresa_id");`);

  console.log("Tabla reportes_empresa lista.");
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
