import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function run() {
  console.log("Adding cierre-de-periodo columns to informes_mensuales...");
  try {
    await db.execute(sql`
      ALTER TABLE "informes_mensuales"
        ADD COLUMN IF NOT EXISTS "alerta_cierre_enviada" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "cerrado" boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "cerrado_en" timestamp with time zone;
    `);
    console.log("Done successfully.");
  } catch (error) {
    console.log("Error:", error);
  }
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
