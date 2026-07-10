import { db } from "../src/lib/db";
import { propuestas } from "../src/lib/schema";

async function run() {
  console.log("Deleting all proposals...");
  try {
    await db.delete(propuestas);
    console.log("Proposals deleted successfully.");
    // wait a moment for neon serverless driver
    await new Promise(resolve => setTimeout(resolve, 1000));
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
