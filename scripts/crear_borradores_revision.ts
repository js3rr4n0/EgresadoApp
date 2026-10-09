import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function run() {
  console.log("Creando el borrador de revisión del asesor y la versión revisada de las actividades...");
  try {
    // Contenido de la actividad al momento de la última revisión: permite resaltar los cambios cuando se reenvía
    await db.execute(sql`
      ALTER TABLE "registros_actividad" ADD COLUMN IF NOT EXISTS "version_revisada" jsonb;
    `);

    // Comentarios de la revisión semanal aún no registrados (el egresado no los ve)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "borradores_revision" (
        "id" serial PRIMARY KEY,
        "propuesta_id" integer NOT NULL REFERENCES "propuestas"("id") ON DELETE CASCADE,
        "periodo" smallint NOT NULL,
        "semana" smallint NOT NULL,
        "asesor_id" integer NOT NULL REFERENCES "usuarios"("id"),
        "datos" jsonb NOT NULL,
        "actualizado_en" timestamp with time zone NOT NULL DEFAULT now()
      );
    `);
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS "borradores_revision_semana_unica"
        ON "borradores_revision" ("propuesta_id", "periodo", "semana");
    `);
    console.log("Listo.");
  } catch (err) {
    console.error("Error al aplicar la migración:", err);
    process.exit(1);
  }
}

run();
