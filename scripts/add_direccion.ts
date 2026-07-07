import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function run() {
  await db.execute(sql`ALTER TABLE "empresas" ADD COLUMN IF NOT EXISTS "direccion" text;`);
  console.log("Column added.");
  process.exit(0);
}
run();
