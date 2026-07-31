import "dotenv/config";
import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function run() {
  console.log("Ensuring titulo column exists in propuestas table...");
  
  // 1. Add column if it doesn't exist
  await db.execute(sql`
    ALTER TABLE propuestas ADD COLUMN IF NOT EXISTS titulo TEXT;
  `);

  // 2. Populate null/blank titles for existing proposals in DB
  await db.execute(sql`
    UPDATE propuestas
    SET titulo = 'Título de prueba - Propuesta #' || id
    WHERE titulo IS NULL OR TRIM(titulo) = '';
  `);

  console.log("✅ Column titulo added to propuestas and populated for existing proposals.");
  process.exit(0);
}

run().catch((err) => {
  console.error("Error updating propuestas table with titulo:", err);
  process.exit(1);
});
