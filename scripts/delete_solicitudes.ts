import "dotenv/config";
import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function run() {
  try {
    // Delete the stuck request for Almacenes Siman (or all pending if we don't know the ID)
    // The user just created one with huge lorem ipsum. Let's delete all pending ones.
    await db.execute(sql`DELETE FROM "solicitudes_empresa" WHERE "estado" = 'pendiente';`);
    console.log("Solicitudes eliminadas con exito");
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}

run();
