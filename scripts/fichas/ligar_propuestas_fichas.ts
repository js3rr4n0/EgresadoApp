// Entrega P2: liga cada propuesta a la versión de ficha con la que se redacta, y guarda las respuestas de los
// espacios que no existían en la fase 1 (por ejemplo, un bloque de texto "Antecedentes").
//   - propuestas.ficha_version_id: null en las propuestas anteriores (siguen con el flujo de la fase 1).
//   - respuestas_espacios: una fila por propuesta y espacio (espacio_id es el id estable del espacio en la ficha).
// Solo agrega; se puede ejecutar más de una vez.
// Uso: npx tsx --env-file=.env.local scripts/fichas/ligar_propuestas_fichas.ts
import { sql } from "drizzle-orm";
import { db } from "../../src/lib/db";
import { exigirBaseDesarrollo } from "./guardia";

async function run() {
  exigirBaseDesarrollo("ligar_propuestas_fichas");

  await db.execute(sql`ALTER TABLE "propuestas" ADD COLUMN IF NOT EXISTS "ficha_version_id" integer;`);
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'propuestas_ficha_version_id_fk') THEN
        ALTER TABLE "propuestas" ADD CONSTRAINT "propuestas_ficha_version_id_fk"
          FOREIGN KEY ("ficha_version_id") REFERENCES "fichas_versiones"("id");
      END IF;
    END $$;
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "respuestas_espacios" (
      "id" serial PRIMARY KEY,
      "propuesta_id" integer NOT NULL REFERENCES "propuestas"("id") ON DELETE CASCADE,
      "espacio_id" varchar(80) NOT NULL,
      "contenido" text,
      "actualizado_por" integer REFERENCES "usuarios"("id"),
      "actualizado_en" timestamp with time zone NOT NULL DEFAULT now(),
      CONSTRAINT "respuestas_espacios_unique" UNIQUE ("propuesta_id", "espacio_id")
    );
  `);

  const [{ n }] = (await db.execute(sql`SELECT count(*)::int AS n FROM propuestas WHERE ficha_version_id IS NOT NULL`)).rows as { n: number }[];
  console.log(`Listo. Propuestas ligadas a una ficha: ${n}.`);
}

run()
  .then(() => { process.exitCode = 0; })
  .catch((e) => { console.error(e); process.exitCode = 1; });
