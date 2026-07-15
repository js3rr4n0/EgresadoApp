import "dotenv/config";
import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function run() {
  try {
    // We deleted all pending requests, so any proposal that was waiting for approval is now stuck.
    // Let's reset them to 'redactando' and unlock them.
    await db.execute(sql`
      UPDATE "propuestas" 
      SET "estado" = 'redactando', "bloqueada" = false 
      WHERE "estado" IN ('pend_revision_datos', 'pend_empresa_nueva');
    `);
    
    console.log("Propuestas desbloqueadas con exito");
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}

run();
