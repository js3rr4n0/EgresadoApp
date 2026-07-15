import "dotenv/config";
import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function run() {
  try {
    await db.execute(sql`ALTER TABLE "sucursales" ADD COLUMN IF NOT EXISTS "descripcion" text;`);
    await db.execute(sql`ALTER TABLE "sucursales" ADD COLUMN IF NOT EXISTS "antecedentes" text;`);
    console.log("Columnas descripcion y antecedentes añadidas a sucursales");
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}

run();
