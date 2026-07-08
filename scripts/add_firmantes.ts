import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function run() {
  console.log("Creating firmantes table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "firmantes" (
      "id" serial PRIMARY KEY,
      "empresa_id" integer NOT NULL,
      "titulo" varchar(50),
      "nombres" varchar(255) NOT NULL,
      "apellidos" varchar(255) NOT NULL,
      "cargo" varchar(255),
      "telefono" varchar(50),
      "correo" varchar(255),
      "firma_url" text,
      "actualizado_en" timestamp with time zone DEFAULT now()
    );
  `);

  console.log("Adding foreign key constraint...");
  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'firmantes_empresa_id_empresas_id_fk'
      ) THEN
        ALTER TABLE "firmantes" 
          ADD CONSTRAINT "firmantes_empresa_id_empresas_id_fk" 
          FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE cascade;
      END IF;
    END
    $$;
  `);

  console.log("Done.");
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
