import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function run() {
  try {
    const res = await db.execute(sql`SELECT COUNT(*) FROM "propuestas";`);
    console.log("Proposals count:", res.rows[0]);
  } catch (error) {
    console.log("Error:", error);
  }
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
