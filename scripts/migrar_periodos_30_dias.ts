/**
 * Migración a 5 períodos de 30 días (4 semanas cada uno) y estructuras de comentarios/visita del asesor.
 *
 * 1. Esquema: 5 informes por pasantía, comentarios del asesor para el decanato, notas semanales e informe de visita.
 * 2. Cronogramas existentes: cada actividad se reubica por fecha. Se toma la fecha de inicio de su semana según la regla
 *    anterior (meses calendario) y se ubica en el período de 30 días y la semana que contienen esa fecha; luego se
 *    renumeran las actividades de cada período en orden.
 *
 * Uso: DOTENV_CONFIG_PATH=.env.local npx tsx -r dotenv/config scripts/migrar_periodos_30_dias.ts <respaldo.json>
 */
import { writeFileSync } from "fs";
import { db } from "../src/lib/db";
import { sql, eq } from "drizzle-orm";
import { actividades, cartasAceptacion } from "../src/lib/schema";
import { DIAS_POR_PERIODO, SEMANAS_POR_PERIODO, NUM_INFORMES_MENSUALES, fechaLocalDesdeISO } from "../src/lib/periodosPasantia";

const DIA_MS = 24 * 60 * 60 * 1000;

/** Regla anterior: períodos por mes calendario desde la fecha de inicio. */
function periodosCalendario(start: Date) {
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 150);
  const periodos: { inicio: Date; fin: Date }[] = [];
  let actual = new Date(start);
  while (actual <= end) {
    let fin = new Date(actual.getFullYear(), actual.getMonth() + 1, 0);
    if (fin > end) fin = new Date(end);
    periodos.push({ inicio: new Date(actual), fin });
    actual = new Date(actual.getFullYear(), actual.getMonth() + 1, 1);
  }
  return periodos;
}

async function esquema() {
  await db.execute(sql`ALTER TABLE "informes_mensuales" DROP CONSTRAINT IF EXISTS "numero_informe_mensual_check"`);
  await db.execute(sql`ALTER TABLE "informes_mensuales" ADD CONSTRAINT "numero_informe_mensual_check" CHECK ("numero" BETWEEN 1 AND 5)`);
  await db.execute(sql`
    ALTER TABLE "informes_mensuales"
      ADD COLUMN IF NOT EXISTS "comentarios_decanato" jsonb,
      ADD COLUMN IF NOT EXISTS "comentarios_decanato_en" timestamp with time zone
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "notas_seguimiento_asesor" (
      "id" serial PRIMARY KEY,
      "propuesta_id" integer NOT NULL REFERENCES "propuestas"("id") ON DELETE CASCADE,
      "periodo" smallint NOT NULL,
      "semana" smallint NOT NULL,
      "nota" text NOT NULL,
      "asesor_id" integer REFERENCES "usuarios"("id"),
      "actualizado_en" timestamp with time zone NOT NULL DEFAULT now(),
      CONSTRAINT "notas_seguimiento_asesor_unique" UNIQUE ("propuesta_id", "periodo", "semana")
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "informes_visita" (
      "id" serial PRIMARY KEY,
      "propuesta_id" integer NOT NULL UNIQUE REFERENCES "propuestas"("id") ON DELETE CASCADE,
      "asesor_id" integer REFERENCES "usuarios"("id"),
      "estado" varchar(20) NOT NULL DEFAULT 'borrador',
      "respuestas" jsonb NOT NULL DEFAULT '{}'::jsonb,
      "fotos" jsonb NOT NULL DEFAULT '[]'::jsonb,
      "completado_en" timestamp with time zone,
      "creado_en" timestamp with time zone NOT NULL DEFAULT now(),
      "actualizado_en" timestamp with time zone NOT NULL DEFAULT now(),
      CONSTRAINT "estado_informe_visita_check" CHECK ("estado" IN ('borrador', 'completado'))
    )
  `);
  console.log("Esquema actualizado.");
}

