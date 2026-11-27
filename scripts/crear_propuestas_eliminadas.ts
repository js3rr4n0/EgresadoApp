// A5 (specs/REVISAR_PROPUESTA_ADMIN.md): registro de las propuestas que elimina el superadministrador (qué era, quiénes
// la redactaban, en qué estado estaba, la justificación, quién y cuándo). Sin referencia a «propuestas»: la propuesta ya
// no existe. Se puede ejecutar más de una vez.
// Uso: npx tsx --env-file=.env.local scripts/crear_propuestas_eliminadas.ts
import { sql } from "drizzle-orm";
import { db } from "../src/lib/db";
import { exigirBaseDesarrollo } from "./fichas/guardia";

async function run() {
  exigirBaseDesarrollo("crear_propuestas_eliminadas");
  await db.execute(
    sql.raw(`CREATE TABLE IF NOT EXISTS "propuestas_eliminadas" (
      "id" serial PRIMARY KEY,
      "propuesta_id" integer NOT NULL,
      "numero" integer NOT NULL,
      "titulo" text,
      "tipo" varchar(30) NOT NULL,
      "estado" varchar(30) NOT NULL,
      "integrantes" jsonb NOT NULL,
      "empresa" text,
      "justificacion" text NOT NULL,
      "eliminada_por" integer REFERENCES "usuarios"("id") ON DELETE SET NULL,
      "eliminada_en" timestamp with time zone NOT NULL DEFAULT now()
    )`),
  );
  console.log("Registro de propuestas eliminadas listo.");
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
