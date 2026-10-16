import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function run() {
  console.log("Agregando la introducción del informe final...");
  await db.execute(sql`ALTER TABLE informes_mensuales ADD COLUMN IF NOT EXISTS introduccion jsonb`);
  console.log("Listo.");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
