// D5 (specs/COORDINADOR_ASIGNACION.md): cupo máximo de procesos de cada asesor en la configuración de la cohorte.
// Sin fila, el cupo es el de por defecto (5). Se puede ejecutar más de una vez.
// Uso: npx tsx --env-file=.env.local scripts/crear_cupos_asesor.ts
import { sql } from "drizzle-orm";
import { db } from "../src/lib/db";
import { exigirBaseDesarrollo } from "./fichas/guardia";

async function run() {
  exigirBaseDesarrollo("crear_cupos_asesor");
  await db.execute(
    sql.raw(`CREATE TABLE IF NOT EXISTS "cohorte_cupos_asesor" (
      "periodo_id" integer NOT NULL REFERENCES "periodos"("id") ON DELETE CASCADE,
      "facultad_id" integer NOT NULL REFERENCES "facultades"("id") ON DELETE CASCADE,
      "usuario_id" integer NOT NULL REFERENCES "usuarios"("id") ON DELETE CASCADE,
      "cupo" integer NOT NULL CHECK ("cupo" BETWEEN 1 AND 50),
      PRIMARY KEY ("periodo_id", "facultad_id", "usuario_id")
    )`),
  );
  console.log("Tabla de cupos de asesores lista.");
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
