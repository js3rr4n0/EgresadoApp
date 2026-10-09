import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function run() {
  console.log("Agregando los elementos del informe final (agradecimientos y carta de finalización)...");
  await db.execute(sql`ALTER TABLE informes_mensuales ADD COLUMN IF NOT EXISTS agradecimientos text`);
  await db.execute(sql`ALTER TABLE informes_mensuales ADD COLUMN IF NOT EXISTS carta_finalizacion jsonb`);
  await db.execute(sql`ALTER TABLE informes_mensuales ADD COLUMN IF NOT EXISTS carta_finalizacion_verificada_en timestamptz`);
  await db.execute(
    sql`ALTER TABLE informes_mensuales ADD COLUMN IF NOT EXISTS carta_finalizacion_verificada_por integer REFERENCES usuarios(id)`
  );
  console.log("Listo.");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
