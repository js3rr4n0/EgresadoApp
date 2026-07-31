import "dotenv/config";
import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function run() {
  console.log("Updating database schema for Coordinador role...");

  // 1. Update rol_check constraint on usuarios table
  try {
    await db.execute(sql`ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS rol_check`);
    await db.execute(sql`ALTER TABLE usuarios ADD CONSTRAINT rol_check CHECK (rol IN ('admin', 'decanato', 'coordinador', 'asesor', 'egresado'))`);
    console.log("✅ usuarios rol_check updated.");
  } catch (e: any) {
    console.log("Notice on usuarios constraint:", e.message);
  }

  // 2. Add columns to propuestas table
  try {
    await db.execute(sql`ALTER TABLE propuestas ADD COLUMN IF NOT EXISTS coordinador_id INTEGER REFERENCES usuarios(id)`);
    await db.execute(sql`ALTER TABLE propuestas ADD COLUMN IF NOT EXISTS fecha_aprobacion TIMESTAMP WITH TIME ZONE`);
    console.log("✅ propuestas columns (coordinador_id, fecha_aprobacion) checked.");
  } catch (e: any) {
    console.log("Notice on propuestas columns:", e.message);
  }

  // 3. Update propuestas check constraints
  try {
    await db.execute(sql`ALTER TABLE propuestas DROP CONSTRAINT IF EXISTS tipo_propuesta_check`);
    await db.execute(sql`ALTER TABLE propuestas ADD CONSTRAINT tipo_propuesta_check CHECK (tipo IN ('pasantia', 'proyecto', 'investigacion'))`);
    await db.execute(sql`ALTER TABLE propuestas DROP CONSTRAINT IF EXISTS estado_propuesta_check`);
    await db.execute(sql`ALTER TABLE propuestas ADD CONSTRAINT estado_propuesta_check CHECK (estado IN ('redactando', 'pend_empresa_nueva', 'pend_revision_datos', 'empresa_aprobada', 'empresa_rechazada', 'datos_aprobados', 'datos_rechazados', 'enviada', 'aprobada', 'rechazada', 'anulada'))`);
    console.log("✅ propuestas check constraints updated.");
  } catch (e: any) {
    console.log("Notice on propuestas constraints:", e.message);
  }

  // 4. Add coordinador_id to solicitudes_asesor
  try {
    await db.execute(sql`ALTER TABLE solicitudes_asesor ADD COLUMN IF NOT EXISTS coordinador_id INTEGER REFERENCES usuarios(id)`);
    console.log("✅ solicitudes_asesor coordinador_id column checked.");
  } catch (e: any) {
    console.log("Notice on solicitudes_asesor column:", e.message);
  }

  // 5. Create solicitudes_baja table
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS solicitudes_baja (
        id SERIAL PRIMARY KEY,
        propuesta_id INTEGER NOT NULL REFERENCES propuestas(id) ON DELETE CASCADE,
        asesor_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        coordinador_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        motivo TEXT NOT NULL,
        estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
        respuesta_coordinador TEXT,
        creada_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        respondido_en TIMESTAMP WITH TIME ZONE,
        CONSTRAINT estado_solicitud_baja_check CHECK (estado IN ('pendiente', 'aprobada', 'rechazada'))
      )
    `);
    console.log("✅ solicitudes_baja table created/checked.");
  } catch (e: any) {
    console.log("Notice on solicitudes_baja table:", e.message);
  }

  console.log("🎉 Coordinador schema migration finished successfully!");
  process.exit(0);
}

run().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
