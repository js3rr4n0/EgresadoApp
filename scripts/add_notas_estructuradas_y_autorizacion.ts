import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function run() {
  console.log("Agregando las respuestas de las notas semanales y la autorización de la visita virtual...");
  try {
    // Las notas semanales del asesor siguen las mismas preguntas de los comentarios mensuales
    await db.execute(sql`
      ALTER TABLE "notas_seguimiento_asesor" ADD COLUMN IF NOT EXISTS "respuestas" jsonb;
    `);
    // Correo de autorización del decanato cuando la visita es virtual
    await db.execute(sql`
      ALTER TABLE "informes_visita" ADD COLUMN IF NOT EXISTS "autorizacion" jsonb;
    `);
    console.log("Listo.");
  } catch (err) {
    console.error("Error al aplicar la migración:", err);
    process.exit(1);
  }
}

run();
