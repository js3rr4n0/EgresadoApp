import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function run() {
  console.log("Creando las imágenes adicionales de las actividades y el origen de la imagen principal...");
  try {
    // Origen ('propia' | 'externa') y fuente de la imagen de soporte principal
    await db.execute(sql`
      ALTER TABLE "registros_actividad"
        ADD COLUMN IF NOT EXISTS "imagen_origen" varchar(10),
        ADD COLUMN IF NOT EXISTS "imagen_fuente" jsonb;
    `);

    // Imágenes de soporte adicionales (cuentan para el límite semanal) y anexos para el informe final
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "imagenes_actividad" (
        "id" serial PRIMARY KEY,
        "registro_id" integer NOT NULL REFERENCES "registros_actividad"("id") ON DELETE CASCADE,
        "tipo" varchar(10) NOT NULL,
        "url" text NOT NULL,
        "leyenda" varchar(255) NOT NULL,
        "origen" varchar(10) NOT NULL,
        "fuente" jsonb,
        "creado_en" timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "tipo_imagen_actividad_check" CHECK ("tipo" IN ('soporte', 'anexo')),
        CONSTRAINT "origen_imagen_actividad_check" CHECK ("origen" IN ('propia', 'externa'))
      );
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "imagenes_actividad_registro_idx" ON "imagenes_actividad" ("registro_id");
    `);
    console.log("Listo.");
  } catch (err) {
    console.error("Error al aplicar la migración:", err);
    process.exit(1);
  }
}

run();
