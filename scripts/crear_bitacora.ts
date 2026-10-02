/**
 * Crea la bitácora del proceso de seguimiento y, si está vacía, la alimenta con el historial que ya existe en el sistema
 * (borradores, envíos y revisiones de actividades, solicitudes de cambio, informes y cierres de período).
 * El historial previo solo refleja el último estado registrado de cada elemento (rondas de corrección anteriores no se
 * guardaban); a partir de ahora cada acción queda registrada.
 *
 * Uso: DOTENV_CONFIG_PATH=.env.local npx tsx -r dotenv/config scripts/crear_bitacora.ts
 */
import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

const CODIGO = sql.raw(`a.periodo || '.' || a.semana || '.' || a.numero`);
const TITULO = sql.raw(`coalesce(a.titulo, 'sin título')`);

async function run() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "bitacora_eventos" (
      "id" serial PRIMARY KEY,
      "propuesta_id" integer NOT NULL REFERENCES "propuestas"("id") ON DELETE CASCADE,
      "actor_id" integer REFERENCES "usuarios"("id"),
      "actor_rol" varchar(20) NOT NULL,
      "tipo" varchar(50) NOT NULL,
      "descripcion" text NOT NULL,
      "detalle" text,
      "referencia" varchar(60),
      "creado_en" timestamp with time zone NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS "bitacora_eventos_propuesta_idx" ON "bitacora_eventos" ("propuesta_id", "creado_en")`);
  console.log("Tabla bitacora_eventos lista.");

  const existentes: any = await db.execute(sql`SELECT count(*)::int AS total FROM "bitacora_eventos"`);
  if (existentes.rows[0].total > 0) {
    console.log("La bitácora ya tiene eventos; se omite la carga del historial.");
    return;
  }

  // Actividades: borradores vigentes, envíos y última revisión del asesor.
  await db.execute(sql`
    INSERT INTO bitacora_eventos (propuesta_id, actor_id, actor_rol, tipo, descripcion, referencia, creado_en)
    SELECT a.propuesta_id, p.egresado_id, 'egresado', 'actividad_borrador',
           'Guardó el borrador de la actividad ' || ${CODIGO} || ' (' || ${TITULO} || ').', 'actividad:' || a.id, r.actualizado_en
    FROM registros_actividad r JOIN actividades a ON a.id = r.actividad_id JOIN propuestas p ON p.id = a.propuesta_id
    WHERE r.estado = 'guardado' AND r.actualizado_en IS NOT NULL
  `);
  await db.execute(sql`
    INSERT INTO bitacora_eventos (propuesta_id, actor_id, actor_rol, tipo, descripcion, referencia, creado_en)
    SELECT a.propuesta_id, p.egresado_id, 'egresado', 'actividad_enviada',
           'Envió la actividad ' || ${CODIGO} || ' (' || ${TITULO} || ') para revisión.', 'actividad:' || a.id, r.enviado_en
    FROM registros_actividad r JOIN actividades a ON a.id = r.actividad_id JOIN propuestas p ON p.id = a.propuesta_id
    WHERE r.enviado_en IS NOT NULL
  `);
  await db.execute(sql`
    INSERT INTO bitacora_eventos (propuesta_id, actor_id, actor_rol, tipo, descripcion, detalle, referencia, creado_en)
    SELECT a.propuesta_id, r.revisado_por, 'asesor',
           CASE r.estado WHEN 'aprobado' THEN 'actividad_aprobada' ELSE 'actividad_observada' END,
           CASE r.estado WHEN 'aprobado' THEN 'Aprobó la actividad ' ELSE 'Solicitó correcciones en la actividad ' END
             || ${CODIGO} || ' (' || ${TITULO} || ').',
           r.comentario_asesor, 'actividad:' || a.id, r.revisado_en
    FROM registros_actividad r JOIN actividades a ON a.id = r.actividad_id
    WHERE r.revisado_en IS NOT NULL AND r.estado IN ('aprobado', 'observado')
  `);

  // Solicitudes de cambio al cronograma y su respuesta.
  const tipoTexto = sql.raw(`CASE s.tipo WHEN 'agregar' THEN 'agregar una actividad' WHEN 'modificar' THEN 'modificar una actividad'
    WHEN 'eliminar' THEN 'eliminar una actividad' WHEN 'posponer' THEN 'posponer una actividad' ELSE 'reubicar una actividad' END`);
  await db.execute(sql`
    INSERT INTO bitacora_eventos (propuesta_id, actor_id, actor_rol, tipo, descripcion, detalle, creado_en)
    SELECT s.propuesta_id, p.egresado_id, 'egresado', 'cambio_solicitado',
           'Solicitó ' || ${tipoTexto} || coalesce(' ' || ${CODIGO}, '') || ' del cronograma.', s.justificacion, s.creada_en
    FROM solicitudes_cambio_actividad s JOIN propuestas p ON p.id = s.propuesta_id LEFT JOIN actividades a ON a.id = s.actividad_id
  `);
  await db.execute(sql`
    INSERT INTO bitacora_eventos (propuesta_id, actor_id, actor_rol, tipo, descripcion, detalle, creado_en)
    SELECT s.propuesta_id, s.revisado_por, 'asesor',
           CASE s.estado WHEN 'aprobada' THEN 'cambio_aprobado' ELSE 'cambio_rechazado' END,
           CASE s.estado WHEN 'aprobada' THEN 'Aprobó' ELSE 'Rechazó' END || ' la solicitud para ' || ${tipoTexto}
             || coalesce(' ' || ${CODIGO}, '') || ' del cronograma.',
           s.respuesta_asesor, s.revisado_en
    FROM solicitudes_cambio_actividad s LEFT JOIN actividades a ON a.id = s.actividad_id
    WHERE s.revisado_en IS NOT NULL AND s.estado IN ('aprobada', 'rechazada')
  `);

  // Informes: envío, última revisión y cierre del período.
  await db.execute(sql`
    INSERT INTO bitacora_eventos (propuesta_id, actor_id, actor_rol, tipo, descripcion, referencia, creado_en)
    SELECT i.propuesta_id, p.egresado_id, 'egresado', 'informe_enviado',
           'Envió el Informe #' || i.numero || ' al asesor' ||
             CASE i.cumplimiento WHEN 'a_tiempo' THEN ' (a tiempo).' WHEN 'fuera_de_tiempo' THEN ' (fuera de tiempo).' ELSE '.' END,
           'informe:' || i.id, i.enviado_en
    FROM informes_mensuales i JOIN propuestas p ON p.id = i.propuesta_id
    WHERE i.enviado_en IS NOT NULL
  `);
  await db.execute(sql`
    INSERT INTO bitacora_eventos (propuesta_id, actor_id, actor_rol, tipo, descripcion, detalle, referencia, creado_en)
    SELECT i.propuesta_id, i.revisado_por, 'asesor',
           CASE i.estado WHEN 'aprobado' THEN 'informe_aprobado' ELSE 'informe_observado' END,
           CASE i.estado WHEN 'aprobado' THEN 'Aprobó el Informe #' ELSE 'Solicitó correcciones en el Informe #' END || i.numero || '.',
           i.comentario_asesor, 'informe:' || i.id, i.revisado_en
    FROM informes_mensuales i
    WHERE i.revisado_en IS NOT NULL AND i.estado IN ('aprobado', 'observado')
  `);
  await db.execute(sql`
    INSERT INTO bitacora_eventos (propuesta_id, actor_id, actor_rol, tipo, descripcion, referencia, creado_en)
    SELECT i.propuesta_id, NULL, 'sistema', 'periodo_cerrado',
           'Venció la fecha límite del Informe #' || i.numero || '.', 'informe:' || i.id, i.cerrado_en
    FROM informes_mensuales i
    WHERE i.cerrado_en IS NOT NULL
  `);

  const total: any = await db.execute(sql`SELECT count(*)::int AS total FROM "bitacora_eventos"`);
  console.log(`Historial cargado: ${total.rows[0].total} eventos.`);
}

run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
