// Catálogo editable, entrega C1: crea la tabla elementos_catalogo (src/lib/schema.ts) para los elementos propios.
// Solo agrega una tabla nueva; no modifica ni borra nada existente. Se puede ejecutar más de una vez.
// Uso: npx tsx --env-file=.env.local scripts/fichas/crear_elementos_catalogo.ts
import { sql } from "drizzle-orm";
import { db } from "../../src/lib/db";
import { exigirBaseDesarrollo } from "./guardia";

async function run() {
  exigirBaseDesarrollo("crear_elementos_catalogo");

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "elementos_catalogo" (
      "id" serial PRIMARY KEY NOT NULL,
      "nombre" varchar(150) NOT NULL,
      "estado" varchar(20) DEFAULT 'borrador' NOT NULL,
      "definicion" jsonb NOT NULL,
      "creado_por" integer REFERENCES "usuarios"("id"),
      "creado_en" timestamp with time zone DEFAULT now() NOT NULL,
      "actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
      "publicado_en" timestamp with time zone,
      CONSTRAINT "elementos_catalogo_estado_check" CHECK ("estado" IN ('borrador', 'publicado'))
    );
  `);

  console.log("Tabla elementos_catalogo lista.");
}

// Sin process.exit(0): en Windows, salir con conexiones abiertas puede abortar Node (UV_HANDLE_CLOSING).
run().catch((e) => {
  console.error("No se pudo crear la tabla:", e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
