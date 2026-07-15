import "dotenv/config";
import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function run() {
  try {
    await db.execute(sql`ALTER TABLE "solicitudes_empresa" ADD COLUMN IF NOT EXISTS "creada_en" timestamp with time zone DEFAULT now();`);
    
    // We can try to alter the constraint, but it's easier to just drop it and recreate
    await db.execute(sql`ALTER TABLE "solicitudes_empresa" DROP CONSTRAINT IF EXISTS "tipo_solicitud_check";`);
    await db.execute(sql`ALTER TABLE "solicitudes_empresa" ADD CONSTRAINT "tipo_solicitud_check" CHECK (tipo IN ('nueva', 'actualizacion', 'modificacion'));`);
    
    console.log("Column and constraint updated successfully");
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}

run();
