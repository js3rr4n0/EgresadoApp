import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function run() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "periodos" (
      "id" serial PRIMARY KEY NOT NULL,
      "nombre" varchar(50) NOT NULL,
      "inicio_recepcion" date NOT NULL,
      "fin_recepcion" date NOT NULL,
      "max_aprobacion_propuesta" date NOT NULL,
      "max_inicio_proceso" date NOT NULL,
      "max_primer_informe" date NOT NULL,
      "max_segundo_informe" date NOT NULL,
      "max_tercer_informe" date NOT NULL,
      "max_cuarto_informe" date NOT NULL,
      "visita_asesor_inicio" date NOT NULL,
      "visita_asesor_fin" date NOT NULL,
      "max_informe_final" date NOT NULL,
      "max_aprobacion_final" date NOT NULL,
      "activo" boolean DEFAULT true NOT NULL
    );
  `);
  
  await db.execute(sql`
    ALTER TABLE "propuestas" ADD CONSTRAINT "propuestas_periodo_id_periodos_id_fk" FOREIGN KEY ("periodo_id") REFERENCES "public"."periodos"("id") ON DELETE cascade ON UPDATE no action;
  `).catch(e => console.log("Constraint might exist already", e.message));

  console.log("Schema applied");
  process.exit(0);
}
run();
