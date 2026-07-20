import { db } from "../src/lib/db";
import { sucursales } from "../src/lib/schema";
import { eq } from "drizzle-orm";

async function main() {
  const sucs = await db.select().from(sucursales).where(eq(sucursales.empresaId, 4));
  console.log("Sucursales:", sucs);
  process.exit(0);
}

main();
