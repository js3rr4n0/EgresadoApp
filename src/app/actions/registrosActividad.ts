"use server";

import { db } from "@/lib/db";
import {
  actividades,
  registrosActividad,
  propuestas,
  periodos,
  usuarios,
  carreras,
  notificaciones,
} from "@/lib/schema";
import { getSession } from "@/lib/session";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { ensureInformesMensuales } from "./informesMensuales";
import {
  ensureRegistros,
  calcularHabilitacion,
  codigoActividad,
  validarContenidoRegistro,
  ESTADOS_REGISTRADOS,
} from "@/lib/habilitacionActividades";

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

export async function getSeguimientoEgresado(propuestaId: number) {
  try {
    const access = await assertAccesoPropuesta(propuestaId);
    if (!access.ok) return { success: false, error: access.error };
    const { prop } = access;

    if (prop.tipo !== "pasantia") {
      return { success: false, error: "El seguimiento progresivo está disponible por ahora únicamente para propuestas de Pasantía." };
    }

    const { actividades: acts, registros } = await ensureRegistros(propuestaId);

    if (acts.length === 0) {
      return { success: false, error: "Esta propuesta no tiene actividades registradas en su cronograma (Gantt)." };
    }

    const registrosPorActividad = new Map(registros.map((r) => [r.actividadId, r]));
    const grupos = calcularHabilitacion(acts, registrosPorActividad);

    const totalActividades = acts.length;
    const completadas = registros.filter((r) => ESTADOS_REGISTRADOS.includes(r.estado)).length;
    const porcentajeAvance = Math.round((completadas / totalActividades) * 100);

    const grupoActual = grupos.find((g) => g.estadoGrupo === "habilitada") || grupos[grupos.length - 1];

    const [periodo] = await db.select().from(periodos).where(eq(periodos.id, prop.periodoId)).limit(1);
    const deadlineFields = [
      periodo?.maxPrimerInforme,
      periodo?.maxSegundoInforme,
      periodo?.maxTercerInforme,
      periodo?.maxCuartoInforme,
    ];
    const fechaLimiteMesActual = grupoActual ? deadlineFields[Math.min(grupoActual.periodo - 1, 3)] : null;

    const [egresado] = await db.select().from(usuarios).where(eq(usuarios.id, prop.egresadoId)).limit(1);
    const asesor = prop.asesorId
      ? (await db.select().from(usuarios).where(eq(usuarios.id, prop.asesorId)).limit(1))[0] || null
      : null;

    return {
      success: true,
      propuesta: prop,
      egresado,
      asesor,
      grupos: grupos.map((g) => ({
        periodo: g.periodo,
        semana: g.semana,
        estadoGrupo: g.estadoGrupo,
        actividades: g.actividades.map((x) => ({
          id: x.actividad.id,
          codigo: codigoActividad(x.actividad),
          titulo: x.actividad.titulo,
          descripcion: x.actividad.descripcion,
          registro: x.registro
            ? {
                id: x.registro.id,
                estado: x.registro.estado,
                fecha: x.registro.fecha,
                descriptor: x.registro.descriptor,
                marcoTeorico: x.registro.marcoTeorico,
                citaApa: x.registro.citaApa,
                imagenUrl: x.registro.imagenUrl,
                leyendaImagen: x.registro.leyendaImagen,
                numeroImagen: x.registro.numeroImagen,
                comentarioAsesor: x.registro.comentarioAsesor,
                enviadoEn: x.registro.enviadoEn,
              }
            : null,
        })),
      })),
      porcentajeAvance,
      totalActividades,
      completadas,
      mesActual: grupoActual?.periodo ?? null,
      semanaActual: grupoActual?.semana ?? null,
      fechaLimiteMesActual,
    };
  } catch (err: any) {
    console.error("Error en getSeguimientoEgresado:", err);
    return { success: false, error: err.message || "Error al obtener el seguimiento" };
  }
}

