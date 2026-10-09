"use server";

import { db } from "@/lib/db";
import {
  informesMensuales,
  propuestas,
  periodos,
  usuarios,
  supervisores,
  empresas,
  notificaciones,
  registrosActividad,
  solicitudesCambioActividad,
  informesVisita,
} from "@/lib/schema";
import { getSession } from "@/lib/session";
import { eq, asc, and, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  ensureRegistros,
  codigoActividad,
  validarContenidoRegistro,
  getPeriodosPropuesta,
  getActividadesPospuestas,
  conImagenesAdicionales,
  ESTADOS_REGISTRADOS,
} from "@/lib/habilitacionActividades";
import { estimarPaginas, PAGINAS_MINIMAS_INFORME } from "@/lib/metricaPaginas";
import { leerComentarios, validarComentariosCompletos } from "@/lib/comentariosAsesor";
import { registrarEvento } from "@/lib/bitacora";
import { palabrasDudosas } from "@/lib/ortografia";
import { leerComentariosSecciones } from "@/lib/comentariosRevision";

/** El informe del tercer período (alrededor de los 90 días) incluye la visita del asesor a la empresa. */
const NUMERO_INFORME_VISITA = 3;
import { hoyISOElSalvador, formatearFechaLarga, NUM_INFORMES_MENSUALES, esInformeFinal } from "@/lib/periodosPasantia";
import { leerCartaFinalizacion, validarAgradecimientos } from "@/lib/informeFinal";

async function assertAccesoPropuesta(propuestaId: number) {
  const session = await getSession();
  if (!session || !session.userId) {
    return { ok: false as const, error: "No autenticado" };
  }

  const [prop] = await db.select().from(propuestas).where(eq(propuestas.id, propuestaId)).limit(1);
  if (!prop) {
    return { ok: false as const, error: "Propuesta no encontrada" };
  }

  const isOwner = session.rol === "egresado" && prop.egresadoId === session.userId;
  const isAsesor = session.rol === "asesor" && prop.asesorId === session.userId;
  const isAdmin = session.rol === "admin" || session.rol === "coordinador";

  if (!isOwner && !isAsesor && !isAdmin) {
    return { ok: false as const, error: "No tiene permisos sobre esta propuesta." };
  }

  return { ok: true as const, session, prop };
}

/**
 * Asegura que exista el "contenedor" de informe (numero 1-5) para cada período de 30 días de la pasantía.
 * fechaLimite guarda el límite máximo de la cohorte (periodos.max*Informe; el quinto usa maxInformeFinal): al vencer, el período
 * se cierra. La fecha de entrega esperada es el último día de cada período (día 30, y día 150 para el quinto); ver fechaEntregaInforme.
 */
export async function ensureInformesMensuales(propuestaId: number) {
  const [prop] = await db.select().from(propuestas).where(eq(propuestas.id, propuestaId)).limit(1);
  if (!prop) return { error: "Propuesta no encontrada" as const };

  if (prop.tipo !== "pasantia") {
    return { error: "Los informes mensuales están disponibles por ahora únicamente para propuestas de Pasantía." as const };
  }

  const [periodo] = await db.select().from(periodos).where(eq(periodos.id, prop.periodoId)).limit(1);
  if (!periodo) return { error: "Periodo académico no encontrado." as const };

  const deadlines = [
    periodo.maxPrimerInforme,
    periodo.maxSegundoInforme,
    periodo.maxTercerInforme,
    periodo.maxCuartoInforme,
    periodo.maxInformeFinal,
  ];

  let existentes = await db
    .select()
    .from(informesMensuales)
    .where(eq(informesMensuales.propuestaId, propuestaId))
    .orderBy(asc(informesMensuales.numero));

  const existentesPorNumero = new Set(existentes.map((i) => i.numero));
  const faltantes = Array.from({ length: NUM_INFORMES_MENSUALES }, (_, i) => i + 1).filter((n) => !existentesPorNumero.has(n));

  if (faltantes.length > 0) {
    await db.insert(informesMensuales).values(
      faltantes.map((n) => ({
        propuestaId,
        numero: n,
        fechaLimite: deadlines[n - 1],
        estado: "redactando",
      }))
    );
    existentes = await db
      .select()
      .from(informesMensuales)
      .where(eq(informesMensuales.propuestaId, propuestaId))
      .orderBy(asc(informesMensuales.numero));
  }

  return { prop, informes: existentes };
}

