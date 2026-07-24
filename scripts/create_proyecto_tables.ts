import "dotenv/config";
import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Creating proyecto tables...");

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "integrantes_proyecto" (
      "id" serial PRIMARY KEY NOT NULL,
      "propuesta_id" integer NOT NULL REFERENCES "propuestas"("id") ON DELETE CASCADE,
      "egresado_id" integer NOT NULL REFERENCES "usuarios"("id") ON DELETE CASCADE,
      "invitado_por_id" integer NOT NULL REFERENCES "usuarios"("id") ON DELETE CASCADE,
      "estado" varchar(20) DEFAULT 'pendiente' NOT NULL,
      "creado_en" timestamp with time zone DEFAULT now() NOT NULL,
      CONSTRAINT "unique_propuesta_egresado_integrante" UNIQUE("propuesta_id", "egresado_id")
    );
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "detalles_proyecto" (
      "id" serial PRIMARY KEY NOT NULL,
      "propuesta_id" integer NOT NULL UNIQUE REFERENCES "propuestas"("id") ON DELETE CASCADE,
      "actor_patrocinador" text,
      "actor_beneficiario" text,
      "actor_ejecutor" text,
      "actor_financista" text,
      "descripcion_problema" text,
      "justificacion" text,
      "alcance" text,
      "objetivo_general" text,
      "objetivos_especificos" jsonb
    );
  `);

  console.log("Proyecto tables created successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Error creating tables:", err);
  process.exit(1);
});
