import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function run() {
  console.log("Creating organigramas_empresa table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "organigramas_empresa" (
      "id" serial PRIMARY KEY,
      "empresa_id" integer NOT NULL,
      "url" text NOT NULL,
      "subido_en" timestamp with time zone DEFAULT now()
    );
  `);

  console.log("Adding foreign key constraint...");
  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'organigramas_empresa_empresa_id_empresas_id_fk'
      ) THEN
        ALTER TABLE "organigramas_empresa" 
          ADD CONSTRAINT "organigramas_empresa_empresa_id_empresas_id_fk" 
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