/**
 * Fecha de entrega esperada del informe: el último día de su período de 30 días (día 150 para el quinto). Desde esa fecha
 * corre el retraso. Sin fecha de inicio de la pasantía se usa el límite de la cohorte.
 */
async function fechaEntregaInforme(propuestaId: number, numero: number, fechaLimiteCohorte: string) {
  const periodo = (await getPeriodosPropuesta(propuestaId)).find((p) => p.num === numero);
  return periodo?.fin ?? fechaLimiteCohorte;
}

export async function getInformesMensuales(propuestaId: number) {
  try {
    const access = await assertAccesoPropuesta(propuestaId);
    if (!access.ok) return { success: false, error: access.error };

    const result = await ensureInformesMensuales(propuestaId);
    if ("error" in result) return { success: false, error: result.error };
    const { prop, informes } = result;

    const [egresado] = await db.select().from(usuarios).where(eq(usuarios.id, prop.egresadoId)).limit(1);
    const asesor = prop.asesorId
      ? (await db.select().from(usuarios).where(eq(usuarios.id, prop.asesorId)).limit(1))[0] || null
      : null;
    const empresa = prop.empresaId
      ? (await db.select().from(empresas).where(eq(empresas.id, prop.empresaId)).limit(1))[0] || null
      : null;
    const supervisor = prop.supervisorId
      ? (await db.select().from(supervisores).where(eq(supervisores.id, prop.supervisorId)).limit(1))[0] || null
      : null;

    return { success: true, propuesta: prop, egresado, asesor, empresa, supervisor, informes };
  } catch (err: any) {
    console.error("Error en getInformesMensuales:", err);
    return { success: false, error: err.message || "Error al obtener los informes mensuales" };
  }
}

export async function getInformesMensualesAsesor(propuestaId: number) {
  try {
    const session = await getSession();
    if (!session || !session.userId || session.rol !== "asesor") {
      return { success: false, error: "No autorizado" };
    }

    const [prop] = await db.select().from(propuestas).where(eq(propuestas.id, propuestaId)).limit(1);
    if (!prop || prop.asesorId !== session.userId) {
      return { success: false, error: "No tiene permisos sobre esta propuesta." };
    }

    const result = await ensureInformesMensuales(propuestaId);
    if ("error" in result) return { success: false, error: result.error };

    const [egresado] = await db.select().from(usuarios).where(eq(usuarios.id, prop.egresadoId)).limit(1);

    return { success: true, propuesta: prop, egresado, informes: result.informes };
  } catch (err: any) {
    console.error("Error en getInformesMensualesAsesor:", err);
    return { success: false, error: err.message || "Error al obtener los informes mensuales" };
  }
}

/**
 * Fase 4 — Notificación 3 días antes del cierre + detección de cierre del periodo de 30 días.
 * Se invoca de forma perezosa cada vez que el egresado abre su pantalla de seguimiento
 * (el proyecto no cuenta con un scheduler/cron; esta verificación cumple el mismo propósito
 * observable ya que el egresado necesariamente visita la pantalla para trabajar).
 */
