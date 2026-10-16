import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function run() {
  console.log("Agregando el glosario de términos del informe final...");
  await db.execute(sql`ALTER TABLE informes_mensuales ADD COLUMN IF NOT EXISTS glosario jsonb`);
  console.log("Listo.");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