export async function getRegistroActividadDetalle(actividadId: number) {
  try {
    const [actividad] = await db.select().from(actividades).where(eq(actividades.id, actividadId)).limit(1);
    if (!actividad) return { success: false, error: "Actividad no encontrada" };

    const access = await assertAccesoPropuesta(actividad.propuestaId);
    if (!access.ok) return { success: false, error: access.error };

    await ensureRegistros(actividad.propuestaId);

    const [registro] = await db
      .select()
      .from(registrosActividad)
      .where(eq(registrosActividad.actividadId, actividadId))
      .limit(1);

    // Determinar si esta actividad pertenece al grupo actualmente habilitado
    const { actividades: acts, registros } = await ensureRegistros(actividad.propuestaId);
    const registrosPorActividad = new Map(registros.map((r) => [r.actividadId, r]));
    const grupos = calcularHabilitacion(acts, registrosPorActividad);
    const grupo = grupos.find((g) => g.periodo === actividad.periodo && g.semana === actividad.semana);

    return {
      success: true,
      actividad: { ...actividad, codigo: codigoActividad(actividad) },
      registro,
      estadoGrupo: grupo?.estadoGrupo || "bloqueada",
      rol: access.session.rol,
    };
  } catch (err: any) {
    console.error("Error en getRegistroActividadDetalle:", err);
    return { success: false, error: err.message || "Error al obtener la actividad" };
  }
}

export async function guardarRegistroActividad(
  actividadId: number,
  datos: { fecha?: string | null; descriptor: string; marcoTeorico: string; citaApa: string }
) {
  try {
    const session = await getSession();
    if (!session || !session.userId || session.rol !== "egresado") {
      return { success: false, error: "No autorizado" };
    }

    const [actividad] = await db.select().from(actividades).where(eq(actividades.id, actividadId)).limit(1);
    if (!actividad) return { success: false, error: "Actividad no encontrada" };

    const [prop] = await db.select().from(propuestas).where(eq(propuestas.id, actividad.propuestaId)).limit(1);
    if (!prop || prop.egresadoId !== session.userId) {
      return { success: false, error: "No tiene permisos sobre esta actividad." };
    }

    const [registro] = await db
      .select()
      .from(registrosActividad)
      .where(eq(registrosActividad.actividadId, actividadId))
      .limit(1);
    if (!registro) return { success: false, error: "Registro no encontrado" };

    if (registro.estado === "enviado" || registro.estado === "aprobado") {
      return { success: false, error: "Esta actividad ya fue enviada y no admite cambios." };
    }

    // Verificar que la semana de esta actividad esté habilitada (o en observación)
    const { actividades: acts, registros } = await ensureRegistros(actividad.propuestaId);
    const registrosPorActividad = new Map(registros.map((r) => [r.actividadId, r]));
    const grupos = calcularHabilitacion(acts, registrosPorActividad);
    const grupo = grupos.find((g) => g.periodo === actividad.periodo && g.semana === actividad.semana);
    if (grupo && grupo.estadoGrupo === "bloqueada") {
      return { success: false, error: "Esta actividad pertenece a una semana que aún no está habilitada." };
    }

    await db
      .update(registrosActividad)
      .set({
        estado: "guardado",
        fecha: datos.fecha || registro.fecha,
        descriptor: datos.descriptor,
        marcoTeorico: datos.marcoTeorico,
        citaApa: datos.citaApa,
        actualizadoEn: new Date(),
      })
      .where(eq(registrosActividad.actividadId, actividadId));

    revalidatePath(`/egresado/reportes`);
    revalidatePath(`/egresado/reportes/actividad/${actividadId}`);
    return { success: true };
  } catch (err: any) {
    console.error("Error al guardar registro de actividad:", err);
    return { success: false, error: err.message || "Error al guardar el registro" };
  }
}