export async function verificarCierrePeriodo(
  propuestaId: number,
  mesActual: number,
  actividadesPendientesMes: number,
  porcentajeAvanceGeneral?: number
) {
  try {
    const session = await getSession();
    if (!session || !session.userId || session.rol !== "egresado") {
      return { success: false, error: "No autorizado" };
    }

    const result = await ensureInformesMensuales(propuestaId);
    if ("error" in result) return { success: false, error: result.error };
    const { prop, informes } = result;

    const informeMes = informes.find((i) => i.numero === mesActual);
    if (!informeMes) return { success: false, error: "Informe del mes no encontrado." };

    const hoy = new Date();
    const fechaLimite = new Date(`${informeMes.fechaLimite}T23:59:59`);
    const fechaEntrega = await fechaEntregaInforme(propuestaId, mesActual, informeMes.fechaLimite);
    const diasRestantes = Math.round((Date.parse(fechaEntrega) - Date.parse(hoyISOElSalvador())) / (1000 * 60 * 60 * 24));
    const informePresentado = informeMes.estado === "enviado" || informeMes.estado === "aprobado";

    // Aviso 3 días antes de la fecha de entrega (día 30 del período), una sola vez por informe
    if (diasRestantes <= 3 && diasRestantes >= 0 && !informeMes.alertaCierreEnviada && !informePresentado) {
      const pendientesTexto =
        actividadesPendientesMes > 0
          ? `Tiene ${actividadesPendientesMes} actividad${actividadesPendientesMes > 1 ? "es" : ""} pendiente${actividadesPendientesMes > 1 ? "s" : ""} de registrar/enviar.`
          : "No tiene actividades pendientes por registrar.";

      await db.insert(notificaciones).values({
        usuarioId: prop.egresadoId,
        tipo: "cierre_periodo_proximo",
        mensaje: `Faltan ${diasRestantes} día(s) para la fecha de entrega del informe del Período ${mesActual} de su pasantía (${formatearFechaLarga(fechaEntrega)}). ${pendientesTexto}`,
      });

      await db
        .update(informesMensuales)
        .set({ alertaCierreEnviada: true })
        .where(eq(informesMensuales.id, informeMes.id));

      await registrarEvento({
        propuestaId,
        actorRol: "sistema",
        tipo: "alerta_cierre",
        descripcion: `Se notificó al egresado que faltan ${diasRestantes} día(s) para la fecha de entrega del Informe #${mesActual}. ${pendientesTexto}`,
        referencia: `informe:${informeMes.id}`,
      });
    }

    // Cierre del periodo al vencer el límite de la cohorte: el informe se considera cerrado con lo que haya registrado hasta
    // la fecha, aunque existan actividades incompletas. La entrega formal al asesor sigue dependiendo de la
    // revisión (Fase 2) y de la generación del documento (Fase 5).
    let cerrado = informeMes.cerrado;
    if (hoy.getTime() > fechaLimite.getTime() && !informeMes.cerrado) {
      await db
        .update(informesMensuales)
        .set({ cerrado: true, cerradoEn: new Date() })
        .where(eq(informesMensuales.id, informeMes.id));
      cerrado = true;

      await registrarEvento({
        propuestaId,
        actorRol: "sistema",
        tipo: "periodo_cerrado",
        descripcion: `Venció el límite de la cohorte del Informe #${mesActual} (${formatearFechaLarga(informeMes.fechaLimite)}) con ${actividadesPendientesMes} actividad(es) sin completar.`,
        referencia: `informe:${informeMes.id}`,
      });

      if (prop.asesorId) {
        await db.insert(notificaciones).values({
          usuarioId: prop.asesorId,
          tipo: "periodo_cerrado",
          mensaje: `El Período ${mesActual} de la propuesta #${prop.numero} cerró con la información registrada hasta la fecha límite.`,
        });
      }

      // Fase 6 — el coordinador también recibe el estado de llenado y porcentaje de avance al cierre.
      if (prop.coordinadorId) {
        const avanceTexto =
          porcentajeAvanceGeneral !== undefined ? ` El avance general del estudiante es de ${porcentajeAvanceGeneral}%.` : "";
        await db.insert(notificaciones).values({
          usuarioId: prop.coordinadorId,
          tipo: "periodo_cerrado_coordinador",
          mensaje: `El Período ${mesActual} de la propuesta #${prop.numero} cerró con ${actividadesPendientesMes} actividad(es) sin completar.${avanceTexto}`,
        });
      }
    }

    return {
      success: true,
      diasRestantes,
      fechaEntrega,
      cerrado,
      fechaLimite: informeMes.fechaLimite,
      estadoInforme: informeMes.estado,
    };
  } catch (err: any) {
    console.error("Error en verificarCierrePeriodo:", err);
    return { success: false, error: err.message || "Error al verificar el cierre del periodo" };
  }
}

// ─────────────────────────── Envío y revisión del informe mensual ───────────────────────────

type InformeMensual = typeof informesMensuales.$inferSelect;
type Propuesta = typeof propuestas.$inferSelect;

export interface RequisitoInforme {
  id: string;
  titulo: string;
  cumplido: boolean;
  detalles: string[];
}

const ETIQUETA_ESTADO_ACTIVIDAD: Record<string, string> = {
  pendiente: "sin registrar",
  guardado: "guardada como borrador; falta enviarla",
  enviado: "enviada; falta que su asesor designado apruebe la semana",
  observado: "tiene observaciones del asesor pendientes de corregir",
};

/**
 * La aprobación es acumulativa: si el asesor aprobó todas las semanas del período, el informe mensual ya está validado.
 * Por eso el informe solo se envía y se aprueba con todas las actividades del período aprobadas.
 */
async function actividadesSinAprobar(propuestaId: number, numero: number) {
  const { actividades: acts, registros } = await ensureRegistros(propuestaId);
  const estadoPorActividad = new Map(registros.map((r) => [r.actividadId, r.estado]));
  return acts
    .filter((a) => a.periodo === numero && estadoPorActividad.get(a.id) !== "aprobado")
    .map((a) => codigoActividad(a));
}

