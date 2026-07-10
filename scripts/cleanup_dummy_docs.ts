import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function run() {
  console.log("Deleting local upload docs...");
  try {
    await db.execute(sql`DELETE FROM "documentos_egresado" WHERE "archivo_url" LIKE '/uploads%';`);
    console.log("Local docs deleted successfully.");
  } catch (error) {
    console.log("Error deleting local docs:", error);
  }
  console.log("Done.");
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