export async function enviarRegistroActividad(actividadId: number) {
  try {
    const session = await getSession();
    if (!session || !session.userId || session.rol !== "egresado") {
      return { success: false, error: "No autorizado" };
    }

    const [actividad] = await db.select().from(actividades).where(eq(actividades.id, actividadId)).limit(1);
    if (!actividad) return { success: false, error: "Actividad no encontrada" };

    const [prop] = await db.select().from(propuestas).where(eq(propuestas.id, actividad.propuestaId)).limit(1);
    if (!prop || prop.egresadoId !== session.userId) {
      return { success: false, error: "No tiene permisos sobre esta actividad." };
    }

    const [registro] = await db
      .select()
      .from(registrosActividad)
      .where(eq(registrosActividad.actividadId, actividadId))
      .limit(1);
    if (!registro) return { success: false, error: "Registro no encontrado" };

    if (registro.estado === "enviado" || registro.estado === "aprobado") {
      return { success: false, error: "Esta actividad ya fue enviada." };
    }

    const problemas = validarContenidoRegistro(registro);
    if (problemas.length > 0) {
      return { success: false, error: problemas[0] };
    }

    const enviadoEn = new Date();
    await db
      .update(registrosActividad)
      .set({ estado: "enviado", enviadoEn, comentarioAsesor: null, actualizadoEn: enviadoEn })
      .where(eq(registrosActividad.actividadId, actividadId));

    if (prop.asesorId) {
      await db.insert(notificaciones).values({
        usuarioId: prop.asesorId,
        tipo: "actividad_registrada",
        mensaje: `El estudiante de la propuesta #${prop.numero} registró la actividad ${codigoActividad(actividad)} (${actividad.titulo || "sin título"}).`,
      });
    }

    revalidatePath(`/egresado/reportes`);
    revalidatePath(`/egresado/reportes/actividad/${actividadId}`);
    return { success: true };
  } catch (err: any) {
    console.error("Error al enviar registro de actividad:", err);
    return { success: false, error: err.message || "Error al enviar la actividad" };
  }
}

export async function uploadImagenRegistroActividad(actividadId: number, formData: FormData) {
  try {
    const session = await getSession();
    if (!session || !session.userId || session.rol !== "egresado") {
      return { success: false, error: "No autorizado" };
    }

    const [actividad] = await db.select().from(actividades).where(eq(actividades.id, actividadId)).limit(1);
    if (!actividad) return { success: false, error: "Actividad no encontrada" };

    const [prop] = await db.select().from(propuestas).where(eq(propuestas.id, actividad.propuestaId)).limit(1);
    if (!prop || prop.egresadoId !== session.userId) {
      return { success: false, error: "No tiene permisos sobre esta actividad." };
    }

    const [registro] = await db
      .select()
      .from(registrosActividad)
      .where(eq(registrosActividad.actividadId, actividadId))
      .limit(1);
    if (!registro) return { success: false, error: "Registro no encontrado" };
    if (registro.estado === "enviado" || registro.estado === "aprobado") {
      return { success: false, error: "Esta actividad ya fue enviada y no admite cambios." };
    }

    const rawFile = formData.get("archivo");
    if (!rawFile || typeof rawFile === "string") {
      return { success: false, error: "Debe seleccionar una imagen válida." };
    }
    const archivo = rawFile as File;
    if (archivo.size > 8 * 1024 * 1024) {
      return { success: false, error: "La imagen excede el tamaño máximo permitido de 8MB." };
    }
    if (!archivo.type.startsWith("image/")) {
      return { success: false, error: "El archivo debe ser una imagen (PNG recomendado)." };
    }

    const leyenda = (formData.get("leyenda") as string) || null;
    const buffer = Buffer.from(await archivo.arrayBuffer());
    const imagenUrl = `data:${archivo.type};base64,${buffer.toString("base64")}`;

    let numeroImagen = registro.numeroImagen;
    if (!numeroImagen) {
      const existentes = await db
        .select({ numeroImagen: registrosActividad.numeroImagen })
        .from(registrosActividad)
        .innerJoin(actividades, eq(registrosActividad.actividadId, actividades.id))
        .where(eq(actividades.propuestaId, actividad.propuestaId));
      const maxNumero = existentes.reduce((max, r) => Math.max(max, r.numeroImagen || 0), 0);
      numeroImagen = maxNumero + 1;
    }

    await db
      .update(registrosActividad)
      .set({ imagenUrl, leyendaImagen: leyenda, numeroImagen, actualizadoEn: new Date() })
      .where(eq(registrosActividad.actividadId, actividadId));

    revalidatePath(`/egresado/reportes/actividad/${actividadId}`);
    return { success: true };
  } catch (err: any) {
    console.error("Error al subir imagen de actividad:", err);
    return { success: false, error: err.message || "Error al subir la imagen" };
  }
}

