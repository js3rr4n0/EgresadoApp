import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function run() {
  console.log("Adding 'eliminada' column to actividades and creating solicitudes_cambio_actividad table...");
  try {
    await db.execute(sql`
      ALTER TABLE "actividades" ADD COLUMN IF NOT EXISTS "eliminada" boolean NOT NULL DEFAULT false;
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "solicitudes_cambio_actividad" (
        "id" serial PRIMARY KEY NOT NULL,
        "propuesta_id" integer NOT NULL REFERENCES "propuestas"("id") ON DELETE CASCADE,
        "actividad_id" integer REFERENCES "actividades"("id") ON DELETE CASCADE,
        "tipo" varchar(20) NOT NULL,
        "periodo_destino" smallint,
        "semana_destino" smallint,
        "titulo_propuesto" text,
        "descripcion_propuesta" text,
        "justificacion" text NOT NULL,
        "estado" varchar(20) DEFAULT 'pendiente' NOT NULL,
        "respuesta_asesor" text,
        "revisado_por" integer REFERENCES "usuarios"("id"),
        "revisado_en" timestamp with time zone,
        "creada_en" timestamp with time zone DEFAULT now() NOT NULL,
        CONSTRAINT "tipo_cambio_actividad_check" CHECK ("tipo" IN ('agregar', 'modificar', 'eliminar', 'posponer')),
        CONSTRAINT "estado_cambio_actividad_check" CHECK ("estado" IN ('pendiente', 'aprobada', 'rechazada'))
      );
    `);

    console.log("Done successfully.");
  } catch (error) {
    console.log("Error:", error);
  }
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
