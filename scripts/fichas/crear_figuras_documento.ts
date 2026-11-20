// Informe final de investigación, entrega F2: crea la tabla figuras_documento (src/lib/schema.ts) para las imágenes con
// leyenda de los apartados académicos. Solo agrega una tabla nueva; no modifica ni borra nada existente. Se puede
// ejecutar más de una vez. Uso: npx tsx --env-file=.env.local scripts/fichas/crear_figuras_documento.ts
import { sql } from "drizzle-orm";
import { db } from "../../src/lib/db";
import { exigirBaseDesarrollo } from "./guardia";

async function run() {
  exigirBaseDesarrollo("crear_figuras_documento");

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "figuras_documento" (
      "id" serial PRIMARY KEY NOT NULL,
      "propuesta_id" integer NOT NULL REFERENCES "propuestas"("id") ON DELETE CASCADE,
      "url" text NOT NULL,
      "nombre" varchar(255),
      "subido_por" integer REFERENCES "usuarios"("id"),
      "subido_en" timestamp with time zone DEFAULT now() NOT NULL
    );
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "figuras_documento_propuesta" ON "figuras_documento" ("propuesta_id");`);

  console.log("Tabla figuras_documento lista.");
}

// Sin process.exit(0): en Windows, salir con conexiones abiertas puede abortar Node (UV_HANDLE_CLOSING).
run().catch((e) => {
  console.error("No se pudo crear la tabla:", e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