export async function deleteImagenRegistroActividad(actividadId: number) {
  try {
    const session = await getSession();
    if (!session || !session.userId || session.rol !== "egresado") {
      return { success: false, error: "No autorizado" };
    }

    const [registro] = await db
      .select()
      .from(registrosActividad)
      .where(eq(registrosActividad.actividadId, actividadId))
      .limit(1);
    if (!registro) return { success: false, error: "Registro no encontrado" };
    if (registro.estado === "enviado" || registro.estado === "aprobado") {
      return { success: false, error: "Esta actividad ya fue enviada y no admite cambios." };
    }

    await db
      .update(registrosActividad)
      .set({ imagenUrl: null, leyendaImagen: null, numeroImagen: null, actualizadoEn: new Date() })
      .where(eq(registrosActividad.actividadId, actividadId));

    revalidatePath(`/egresado/reportes/actividad/${actividadId}`);
    return { success: true };
  } catch (err: any) {
    console.error("Error al eliminar imagen:", err);
    return { success: false, error: err.message || "Error al eliminar la imagen" };
  }
}

// ─────────────────────────── Revisión del Asesor ───────────────────────────

export async function getResumenSeguimientoAsesor() {
  try {
    const session = await getSession();
    if (!session || !session.userId || session.rol !== "asesor") {
      return { success: false, error: "No autorizado" };
    }

    const props = await db
      .select()
      .from(propuestas)
      .where(
        and(
          eq(propuestas.asesorId, session.userId),
          eq(propuestas.tipo, "pasantia"),
          eq(propuestas.estado, "en_ejecucion")
        )
      );

    const resumen = await Promise.all(
      props.map(async (prop) => {
        const { actividades: acts, registros } = await ensureRegistros(prop.id);
        if (acts.length === 0) return null;

        const registrosPorActividad = new Map(registros.map((r) => [r.actividadId, r]));
        const grupos = calcularHabilitacion(acts, registrosPorActividad);
        const grupoActual = grupos.find((g) => g.estadoGrupo === "habilitada") || grupos[grupos.length - 1];

        const completadas = registros.filter((r) => ESTADOS_REGISTRADOS.includes(r.estado)).length;
        const porcentajeAvance = Math.round((completadas / acts.length) * 100);
        const pendientesRevision = registros.filter((r) => r.estado === "enviado").length;

        const [egresado] = await db.select().from(usuarios).where(eq(usuarios.id, prop.egresadoId)).limit(1);
        const infResult = await ensureInformesMensuales(prop.id);
        const informes = "informes" in infResult && infResult.informes ? infResult.informes : [];

        return {
          propuestaId: prop.id,
          numero: prop.numero,
          egresado: { nombreCompleto: egresado?.nombreCompleto, carnet: egresado?.carnet },
          porcentajeAvance,
          mesActual: grupoActual?.periodo ?? null,
          semanaActual: grupoActual?.semana ?? null,
          pendientesRevision,
          informesPorRevisar: informes.filter((i) => i.estado === "enviado").length,
        };
      })
    );

    return { success: true, estudiantes: resumen.filter((r) => r !== null) };
  } catch (err: any) {
    console.error("Error en getResumenSeguimientoAsesor:", err);
    return { success: false, error: err.message || "Error al obtener el resumen" };
  }
}

export async function getSeguimientoAsesor(propuestaId: number) {
  try {
    const session = await getSession();
    if (!session || !session.userId || session.rol !== "asesor") {
      return { success: false, error: "No autorizado" };
    }

    const [prop] = await db.select().from(propuestas).where(eq(propuestas.id, propuestaId)).limit(1);
    if (!prop || prop.asesorId !== session.userId) {
      return { success: false, error: "No tiene permisos sobre esta propuesta." };
    }

    const { actividades: acts, registros } = await ensureRegistros(propuestaId);
    if (acts.length === 0) {
      return { success: false, error: "Esta propuesta no tiene actividades registradas en su cronograma (Gantt)." };
    }

    const registrosPorActividad = new Map(registros.map((r) => [r.actividadId, r]));
    const grupos = calcularHabilitacion(acts, registrosPorActividad);

    const totalActividades = acts.length;
    const completadas = registros.filter((r) => ESTADOS_REGISTRADOS.includes(r.estado)).length;
    const porcentajeAvance = Math.round((completadas / totalActividades) * 100);
    const pendientesRevision = registros.filter((r) => r.estado === "enviado").length;

    const [egresado] = await db.select().from(usuarios).where(eq(usuarios.id, prop.egresadoId)).limit(1);

    return {
      success: true,
      propuesta: prop,
      egresado,
      porcentajeAvance,
      totalActividades,
      completadas,
      pendientesRevision,
      grupos: grupos.map((g) => ({
        periodo: g.periodo,
        semana: g.semana,
        estadoGrupo: g.estadoGrupo,
        actividades: g.actividades.map((x) => ({
          id: x.actividad.id,
          codigo: codigoActividad(x.actividad),
          titulo: x.actividad.titulo,
          registro: x.registro
            ? { estado: x.registro.estado, enviadoEn: x.registro.enviadoEn, comentarioAsesor: x.registro.comentarioAsesor }
            : null,
        })),
      })),
    };
  } catch (err: any) {
    console.error("Error en getSeguimientoAsesor:", err);
    return { success: false, error: err.message || "Error al obtener el seguimiento" };
  }
}

