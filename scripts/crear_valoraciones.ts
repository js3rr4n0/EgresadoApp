// Entrega V3 (specs/VALORACIONES_EMPRESAS_ASESORES.md): crea la tabla valoraciones (src/lib/schema.ts).
// Solo agrega una tabla nueva; no modifica ni borra nada existente. Se puede ejecutar más de una vez.
// Uso: npx tsx --env-file=.env.local scripts/crear_valoraciones.ts
import { sql } from "drizzle-orm";
import { db } from "../src/lib/db";
import { exigirBaseDesarrollo } from "./fichas/guardia";

async function run() {
  exigirBaseDesarrollo("crear_valoraciones");

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "valoraciones" (
      "id" serial PRIMARY KEY NOT NULL,
      "propuesta_id" integer NOT NULL REFERENCES "propuestas"("id") ON DELETE CASCADE,
      "evaluador_id" integer NOT NULL REFERENCES "usuarios"("id") ON DELETE CASCADE,
      "evaluador_rol" varchar(20) NOT NULL,
      "objetivo" varchar(20) NOT NULL,
      "evaluado_id" integer NOT NULL,
      "puntajes" jsonb NOT NULL,
      "promedio" numeric(4, 2) NOT NULL,
      "comentario" text,
      "creado_en" timestamp with time zone DEFAULT now() NOT NULL,
      CONSTRAINT "valoraciones_unica" UNIQUE ("propuesta_id", "evaluador_id", "objetivo", "evaluado_id"),
      CONSTRAINT "valoraciones_rol_check" CHECK ("evaluador_rol" IN ('egresado', 'asesor')),
      CONSTRAINT "valoraciones_objetivo_check" CHECK ("objetivo" IN ('empresa', 'asesor', 'egresado'))
    );
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "valoraciones_evaluado_idx" ON "valoraciones" ("objetivo", "evaluado_id");`);

  console.log("Tabla valoraciones lista.");
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
