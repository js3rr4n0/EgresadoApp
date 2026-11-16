// Notas del 13-nov-2026: productos por objetivo específico. Una entrega por propuesta y objetivo (con la conclusión
// del objetivo) y sus archivos, cada uno ligado a un producto prometido en el plan. Solo agrega; se puede ejecutar
// más de una vez.
// Uso: npx tsx --env-file=.env.local scripts/fichas/crear_entregas_objetivo.ts
import { sql } from "drizzle-orm";
import { db } from "../../src/lib/db";
import { exigirBaseDesarrollo } from "./guardia";

async function run() {
  exigirBaseDesarrollo("crear_entregas_objetivo");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "entregas_objetivo" (
      "id" serial PRIMARY KEY,
      "propuesta_id" integer NOT NULL REFERENCES "propuestas"("id") ON DELETE CASCADE,
      "nodo_id" varchar(64) NOT NULL,
      "egresado_id" integer NOT NULL REFERENCES "usuarios"("id"),
      "conclusion" text,
      "estado" varchar(20) NOT NULL DEFAULT 'borrador',
      "periodo" smallint,
      "comentario_asesor" text,
      "enviado_en" timestamp with time zone,
      "revisado_por" integer REFERENCES "usuarios"("id"),
      "revisado_en" timestamp with time zone,
      "actualizado_en" timestamp with time zone NOT NULL DEFAULT now(),
      CONSTRAINT "entregas_objetivo_unique" UNIQUE ("propuesta_id", "nodo_id"),
      CONSTRAINT "entregas_objetivo_estado_check" CHECK ("estado" IN ('borrador', 'enviado', 'observado', 'aprobado'))
    );
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "productos_objetivo" (
      "id" serial PRIMARY KEY,
      "entrega_id" integer NOT NULL REFERENCES "entregas_objetivo"("id") ON DELETE CASCADE,
      "producto" smallint NOT NULL,
      "tipo" varchar(10) NOT NULL,
      "url" text NOT NULL,
      "nombre" varchar(255),
      "leyenda" varchar(255) NOT NULL,
      "origen" varchar(10),
      "fuente" jsonb,
      "creado_en" timestamp with time zone NOT NULL DEFAULT now(),
      CONSTRAINT "productos_objetivo_tipo_check" CHECK ("tipo" IN ('imagen', 'documento', 'enlace'))
    );
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "productos_objetivo_entrega_idx" ON "productos_objetivo" ("entrega_id")`);
  // Bitácora (notas del 13-nov-2026): cambio o acontecimiento opcional en cada actividad y en cada objetivo.
  for (const tabla of ["registros_plan", "entregas_objetivo"]) {
    await db.execute(sql.raw(`ALTER TABLE "${tabla}" ADD COLUMN IF NOT EXISTS "modificacion_tipo" varchar(20)`));
    await db.execute(sql.raw(`ALTER TABLE "${tabla}" ADD COLUMN IF NOT EXISTS "modificacion" text`));
  }
  console.log("Tablas entregas_objetivo y productos_objetivo listas (con la bitácora).");
}

run()
  .then(() => { process.exitCode = 0; })
  .catch((e) => { console.error(e); process.exitCode = 1; });