/** Evalúa en servidor si el informe mensual cumple todas las condiciones para enviarse. */
async function evaluarRequisitosInforme(informe: InformeMensual, prop: Propuesta) {
  const requisitos: RequisitoInforme[] = [];
  // El informe puede enviarse antes de que termine el período, en cuanto el asesor apruebe todas sus semanas;
  // la fecha de entrega esperada es el último día del período (día 30).
  const periodosProp = await getPeriodosPropuesta(prop.id);
  const periodo = periodosProp.find((p) => p.num === informe.numero) || null;

  // 1. Datos generales de la portada
  const faltantesPortada: string[] = [];
  if (!prop.asesorId) faltantesPortada.push("No hay asesor designado.");
  if (!prop.empresaId) faltantesPortada.push("No hay empresa registrada en la propuesta.");
  if (!prop.supervisorId) faltantesPortada.push("No hay supervisor empresarial registrado en la propuesta.");
  requisitos.push({
    id: "portada",
    titulo: "Datos generales de la portada",
    cumplido: faltantesPortada.length === 0,
    detalles: faltantesPortada,
  });

  // 2. Actividades del mes aprobadas por el asesor (todas sus semanas)
  const { actividades: acts, registros } = await ensureRegistros(prop.id);
  const actsMes = acts.filter((a) => a.periodo === informe.numero);
  const registroPorActividad = new Map(registros.map((r) => [r.actividadId, r]));

  const pospuestas = await getActividadesPospuestas(prop.id);
  const pendientesActividad: string[] = [];
  const problemasContenido: string[] = [];
  if (actsMes.length === 0) {
    pendientesActividad.push(`El Período ${informe.numero} no tiene actividades en el cronograma.`);
  }
  for (const a of actsMes) {
    const r = registroPorActividad.get(a.id);
    const estado = r?.estado ?? "pendiente";
    const nombre = `${codigoActividad(a)} — ${a.titulo || a.descripcion}`;
    if (ETIQUETA_ESTADO_ACTIVIDAD[estado]) {
      pendientesActividad.push(
        pospuestas.has(a.id)
          ? `${nombre}: actividad pospuesta; debe completarla o solicitar su eliminación para enviar el informe.`
          : `${nombre}: ${ETIQUETA_ESTADO_ACTIVIDAD[estado]}.`
      );
    }
    // El contenido se valida en toda actividad ya enviada a revisión (enviada o aprobada).
    if (r && (estado === "enviado" || estado === "aprobado")) {
      for (const problema of validarContenidoRegistro(r)) {
        problemasContenido.push(`${codigoActividad(a)}: ${problema}`);
      }
    }
  }
  requisitos.push({
    id: "actividades",
    titulo: "Actividades del mes aprobadas por su asesor designado",
    cumplido: pendientesActividad.length === 0,
    detalles: pendientesActividad,
  });
  requisitos.push({
    id: "contenido",
    titulo: "Contenido obligatorio de cada actividad (marco teórico con cita APA 7, descripción de 200 a 300 palabras, pie de imagen y conclusión técnica de 40 a 60 palabras)",
    cumplido: problemasContenido.length === 0,
    detalles: problemasContenido,
  });

  // 3. Sin cambios pendientes en el cronograma del mes
  const actIdsMes = new Set(actsMes.map((a) => a.id));
  const solicitudesPendientes = await db
    .select()
    .from(solicitudesCambioActividad)
    .where(and(eq(solicitudesCambioActividad.propuestaId, prop.id), eq(solicitudesCambioActividad.estado, "pendiente")));
  const cambiosDelMes = solicitudesPendientes.filter(
    (s) =>
      (s.actividadId && actIdsMes.has(s.actividadId)) ||
      (s.actividadIntercambioId && actIdsMes.has(s.actividadIntercambioId)) ||
      s.periodoDestino === informe.numero
  );
  requisitos.push({
    id: "cambios",
    titulo: "Cronograma del mes sin solicitudes de cambio pendientes",
    cumplido: cambiosDelMes.length === 0,
    detalles: cambiosDelMes.map((s) => {
      const act = acts.find((a) => a.id === s.actividadId);
      return `Solicitud de tipo "${s.tipo}"${act ? ` sobre la actividad ${codigoActividad(act)}` : ""} pendiente de respuesta del asesor.`;
    }),
  });

  // 4. Extensión mínima del informe: impide el envío si no alcanza las páginas requeridas.
  const advertencias: string[] = [];
  const registrosRegistrados = actsMes
    .map((a) => registroPorActividad.get(a.id))
    .filter((r): r is NonNullable<typeof r> => !!r && ESTADOS_REGISTRADOS.includes(r.estado));
  const paginasEstimadas = estimarPaginas(await conImagenesAdicionales(registrosRegistrados));
  requisitos.push({
    id: "extension",
    titulo: `Extensión mínima de ${PAGINAS_MINIMAS_INFORME} páginas`,
    cumplido: paginasEstimadas >= PAGINAS_MINIMAS_INFORME,
    detalles:
      paginasEstimadas >= PAGINAS_MINIMAS_INFORME
        ? []
        : [
            `La extensión estimada es de ${Math.round(paginasEstimadas)} páginas. Complete el período con actividades adicionales mediante una solicitud de cambio al cronograma.`,
          ],
  });

  // 5. Elementos propios del informe final: agradecimientos (opcionales) y carta de finalización satisfactoria.
  if (esInformeFinal(informe.numero)) {
    const problemasAgradecimientos = validarAgradecimientos(informe.agradecimientos || "");
    requisitos.push({
      id: "agradecimientos",
      titulo: "Agradecimientos (opcionales): una página, máximo 4 párrafos",
      cumplido: problemasAgradecimientos.length === 0,
      detalles: problemasAgradecimientos,
    });
    const carta = leerCartaFinalizacion(informe.cartaFinalizacion);
    requisitos.push({
      id: "carta",
      titulo: "Carta de finalización satisfactoria emitida por la empresa",
      cumplido: !!carta,
      detalles: carta ? [] : ["Adjunte la imagen de la carta de finalización satisfactoria emitida por la empresa."],
    });
  }

  return {
    requisitos,
    advertencias,
    paginasEstimadas,
    periodo,
    actividadesMes: actsMes.map((a) => ({
      id: a.id,
      codigo: codigoActividad(a),
      titulo: a.titulo || a.descripcion,
      estado: registroPorActividad.get(a.id)?.estado ?? "pendiente",
    })),
  };
}