async function reubicarCronogramas(rutaRespaldo: string) {
  const acts = await db.select().from(actividades);
  writeFileSync(rutaRespaldo, JSON.stringify(acts));
  console.log(`Respaldo de ${acts.length} actividades en ${rutaRespaldo}`);

  const propuestaIds = [...new Set(acts.map((a) => a.propuestaId))];
  for (const propuestaId of propuestaIds) {
    const [carta] = await db
      .select({ fechaInicio: cartasAceptacion.fechaInicio })
      .from(cartasAceptacion)
      .where(eq(cartasAceptacion.propuestaId, propuestaId))
      .limit(1);
    if (!carta?.fechaInicio) {
      console.log(`Propuesta ${propuestaId}: sin carta de aceptación, se omite.`);
      continue;
    }
    const inicio = fechaLocalDesdeISO(carta.fechaInicio);
    const anteriores = periodosCalendario(inicio);
    const propias = acts.filter((a) => a.propuestaId === propuestaId);

    const ubicadas = propias.map((a) => {
      const anterior = anteriores[Math.min(a.periodo, anteriores.length) - 1];
      const fechaSemana = new Date(anterior.inicio.getFullYear(), anterior.inicio.getMonth(), anterior.inicio.getDate() + 7 * (a.semana - 1));
      const fecha = fechaSemana > anterior.fin ? anterior.fin : fechaSemana;
      const dias = Math.round((fecha.getTime() - inicio.getTime()) / DIA_MS);
      const periodo = Math.min(NUM_INFORMES_MENSUALES, Math.floor(dias / DIAS_POR_PERIODO) + 1);
      const diasEnPeriodo = dias - (periodo - 1) * DIAS_POR_PERIODO;
      const semana = Math.min(SEMANAS_POR_PERIODO, Math.floor(diasEnPeriodo / 7) + 1);
      return { a, periodo, semana };
    });

    // Numeración correlativa por período (las vigentes primero en el orden original; las eliminadas conservan el número).
    const finales = new Map<number, { periodo: number; semana: number; numero: number }>();
    for (let p = 1; p <= NUM_INFORMES_MENSUALES; p++) {
      const delPeriodo = ubicadas
        .filter((u) => u.periodo === p && !u.a.eliminada)
        .sort((x, y) => x.semana - y.semana || x.a.periodo - y.a.periodo || x.a.semana - y.a.semana || x.a.numero - y.a.numero || x.a.id - y.a.id);
      delPeriodo.forEach((u, i) => finales.set(u.a.id, { periodo: p, semana: u.semana, numero: i + 1 }));
    }
    for (const u of ubicadas.filter((x) => x.a.eliminada)) {
      finales.set(u.a.id, { periodo: u.periodo, semana: u.semana, numero: u.a.numero });
    }

    // Dos fases para no chocar con el índice único de códigos vigentes.
    for (const a of propias) await db.update(actividades).set({ numero: -a.id }).where(eq(actividades.id, a.id));
    for (const a of propias) await db.update(actividades).set(finales.get(a.id)!).where(eq(actividades.id, a.id));

    const resumen = propias
      .map((a) => `${a.periodo}.${a.semana}.${a.numero}->${finales.get(a.id)!.periodo}.${finales.get(a.id)!.semana}.${finales.get(a.id)!.numero}`)
      .join(" ");
    console.log(`Propuesta ${propuestaId}: ${propias.length} actividades reubicadas. ${resumen}`);
  }
}

async function run() {
  const rutaRespaldo = process.argv[2];
  if (!rutaRespaldo) throw new Error("Indique la ruta del archivo de respaldo.");
  // La reubicación solo debe aplicarse una vez: si la tabla de visitas ya existe, la migración ya se ejecutó.
  const previa: any = await db.execute(sql`SELECT to_regclass('public.informes_visita') AS tabla`);
  const yaMigrado = !!previa.rows?.[0]?.tabla;
  await esquema();
  if (yaMigrado) {
    console.log("Los cronogramas ya fueron reubicados anteriormente; se omite la reubicación.");
  } else {
    await reubicarCronogramas(rutaRespaldo);
  }
  console.log("Migración completada.");
}

run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
