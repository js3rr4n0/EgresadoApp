import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function run() {
  console.log("Adding 'reubicar' change type and swap column to solicitudes_cambio_actividad...");
  try {
    await db.execute(sql`
      ALTER TABLE "solicitudes_cambio_actividad"
        ADD COLUMN IF NOT EXISTS "actividad_intercambio_id" integer REFERENCES "actividades"("id") ON DELETE SET NULL;
    `);
    await db.execute(sql`
      ALTER TABLE "solicitudes_cambio_actividad" DROP CONSTRAINT IF EXISTS "tipo_cambio_actividad_check";
    `);
    await db.execute(sql`
      ALTER TABLE "solicitudes_cambio_actividad"
        ADD CONSTRAINT "tipo_cambio_actividad_check"
        CHECK ("tipo" IN ('agregar', 'modificar', 'eliminar', 'posponer', 'reubicar'));
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
