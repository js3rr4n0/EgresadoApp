// Entrega P4: registros de la ejecución del proyecto. Cada integrante registra, por período, las actividades de su
// plan individual: avance (%), acciones realizadas, resultado y, si hace falta, marco teórico. El asesor revisa.
// Una fila por propuesta, actividad del plan (nodo_id estable de planes_trabajo.arbol) y período.
// Solo agrega; se puede ejecutar más de una vez.
// Uso: npx tsx --env-file=.env.local scripts/fichas/crear_registros_plan.ts
import { sql } from "drizzle-orm";
import { db } from "../../src/lib/db";
import { exigirBaseDesarrollo } from "./guardia";

async function run() {
  exigirBaseDesarrollo("crear_registros_plan");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "registros_plan" (
      "id" serial PRIMARY KEY,
      "propuesta_id" integer NOT NULL REFERENCES "propuestas"("id") ON DELETE CASCADE,
      "nodo_id" varchar(64) NOT NULL,
      "periodo" smallint NOT NULL,
      "egresado_id" integer NOT NULL REFERENCES "usuarios"("id"),
      "avance" smallint,
      "acciones" text,
      "resultado" text,
      "marco_teorico" text,
      "estado" varchar(20) NOT NULL DEFAULT 'borrador',
      "comentario_asesor" text,
      "enviado_en" timestamp with time zone,
      "revisado_por" integer REFERENCES "usuarios"("id"),
      "revisado_en" timestamp with time zone,
      "actualizado_en" timestamp with time zone NOT NULL DEFAULT now(),
      CONSTRAINT "registros_plan_unique" UNIQUE ("propuesta_id", "nodo_id", "periodo"),
      CONSTRAINT "registros_plan_estado_check" CHECK ("estado" IN ('borrador', 'enviado', 'observado', 'aprobado')),
      CONSTRAINT "registros_plan_avance_check" CHECK ("avance" IS NULL OR "avance" BETWEEN 0 AND 100)
    );
  `);
  console.log("Tabla registros_plan lista.");
}

run()
  .then(() => { process.exitCode = 0; })
  .catch((e) => { console.error(e); process.exitCode = 1; });