export interface PuntoRubrica {
  id: string;
  titulo: string;
  estado: "cumple" | "pendiente" | "revisar";
  detalle: string;
  automatico: boolean;
}

/**
 * Lista de verificación de la rúbrica del informe: el sistema valida casi todos los puntos por sí solo para que el
 * asesor se concentre en el contenido. Los criterios de redacción, involucramiento y valor de la actividad provienen
 * de las observaciones estándar que el asesor marcó en la revisión semanal.
 */
async function verificarRubrica(
  informe: InformeMensual,
  prop: Propuesta,
  requisitos: RequisitoInforme[],
  paginasEstimadas: number
): Promise<PuntoRubrica[]> {
  const { actividades: acts, registros } = await ensureRegistros(prop.id);
  const actsPeriodo = acts.filter((a) => a.periodo === informe.numero);
  const registroPorActividad = new Map(registros.map((r) => [r.actividadId, r]));
  const registrosPeriodo = actsPeriodo.map((a) => ({ a, r: registroPorActividad.get(a.id) }));
  const req = (id: string) => requisitos.find((r) => r.id === id);
  const sinAprobar = registrosPeriodo.filter((x) => x.r?.estado !== "aprobado").length;
  const sinDeclaracion = registrosPeriodo.filter((x) => !x.r?.declaracionAutoriaEn).length;
  const dudosas = [
    ...new Set(
      (
        await Promise.all(
          registrosPeriodo.map((x) => palabrasDudosas(x.r?.marcoTeorico, x.r?.descriptor, x.r?.conclusionTecnica))
        )
      ).flat()
    ),
  ];
  const conObservacion = (id: string) =>
    registrosPeriodo.filter((x) => leerComentariosSecciones(x.r?.comentariosSecciones).estandar?.includes(id as never)).map((x) => codigoActividad(x.a));

  const punto = (id: string, titulo: string, cumple: boolean | null, detalle: string, automatico = true): PuntoRubrica => ({
    id,
    titulo,
    estado: cumple === null ? "pendiente" : cumple ? "cumple" : "revisar",
    detalle,
    automatico,
  });
  const observacionEstandar = (id: string, titulo: string) => {
    const codigos = conObservacion(id);
    return punto(
      id,
      titulo,
      codigos.length === 0,
      codigos.length === 0 ? "Sin observaciones en la revisión semanal." : `Observado en: ${codigos.join(", ")}.`,
      false
    );
  };

  return [
    punto(
      "a_tiempo",
      "Entregado a tiempo",
      informe.cumplimiento ? informe.cumplimiento === "a_tiempo" : null,
      informe.cumplimiento ? (informe.cumplimiento === "a_tiempo" ? "Enviado dentro del plazo." : "Enviado fuera del plazo.") : "Aún no se ha enviado."
    ),
    punto("formato", "Formato institucional (márgenes, tipografía, interlineado)", true, "Lo aplica el sistema al generar el documento."),
    punto(
      "extension",
      "Extensión mínima de 20 páginas",
      paginasEstimadas >= 20,
      `Extensión estimada: ${Math.round(paginasEstimadas)} páginas.`
    ),
    punto(
      "cronograma",
      "Actividades conforme al cronograma, aprobadas semana a semana",
      sinAprobar === 0,
      sinAprobar === 0 ? "Todas las actividades del período están aprobadas." : `${sinAprobar} actividad(es) sin aprobar.`
    ),
    punto(
      "contenido",
      "Marco teórico con cita APA 7, descripción, imagen con fuente y conclusión",
      req("contenido")?.cumplido ?? false,
      req("contenido")?.cumplido ? "Todos los apartados cumplen." : (req("contenido")?.detalles[0] ?? "Hay apartados incompletos.")
    ),
    punto(
      "ortografia",
      "Ortografía",
      dudosas.length === 0,
      dudosas.length === 0
        ? "Sin palabras desconocidas."
        : `Revise: ${dudosas.slice(0, 8).join(", ")}${dudosas.length > 8 ? "..." : ""} (pueden ser errores o palabras en otro idioma).`
    ),
    punto(
      "produccion_propia",
      "Producción propia del egresado",
      sinDeclaracion === 0,
      sinDeclaracion === 0 ? "Declarada al enviar cada semana." : `${sinDeclaracion} actividad(es) sin declaración de autoría.`
    ),
    observacionEstandar("redaccion", "Redacción acorde al nivel del egresado"),
    observacionEstandar("involucramiento", "Involucramiento del egresado en las actividades"),
    observacionEstandar("no_reportable", "Actividades reportables con valor para el egresado"),
  ];
}

