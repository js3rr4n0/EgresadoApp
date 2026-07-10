import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function run() {
  console.log("Deleting all proposals...");
  try {
    await db.execute(sql`DELETE FROM "propuestas";`);
    console.log("Proposals deleted successfully.");
  } catch (error) {
    console.log("Error deleting proposals:", error);
  }
  console.log("Done.");
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
