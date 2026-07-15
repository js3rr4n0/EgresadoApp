import "dotenv/config";
import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function run() {
  await db.execute(sql`ALTER TABLE "propuestas" ADD COLUMN IF NOT EXISTS "sucursal_id" integer;`);
  console.log("Columna agregada");
  process.exit(0);
}
run().catch(console.error);
