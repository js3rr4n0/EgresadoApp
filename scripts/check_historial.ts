import "dotenv/config";
import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function run() {
  try {
    const res = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'historial_empresas';
    `);
    console.log(res.rows);
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}
run();
