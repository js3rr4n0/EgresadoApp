import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function run() {
  console.log("Creating sucursales table...");
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "sucursales" (
        "id" serial PRIMARY KEY,
        "empresa_id" integer NOT NULL REFERENCES "empresas"("id") ON DELETE CASCADE,
        "nombre" varchar(255) NOT NULL,
        "direccion" text,
        "telefono" varchar(50),
        "mapa_url" text,
        "creada_en" timestamp with time zone DEFAULT now()
      );
    `);
    console.log("Table created successfully.");
  } catch (error) {
    console.log("Error creating table:", error);
  }
  console.log("Done.");
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
