// Entrega P5: informes del período del proyecto. Una fila por propuesta, período y autor:
// egresado_id = integrante (informe individual) o NULL (informe general del equipo, que envía el líder).
// El contenido se arma con el plan y los registros (src/lib/fichas/informePeriodo.ts); aquí se guarda el estado.
// Solo agrega; se puede ejecutar más de una vez.
// Uso: npx tsx --env-file=.env.local scripts/fichas/crear_informes_plan.ts
import { sql } from "drizzle-orm";
import { db } from "../../src/lib/db";
import { exigirBaseDesarrollo } from "./guardia";

async function run() {
  exigirBaseDesarrollo("crear_informes_plan");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "informes_plan" (
      "id" serial PRIMARY KEY,
      "propuesta_id" integer NOT NULL REFERENCES "propuestas"("id") ON DELETE CASCADE,
      "periodo" smallint NOT NULL,
      "egresado_id" integer REFERENCES "usuarios"("id"),
      "estado" varchar(20) NOT NULL DEFAULT 'enviado',
      "comentario_asesor" text,
      "enviado_en" timestamp with time zone NOT NULL DEFAULT now(),
      "revisado_por" integer REFERENCES "usuarios"("id"),
      "revisado_en" timestamp with time zone,
      CONSTRAINT "informes_plan_estado_check" CHECK ("estado" IN ('enviado', 'observado', 'aprobado'))
    );
  `);
  // Una fila por autor y período; el general (egresado_id NULL) también es único por período.
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS "informes_plan_individual_unico" ON "informes_plan" ("propuesta_id", "periodo", "egresado_id") WHERE "egresado_id" IS NOT NULL;`);
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS "informes_plan_general_unico" ON "informes_plan" ("propuesta_id", "periodo") WHERE "egresado_id" IS NULL;`);
  console.log("Tabla informes_plan lista.");
}

run()
  .then(() => { process.exitCode = 0; })
  .catch((e) => { console.error(e); process.exitCode = 1; });
