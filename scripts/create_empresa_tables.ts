import "dotenv/config";
import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function run() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "historial_empresas" (
      "id" serial PRIMARY KEY NOT NULL,
      "empresa_id" integer NOT NULL,
      "admin_id" integer,
      "cambios" jsonb NOT NULL,
      "fecha" timestamp with time zone DEFAULT now()
    );
  `);
  
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "solicitudes_empresa" (
      "id" serial PRIMARY KEY NOT NULL,
      "propuesta_id" integer,
      "empresa_id" integer,
      "tipo" varchar(30) NOT NULL,
      "datos" jsonb NOT NULL,
      "estado" varchar(30) DEFAULT 'pendiente' NOT NULL,
      "creada_en" timestamp with time zone DEFAULT now()
    );
  `);

  console.log("Tablas creadas");
  process.exit(0);
}

run().catch(console.error);
