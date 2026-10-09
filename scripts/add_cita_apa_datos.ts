import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function run() {
  console.log("Agregando los campos de la referencia APA 7 a los registros de actividad...");
  try {
    // Campos de la referencia (tipo de fuente, autores, año, título...). cita_apa conserva el texto ya formateado.
    await db.execute(sql`
      ALTER TABLE "registros_actividad" ADD COLUMN IF NOT EXISTS "cita_apa_datos" jsonb;
    `);
    console.log("Listo.");
  } catch (err) {
    console.error("Error al aplicar la migración:", err);
    process.exit(1);
  }
}

run();
