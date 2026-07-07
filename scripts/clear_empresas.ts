import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function run() {
  await db.execute(sql`DELETE FROM empresas`); // Cascades to supervisores
  console.log("All empresas and supervisores deleted.");
  process.exit(0);
}
run();
