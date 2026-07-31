import "dotenv/config";
import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Updating estado_propuesta_check constraint...");
  try {
    await db.execute(sql`
      ALTER TABLE propuestas 
      DROP CONSTRAINT IF EXISTS estado_propuesta_check;
    `);

    await db.execute(sql`
      ALTER TABLE propuestas 
      ADD CONSTRAINT estado_propuesta_check 
      CHECK (estado IN ('redactando', 'pend_empresa_nueva', 'pend_revision_datos', 'empresa_aprobada', 'empresa_rechazada', 'datos_aprobados', 'datos_rechazados', 'enviada', 'coordinador_asignado', 'aprobada', 'rechazada', 'anulada'));
    `);

    console.log("Constraint updated successfully!");
  } catch (err) {
    console.error("Error updating constraint:", err);
  }
  process.exit(0);
}

main();
