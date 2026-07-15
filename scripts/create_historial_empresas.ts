import "dotenv/config";
import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function run() {
  try {
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
      ALTER TABLE "historial_empresas" ADD CONSTRAINT "historial_empresas_empresa_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE cascade ON UPDATE no action;
    `).catch(e => console.log(e.message));

    await db.execute(sql`
      ALTER TABLE "historial_empresas" ADD CONSTRAINT "historial_empresas_admin_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;
    `).catch(e => console.log(e.message));

    console.log("Tabla historial_empresas creada");
  } catch(e) {
    console.error(e);
  }
  process.exit(0);
}
run();
