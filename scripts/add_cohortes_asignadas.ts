import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function run() {
  console.log("Adding cohortes_asignadas column to usuarios table...");
  try {
    await db.execute(sql`
      ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "cohortes_asignadas" jsonb;
    `);
    console.log("Column added successfully.");
  } catch (error) {
    console.log("Column might already exist or error:", error);
  }
  console.log("Done.");
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
