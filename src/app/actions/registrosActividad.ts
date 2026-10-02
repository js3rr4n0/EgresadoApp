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
  informesVisita,
} from "@/lib/schema";
import { getSession } from "@/lib/session";
import { eq, and, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { ensureInformesMensuales } from "./informesMensuales";
import {
  ensureRegistros,
  calcularHabilitacion,
  calcularMetricaPaginas,
  grupoActualDe,
  codigoActividad,
  validarContenidoRegistro,
  ESTADOS_REGISTRADOS,
} from "@/lib/habilitacionActividades";
import { hoyISOElSalvador } from "@/lib/periodosPasantia";
import { registrarEvento } from "@/lib/bitacora";

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

    const grupoActual = grupoActualDe(grupos);

    const [periodo] = await db.select().from(periodos).where(eq(periodos.id, prop.periodoId)).limit(1);
    const deadlineFields = [
      periodo?.maxPrimerInforme,
      periodo?.maxSegundoInforme,
      periodo?.maxTercerInforme,
      periodo?.maxCuartoInforme,
      periodo?.maxInformeFinal,
    ];
    const fechaLimiteMesActual = grupoActual ? deadlineFields[Math.min(grupoActual.periodo - 1, deadlineFields.length - 1)] : null;

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
                conclusionTecnica: x.registro.conclusionTecnica,
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
      metricaPaginas: await calcularMetricaPaginas(propuestaId, acts, registros),
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
    const indice = grupo ? grupo.actividades.findIndex((x) => x.actividad.id === actividadId) : -1;
    const siguiente = grupo && indice >= 0 ? grupo.actividades[indice + 1]?.actividad : undefined;

    return {
      success: true,
      actividad: { ...actividad, codigo: codigoActividad(actividad) },
      registro,
      estadoGrupo: grupo?.estadoGrupo || "bloqueada",
      semana: {
        periodo: actividad.periodo,
        semana: actividad.semana,
        posicion: indice + 1,
        total: grupo?.actividades.length ?? 1,
        siguienteId: siguiente?.id ?? null,
        siguienteCodigo: siguiente ? codigoActividad(siguiente) : null,
      },
      rol: access.session.rol,
    };
  } catch (err: any) {
    console.error("Error en getRegistroActividadDetalle:", err);
    return { success: false, error: err.message || "Error al obtener la actividad" };
  }
}

export async function guardarRegistroActividad(
  actividadId: number,
  datos: { descriptor: string; marcoTeorico: string; citaApa: string; conclusionTecnica: string; leyendaImagen?: string }
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
        descriptor: datos.descriptor,
        marcoTeorico: datos.marcoTeorico,
        citaApa: datos.citaApa,
        conclusionTecnica: datos.conclusionTecnica,
        // El pie solo se edita mientras exista la imagen; la fecha de realización se asigna al enviar la semana.
        ...(registro.imagenUrl && datos.leyendaImagen !== undefined ? { leyendaImagen: datos.leyendaImagen.trim() || null } : {}),
        actualizadoEn: new Date(),
      })
      .where(eq(registrosActividad.actividadId, actividadId));

    await registrarEvento({
      propuestaId: actividad.propuestaId,
      actorId: session.userId,
      actorRol: "egresado",
      tipo: "actividad_borrador",
      descripcion: `Guardó el borrador de la actividad ${codigoActividad(actividad)} (${actividad.titulo || "sin título"}).`,
      referencia: `actividad:${actividadId}`,
      agruparMinutos: 60,
    });

    revalidatePath(`/egresado/reportes`);
    revalidatePath(`/egresado/reportes/actividad/${actividadId}`);
    return { success: true };
  } catch (err: any) {
    console.error("Error al guardar registro de actividad:", err);
    return { success: false, error: err.message || "Error al guardar el registro" };
  }
}

/**
 * Envía al asesor todas las actividades de la semana habilitada. Solo procede cuando cada actividad de la semana
 * tiene su contenido completo; las actividades ya aprobadas o enviadas no se modifican.
 */
