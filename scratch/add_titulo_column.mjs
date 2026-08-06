import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

async function run() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL not found");
    process.exit(1);
  }
  const sql = neon(dbUrl);
  try {
    console.log("Adding column 'titulo' to 'actividades' table if not exists...");
    await sql`ALTER TABLE actividades ADD COLUMN IF NOT EXISTS titulo text;`;
    console.log("Column 'titulo' added successfully!");
  } catch (err) {
    console.error("Error executing SQL:", err);
  }
}

run();
