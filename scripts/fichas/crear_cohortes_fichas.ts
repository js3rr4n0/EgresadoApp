// H1 (la "entrega 3"): crea la tabla fichas_versiones_cohortes (src/lib/schema.ts), que liga cada versión de ficha con
// las cohortes que la usan. Solo agrega una tabla nueva; no modifica ni borra nada existente. Se puede ejecutar más de
// una vez. Uso: npx tsx --env-file=.env.local scripts/fichas/crear_cohortes_fichas.ts
import { sql } from "drizzle-orm";
import { db } from "../../src/lib/db";
import { exigirBaseDesarrollo } from "./guardia";

async function run() {
  exigirBaseDesarrollo("crear_cohortes_fichas");

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "fichas_versiones_cohortes" (
      "id" serial PRIMARY KEY NOT NULL,
      "version_id" integer NOT NULL REFERENCES "fichas_versiones"("id") ON DELETE CASCADE,
      "periodo_id" integer NOT NULL REFERENCES "periodos"("id") ON DELETE CASCADE,
      "asignada_en" timestamp with time zone DEFAULT now() NOT NULL,
      CONSTRAINT "fichas_versiones_cohortes_unique" UNIQUE ("version_id", "periodo_id")
    );
  `);

  console.log("Tabla fichas_versiones_cohortes lista.");
}

// Sin process.exit(0): en Windows, salir con conexiones abiertas puede abortar Node (UV_HANDLE_CLOSING).
run().catch((e) => {
  console.error("No se pudo crear la tabla:", e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
