"use server";

import { db } from "@/lib/db";
import { actividades, registrosActividad, solicitudesCambioActividad, propuestas, notificaciones } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { eq, and, asc, desc, max, or, ne, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { ensureInformesMensuales } from "./informesMensuales";
import {
  ensureRegistros,
  calcularHabilitacion,
  grupoActualDe,
  codigoActividad,
  getPeriodosPropuesta,
} from "@/lib/habilitacionActividades";
import { NUM_INFORMES_MENSUALES, compararPosicion, type Posicion } from "@/lib/periodosPasantia";
import { registrarEvento } from "@/lib/bitacora";

function textoSolicitud(tipo: TipoCambio, codigo: string | null, destino: { periodo: number | null; semana: number | null }) {
  const sobre = codigo ? ` ${codigo}` : "";
  const hacia = destino.periodo && destino.semana ? ` (destino: Período ${destino.periodo}, Semana ${destino.semana})` : "";
  return `${TIPO_TEXTO[tipo]}${sobre}${hacia}`;
}

type TipoCambio = "agregar" | "modificar" | "eliminar" | "posponer" | "reubicar";

const TIPO_TEXTO: Record<TipoCambio, string> = {
  agregar: "agregar una actividad",
  modificar: "modificar una actividad",
  eliminar: "eliminar una actividad",
  posponer: "posponer una actividad",
  reubicar: "reubicar una actividad",
};

interface DatosSolicitud {
  tipo: TipoCambio;
  actividadId?: number | null;
  actividadIntercambioId?: number | null;
  periodoDestino?: number | null;
  semanaDestino?: number | null;
  tituloPropuesto?: string | null;
  descripcionPropuesta?: string | null;
}

/** Nota de solicitud o aprobación del supervisor empresarial que respalda el cambio (PDF, PNG o JPG). */
interface DocumentoSupervisor {
  nombre: string;
  dataUrl: string;
}

const TAMANO_MAXIMO_DOCUMENTO = 5 * 1024 * 1024;
const TIPOS_DOCUMENTO = ["application/pdf", "image/png", "image/jpeg"];
const MAX_ELIMINACIONES_POR_MES = 1;

function validarDocumentoSupervisor(doc: DocumentoSupervisor | null | undefined) {
  if (!doc || !doc.dataUrl || !doc.nombre?.trim()) {
    return "Debe adjuntar la nota de solicitud o aprobación del supervisor empresarial.";
  }
  const coincidencia = /^data:([a-z/+.-]+);base64,(.+)$/i.exec(doc.dataUrl);
  if (!coincidencia || !TIPOS_DOCUMENTO.includes(coincidencia[1].toLowerCase())) {
    return "El documento del supervisor debe ser un archivo PDF, PNG o JPG.";
  }
  const bytes = Math.floor((coincidencia[2].length * 3) / 4);
  if (bytes > TAMANO_MAXIMO_DOCUMENTO) {
    return "El documento del supervisor excede el tamaño máximo de 5 MB.";
  }
  return null;
}

/** Eliminaciones solicitadas (pendientes o aprobadas) sobre actividades de un mes. */
async function contarEliminacionesDelMes(propuestaId: number, periodo: number, excluirSolicitudId?: number) {
  const condiciones = [
    eq(solicitudesCambioActividad.propuestaId, propuestaId),
    eq(solicitudesCambioActividad.tipo, "eliminar"),
    inArray(solicitudesCambioActividad.estado, ["pendiente", "aprobada"]),
    eq(actividades.periodo, periodo),
  ];
  if (excluirSolicitudId) condiciones.push(ne(solicitudesCambioActividad.id, excluirSolicitudId));
  const filas = await db
    .select({ id: solicitudesCambioActividad.id })
    .from(solicitudesCambioActividad)
    .innerJoin(actividades, eq(solicitudesCambioActividad.actividadId, actividades.id))
    .where(and(...condiciones));
  return filas.length;
}

async function siguienteNumero(propuestaId: number, periodo: number, semana: number) {
  const [row] = await db
    .select({ maxNumero: max(actividades.numero) })
    .from(actividades)
    .where(
      and(
        eq(actividades.propuestaId, propuestaId),
        eq(actividades.periodo, periodo),
        eq(actividades.semana, semana),
        eq(actividades.eliminada, false)
      )
    );
  return (row?.maxNumero || 0) + 1;
}

/** Estado del cronograma necesario para validar cambios: meses/semanas válidos, semana actual y meses ya entregados. */
async function cargarContextoCronograma(propuestaId: number) {
  const periodos = (await getPeriodosPropuesta(propuestaId)).filter((p) => p.num <= NUM_INFORMES_MENSUALES);

  const { actividades: acts, registros } = await ensureRegistros(propuestaId);
  const registroPorActividad = new Map(registros.map((r) => [r.actividadId, r]));
  const grupos = calcularHabilitacion(acts, registroPorActividad);
  const actual = grupoActualDe(grupos);
  const posicionActual: Posicion = actual ? { mes: actual.periodo, semana: actual.semana } : { mes: 1, semana: 1 };

  const infRes = await ensureInformesMensuales(propuestaId);
  const informes = "informes" in infRes && infRes.informes ? infRes.informes : [];
  const mesesNoEditables = new Set(
    informes.filter((i) => i.cerrado || i.estado === "enviado" || i.estado === "aprobado").map((i) => i.numero)
  );

  return { periodos, acts, registroPorActividad, posicionActual, mesesNoEditables };
}

type ContextoCronograma = Awaited<ReturnType<typeof cargarContextoCronograma>>;

function estaSinEnviar(ctx: ContextoCronograma, actividadId: number) {
  const estado = ctx.registroPorActividad.get(actividadId)?.estado ?? "pendiente";
  return estado === "pendiente" || estado === "guardado";
}

function validarDestino(ctx: ContextoCronograma, mes: number | null | undefined, semana: number | null | undefined) {
  if (!mes || !semana || !Number.isInteger(mes) || !Number.isInteger(semana)) {
    return "Debe seleccionar el mes y la semana de destino.";
  }
  const periodo = ctx.periodos.find((p) => p.num === mes);
  if (!periodo) {
    return `El mes seleccionado está fuera del período configurado (meses 1 a ${ctx.periodos.length}).`;
  }
  if (semana < 1 || semana > periodo.semanas) {
    return `El Período ${mes} tiene ${periodo.semanas} semana${periodo.semanas === 1 ? "" : "s"}; la semana ${semana} no es válida.`;
  }
  if (ctx.mesesNoEditables.has(mes)) {
    return `El informe del Período ${mes} ya fue enviado o su período cerró; no admite cambios en el cronograma.`;
  }
  if (mes !== ctx.posicionActual.mes) {
    return `Los cambios solo pueden programarse dentro de su período actual (Período ${ctx.posicionActual.mes}).`;
  }
  if (compararPosicion({ mes, semana }, ctx.posicionActual) < 0) {
    return `No es posible programar actividades en una semana anterior a su semana actual (Período ${ctx.posicionActual.mes}, Semana ${ctx.posicionActual.semana}).`;
  }
  return null;
}

async function tieneSolicitudPendiente(actividadId: number, excluirSolicitudId?: number) {
  const condiciones = [
    eq(solicitudesCambioActividad.estado, "pendiente"),
    or(
      eq(solicitudesCambioActividad.actividadId, actividadId),
      eq(solicitudesCambioActividad.actividadIntercambioId, actividadId)
    ),
  ];
  if (excluirSolicitudId) condiciones.push(ne(solicitudesCambioActividad.id, excluirSolicitudId));
  const [existente] = await db
    .select({ id: solicitudesCambioActividad.id })
    .from(solicitudesCambioActividad)
    .where(and(...condiciones))
    .limit(1);
  return !!existente;
}

/** Valida una solicitud contra el estado actual del cronograma. Se usa al crearla y nuevamente al aprobarla. */
async function validarSolicitud(ctx: ContextoCronograma, datos: DatosSolicitud, excluirSolicitudId?: number) {
  if (datos.tipo === "modificar") {
    return "La opción de modificar actividades ya no está disponible.";
  }
  if (datos.tipo === "agregar") {
    if (!datos.tituloPropuesto?.trim() || !datos.descripcionPropuesta?.trim()) {
      return "Debe indicar el título y la descripción de la nueva actividad.";
    }
    return validarDestino(ctx, datos.periodoDestino, datos.semanaDestino);
  }

  const actividad = ctx.acts.find((a) => a.id === datos.actividadId);
  if (!actividad) return "La actividad seleccionada no existe en el cronograma vigente.";
  const origen: Posicion = { mes: actividad.periodo, semana: actividad.semana };

  if (actividad.periodo !== ctx.posicionActual.mes) {
    return `Solo se pueden solicitar cambios sobre actividades de su período actual (Período ${ctx.posicionActual.mes}); la actividad ${codigoActividad(actividad)} pertenece al Período ${actividad.periodo}.`;
  }
  if (ctx.mesesNoEditables.has(actividad.periodo)) {
    return `La actividad ${codigoActividad(actividad)} pertenece a un informe ya enviado o cuyo período cerró.`;
  }
  if (await tieneSolicitudPendiente(actividad.id, excluirSolicitudId)) {
    return `Ya existe una solicitud pendiente sobre la actividad ${codigoActividad(actividad)}.`;
  }

  // Los cambios solo proceden sobre actividades aún no realizadas: lo reportado y enviado al asesor no se modifica.
  if (!estaSinEnviar(ctx, actividad.id)) {
    return `Solo se pueden solicitar cambios sobre actividades que aún no han sido realizadas ni enviadas; la actividad ${codigoActividad(actividad)} ya fue enviada.`;
  }

  if (datos.tipo === "eliminar") {
    if ((await contarEliminacionesDelMes(actividad.propuestaId, actividad.periodo, excluirSolicitudId)) >= MAX_ELIMINACIONES_POR_MES) {
      return `Solo se permite eliminar una actividad por período con la aprobación del asesor. Eliminar una segunda actividad del Período ${actividad.periodo} requiere la autorización del decanato.`;
    }
    return null;
  }

  const errorDestino = validarDestino(ctx, datos.periodoDestino, datos.semanaDestino);
  if (errorDestino) return errorDestino;
  const destino: Posicion = { mes: datos.periodoDestino!, semana: datos.semanaDestino! };

  if (datos.tipo === "posponer") {
    if (compararPosicion(destino, origen) <= 0) {
      return `Para posponer, el destino debe ser posterior a la ubicación actual de la actividad (Período ${origen.mes}, Semana ${origen.semana}).`;
    }
    if (destino.mes !== origen.mes) {
      return `Una actividad solo puede posponerse dentro de su período (Período ${origen.mes}); no es posible trasladarla al Período ${destino.mes}. Si ya no se realizará, solicite su eliminación.`;
    }
    return null;
  }

  // reubicar
  if (compararPosicion(destino, origen) >= 0) {
    return `Para reubicar, el destino debe ser anterior a la ubicación actual de la actividad (Período ${origen.mes}, Semana ${origen.semana}). Para moverla a una semana posterior utilice "Posponer actividad".`;
  }

  if (datos.actividadIntercambioId) {
    const intercambio = ctx.acts.find((a) => a.id === datos.actividadIntercambioId);
    if (!intercambio || intercambio.id === actividad.id) {
      return "La actividad seleccionada para el intercambio no es válida.";
    }
    if (intercambio.periodo !== destino.mes || intercambio.semana !== destino.semana) {
      return "La actividad de intercambio debe pertenecer a la semana de destino.";
    }
    if (!estaSinEnviar(ctx, intercambio.id)) {
      return `No es posible intercambiar con la actividad ${codigoActividad(intercambio)} porque ya fue enviada.`;
    }
    if (await tieneSolicitudPendiente(intercambio.id, excluirSolicitudId)) {
      return `Ya existe una solicitud pendiente sobre la actividad ${codigoActividad(intercambio)}.`;
    }
  }

  return null;
}

export async function getOpcionesDestinoCambio(propuestaId: number) {
  try {
    const session = await getSession();
    if (!session || !session.userId || session.rol !== "egresado") {
      return { success: false, error: "No autorizado" };
    }
    const [prop] = await db.select().from(propuestas).where(eq(propuestas.id, propuestaId)).limit(1);
    if (!prop || prop.egresadoId !== session.userId) {
      return { success: false, error: "No tiene permisos sobre esta propuesta." };
    }

    const ctx = await cargarContextoCronograma(propuestaId);

    const meses = ctx.periodos
      .filter((p) => !ctx.mesesNoEditables.has(p.num) && p.num === ctx.posicionActual.mes)
      .map((p) => ({
        mes: p.num,
        nombre: p.nombre,
        inicio: p.inicio,
        fin: p.fin,
        semanas: Array.from({ length: p.semanas }, (_, i) => i + 1).filter(
          (s) => compararPosicion({ mes: p.num, semana: s }, ctx.posicionActual) >= 0
        ),
      }))
      .filter((m) => m.semanas.length > 0);

    const actividadesCronograma = ctx.acts.map((a) => ({
      id: a.id,
      codigo: codigoActividad(a),
      titulo: a.titulo,
      periodo: a.periodo,
      semana: a.semana,
      estado: ctx.registroPorActividad.get(a.id)?.estado ?? "pendiente",
      editable: a.periodo === ctx.posicionActual.mes && !ctx.mesesNoEditables.has(a.periodo),
    }));

    // Eliminaciones ya solicitadas (pendientes o aprobadas) por período, para informar el límite al egresado.
    const eliminaciones = await db
      .select({ periodo: actividades.periodo })
      .from(solicitudesCambioActividad)
      .innerJoin(actividades, eq(solicitudesCambioActividad.actividadId, actividades.id))
      .where(
        and(
          eq(solicitudesCambioActividad.propuestaId, propuestaId),
          eq(solicitudesCambioActividad.tipo, "eliminar"),
          inArray(solicitudesCambioActividad.estado, ["pendiente", "aprobada"])
        )
      );
    const eliminacionesPorMes: Record<number, number> = {};
    for (const e of eliminaciones) eliminacionesPorMes[e.periodo] = (eliminacionesPorMes[e.periodo] || 0) + 1;

    return {
      success: true,
      meses,
      posicionActual: ctx.posicionActual,
      actividades: actividadesCronograma,
      eliminacionesPorMes,
      maxEliminacionesPorMes: MAX_ELIMINACIONES_POR_MES,
    };
  } catch (err: any) {
    console.error("Error en getOpcionesDestinoCambio:", err);
    return { success: false, error: err.message || "Error al obtener las opciones del cronograma" };
  }
}

export async function crearSolicitudCambioActividad(
  propuestaId: number,
  datos: DatosSolicitud & { justificacion: string; documentoSupervisor?: DocumentoSupervisor | null }
) {
  try {
    const session = await getSession();
    if (!session || !session.userId || session.rol !== "egresado") {
      return { success: false, error: "No autorizado" };
    }

    const [prop] = await db.select().from(propuestas).where(eq(propuestas.id, propuestaId)).limit(1);
    if (!prop || prop.egresadoId !== session.userId) {
      return { success: false, error: "No tiene permisos sobre esta propuesta." };
    }
    if (prop.estado !== "en_ejecucion") {
      return { success: false, error: "Solo puede solicitar cambios al cronograma mientras la pasantía está en ejecución." };
    }
    if (!TIPO_TEXTO[datos.tipo]) {
      return { success: false, error: "Tipo de cambio no válido." };
    }
    if (!datos.justificacion || datos.justificacion.trim().length < 15) {
      return { success: false, error: "Debe justificar el cambio con al menos 15 caracteres." };
    }

    const errorDocumento = validarDocumentoSupervisor(datos.documentoSupervisor);
    if (errorDocumento) return { success: false, error: errorDocumento };

    const ctx = await cargarContextoCronograma(propuestaId);
    const error = await validarSolicitud(ctx, datos);
    if (error) return { success: false, error };

    const usaDestino = datos.tipo === "agregar" || datos.tipo === "posponer" || datos.tipo === "reubicar";
    const usaTexto = datos.tipo === "agregar";

    await db.insert(solicitudesCambioActividad).values({
      propuestaId,
      actividadId: datos.tipo === "agregar" ? null : datos.actividadId,
      actividadIntercambioId: datos.tipo === "reubicar" ? datos.actividadIntercambioId || null : null,
      tipo: datos.tipo,
      periodoDestino: usaDestino ? datos.periodoDestino : null,
      semanaDestino: usaDestino ? datos.semanaDestino : null,
      tituloPropuesto: usaTexto ? datos.tituloPropuesto!.trim() : null,
      descripcionPropuesta: usaTexto ? datos.descripcionPropuesta!.trim() : null,
      justificacion: datos.justificacion.trim(),
      documentoSupervisorUrl: datos.documentoSupervisor!.dataUrl,
      documentoSupervisorNombre: datos.documentoSupervisor!.nombre.trim().slice(0, 255),
    });

    const actividadSolicitud = datos.actividadId ? ctx.acts.find((a) => a.id === datos.actividadId) : null;
    await registrarEvento({
      propuestaId,
      actorId: session.userId,
      actorRol: "egresado",
      tipo: "cambio_solicitado",
      descripcion: `Solicitó ${textoSolicitud(datos.tipo, actividadSolicitud ? codigoActividad(actividadSolicitud) : null, {
        periodo: usaDestino ? datos.periodoDestino ?? null : null,
        semana: usaDestino ? datos.semanaDestino ?? null : null,
      })} del cronograma.`,
      detalle: datos.justificacion,
    });

    if (prop.asesorId) {
      await db.insert(notificaciones).values({
        usuarioId: prop.asesorId,
        tipo: "solicitud_cambio_actividad",
        mensaje: `El estudiante de la propuesta #${prop.numero} solicitó ${TIPO_TEXTO[datos.tipo]} del cronograma. Requiere su validación.`,
      });
    }

    revalidatePath(`/egresado/reportes`);
    return { success: true };
  } catch (err: any) {
    console.error("Error al crear solicitud de cambio:", err);
    return { success: false, error: err.message || "Error al crear la solicitud" };
  }
}

async function listarSolicitudes(propuestaId: number) {
  const solicitudes = await db
    .select()
    .from(solicitudesCambioActividad)
    .where(eq(solicitudesCambioActividad.propuestaId, propuestaId))
    .orderBy(desc(solicitudesCambioActividad.creadaEn));

  const acts = await db.select().from(actividades).where(eq(actividades.propuestaId, propuestaId));
  const actsPorId = new Map(acts.map((a) => [a.id, { ...a, codigo: codigoActividad(a) }]));

  // El documento del supervisor (base64) no viaja en el listado: se consulta bajo demanda.
  return solicitudes.map(({ documentoSupervisorUrl, ...s }) => ({
    ...s,
    tieneDocumento: !!documentoSupervisorUrl,
    actividad: s.actividadId ? actsPorId.get(s.actividadId) || null : null,
    actividadIntercambio: s.actividadIntercambioId ? actsPorId.get(s.actividadIntercambioId) || null : null,
  }));
}

/** Documento del supervisor empresarial de una solicitud: egresado dueño, asesor asignado, coordinador o administrador. */
export async function getDocumentoSupervisorSolicitud(solicitudId: number) {
  try {
    const session = await getSession();
    if (!session || !session.userId) return { success: false, error: "No autenticado" };

    const [solicitud] = await db
      .select()
      .from(solicitudesCambioActividad)
      .where(eq(solicitudesCambioActividad.id, solicitudId))
      .limit(1);
    if (!solicitud) return { success: false, error: "Solicitud no encontrada" };

    const [prop] = await db.select().from(propuestas).where(eq(propuestas.id, solicitud.propuestaId)).limit(1);
    const autorizado =
      !!prop &&
      ((session.rol === "egresado" && prop.egresadoId === session.userId) ||
        (session.rol === "asesor" && prop.asesorId === session.userId) ||
        session.rol === "admin" ||
        session.rol === "coordinador");
    if (!autorizado) return { success: false, error: "No tiene permisos sobre esta solicitud." };
    if (!solicitud.documentoSupervisorUrl) return { success: false, error: "La solicitud no tiene documento adjunto." };

    return {
      success: true,
      url: solicitud.documentoSupervisorUrl,
      nombre: solicitud.documentoSupervisorNombre || "Documento del supervisor",
    };
  } catch (err: any) {
    console.error("Error en getDocumentoSupervisorSolicitud:", err);
    return { success: false, error: err.message || "Error al obtener el documento" };
  }
}

/**
 * Mantiene el código de las actividades correlativo dentro del mes (periodo.semana.número, con el número consecutivo en todo el
 * mes, como lo asigna el editor del cronograma). Se ejecuta tras un cambio aprobado, por ejemplo al eliminar una actividad las
 * siguientes recorren su código. Usa números temporales negativos para no chocar con el índice único durante el cambio.
 */
async function renumerarMes(propuestaId: number, periodo: number) {
  const vigentes = await db
    .select({ id: actividades.id, numero: actividades.numero })
    .from(actividades)
    .where(and(eq(actividades.propuestaId, propuestaId), eq(actividades.periodo, periodo), eq(actividades.eliminada, false)))
    .orderBy(asc(actividades.semana), asc(actividades.numero), asc(actividades.id));

  const cambios = vigentes.map((a, i) => ({ id: a.id, actual: a.numero, nuevo: i + 1 })).filter((a) => a.actual !== a.nuevo);
  if (cambios.length === 0) return;

  const comandos = [
    ...cambios.map((c) => db.update(actividades).set({ numero: -c.nuevo }).where(eq(actividades.id, c.id))),
    ...cambios.map((c) => db.update(actividades).set({ numero: c.nuevo }).where(eq(actividades.id, c.id))),
  ];
  await db.batch(comandos as unknown as Parameters<typeof db.batch>[0]);
}

export async function getSolicitudesCambioEgresado(propuestaId: number) {
  try {
    const session = await getSession();
    if (!session || !session.userId || session.rol !== "egresado") {
      return { success: false, error: "No autorizado" };
    }
    const [prop] = await db.select().from(propuestas).where(eq(propuestas.id, propuestaId)).limit(1);
    if (!prop || prop.egresadoId !== session.userId) {
      return { success: false, error: "No tiene permisos sobre esta propuesta." };
    }
    return { success: true, solicitudes: await listarSolicitudes(propuestaId) };
  } catch (err: any) {
    console.error("Error en getSolicitudesCambioEgresado:", err);
    return { success: false, error: err.message || "Error al obtener las solicitudes" };
  }
}

export async function getSolicitudesCambioAsesor(propuestaId: number) {
  try {
    const session = await getSession();
    if (!session || !session.userId || session.rol !== "asesor") {
      return { success: false, error: "No autorizado" };
    }
    const [prop] = await db.select().from(propuestas).where(eq(propuestas.id, propuestaId)).limit(1);
    if (!prop || prop.asesorId !== session.userId) {
      return { success: false, error: "No tiene permisos sobre esta propuesta." };
    }
    return { success: true, solicitudes: await listarSolicitudes(propuestaId) };
  } catch (err: any) {
    console.error("Error en getSolicitudesCambioAsesor:", err);
    return { success: false, error: err.message || "Error al obtener las solicitudes" };
  }
}

export async function responderSolicitudCambioActividad(
  solicitudId: number,
  decision: "aprobada" | "rechazada",
  respuesta?: string
) {
  try {
    const session = await getSession();
    if (!session || !session.userId || session.rol !== "asesor") {
      return { success: false, error: "No autorizado" };
    }

    const [solicitud] = await db
      .select()
      .from(solicitudesCambioActividad)
      .where(eq(solicitudesCambioActividad.id, solicitudId))
      .limit(1);
    if (!solicitud) return { success: false, error: "Solicitud no encontrada" };
    if (solicitud.estado !== "pendiente") {
      return { success: false, error: "Esta solicitud ya fue resuelta." };
    }

    const [prop] = await db.select().from(propuestas).where(eq(propuestas.id, solicitud.propuestaId)).limit(1);
    if (!prop || prop.asesorId !== session.userId) {
      return { success: false, error: "No tiene permisos sobre esta propuesta." };
    }

    if (decision === "rechazada" && (!respuesta || respuesta.trim().length < 5)) {
      return { success: false, error: "Debe justificar el rechazo de la solicitud." };
    }

    const tipo = solicitud.tipo as TipoCambio;
    let periodoOrigen: number | null = null;

    if (decision === "aprobada") {
      // El cronograma pudo cambiar desde que se creó la solicitud: se revalida antes de aplicar.
      const ctx = await cargarContextoCronograma(prop.id);
      const error = await validarSolicitud(
        ctx,
        {
          tipo,
          actividadId: solicitud.actividadId,
          actividadIntercambioId: solicitud.actividadIntercambioId,
          periodoDestino: solicitud.periodoDestino,
          semanaDestino: solicitud.semanaDestino,
          tituloPropuesto: solicitud.tituloPropuesto,
          descripcionPropuesta: solicitud.descripcionPropuesta,
        },
        solicitud.id
      );
      if (error) {
        return { success: false, error: `La solicitud ya no puede aplicarse: ${error} Puede rechazarla indicando el motivo.` };
      }
      periodoOrigen = ctx.acts.find((a) => a.id === solicitud.actividadId)?.periodo ?? null;

      if (tipo === "agregar") {
        const numero = await siguienteNumero(prop.id, solicitud.periodoDestino!, solicitud.semanaDestino!);
        const [nuevaActividad] = await db
          .insert(actividades)
          .values({
            propuestaId: prop.id,
            egresadoId: prop.egresadoId,
            periodo: solicitud.periodoDestino!,
            semana: solicitud.semanaDestino!,
            numero,
            titulo: solicitud.tituloPropuesto,
            descripcion: solicitud.descripcionPropuesta!,
            esNueva: true,
          })
          .returning();
        await db.insert(registrosActividad).values({ actividadId: nuevaActividad.id, estado: "pendiente" });
      } else if (tipo === "eliminar") {
        // Baja lógica; la renumeración automática del mes se aplica al final.
        await db.update(actividades).set({ eliminada: true }).where(eq(actividades.id, solicitud.actividadId!));
      } else if (tipo === "reubicar" && solicitud.actividadIntercambioId) {
        // Intercambio: cada actividad toma la posición exacta (y el código) de la otra.
        // Se usa una posición temporal (0.0.0) para no violar la restricción única del código durante el cambio.
        const a = ctx.acts.find((x) => x.id === solicitud.actividadId)!;
        const b = ctx.acts.find((x) => x.id === solicitud.actividadIntercambioId)!;
        await db.batch([
          db.update(actividades).set({ periodo: 0, semana: 0, numero: 0 }).where(eq(actividades.id, a.id)),
          db
            .update(actividades)
            .set({ periodo: a.periodo, semana: a.semana, numero: a.numero })
            .where(eq(actividades.id, b.id)),
          db
            .update(actividades)
            .set({ periodo: b.periodo, semana: b.semana, numero: b.numero })
            .where(eq(actividades.id, a.id)),
        ]);
      } else {
        // posponer, o reubicar sin intercambio: la actividad pasa al final de la semana destino
        // (las actividades existentes en el destino conservan su código).
        const numero = await siguienteNumero(prop.id, solicitud.periodoDestino!, solicitud.semanaDestino!);
        await db
          .update(actividades)
          .set({ periodo: solicitud.periodoDestino!, semana: solicitud.semanaDestino!, numero })
          .where(eq(actividades.id, solicitud.actividadId!));
      }
    }

    if (decision === "aprobada") {
      const meses = new Set<number>();
      if (periodoOrigen) meses.add(periodoOrigen);
      if (solicitud.periodoDestino) meses.add(solicitud.periodoDestino);
      for (const mes of meses) await renumerarMes(prop.id, mes);
    }

    await db
      .update(solicitudesCambioActividad)
      .set({
        estado: decision,
        respuestaAsesor: respuesta?.trim() || null,
        revisadoPor: session.userId,
        revisadoEn: new Date(),
      })
      .where(eq(solicitudesCambioActividad.id, solicitudId));

    const actividadSolicitud = solicitud.actividadId
      ? (await db.select().from(actividades).where(eq(actividades.id, solicitud.actividadId)).limit(1))[0]
      : null;
    await registrarEvento({
      propuestaId: prop.id,
      actorId: session.userId,
      actorRol: "asesor",
      tipo: decision === "aprobada" ? "cambio_aprobado" : "cambio_rechazado",
      descripcion: `${decision === "aprobada" ? "Aprobó" : "Rechazó"} la solicitud para ${textoSolicitud(
        tipo,
        actividadSolicitud ? codigoActividad(actividadSolicitud) : null,
        { periodo: solicitud.periodoDestino, semana: solicitud.semanaDestino }
      )} del cronograma.`,
      detalle: respuesta,
    });

    await db.insert(notificaciones).values({
      usuarioId: prop.egresadoId,
      tipo: decision === "aprobada" ? "cambio_actividad_aprobado" : "cambio_actividad_rechazado",
      mensaje:
        decision === "aprobada"
          ? `Su asesor designado aprobó la solicitud para ${TIPO_TEXTO[tipo]} del cronograma.`
          : `Su asesor designado rechazó la solicitud para ${TIPO_TEXTO[tipo]} del cronograma: ${respuesta}`,
    });

    revalidatePath(`/egresado/reportes`);
    revalidatePath(`/asesor/seguimiento/${prop.id}`);
    return { success: true };
  } catch (err: any) {
    console.error("Error al responder solicitud de cambio:", err);
    return { success: false, error: err.message || "Error al procesar la solicitud" };
  }
}
