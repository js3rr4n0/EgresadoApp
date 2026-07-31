import "dotenv/config";
import { db } from "../src/lib/db";
import { usuarios } from "../src/lib/schema";
import { eq } from "drizzle-orm";

async function run() {
  const coords = await db.select().from(usuarios).where(eq(usuarios.rol, "coordinador"));
  console.log("Coordinadores encontrados:", coords.length);
  coords.forEach((c) => {
    console.log(`ID: ${c.id} | Nombre: ${c.nombreCompleto} | Correo: ${c.correo}`);
  });
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