export async function getEnvioInformeMensual(informeId: number) {
  try {
    const [informe] = await db.select().from(informesMensuales).where(eq(informesMensuales.id, informeId)).limit(1);
    if (!informe) return { success: false, error: "Informe no encontrado" };

    const access = await assertAccesoPropuesta(informe.propuestaId);
    if (!access.ok) return { success: false, error: access.error };

    const { requisitos, advertencias, paginasEstimadas, periodo, actividadesMes } = await evaluarRequisitosInforme(informe, access.prop);
    const estadoPermiteEnvio = informe.estado === "redactando" || informe.estado === "observado";
    // La lista de verificación de la rúbrica es para quien revisa el informe.
    const rubrica = access.session.rol === "egresado" ? [] : await verificarRubrica(informe, access.prop, requisitos, paginasEstimadas);

    return {
      success: true,
      informe,
      rubrica,
      propuestaId: access.prop.id,
      periodo,
      fechaEntrega: periodo?.fin ?? informe.fechaLimite,
      requisitos,
      advertencias,
      paginasEstimadas,
      actividadesMes,
      puedeEnviar: estadoPermiteEnvio && requisitos.every((r) => r.cumplido),
      rol: access.session.rol,
    };
  } catch (err: any) {
    console.error("Error en getEnvioInformeMensual:", err);
    return { success: false, error: err.message || "Error al obtener el estado del informe" };
  }
}

