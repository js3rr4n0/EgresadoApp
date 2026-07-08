import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function run() {
  console.log("Adding sucursal_id to supervisores and firmantes...");
  try {
    await db.execute(sql`ALTER TABLE "supervisores" ADD COLUMN IF NOT EXISTS "sucursal_id" integer;`);
    await db.execute(sql`ALTER TABLE "firmantes" ADD COLUMN IF NOT EXISTS "sucursal_id" integer;`);
    console.log("Columns added successfully.");
  } catch (error) {
    console.log("Error adding columns:", error);
  }
  console.log("Done.");
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