export async function enviarSemanaActividades(propuestaId: number) {
  try {
    const session = await getSession();
    if (!session || !session.userId || session.rol !== "egresado") {
      return { success: false, error: "No autorizado" };
    }

    const [prop] = await db.select().from(propuestas).where(eq(propuestas.id, propuestaId)).limit(1);
    if (!prop || prop.egresadoId !== session.userId) {
      return { success: false, error: "No tiene permisos sobre esta propuesta." };
    }

    const { actividades: acts, registros } = await ensureRegistros(propuestaId);
    const registroPorActividad = new Map(registros.map((r) => [r.actividadId, r]));
    const grupos = calcularHabilitacion(acts, registroPorActividad);
    const grupo = grupoActualDe(grupos);
    if (!grupo || grupo.estadoGrupo === "completada") {
      return { success: false, error: "No hay una semana pendiente de envío." };
    }
    if (grupo.estadoGrupo === "en_revision") {
      return { success: false, error: "La semana actual ya fue enviada y se encuentra en revisión por su asesor designado." };
    }

    const porEnviar = grupo.actividades.filter((x) => ["pendiente", "guardado", "observado"].includes(x.registro?.estado || "pendiente"));
    if (porEnviar.length === 0) {
      return { success: false, error: "No hay actividades por enviar en la semana actual." };
    }

    const problemas: string[] = [];
    for (const x of porEnviar) {
      for (const p of validarContenidoRegistro(x.registro || {})) {
        problemas.push(`${codigoActividad(x.actividad)}: ${p}`);
      }
    }
    if (problemas.length > 0) {
      return {
        success: false,
        error: `La semana no puede enviarse hasta completar todas sus actividades. ${problemas.slice(0, 3).join(" ")}${problemas.length > 3 ? ` (y ${problemas.length - 3} pendiente(s) más)` : ""}`,
      };
    }

    const enviadoEn = new Date();
    await db
      .update(registrosActividad)
      .set({
        estado: "enviado",
        fecha: hoyISOElSalvador(),
        enviadoEn,
        comentarioAsesor: null,
        actualizadoEn: enviadoEn,
      })
      .where(
        inArray(
          registrosActividad.actividadId,
          porEnviar.map((x) => x.actividad.id)
        )
      );

    await registrarEvento({
      propuestaId,
      actorId: session.userId,
      actorRol: "egresado",
      tipo: "semana_enviada",
      descripcion: `Envió al asesor la Semana ${grupo.semana} del Mes ${grupo.periodo}: ${porEnviar.map((x) => codigoActividad(x.actividad)).join(", ")}.`,
      referencia: `semana:${grupo.periodo}.${grupo.semana}`,
    });

    if (prop.asesorId) {
      await db.insert(notificaciones).values({
        usuarioId: prop.asesorId,
        tipo: "actividad_registrada",
        mensaje: `El estudiante de la propuesta #${prop.numero} envió ${porEnviar.length} actividad${porEnviar.length > 1 ? "es" : ""} de la Semana ${grupo.semana} del Mes ${grupo.periodo} para su revisión.`,
      });
    }

    revalidatePath(`/egresado/reportes`);
    revalidatePath(`/asesor/seguimiento/${propuestaId}`);
    return { success: true, enviadas: porEnviar.length };
  } catch (err: any) {
    console.error("Error al enviar la semana de actividades:", err);
    return { success: false, error: err.message || "Error al enviar la semana" };
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

    const leyenda = ((formData.get("leyenda") as string) || "").trim();
    if (leyenda.length < 3) {
      return { success: false, error: "Debe indicar el pie de imagen antes de adjuntarla." };
    }
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

    await registrarEvento({
      propuestaId: actividad.propuestaId,
      actorId: session.userId,
      actorRol: "egresado",
      tipo: "actividad_imagen",
      descripcion: `Adjuntó la imagen de soporte de la actividad ${codigoActividad(actividad)}: «${leyenda}».`,
      referencia: `actividad:${actividadId}`,
    });

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
        const grupoActual = grupoActualDe(grupos);

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
      mensaje: `Su asesor designado aprobó la actividad ${codigoActividad(actividad)} (${actividad.titulo || "sin título"}).`,
    });

    await registrarEvento({
      propuestaId: actividad.propuestaId,
      actorId: session.userId,
      actorRol: "asesor",
      tipo: "actividad_aprobada",
      descripcion: `Aprobó la actividad ${codigoActividad(actividad)} (${actividad.titulo || "sin título"}).`,
      detalle: comentario,
      referencia: `actividad:${actividadId}`,
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
      mensaje: `Su asesor designado solicitó correcciones en la actividad ${codigoActividad(actividad)}. Revise las observaciones y vuelva a enviarla.`,
    });

    await registrarEvento({
      propuestaId: actividad.propuestaId,
      actorId: session.userId,
      actorRol: "asesor",
      tipo: "actividad_observada",
      descripcion: `Solicitó correcciones en la actividad ${codigoActividad(actividad)} (${actividad.titulo || "sin título"}).`,
      detalle: comentario,
      referencia: `actividad:${actividadId}`,
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
        const grupoActual = grupoActualDe(grupos);

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
        const [visita] = await db
          .select({ estado: informesVisita.estado })
          .from(informesVisita)
          .where(eq(informesVisita.propuestaId, prop.id))
          .limit(1);

        return {
          propuestaId: prop.id,
          numero: prop.numero,
          visitaCompletada: visita?.estado === "completado",
          egresado,
          asesor: asesor?.nombreCompleto || "Sin asignar",
          asesorId: asesor?.id ?? null,
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