export async function getRegistroActividadRevision(actividadId: number) {
  try {
    const session = await getSession();
    if (!session || !session.userId || session.rol !== "asesor") {
      return { success: false, error: "No autorizado" };
    }

    const [actividad] = await db.select().from(actividades).where(eq(actividades.id, actividadId)).limit(1);
    if (!actividad) return { success: false, error: "Actividad no encontrada" };

    const [prop] = await db.select().from(propuestas).where(eq(propuestas.id, actividad.propuestaId)).limit(1);
    if (!prop || prop.asesorId !== session.userId) {
      return { success: false, error: "No tiene permisos sobre esta actividad." };
    }

    const [registro] = await db
      .select()
      .from(registrosActividad)
      .where(eq(registrosActividad.actividadId, actividadId))
      .limit(1);
    if (!registro) return { success: false, error: "Registro no encontrado" };

    const [egresado] = await db.select().from(usuarios).where(eq(usuarios.id, prop.egresadoId)).limit(1);

    return {
      success: true,
      actividad: { ...actividad, codigo: codigoActividad(actividad) },
      registro,
      propuesta: prop,
      egresado,
    };
  } catch (err: any) {
    console.error("Error en getRegistroActividadRevision:", err);
    return { success: false, error: err.message || "Error al obtener la actividad" };
  }
}

export async function aprobarRegistroActividad(actividadId: number, comentario?: string) {
  try {
    const session = await getSession();
    if (!session || !session.userId || session.rol !== "asesor") {
      return { success: false, error: "No autorizado" };
    }

    const [actividad] = await db.select().from(actividades).where(eq(actividades.id, actividadId)).limit(1);
    if (!actividad) return { success: false, error: "Actividad no encontrada" };

    const [prop] = await db.select().from(propuestas).where(eq(propuestas.id, actividad.propuestaId)).limit(1);
    if (!prop || prop.asesorId !== session.userId) {
      return { success: false, error: "No tiene permisos sobre esta actividad." };
    }

    const [registro] = await db
      .select()
      .from(registrosActividad)
      .where(eq(registrosActividad.actividadId, actividadId))
      .limit(1);
    if (!registro) return { success: false, error: "Registro no encontrado" };
    if (registro.estado !== "enviado") {
      return { success: false, error: "Esta actividad no está pendiente de revisión." };
    }

    await db
      .update(registrosActividad)
      .set({
        estado: "aprobado",
        comentarioAsesor: comentario?.trim() || null,
        revisadoPor: session.userId,
        revisadoEn: new Date(),
        actualizadoEn: new Date(),
      })
      .where(eq(registrosActividad.actividadId, actividadId));

    await db.insert(notificaciones).values({
      usuarioId: prop.egresadoId,
      tipo: "actividad_aprobada",
      mensaje: `Su docente asesor aprobó la actividad ${codigoActividad(actividad)} (${actividad.titulo || "sin título"}).`,
    });

    revalidatePath(`/asesor/seguimiento/${actividad.propuestaId}`);
    revalidatePath(`/egresado/reportes`);
    return { success: true };
  } catch (err: any) {
    console.error("Error al aprobar actividad:", err);
    return { success: false, error: err.message || "Error al aprobar la actividad" };
  }
}

