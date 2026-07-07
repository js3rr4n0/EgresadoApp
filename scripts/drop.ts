import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function run() {
  await db.execute(sql`DROP TABLE periodos CASCADE`);
  console.log("Periodos dropped");
  process.exit(0);
}
run();
