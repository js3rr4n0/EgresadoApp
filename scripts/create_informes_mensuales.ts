import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function run() {
  console.log("Creating informes_mensuales tables...");
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "informes_mensuales" (
        "id" serial PRIMARY KEY NOT NULL,
        "propuesta_id" integer NOT NULL REFERENCES "propuestas"("id") ON DELETE CASCADE,
        "numero" smallint NOT NULL,
        "periodo_desde" date,
        "periodo_hasta" date,
        "fecha_presentacion" date,
        "estado" varchar(20) DEFAULT 'redactando' NOT NULL,
        "fecha_limite" date NOT NULL,
        "enviado_en" timestamp with time zone,
        "cumplimiento" varchar(20),
        "desviacion_dias" integer,
        "comentario_asesor" text,
        "revisado_por" integer REFERENCES "usuarios"("id"),
        "revisado_en" timestamp with time zone,
        "creado_en" timestamp with time zone DEFAULT now() NOT NULL,
        "actualizado_en" timestamp with time zone DEFAULT now(),
        CONSTRAINT "informes_mensuales_unique" UNIQUE("propuesta_id","numero"),
        CONSTRAINT "numero_informe_mensual_check" CHECK ("numero" BETWEEN 1 AND 4),
        CONSTRAINT "estado_informe_mensual_check" CHECK ("estado" IN ('redactando', 'enviado', 'observado', 'aprobado'))
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "bitacoras_semanales" (
        "id" serial PRIMARY KEY NOT NULL,
        "informe_id" integer NOT NULL REFERENCES "informes_mensuales"("id") ON DELETE CASCADE,
        "semana" smallint NOT NULL,
        "descripcion" text,
        "actualizado_en" timestamp with time zone DEFAULT now(),
        CONSTRAINT "bitacoras_semanales_unique" UNIQUE("informe_id","semana")
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "evidencias_informe_mensual" (
        "id" serial PRIMARY KEY NOT NULL,
        "informe_id" integer NOT NULL REFERENCES "informes_mensuales"("id") ON DELETE CASCADE,
        "semana" smallint NOT NULL,
        "nombre_archivo" varchar(255),
        "archivo_url" text NOT NULL,
        "leyenda" varchar(255),
        "subido_en" timestamp with time zone DEFAULT now() NOT NULL
      );
    `);

    console.log("Tables created successfully.");
  } catch (error) {
    console.log("Error creating tables:", error);
  }
  console.log("Done.");
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