export async function solicitarCorreccionRegistroActividad(actividadId: number, comentario: string) {
  try {
    const session = await getSession();
    if (!session || !session.userId || session.rol !== "asesor") {
      return { success: false, error: "No autorizado" };
    }
    if (!comentario || comentario.trim().length < 5) {
      return { success: false, error: "Debe escribir una observación técnica detallada para el estudiante." };
    }

    const [actividad] = await db.select().from(actividades).where(eq(actividades.id, actividadId)).limit(1);
    if (!actividad) return { success: false, error: "Actividad no encontrada" };

    const [prop] = await db.select().from(propuestas).where(eq(propuestas.id, actividad.propuestaId)).limit(1);
    if (!prop || prop.asesorId !== session.userId) {
      return { success: false, error: "No tiene permisos sobre esta actividad." };
    }

    const [registro] = await db
      .select()
      .from(registrosActividad)
      .where(eq(registrosActividad.actividadId, actividadId))
      .limit(1);
    if (!registro) return { success: false, error: "Registro no encontrado" };
    if (registro.estado !== "enviado") {
      return { success: false, error: "Esta actividad no está pendiente de revisión." };
    }

    await db
      .update(registrosActividad)
      .set({
        estado: "observado",
        comentarioAsesor: comentario.trim(),
        revisadoPor: session.userId,
        revisadoEn: new Date(),
        actualizadoEn: new Date(),
      })
      .where(eq(registrosActividad.actividadId, actividadId));

    await db.insert(notificaciones).values({
      usuarioId: prop.egresadoId,
      tipo: "actividad_observada",
      mensaje: `Su docente asesor solicitó correcciones en la actividad ${codigoActividad(actividad)}. Revise las observaciones y vuelva a enviarla.`,
    });

    revalidatePath(`/asesor/seguimiento/${actividad.propuestaId}`);
    revalidatePath(`/egresado/reportes`);
    return { success: true };
  } catch (err: any) {
    console.error("Error al solicitar corrección de actividad:", err);
    return { success: false, error: err.message || "Error al registrar la observación" };
  }
}

// ─────────────────────────── Seguimiento del Coordinador/Administrador ───────────────────────────

export async function getSeguimientoCoordinador() {
  try {
    const session = await getSession();
    if (!session || !session.userId || (session.rol !== "coordinador" && session.rol !== "admin")) {
      return { success: false, error: "No autorizado" };
    }

    const condiciones = [eq(propuestas.tipo, "pasantia"), eq(propuestas.estado, "en_ejecucion")];
    if (session.rol === "coordinador") {
      condiciones.push(eq(propuestas.coordinadorId, session.userId));
    }

    const props = await db
      .select()
      .from(propuestas)
      .where(and(...condiciones));

    const estudiantes = await Promise.all(
      props.map(async (prop) => {
        const { actividades: acts, registros } = await ensureRegistros(prop.id);
        if (acts.length === 0) return null;

        const registrosPorActividad = new Map(registros.map((r) => [r.actividadId, r]));
        const grupos = calcularHabilitacion(acts, registrosPorActividad);
        const grupoActual = grupos.find((g) => g.estadoGrupo === "habilitada") || grupos[grupos.length - 1];

        const completadas = registros.filter((r) => ESTADOS_REGISTRADOS.includes(r.estado)).length;
        const porcentajeAvance = Math.round((completadas / acts.length) * 100);
        const pendientesRevision = registros.filter((r) => r.estado === "enviado").length;

        const [egresado] = await db
          .select({ nombreCompleto: usuarios.nombreCompleto, carnet: usuarios.carnet, carrera: carreras.nombre })
          .from(usuarios)
          .leftJoin(carreras, eq(usuarios.carreraId, carreras.id))
          .where(eq(usuarios.id, prop.egresadoId))
          .limit(1);

        const asesor = prop.asesorId
          ? (await db.select().from(usuarios).where(eq(usuarios.id, prop.asesorId)).limit(1))[0] || null
          : null;

        const infResult = await ensureInformesMensuales(prop.id);
        const informes = "informes" in infResult && infResult.informes ? infResult.informes : [];

        return {
          propuestaId: prop.id,
          numero: prop.numero,
          egresado,
          asesor: asesor?.nombreCompleto || "Sin asignar",
          mesActual: grupoActual?.periodo ?? null,
          semanaActual: grupoActual?.semana ?? null,
          porcentajeAvance,
          pendientesRevision,
          informes: informes.map((i) => ({ id: i.id, numero: i.numero, cerrado: i.cerrado, estado: i.estado })),
        };
      })
    );

    return { success: true, estudiantes: estudiantes.filter((e) => e !== null) };
  } catch (err: any) {
    console.error("Error en getSeguimientoCoordinador:", err);
    return { success: false, error: err.message || "Error al obtener el seguimiento" };
  }
}
