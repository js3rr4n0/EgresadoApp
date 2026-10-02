import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function run() {
  console.log("Aplicando ajustes de seguimiento de actividades...");
  try {
    // Conclusión técnica por actividad (máx. 200 palabras)
    await db.execute(sql`
      ALTER TABLE "registros_actividad" ADD COLUMN IF NOT EXISTS "conclusion_tecnica" text;
    `);

    // Nota de solicitud o aprobación del supervisor empresarial en las solicitudes de cambio
    await db.execute(sql`
      ALTER TABLE "solicitudes_cambio_actividad"
        ADD COLUMN IF NOT EXISTS "documento_supervisor_url" text,
        ADD COLUMN IF NOT EXISTS "documento_supervisor_nombre" varchar(255);
    `);

    // El código de actividad solo debe ser único entre actividades vigentes: al eliminar una actividad
    // las demás se renumeran y la eliminada conserva su código histórico.
    await db.execute(sql`
      ALTER TABLE "actividades" DROP CONSTRAINT IF EXISTS "actividades_codigo_unico";
    `);
    await db.execute(sql`
      DROP INDEX IF EXISTS "actividades_codigo_unico";
    `);
    await db.execute(sql`
      CREATE UNIQUE INDEX "actividades_codigo_unico"
        ON "actividades" ("propuesta_id", "periodo", "semana", "numero")
        WHERE "eliminada" = false;
    `);
    console.log("Done successfully.");
  } catch (error) {
    console.log("Error:", error);
  }
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
