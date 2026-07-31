import "dotenv/config";
import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function run() {
  console.log("Ensuring solicitudes_asesor table exists...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS solicitudes_asesor (
      id SERIAL PRIMARY KEY,
      propuesta_id INTEGER NOT NULL REFERENCES propuestas(id) ON DELETE CASCADE,
      asesor_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
      justificacion_rechazo TEXT,
      respondido_en TIMESTAMP WITH TIME ZONE,
      creada_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `);
  console.log("✅ Table solicitudes_asesor verified/created successfully.");
  process.exit(0);
}

run().catch((err) => {
  console.error("Error creating solicitudes_asesor table:", err);
  process.exit(1);
});
