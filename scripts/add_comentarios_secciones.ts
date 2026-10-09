import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function run() {
  console.log("Agregando los comentarios del asesor por apartado a los registros de actividad...");
  try {
    // Comentarios por apartado (marco teórico, descripción, imágenes, conclusión y general) de la revisión semanal
    await db.execute(sql`
      ALTER TABLE "registros_actividad" ADD COLUMN IF NOT EXISTS "comentarios_secciones" jsonb;
    `);
    console.log("Listo.");
  } catch (err) {
    console.error("Error al aplicar la migración:", err);
    process.exit(1);
  }
}

run();