export async function enviarInformeMensual(informeId: number) {
  try {
    const session = await getSession();
    if (!session || !session.userId || session.rol !== "egresado") {
      return { success: false, error: "No autorizado" };
    }

    const [informe] = await db.select().from(informesMensuales).where(eq(informesMensuales.id, informeId)).limit(1);
    if (!informe) return { success: false, error: "Informe no encontrado" };

    const [prop] = await db.select().from(propuestas).where(eq(propuestas.id, informe.propuestaId)).limit(1);
    if (!prop || prop.egresadoId !== session.userId) {
      return { success: false, error: "No tiene permisos sobre este informe." };
    }
    if (informe.estado === "enviado") {
      return { success: false, error: "El informe ya fue enviado y se encuentra en revisión." };
    }
    if (informe.estado === "aprobado") {
      return { success: false, error: "El informe ya fue aprobado por su asesor designado." };
    }

    const { requisitos } = await evaluarRequisitosInforme(informe, prop);
    const incompletos = requisitos.filter((r) => !r.cumplido);
    if (incompletos.length > 0) {
      return {
        success: false,
        error: `El informe no puede enviarse. Apartados incompletos: ${incompletos.map((r) => r.titulo).join("; ")}.`,
        requisitos,
      };
    }

    const ahora = new Date();
    const hoy = hoyISOElSalvador();
    const fechaEntrega = await fechaEntregaInforme(prop.id, informe.numero, informe.fechaLimite);
    const aTiempo = hoy <= fechaEntrega;
    const desviacionDias = Math.round((Date.parse(hoy) - Date.parse(fechaEntrega)) / (1000 * 60 * 60 * 24));

    await db
      .update(informesMensuales)
      .set({
        estado: "enviado",
        enviadoEn: ahora,
        fechaPresentacion: hoy,
        cumplimiento: aTiempo ? "a_tiempo" : "fuera_de_tiempo",
        desviacionDias,
        comentarioAsesor: null,
        revisadoPor: null,
        revisadoEn: null,
        actualizadoEn: ahora,
      })
      .where(eq(informesMensuales.id, informeId));

    await registrarEvento({
      propuestaId: prop.id,
      actorId: session.userId,
      actorRol: "egresado",
      tipo: "informe_enviado",
      descripcion: `Envió el Informe #${informe.numero} al asesor (${aTiempo ? "a tiempo" : "fuera de tiempo"}).`,
      referencia: `informe:${informeId}`,
    });

    if (prop.asesorId) {
      await db.insert(notificaciones).values({
        usuarioId: prop.asesorId,
        tipo: "informe_mensual_enviado",
        mensaje: `El estudiante de la propuesta #${prop.numero} envió el Informe #${informe.numero} para su revisión.`,
      });
    }

    revalidatePath(`/egresado/reportes`);
    revalidatePath(`/egresado/reportes/informe/${informeId}`);
    revalidatePath(`/asesor/seguimiento/${prop.id}`);
    return { success: true };
  } catch (err: any) {
    console.error("Error al enviar informe mensual:", err);
    return { success: false, error: err.message || "Error al enviar el informe" };
  }
}

async function cargarInformeParaAsesor(informeId: number) {
  const session = await getSession();
  if (!session || !session.userId || session.rol !== "asesor") {
    return { error: "No autorizado" as const };
  }
  const [informe] = await db.select().from(informesMensuales).where(eq(informesMensuales.id, informeId)).limit(1);
  if (!informe) return { error: "Informe no encontrado" as const };
  const [prop] = await db.select().from(propuestas).where(eq(propuestas.id, informe.propuestaId)).limit(1);
  if (!prop || prop.asesorId !== session.userId) {
    return { error: "No tiene permisos sobre este informe." as const };
  }
  if (informe.estado !== "enviado") {
    return { error: "El informe no está pendiente de revisión." as const };
  }
  return { session, informe, prop };
}

/**
 * Lo que debe cumplirse antes de que el asesor apruebe: todas las semanas del período aprobadas, sus comentarios para el
 * decanato y, en el Informe #3, el informe de visita.
 */
async function requisitosAprobacionAsesor(informe: InformeMensual) {
  const pendientes: string[] = [];
  const sinAprobar = await actividadesSinAprobar(informe.propuestaId, informe.numero);
  if (sinAprobar.length > 0) {
    pendientes.push(
      `Debe aprobar todas las semanas del Período ${informe.numero} antes de aprobar el informe. Actividades sin aprobar: ${sinAprobar.join(", ")}.`
    );
  }
  if (validarComentariosCompletos(leerComentarios(informe.comentariosDecanato)).length > 0) {
    pendientes.push("Debe completar los comentarios del asesor para el decanato antes de aprobar el informe.");
  }
  if (esInformeFinal(informe.numero) && !informe.cartaFinalizacionVerificadaEn) {
    pendientes.push("Debe verificar la carta de finalización satisfactoria antes de aprobar el informe final.");
  }
  if (informe.numero === NUMERO_INFORME_VISITA) {
    const [visita] = await db
      .select({ estado: informesVisita.estado })
      .from(informesVisita)
      .where(eq(informesVisita.propuestaId, informe.propuestaId))
      .limit(1);
    if (visita?.estado !== "completado") {
      pendientes.push(`Debe completar el informe de visita a la empresa antes de aprobar el Informe #${NUMERO_INFORME_VISITA}.`);
    }
  }
  return pendientes;
}

