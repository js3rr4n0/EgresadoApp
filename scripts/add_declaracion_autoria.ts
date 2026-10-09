import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function run() {
  console.log("Agregando la declaración de autoría de las actividades...");
  try {
    // Fecha en que el egresado declaró, al enviar la semana, que el contenido es de su autoría
    await db.execute(sql`
      ALTER TABLE "registros_actividad" ADD COLUMN IF NOT EXISTS "declaracion_autoria_en" timestamp with time zone;
    `);
    console.log("Listo.");
  } catch (err) {
    console.error("Error al aplicar la migración:", err);
    process.exit(1);
  }
}

run();
