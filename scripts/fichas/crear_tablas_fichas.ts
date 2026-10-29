// Entrega 1 del módulo de fichas: crea las tablas fichas y fichas_versiones (src/lib/schema.ts).
// Solo agrega tablas nuevas; no modifica ni borra nada existente. Se puede ejecutar más de una vez.
// Uso: npx tsx --env-file=.env.local scripts/fichas/crear_tablas_fichas.ts
import { sql } from "drizzle-orm";
import { db } from "../../src/lib/db";
import { exigirBaseDesarrollo } from "./guardia";

async function run() {
  exigirBaseDesarrollo("crear_tablas_fichas");

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "fichas" (
      "id" serial PRIMARY KEY NOT NULL,
      "nombre" varchar(150) NOT NULL,
      "modalidad" varchar(20) NOT NULL,
      "facultad_id" integer REFERENCES "facultades"("id"),
      "carrera_id" integer REFERENCES "carreras"("id"),
      "es_base" boolean DEFAULT false NOT NULL,
      "creada_por" integer REFERENCES "usuarios"("id"),
      "creada_en" timestamp with time zone DEFAULT now() NOT NULL,
      "actualizada_en" timestamp with time zone DEFAULT now() NOT NULL,
      CONSTRAINT "fichas_modalidad_check" CHECK ("modalidad" IN ('pasantia', 'proyecto', 'investigacion'))
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "fichas_versiones" (
      "id" serial PRIMARY KEY NOT NULL,
      "ficha_id" integer NOT NULL REFERENCES "fichas"("id") ON DELETE CASCADE,
      "numero" smallint NOT NULL,
      "estado" varchar(20) DEFAULT 'borrador' NOT NULL,
      "definicion" jsonb NOT NULL,
      "basada_en_id" integer,
      "notas" text,
      "creada_por" integer REFERENCES "usuarios"("id"),
      "creada_en" timestamp with time zone DEFAULT now() NOT NULL,
      "actualizada_en" timestamp with time zone DEFAULT now() NOT NULL,
      "habilitada_en" timestamp with time zone,
      "retirada_en" timestamp with time zone,
      CONSTRAINT "fichas_versiones_numero_unique" UNIQUE ("ficha_id", "numero"),
      CONSTRAINT "fichas_versiones_estado_check" CHECK ("estado" IN ('borrador', 'habilitada', 'retirada'))
    );
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "fichas_versiones_un_borrador"
      ON "fichas_versiones" ("ficha_id") WHERE "estado" = 'borrador';
  `);

  console.log("Tablas fichas y fichas_versiones listas.");
}

// Sin process.exit(0): en Windows, salir con conexiones abiertas puede abortar Node (UV_HANDLE_CLOSING).
run().catch((e) => {
  console.error("No se pudieron crear las tablas:", e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