export async function aprobarInformeMensual(informeId: number, comentario?: string) {
  try {
    const ctx = await cargarInformeParaAsesor(informeId);
    if ("error" in ctx) return { success: false, error: ctx.error };
    const { session, informe, prop } = ctx;

    const pendientes = await requisitosAprobacionAsesor(informe);
    if (pendientes.length > 0) {
      return { success: false, error: pendientes.join(" ") };
    }

    await db
      .update(informesMensuales)
      .set({
        estado: "aprobado",
        comentarioAsesor: comentario?.trim() || null,
        revisadoPor: session.userId,
        revisadoEn: new Date(),
        actualizadoEn: new Date(),
      })
      .where(eq(informesMensuales.id, informeId));

    await db.insert(notificaciones).values({
      usuarioId: prop.egresadoId,
      tipo: "informe_mensual_aprobado",
      mensaje: `Su asesor designado aprobó el Informe #${informe.numero}.`,
    });
    await registrarEvento({
      propuestaId: prop.id,
      actorId: session.userId,
      actorRol: "asesor",
      tipo: "informe_aprobado",
      descripcion: `Aprobó el Informe #${informe.numero}.`,
      detalle: comentario,
      referencia: `informe:${informeId}`,
    });
    if (prop.coordinadorId) {
      await db.insert(notificaciones).values({
        usuarioId: prop.coordinadorId,
        tipo: "informe_mensual_aprobado_coordinador",
        mensaje: `El Informe #${informe.numero} de la propuesta #${prop.numero} fue aprobado por el asesor designado.`,
      });
    }

    revalidatePath(`/asesor/seguimiento/${prop.id}`);
    revalidatePath(`/egresado/reportes`);
    return { success: true };
  } catch (err: any) {
    console.error("Error al aprobar informe mensual:", err);
    return { success: false, error: err.message || "Error al aprobar el informe" };
  }
}

/**
 * Devuelve el informe al estudiante. Las actividades indicadas pasan a "observado" con el mismo comentario,
 * de modo que el estudiante pueda corregirlas y luego reenviar el informe.
 */
export async function solicitarCorreccionInformeMensual(informeId: number, comentario: string, actividadIds: number[]) {
  try {
    if (!comentario || comentario.trim().length < 5) {
      return { success: false, error: "Debe escribir las observaciones para el estudiante." };
    }

    const ctx = await cargarInformeParaAsesor(informeId);
    if ("error" in ctx) return { success: false, error: ctx.error };
    const { session, informe, prop } = ctx;

    const { actividades: acts } = await ensureRegistros(prop.id);
    const idsMes = new Set(acts.filter((a) => a.periodo === informe.numero).map((a) => a.id));
    const idsValidos = actividadIds.filter((id) => idsMes.has(id));
    if (idsValidos.length !== actividadIds.length) {
      return { success: false, error: "Alguna de las actividades seleccionadas no pertenece a este informe." };
    }

    const ahora = new Date();
    if (idsValidos.length > 0) {
      await db
        .update(registrosActividad)
        .set({
          estado: "observado",
          comentarioAsesor: `Observación del Informe Mensual #${informe.numero}: ${comentario.trim()}`,
          revisadoPor: session.userId,
          revisadoEn: ahora,
          actualizadoEn: ahora,
        })
        .where(inArray(registrosActividad.actividadId, idsValidos));
    }

    await db
      .update(informesMensuales)
      .set({
        estado: "observado",
        comentarioAsesor: comentario.trim(),
        revisadoPor: session.userId,
        revisadoEn: ahora,
        actualizadoEn: ahora,
      })
      .where(eq(informesMensuales.id, informeId));

    await db.insert(notificaciones).values({
      usuarioId: prop.egresadoId,
      tipo: "informe_mensual_observado",
      mensaje: `Su asesor designado solicitó correcciones en el Informe #${informe.numero}. Revise las observaciones, corrija lo indicado y vuelva a enviarlo.`,
    });

    await registrarEvento({
      propuestaId: prop.id,
      actorId: session.userId,
      actorRol: "asesor",
      tipo: "informe_observado",
      descripcion: `Solicitó correcciones en el Informe #${informe.numero}${idsValidos.length ? ` (${idsValidos.length} actividad(es) devueltas)` : ""}.`,
      detalle: comentario,
      referencia: `informe:${informeId}`,
    });

    revalidatePath(`/asesor/seguimiento/${prop.id}`);
    revalidatePath(`/egresado/reportes`);
    return { success: true };
  } catch (err: any) {
    console.error("Error al solicitar correcciones del informe mensual:", err);
    return { success: false, error: err.message || "Error al registrar las observaciones" };
  }
}
