import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function run() {
  console.log("Creating registros_actividad table...");
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "registros_actividad" (
        "id" serial PRIMARY KEY NOT NULL,
        "actividad_id" integer NOT NULL UNIQUE REFERENCES "actividades"("id") ON DELETE CASCADE,
        "estado" varchar(20) DEFAULT 'pendiente' NOT NULL,
        "fecha" date,
        "descriptor" text,
        "marco_teorico" text,
        "cita_apa" text,
        "imagen_url" text,
        "leyenda_imagen" varchar(255),
        "numero_imagen" integer,
        "comentario_asesor" text,
        "enviado_en" timestamp with time zone,
        "revisado_por" integer REFERENCES "usuarios"("id"),
        "revisado_en" timestamp with time zone,
        "creado_en" timestamp with time zone DEFAULT now() NOT NULL,
        "actualizado_en" timestamp with time zone DEFAULT now(),
        CONSTRAINT "estado_registro_actividad_check" CHECK ("estado" IN ('pendiente', 'guardado', 'enviado', 'observado', 'aprobado'))
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
