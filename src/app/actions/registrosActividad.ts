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
  imagenesActividad,
  borradoresRevision,
} from "@/lib/schema";
import { getSession } from "@/lib/session";
import { eq, and, inArray, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { ensureInformesMensuales } from "./informesMensuales";
import {
  ensureRegistros,
  calcularHabilitacion,
  calcularMetricaPaginas,
  getActividadesPospuestas,
  grupoActualDe,
  estadoSemanaAsesor,
  contarSemanasPorRevisar,
  getPeriodosPropuesta,
  conteoImagenesSemana,
  codigoActividad,
  validarContenidoRegistro,
  ESTADOS_REGISTRADOS,
} from "@/lib/habilitacionActividades";
import { hoyISOElSalvador, rangoSemanaISO, nombreInforme } from "@/lib/periodosPasantia";
import { registrarEvento } from "@/lib/bitacora";
import { normalizarTexto, mencionaPasante } from "@/lib/reglasRegistroActividad";
import { palabrasDudosas } from "@/lib/ortografia";
import {
  leerComentariosSecciones,
  resumenComentarios,
  contarComentarios,
  textosComentarios,
  MIN_CARACTERES_COMENTARIO,
  type ComentariosSecciones,
} from "@/lib/comentariosRevision";
import { createHash } from "crypto";
import { leerDatosCita, textoCitaApa, type DatosCitaApa } from "@/lib/citaApa";
import {
  leerOrigenImagen,
  leerFuenteImagen,
  validarOrigenImagen,
  type FuenteImagen,
} from "@/lib/fuenteImagen";

const MAX_ANEXOS_ACTIVIDAD = 10;

/** Imágenes adicionales (de soporte y anexos) de los registros indicados, en orden de carga. */
async function imagenesAdicionalesDe(registroIds: number[]) {
  if (registroIds.length === 0) return [];
  return db
    .select()
    .from(imagenesActividad)
    .where(inArray(imagenesActividad.registroId, registroIds))
    .orderBy(asc(imagenesActividad.id));
}

/** Origen y fuente enviados en el formulario de carga de una imagen. */
function leerOrigenFormulario(formData: FormData) {
  const origen = leerOrigenImagen(formData.get("origen"));
  let fuente: FuenteImagen | null = null;
  try {
    fuente = leerFuenteImagen(JSON.parse(String(formData.get("fuente") || "null")));
  } catch {
    fuente = null;
  }
  return { origen, fuente: origen === "externa" ? fuente : null };
}

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
    const pospuestas = await getActividadesPospuestas(propuestaId);

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
    // Entrega esperada: último día del período de 30 días; el límite de la cohorte es el máximo permitido.
    const periodoActual = grupoActual ? (await getPeriodosPropuesta(propuestaId)).find((p) => p.num === grupoActual.periodo) : undefined;
    const fechaEntregaMesActual = periodoActual?.fin ?? fechaLimiteMesActual ?? null;

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
          pospuesta: pospuestas.has(x.actividad.id),
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
                imagenOrigen: x.registro.imagenOrigen,
                imagenFuente: x.registro.imagenFuente,
                citaApaDatos: x.registro.citaApaDatos,
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
      fechaEntregaMesActual,
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

    const adicionales = registro ? await imagenesAdicionalesDe([registro.id]) : [];

    return {
      success: true,
      actividad: { ...actividad, codigo: codigoActividad(actividad) },
      registro,
      imagenes: adicionales.map((i) => ({ id: i.id, tipo: i.tipo, url: i.url, leyenda: i.leyenda, origen: i.origen, fuente: i.fuente })),
      imagenesSemana: await conteoImagenesSemana(actividad.propuestaId, actividad.periodo, actividad.semana),
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
  datos: {
    descriptor: string;
    marcoTeorico: string;
    /** Referencia por campos (APA 7); null conserva la referencia de texto libre registrada antes. */
    citaApaDatos: DatosCitaApa | null;
    conclusionTecnica: string;
    leyendaImagen?: string;
    imagenOrigen?: string | null;
    imagenFuente?: FuenteImagen | null;
  }
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

    const citaDatos = leerDatosCita(datos.citaApaDatos);
    await db
      .update(registrosActividad)
      .set({
        // Una actividad observada conserva ese estado mientras se corrige, hasta que la semana se reenvía.
        estado: registro.estado === "observado" ? "observado" : "guardado",
        // Sin espacios dobles ni líneas en blanco; la referencia se arma con el formato APA 7 a partir de sus campos.
        descriptor: normalizarTexto(datos.descriptor),
        marcoTeorico: normalizarTexto(datos.marcoTeorico),
        conclusionTecnica: normalizarTexto(datos.conclusionTecnica),
        ...(citaDatos ? { citaApaDatos: citaDatos, citaApa: textoCitaApa(citaDatos) } : {}),
        // El pie solo se edita mientras exista la imagen; la fecha de realización se asigna al enviar la semana.
        ...(registro.imagenUrl && datos.leyendaImagen !== undefined ? { leyendaImagen: datos.leyendaImagen.trim() || null } : {}),
        ...(registro.imagenUrl && datos.imagenOrigen !== undefined
          ? {
              imagenOrigen: leerOrigenImagen(datos.imagenOrigen),
              imagenFuente: leerOrigenImagen(datos.imagenOrigen) === "externa" ? leerFuenteImagen(datos.imagenFuente) : null,
            }
          : {}),
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
export async function enviarSemanaActividades(propuestaId: number, declaraAutoria: boolean) {
  try {
    const session = await getSession();
    if (!session || !session.userId || session.rol !== "egresado") {
      return { success: false, error: "No autorizado" };
    }
    // Declaración de producción propia (rúbrica): sin ella no se envía la semana.
    if (declaraAutoria !== true) {
      return { success: false, error: "Para enviar la semana debe declarar que todo el contenido es de su autoría." };
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
        declaracionAutoriaEn: enviadoEn,
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
      descripcion: `Envió al asesor la Semana ${grupo.semana} del Período ${grupo.periodo}: ${porEnviar.map((x) => codigoActividad(x.actividad)).join(", ")}. Declaró que el contenido es de su autoría.`,
      referencia: `semana:${grupo.periodo}.${grupo.semana}`,
    });

    if (prop.asesorId) {
      await db.insert(notificaciones).values({
        usuarioId: prop.asesorId,
        tipo: "actividad_registrada",
        mensaje: `El estudiante de la propuesta #${prop.numero} envió ${porEnviar.length} actividad${porEnviar.length > 1 ? "es" : ""} de la Semana ${grupo.semana} del Período ${grupo.periodo} para su revisión.`,
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
    const { origen, fuente } = leerOrigenFormulario(formData);
    const problemasOrigen = validarOrigenImagen(origen, fuente);
    if (problemasOrigen.length > 0) return { success: false, error: problemasOrigen[0] };
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
      .set({ imagenUrl, leyendaImagen: leyenda, numeroImagen, imagenOrigen: origen, imagenFuente: fuente, actualizadoEn: new Date() })
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
      .set({ imagenUrl: null, leyendaImagen: null, numeroImagen: null, imagenOrigen: null, imagenFuente: null, actualizadoEn: new Date() })
      .where(eq(registrosActividad.actividadId, actividadId));

    revalidatePath(`/egresado/reportes/actividad/${actividadId}`);
    return { success: true };
  } catch (err: any) {
    console.error("Error al eliminar imagen:", err);
    return { success: false, error: err.message || "Error al eliminar la imagen" };
  }
}

/**
 * Imagen adicional de una actividad. "soporte": va en el informe y cuenta para el límite semanal (la imagen principal de
 * cada actividad tiene su espacio reservado). "anexo": figura adicional para los anexos del informe final.
 */
export async function subirImagenAdicional(actividadId: number, formData: FormData) {
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
    const [registro] = await db.select().from(registrosActividad).where(eq(registrosActividad.actividadId, actividadId)).limit(1);
    if (!registro) return { success: false, error: "Registro no encontrado" };
    if (registro.estado === "enviado" || registro.estado === "aprobado") {
      return { success: false, error: "Esta actividad ya fue enviada y no admite cambios." };
    }

    const tipo = formData.get("tipo") === "anexo" ? "anexo" : "soporte";
    const rawFile = formData.get("archivo");
    if (!rawFile || typeof rawFile === "string") return { success: false, error: "Debe seleccionar una imagen válida." };
    const archivo = rawFile as File;
    if (archivo.size > 8 * 1024 * 1024) return { success: false, error: "La imagen excede el tamaño máximo permitido de 8MB." };
    if (!archivo.type.startsWith("image/")) return { success: false, error: "El archivo debe ser una imagen (PNG o JPG)." };

    const leyenda = ((formData.get("leyenda") as string) || "").trim();
    if (leyenda.length < 3) return { success: false, error: "Debe indicar el pie de imagen antes de adjuntarla." };
    const { origen, fuente } = leerOrigenFormulario(formData);
    const problemasOrigen = validarOrigenImagen(origen, fuente);
    if (problemasOrigen.length > 0) return { success: false, error: problemasOrigen[0] };

    const existentes = await imagenesAdicionalesDe([registro.id]);
    if (tipo === "soporte") {
      if (!registro.imagenUrl) {
        return { success: false, error: "Primero adjunte la imagen de soporte principal de la actividad." };
      }
      const conteo = await conteoImagenesSemana(actividad.propuestaId, actividad.periodo, actividad.semana);
      if (conteo.usadas + conteo.faltantesPrincipal >= conteo.limite) {
        return {
          success: false,
          error: `Usted ya alcanzó el límite de ${conteo.limite} imágenes de soporte por semana${
            conteo.faltantesPrincipal > 0 ? ` (se reservan ${conteo.faltantesPrincipal} para las imágenes principales pendientes)` : ""
          }. Puede agregar esta imagen como anexo.`,
        };
      }
    } else if (existentes.filter((i) => i.tipo === "anexo").length >= MAX_ANEXOS_ACTIVIDAD) {
      return { success: false, error: `Cada actividad admite un máximo de ${MAX_ANEXOS_ACTIVIDAD} imágenes de anexo.` };
    }

    const buffer = Buffer.from(await archivo.arrayBuffer());
    await db.insert(imagenesActividad).values({
      registroId: registro.id,
      tipo,
      url: `data:${archivo.type};base64,${buffer.toString("base64")}`,
      leyenda,
      origen: origen!,
      fuente,
    });
    await db.update(registrosActividad).set({ actualizadoEn: new Date() }).where(eq(registrosActividad.id, registro.id));

    await registrarEvento({
      propuestaId: actividad.propuestaId,
      actorId: session.userId,
      actorRol: "egresado",
      tipo: "actividad_imagen",
      descripcion: `Adjuntó ${tipo === "anexo" ? "una imagen de anexo" : "una imagen de soporte adicional"} a la actividad ${codigoActividad(actividad)}: «${leyenda}».`,
      referencia: `actividad:${actividadId}`,
    });

    revalidatePath(`/egresado/reportes/actividad/${actividadId}`);
    return { success: true };
  } catch (err: any) {
    console.error("Error al subir imagen adicional:", err);
    return { success: false, error: err.message || "Error al subir la imagen" };
  }
}

export async function eliminarImagenAdicional(imagenId: number) {
  try {
    const session = await getSession();
    if (!session || !session.userId || session.rol !== "egresado") {
      return { success: false, error: "No autorizado" };
    }
    const [fila] = await db
      .select({ imagen: imagenesActividad, registro: registrosActividad, propuestaId: actividades.propuestaId })
      .from(imagenesActividad)
      .innerJoin(registrosActividad, eq(registrosActividad.id, imagenesActividad.registroId))
      .innerJoin(actividades, eq(actividades.id, registrosActividad.actividadId))
      .where(eq(imagenesActividad.id, imagenId))
      .limit(1);
    if (!fila) return { success: false, error: "Imagen no encontrada" };
    const [prop] = await db.select().from(propuestas).where(eq(propuestas.id, fila.propuestaId)).limit(1);
    if (!prop || prop.egresadoId !== session.userId) return { success: false, error: "No tiene permisos sobre esta imagen." };
    if (fila.registro.estado === "enviado" || fila.registro.estado === "aprobado") {
      return { success: false, error: "Esta actividad ya fue enviada y no admite cambios." };
    }

    await db.delete(imagenesActividad).where(eq(imagenesActividad.id, imagenId));
    revalidatePath(`/egresado/reportes/actividad/${fila.registro.actividadId}`);
    return { success: true };
  } catch (err: any) {
    console.error("Error al eliminar imagen adicional:", err);
    return { success: false, error: err.message || "Error al eliminar la imagen" };
  }
}

// ─────────────────────────── Revisión del Asesor ───────────────────────────

/** Plazo recomendado para que el asesor revise una entrega (semana o informe). */
const DIAS_PLAZO_REVISION = 3;

function diasDesde(fecha: Date | string | null | undefined) {
  return fecha ? Math.max(0, Math.floor((Date.now() - new Date(fecha).getTime()) / (1000 * 60 * 60 * 24))) : 0;
}

export interface EntradaBandejaAsesor {
  clave: string;
  tipo: "semana" | "informe";
  propuestaId: number;
  egresado: { nombreCompleto: string; carnet: string };
  titulo: string;
  detalle: string;
  enviadoEn: Date | null;
  diasEsperando: number;
  fueraDePlazo: boolean;
  href: string;
}

/**
 * Resumen del seguimiento de los estudiantes del asesor y su bandeja global de revisión: las semanas enviadas y los
 * informes por aprobar de todos sus estudiantes, ordenados por días de espera (lo más urgente primero).
 */
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
        const pendientesRevision = contarSemanasPorRevisar(grupos);

        const [egresado] = await db.select().from(usuarios).where(eq(usuarios.id, prop.egresadoId)).limit(1);
        const infResult = await ensureInformesMensuales(prop.id);
        const informes = "informes" in infResult && infResult.informes ? infResult.informes : [];
        const datosEgresado = { nombreCompleto: egresado?.nombreCompleto ?? "", carnet: egresado?.carnet ?? "" };

        const semanasPendientes: EntradaBandejaAsesor[] = grupos
          .filter((g) => estadoSemanaAsesor(g.actividades.map((x) => x.registro?.estado || "pendiente")) === "por_revisar")
          .map((g) => {
            const envios = g.actividades.map((x) => x.registro?.enviadoEn?.getTime() ?? 0);
            const enviadoEn = Math.max(...envios) > 0 ? new Date(Math.max(...envios)) : null;
            const dias = diasDesde(enviadoEn);
            const porRevisar = g.actividades.filter((x) => x.registro?.estado === "enviado").length;
            return {
              clave: `s-${prop.id}-${g.periodo}.${g.semana}`,
              tipo: "semana" as const,
              propuestaId: prop.id,
              egresado: datosEgresado,
              titulo: `Período ${g.periodo}, Semana ${g.semana}`,
              detalle: `${porRevisar} de ${g.actividades.length} actividad${g.actividades.length === 1 ? "" : "es"} por revisar`,
              enviadoEn,
              diasEsperando: dias,
              fueraDePlazo: dias > DIAS_PLAZO_REVISION,
              href: `/asesor/seguimiento/${prop.id}/semana/${g.periodo}/${g.semana}`,
            };
          });
        const informesPendientes: EntradaBandejaAsesor[] = informes
          .filter((i) => i.estado === "enviado")
          .map((i) => {
            const dias = diasDesde(i.enviadoEn);
            return {
              clave: `i-${i.id}`,
              tipo: "informe" as const,
              propuestaId: prop.id,
              egresado: datosEgresado,
              titulo: nombreInforme(i.numero),
              detalle: i.cumplimiento === "fuera_de_tiempo" ? "Entregado fuera de tiempo" : "Por aprobar",
              enviadoEn: i.enviadoEn,
              diasEsperando: dias,
              fueraDePlazo: dias > DIAS_PLAZO_REVISION,
              href: `/asesor/seguimiento/${prop.id}/informe/${i.id}`,
            };
          });

        // Estatus del estudiante para el panel: lo que requiere la atención del asesor o del estudiante.
        const hoy = hoyISOElSalvador();
        const periodosProp = await getPeriodosPropuesta(prop.id);
        const enCorreccion = grupos.filter(
          (g) => estadoSemanaAsesor(g.actividades.map((x) => x.registro?.estado || "pendiente")) === "en_correccion"
        ).length;
        const informesAtrasados = informes.filter((i) => {
          if (i.estado === "enviado" || i.estado === "aprobado") return false;
          const entrega = periodosProp.find((p) => p.num === i.numero)?.fin ?? i.fechaLimite;
          return entrega < hoy;
        });
        const estatus: { id: "semana" | "informe" | "correccion" | "atrasado" | "al_dia"; label: string }[] = [
          ...(semanasPendientes.length ? [{ id: "semana" as const, label: semanasPendientes.length > 1 ? `${semanasPendientes.length} semanas por revisar` : "Semana por revisar" }] : []),
          ...(informesPendientes.length ? [{ id: "informe" as const, label: informesPendientes.length > 1 ? `${informesPendientes.length} informes por aprobar` : "Informe por aprobar" }] : []),
          ...(enCorreccion ? [{ id: "correccion" as const, label: "En corrección" }] : []),
          ...(informesAtrasados.length
            ? [{ id: "atrasado" as const, label: `Atrasado (Informe #${informesAtrasados.map((i) => i.numero).join(", #")})` }]
            : []),
        ];
        if (estatus.length === 0) estatus.push({ id: "al_dia", label: "Al día" });

        return {
          propuestaId: prop.id,
          numero: prop.numero,
          egresado: datosEgresado,
          estatus,
          bandeja: [...semanasPendientes, ...informesPendientes],
          porcentajeAvance,
          mesActual: grupoActual?.periodo ?? null,
          semanaActual: grupoActual?.semana ?? null,
          pendientesRevision,
          informesPorRevisar: informes.filter((i) => i.estado === "enviado").length,
        };
      })
    );

    const estudiantes = resumen.filter((r) => r !== null);
    const bandeja = estudiantes
      .flatMap((e) => e.bandeja)
      .sort((a, b) => b.diasEsperando - a.diasEsperando || (a.enviadoEn?.getTime() ?? 0) - (b.enviadoEn?.getTime() ?? 0));
    return {
      success: true,
      // La bandeja de cada estudiante ya va consolidada en la bandeja global.
      estudiantes: estudiantes.map((e) => ({ ...e, bandeja: undefined })),
      bandeja,
      diasPlazoRevision: DIAS_PLAZO_REVISION,
    };
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
    const pendientesRevision = contarSemanasPorRevisar(grupos);

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
        estadoSemana: estadoSemanaAsesor(g.actividades.map((x) => x.registro?.estado || "pendiente")),
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

/** Contenido de una actividad al momento de revisarla; se compara con el que el estudiante reenvía. */
interface VersionRevisada {
  marcoTeorico: string | null;
  citaApa: string | null;
  descriptor: string | null;
  conclusionTecnica: string | null;
  leyendaImagen: string | null;
  imagenHash: string | null;
  adicionales: number[];
}

function huellaImagen(url: string | null | undefined) {
  return url ? createHash("sha1").update(url).digest("hex") : null;
}

function versionDe(r: typeof registrosActividad.$inferSelect, adicionales: number[]): VersionRevisada {
  return {
    marcoTeorico: r.marcoTeorico,
    citaApa: r.citaApa,
    descriptor: r.descriptor,
    conclusionTecnica: r.conclusionTecnica,
    leyendaImagen: r.leyendaImagen,
    imagenHash: huellaImagen(r.imagenUrl),
    adicionales,
  };
}

function leerVersion(valor: unknown): VersionRevisada | null {
  if (!valor || typeof valor !== "object") return null;
  const v = valor as Partial<VersionRevisada>;
  const texto = (x: unknown) => (typeof x === "string" ? x : null);
  return {
    marcoTeorico: texto(v.marcoTeorico),
    citaApa: texto(v.citaApa),
    descriptor: texto(v.descriptor),
    conclusionTecnica: texto(v.conclusionTecnica),
    leyendaImagen: texto(v.leyendaImagen),
    imagenHash: texto(v.imagenHash),
    adicionales: Array.isArray(v.adicionales) ? v.adicionales.filter((x): x is number => typeof x === "number") : [],
  };
}

async function cargarSemanaAsesor(propuestaId: number, periodo: number, semana: number) {
  const session = await getSession();
  if (!session || !session.userId || session.rol !== "asesor") {
    return { error: "No autorizado" };
  }

  const [prop] = await db.select().from(propuestas).where(eq(propuestas.id, propuestaId)).limit(1);
  if (!prop || prop.asesorId !== session.userId) {
    return { error: "No tiene permisos sobre esta propuesta." };
  }

  const { actividades: acts, registros } = await ensureRegistros(propuestaId);
  const grupos = calcularHabilitacion(acts, new Map(registros.map((r) => [r.actividadId, r])));
  const indice = grupos.findIndex((g) => g.periodo === periodo && g.semana === semana);
  if (indice === -1) return { error: "La semana indicada no tiene actividades en el cronograma." };

  return { error: undefined, session, prop, grupos, indice, grupo: grupos[indice] };
}

/** Semana completa para el asesor: contenido de cada actividad (incluidos los borradores) y estado de la revisión. */
export async function getSemanaRevision(propuestaId: number, periodo: number, semana: number) {
  try {
    const ctx = await cargarSemanaAsesor(propuestaId, periodo, semana);
    if (ctx.error !== undefined) return { success: false as const, error: ctx.error };
    const { prop, grupos, indice, grupo } = ctx;

    const [egresado] = await db.select().from(usuarios).where(eq(usuarios.id, prop.egresadoId)).limit(1);
    const periodoProp = (await getPeriodosPropuesta(propuestaId)).find((p) => p.num === periodo);
    const rango =
      periodoProp?.inicio && periodoProp.fin ? rangoSemanaISO(periodoProp.inicio, periodoProp.fin, semana, periodoProp.semanas) : null;
    const anterior = grupos[indice - 1];
    const siguiente = grupos[indice + 1];
    const adicionales = await imagenesAdicionalesDe(
      grupo.actividades.map((x) => x.registro?.id).filter((id): id is number => id !== undefined)
    );
    // Verificaciones automáticas de apoyo al asesor: ortografía (o palabras en otro idioma) y sujeto de ejecución.
    const ortografia = new Map(
      await Promise.all(
        grupo.actividades.map(
          async (x) =>
            [x.actividad.id, await palabrasDudosas(x.registro?.marcoTeorico, x.registro?.descriptor, x.registro?.conclusionTecnica)] as const
        )
      )
    );
    const [borrador] = await db
      .select()
      .from(borradoresRevision)
      .where(and(eq(borradoresRevision.propuestaId, propuestaId), eq(borradoresRevision.periodo, periodo), eq(borradoresRevision.semana, semana)))
      .limit(1);
    const datosBorrador = (borrador?.datos ?? {}) as { comentarios?: Record<string, unknown>; vistas?: unknown };

    return {
      success: true as const,
      borrador: borrador
        ? {
            comentarios: Object.fromEntries(
              Object.entries(datosBorrador.comentarios ?? {}).map(([id, c]) => [Number(id), leerComentariosSecciones(c)])
            ) as Record<number, ComentariosSecciones>,
            vistas: Array.isArray(datosBorrador.vistas) ? datosBorrador.vistas.filter((v): v is number => typeof v === "number") : [],
            actualizadoEn: borrador.actualizadoEn,
          }
        : null,
      propuestaId,
      egresado: { nombreCompleto: egresado?.nombreCompleto ?? "", carnet: egresado?.carnet ?? "" },
      periodo,
      semana,
      rango,
      estadoSemana: estadoSemanaAsesor(grupo.actividades.map((x) => x.registro?.estado || "pendiente")),
      anterior: anterior ? { periodo: anterior.periodo, semana: anterior.semana } : null,
      siguiente: siguiente ? { periodo: siguiente.periodo, semana: siguiente.semana } : null,
      actividades: grupo.actividades.map((x) => ({
        id: x.actividad.id,
        codigo: codigoActividad(x.actividad),
        titulo: x.actividad.titulo || x.actividad.descripcion,
        estado: x.registro?.estado || "pendiente",
        fecha: x.registro?.fecha ?? null,
        enviadoEn: x.registro?.enviadoEn ?? null,
        actualizadoEn: x.registro?.actualizadoEn ?? null,
        marcoTeorico: x.registro?.marcoTeorico ?? null,
        citaApa: x.registro?.citaApa ?? null,
        citaApaDatos: x.registro?.citaApaDatos ?? null,
        descriptor: x.registro?.descriptor ?? null,
        conclusionTecnica: x.registro?.conclusionTecnica ?? null,
        imagenUrl: x.registro?.imagenUrl ?? null,
        leyendaImagen: x.registro?.leyendaImagen ?? null,
        numeroImagen: x.registro?.numeroImagen ?? null,
        imagenOrigen: x.registro?.imagenOrigen ?? null,
        imagenFuente: x.registro?.imagenFuente ?? null,
        comentariosSecciones: leerComentariosSecciones(x.registro?.comentariosSecciones),
        revisadoEn: x.registro?.revisadoEn ?? null,
        imagenes: adicionales
          .filter((i) => i.registroId === x.registro?.id)
          .map((i) => ({ id: i.id, tipo: i.tipo, url: i.url, leyenda: i.leyenda, origen: i.origen, fuente: i.fuente })),
        comentarioAsesor: x.registro?.comentarioAsesor ?? null,
        palabrasDudosas: ortografia.get(x.actividad.id) ?? [],
        sinSujeto: !!x.registro?.descriptor && !mencionaPasante(x.registro.descriptor),
        declaracionAutoriaEn: x.registro?.declaracionAutoriaEn ?? null,
        // Versión revisada anteriormente (si la semana se reenvió) y si las imágenes cambiaron desde entonces.
        ...(() => {
          const version = x.registro ? leerVersion(x.registro.versionRevisada) : null;
          if (!version || !x.registro) return { versionAnterior: null, cambiosImagenes: null };
          const idsActuales = adicionales.filter((i) => i.registroId === x.registro!.id && i.tipo === "soporte").map((i) => i.id);
          return {
            versionAnterior: {
              marcoTeorico: version.marcoTeorico,
              citaApa: version.citaApa,
              descriptor: version.descriptor,
              conclusionTecnica: version.conclusionTecnica,
              leyendaImagen: version.leyendaImagen,
            },
            cambiosImagenes: {
              principal: version.imagenHash !== huellaImagen(x.registro.imagenUrl),
              adicionales:
                idsActuales.length !== version.adicionales.length || idsActuales.some((id) => !version.adicionales.includes(id)),
            },
          };
        })(),
      })),
    };
  } catch (err: any) {
    console.error("Error en getSemanaRevision:", err);
    return { success: false as const, error: err.message || "Error al obtener la semana" };
  }
}

/**
 * Revisión de la semana completa, con comentarios por apartado de cada actividad (marco teórico, descripción, imágenes,
 * conclusión y general). "aprobar" aprueba todas sus actividades (los comentarios quedan como retroalimentación).
 * "corregir" devuelve la semana: las actividades con comentarios quedan para corregir y el estudiante debe reenviar la
 * semana; la aprobación siempre es de la semana entera.
 */
export async function revisarSemanaActividades(
  propuestaId: number,
  periodo: number,
  semana: number,
  decision: "aprobar" | "corregir",
  observaciones: { actividadId: number; comentarios: ComentariosSecciones }[]
) {
  try {
    const ctx = await cargarSemanaAsesor(propuestaId, periodo, semana);
    if (ctx.error !== undefined) return { success: false, error: ctx.error };
    const { session, prop, grupo } = ctx;

    if (estadoSemanaAsesor(grupo.actividades.map((x) => x.registro?.estado || "pendiente")) !== "por_revisar") {
      return { success: false, error: "Esta semana no está pendiente de revisión." };
    }

    const porRevisar = grupo.actividades.filter((x) => x.registro?.estado === "enviado");
    const comentariosPorActividad = new Map(
      observaciones
        .map((o) => [o.actividadId, leerComentariosSecciones(o.comentarios)] as const)
        .filter(([, c]) => contarComentarios(c) > 0)
    );
    if ([...comentariosPorActividad.values()].some((c) => textosComentarios(c).some((t) => t.length < MIN_CARACTERES_COMENTARIO))) {
      return { success: false, error: `Cada comentario debe tener al menos ${MIN_CARACTERES_COMENTARIO} caracteres.` };
    }
    const observadas = porRevisar.filter((x) => comentariosPorActividad.has(x.actividad.id));
    if (decision === "corregir" && observadas.length === 0) {
      return { success: false, error: "Escriba al menos un comentario en alguna actividad para devolver la semana." };
    }
    const comentariosDe = (actividadId: number) => comentariosPorActividad.get(actividadId) ?? null;

    const ahora = new Date();
    const adicionalesSemana = await imagenesAdicionalesDe(porRevisar.map((x) => x.registro!.id));
    const versionActual = (x: (typeof porRevisar)[number]) =>
      versionDe(
        x.registro!,
        adicionalesSemana.filter((i) => i.registroId === x.registro!.id && i.tipo === "soporte").map((i) => i.id)
      );
    const comandos =
      decision === "aprobar"
        ? porRevisar.map((x) =>
            db
              .update(registrosActividad)
              .set({
                estado: "aprobado",
                comentarioAsesor: comentariosDe(x.actividad.id) ? resumenComentarios(comentariosDe(x.actividad.id)!) : null,
                comentariosSecciones: comentariosDe(x.actividad.id),
                versionRevisada: versionActual(x),
                revisadoPor: session.userId,
                revisadoEn: ahora,
                actualizadoEn: ahora,
              })
              .where(eq(registrosActividad.actividadId, x.actividad.id))
          )
        : porRevisar.map((x) =>
            db
              .update(registrosActividad)
              .set(
                comentariosDe(x.actividad.id)
                  ? {
                      estado: "observado",
                      comentarioAsesor: resumenComentarios(comentariosDe(x.actividad.id)!),
                      comentariosSecciones: comentariosDe(x.actividad.id),
                      versionRevisada: versionActual(x),
                      revisadoPor: session.userId,
                      revisadoEn: ahora,
                      actualizadoEn: ahora,
                    }
                  : // Sin comentarios: sigue enviada; solo se registra la versión revisada para la comparación posterior.
                    { versionRevisada: versionActual(x), comentariosSecciones: null }
              )
              .where(eq(registrosActividad.actividadId, x.actividad.id))
          );
    await db.batch(comandos as unknown as Parameters<typeof db.batch>[0]);
    await db
      .delete(borradoresRevision)
      .where(and(eq(borradoresRevision.propuestaId, propuestaId), eq(borradoresRevision.periodo, periodo), eq(borradoresRevision.semana, semana)));

    const etiquetaSemana = `la Semana ${semana} del Período ${periodo}`;
    const codigosObservados = observadas.map((x) => codigoActividad(x.actividad)).join(", ");
    await db.insert(notificaciones).values({
      usuarioId: prop.egresadoId,
      tipo: decision === "aprobar" ? "actividad_aprobada" : "actividad_observada",
      mensaje:
        decision === "aprobar"
          ? `Su asesor designado aprobó ${etiquetaSemana}.`
          : `Su asesor designado solicitó correcciones en ${etiquetaSemana} (actividades ${codigosObservados}). Corríjalas y vuelva a enviar la semana.`,
    });

    await registrarEvento({
      propuestaId,
      actorId: session.userId,
      actorRol: "asesor",
      tipo: decision === "aprobar" ? "semana_aprobada" : "semana_observada",
      descripcion:
        decision === "aprobar"
          ? `Aprobó ${etiquetaSemana}: ${grupo.actividades.map((x) => codigoActividad(x.actividad)).join(", ")}.`
          : `Devolvió ${etiquetaSemana} con observaciones en las actividades ${codigosObservados}.`,
      detalle:
        observadas.map((x) => `${codigoActividad(x.actividad)}\n${resumenComentarios(comentariosDe(x.actividad.id)!)}`).join("\n\n") ||
        undefined,
      referencia: `semana:${periodo}.${semana}`,
    });

    revalidatePath(`/asesor/seguimiento/${propuestaId}`);
    revalidatePath(`/egresado/reportes`);
    return { success: true };
  } catch (err: any) {
    console.error("Error al revisar la semana de actividades:", err);
    return { success: false, error: err.message || "Error al registrar la revisión" };
  }
}

/**
 * Guarda los comentarios de una revisión aún no registrada (borrador del asesor). El egresado no los ve hasta que el
 * asesor aprueba o devuelve la semana.
 */
export async function guardarBorradorRevision(
  propuestaId: number,
  periodo: number,
  semana: number,
  datos: { comentarios: Record<number, ComentariosSecciones>; vistas: number[] }
) {
  try {
    const ctx = await cargarSemanaAsesor(propuestaId, periodo, semana);
    if (ctx.error !== undefined) return { success: false, error: ctx.error };
    const { session, grupo } = ctx;
    if (estadoSemanaAsesor(grupo.actividades.map((x) => x.registro?.estado || "pendiente")) !== "por_revisar") {
      return { success: false, error: "Esta semana no está pendiente de revisión." };
    }

    const idsSemana = new Set(grupo.actividades.map((x) => x.actividad.id));
    const comentarios = Object.fromEntries(
      Object.entries(datos.comentarios ?? {})
        .filter(([id]) => idsSemana.has(Number(id)))
        .map(([id, c]) => [id, leerComentariosSecciones(c)] as const)
        .filter(([, c]) => contarComentarios(c) > 0)
    );
    const vistas = (datos.vistas ?? []).filter((id) => idsSemana.has(id));
    const ahora = new Date();

    await db
      .insert(borradoresRevision)
      .values({ propuestaId, periodo, semana, asesorId: session.userId, datos: { comentarios, vistas }, actualizadoEn: ahora })
      .onConflictDoUpdate({
        target: [borradoresRevision.propuestaId, borradoresRevision.periodo, borradoresRevision.semana],
        set: { datos: { comentarios, vistas }, asesorId: session.userId, actualizadoEn: ahora },
      });
    return { success: true, guardadoEn: ahora };
  } catch (err: any) {
    console.error("Error al guardar el borrador de la revisión:", err);
    return { success: false, error: err.message || "Error al guardar el borrador" };
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
        const pendientesRevision = contarSemanasPorRevisar(grupos);

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
