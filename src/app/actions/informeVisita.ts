"use server";

import { db } from "@/lib/db";
import { informesVisita, informesMensuales, propuestas, usuarios, empresas, supervisores, periodos } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { registrarEvento } from "@/lib/bitacora";
import {
  SECCIONES_VISITA,
  MAX_FOTOS_VISITA,
  validarInformeVisita,
  idExplicacion,
  esVisitaVirtual,
  DIA_INICIO_VISITA,
  DIA_FIN_VISITA,
  type Respuestas,
  type FotoVisita,
  type AutorizacionVisita,
} from "@/lib/formularioVisita";
import { getPeriodosPropuesta } from "@/lib/habilitacionActividades";
import { sumarDiasISO } from "@/lib/periodosPasantia";

const TAMANO_MAXIMO_AUTORIZACION = 5 * 1024 * 1024;
const TIPOS_AUTORIZACION = ["application/pdf", "image/png", "image/jpeg"];

/** Inicio de la pasantía: primer día del primer período de 30 días. */
async function inicioPasantia(propuestaId: number) {
  return (await getPeriodosPropuesta(propuestaId))[0]?.inicio ?? null;
}

const TAMANO_MAXIMO_FOTO = 6 * 1024 * 1024;
const LARGO_MAXIMO_TEXTO = 3000;
const IDS_PREGUNTAS = new Set(
  SECCIONES_VISITA.flatMap((s) =>
    s.preguntas.flatMap((p) => [p.id, ...(p.otro ? [`${p.id}_otro`] : []), ...(p.tipo === "opcion" ? [idExplicacion(p)] : [])])
  )
);

/** Acceso de lectura: asesor asignado, coordinador, administrador o decanato. Edición: solo el asesor asignado. */
async function cargarPropuesta(propuestaId: number) {
  const session = await getSession();
  if (!session || !session.userId) return { error: "No autenticado" as const };
  const [prop] = await db.select().from(propuestas).where(eq(propuestas.id, propuestaId)).limit(1);
  if (!prop) return { error: "Propuesta no encontrada" as const };
  const esAsesor = session.rol === "asesor" && prop.asesorId === session.userId;
  const puedeLeer = esAsesor || ["coordinador", "admin", "decanato"].includes(session.rol);
  if (!puedeLeer) return { error: "No tiene permisos sobre esta propuesta." as const };
  return { session, prop, esAsesor };
}

async function informe3Aprobado(propuestaId: number) {
  const [inf] = await db
    .select({ estado: informesMensuales.estado })
    .from(informesMensuales)
    .where(and(eq(informesMensuales.propuestaId, propuestaId), eq(informesMensuales.numero, 3)))
    .limit(1);
  return inf?.estado === "aprobado";
}

async function cargarParaEditar(propuestaId: number) {
  const ctx = await cargarPropuesta(propuestaId);
  if (ctx.error !== undefined) return { error: ctx.error };
  if (!ctx.esAsesor) return { error: "Solo el asesor designado puede registrar el informe de visita." as const };
  if (ctx.prop.tipo !== "pasantia" || ctx.prop.estado !== "en_ejecucion") {
    return { error: "El informe de visita se registra mientras la pasantía está en ejecución." as const };
  }
  if (await informe3Aprobado(propuestaId)) {
    return { error: "El Informe #3 ya fue aprobado; el informe de visita no admite cambios." as const };
  }
  const [visita] = await db.select().from(informesVisita).where(eq(informesVisita.propuestaId, propuestaId)).limit(1);
  return { ...ctx, visita: visita || null };
}

function limpiarRespuestas(entrada: Respuestas): Respuestas {
  const salida: Respuestas = {};
  for (const [clave, valor] of Object.entries(entrada || {})) {
    if (!IDS_PREGUNTAS.has(clave)) continue;
    if (Array.isArray(valor)) {
      const lista = valor.filter((x) => typeof x === "string").map((x) => x.trim().slice(0, LARGO_MAXIMO_TEXTO)).filter(Boolean);
      if (lista.length) salida[clave] = lista;
    } else if (typeof valor === "string" && valor.trim()) {
      salida[clave] = valor.trim().slice(0, LARGO_MAXIMO_TEXTO);
    }
  }
  return salida;
}

export async function getInformeVisita(propuestaId: number) {
  try {
    const ctx = await cargarPropuesta(propuestaId);
    if ("error" in ctx) return { success: false, error: ctx.error };
    const { prop, esAsesor } = ctx;

    const [visita] = await db.select().from(informesVisita).where(eq(informesVisita.propuestaId, propuestaId)).limit(1);
    const [egresado] = await db.select().from(usuarios).where(eq(usuarios.id, prop.egresadoId)).limit(1);
    const asesor = prop.asesorId ? (await db.select().from(usuarios).where(eq(usuarios.id, prop.asesorId)).limit(1))[0] : null;
    const empresa = prop.empresaId ? (await db.select().from(empresas).where(eq(empresas.id, prop.empresaId)).limit(1))[0] : null;
    const supervisor = prop.supervisorId
      ? (await db.select().from(supervisores).where(eq(supervisores.id, prop.supervisorId)).limit(1))[0]
      : null;
    const [periodo] = await db.select().from(periodos).where(eq(periodos.id, prop.periodoId)).limit(1);
    const bloqueado = await informe3Aprobado(propuestaId);

    return {
      success: true,
      propuesta: { id: prop.id, numero: prop.numero, tipo: prop.tipo, estado: prop.estado },
      datos: {
        tipoTrabajo: prop.tipo === "pasantia" ? "Pasantía" : prop.tipo,
        egresado: egresado?.nombreCompleto || "—",
        carnet: egresado?.carnet || "—",
        asesor: asesor?.nombreCompleto || "—",
        empresa: empresa?.nombre || "—",
        supervisor: supervisor ? `${supervisor.nombres} ${supervisor.apellidos}` : "—",
        cargoSupervisor: supervisor?.cargo || "—",
      },
      // Ventana oficial: entre los días 90 y 100 después del inicio de la pasantía (si no se conoce el inicio, la de la cohorte).
      ventanaVisita: await (async () => {
        const inicio = await inicioPasantia(propuestaId);
        if (inicio) return { inicio: sumarDiasISO(inicio, DIA_INICIO_VISITA), fin: sumarDiasISO(inicio, DIA_FIN_VISITA), inicioPasantia: inicio };
        return periodo ? { inicio: periodo.visitaAsesorInicio, fin: periodo.visitaAsesorFin, inicioPasantia: null } : null;
      })(),
      autorizacion: (visita?.autorizacion as AutorizacionVisita | null) ?? null,
      visita: visita
        ? {
            estado: visita.estado,
            respuestas: (visita.respuestas || {}) as Respuestas,
            fotos: (visita.fotos || []) as FotoVisita[],
            completadoEn: visita.completadoEn ? visita.completadoEn.toISOString() : null,
          }
        : { estado: "borrador", respuestas: {} as Respuestas, fotos: [] as FotoVisita[], completadoEn: null },
      puedeEditar: esAsesor && prop.tipo === "pasantia" && prop.estado === "en_ejecucion" && !bloqueado,
    };
  } catch (err: any) {
    console.error("Error en getInformeVisita:", err);
    return { success: false, error: err.message || "Error al obtener el informe de visita" };
  }
}

/** Guarda el formulario. Con `completar`, valida todos los apartados y las fotografías y lo marca como completado. */
export async function guardarInformeVisita(propuestaId: number, respuestas: Respuestas, completar: boolean) {
  try {
    const ctx = await cargarParaEditar(propuestaId);
    if ("error" in ctx) return { success: false, error: ctx.error };

    const limpias = limpiarRespuestas(respuestas);
    const fotos = (ctx.visita?.fotos || []) as FotoVisita[];
    const autorizacion = (ctx.visita?.autorizacion as AutorizacionVisita | null) ?? null;
    if (completar) {
      const problemas = validarInformeVisita(limpias, fotos, autorizacion);
      if (problemas.length > 0) {
        return { success: false, error: "Faltan apartados por completar:", problemas };
      }
    }

    const ahora = new Date();
    const valores = {
      respuestas: limpias,
      // Si la visita deja de ser virtual, el correo de autorización ya no aplica.
      ...(esVisitaVirtual(limpias) ? {} : { autorizacion: null }),
      estado: completar ? "completado" : "borrador",
      completadoEn: completar ? ahora : null,
      asesorId: ctx.session.userId,
      actualizadoEn: ahora,
    };
    if (ctx.visita) {
      await db.update(informesVisita).set(valores).where(eq(informesVisita.propuestaId, propuestaId));
    } else {
      await db.insert(informesVisita).values({ propuestaId, ...valores });
    }

    await registrarEvento({
      propuestaId,
      actorId: ctx.session.userId,
      actorRol: "asesor",
      tipo: completar ? "visita_completada" : "visita_actualizada",
      descripcion: completar
        ? `Completó el informe de visita a la empresa${typeof limpias.fecha_visita === "string" ? ` (visita del ${limpias.fecha_visita.split("-").reverse().join("/")})` : ""}.`
        : "Guardó un borrador del informe de visita a la empresa.",
      referencia: "visita",
      agruparMinutos: completar ? undefined : 60,
    });

    revalidatePath(`/asesor/seguimiento/${propuestaId}`);
    revalidatePath(`/asesor/seguimiento/${propuestaId}/visita`);
    return { success: true };
  } catch (err: any) {
    console.error("Error al guardar informe de visita:", err);
    return { success: false, error: err.message || "Error al guardar el informe de visita" };
  }
}

export async function subirFotoVisita(propuestaId: number, formData: FormData) {
  try {
    const ctx = await cargarParaEditar(propuestaId);
    if ("error" in ctx) return { success: false, error: ctx.error };

    const archivo = formData.get("archivo");
    const leyenda = String(formData.get("leyenda") || "").trim();
    if (!archivo || typeof archivo === "string") return { success: false, error: "Debe seleccionar una fotografía." };
    if (!archivo.type.startsWith("image/")) return { success: false, error: "El archivo debe ser una imagen (JPG o PNG)." };
    if (archivo.size > TAMANO_MAXIMO_FOTO) return { success: false, error: "La fotografía excede el tamaño máximo de 6 MB." };
    if (leyenda.length < 3) return { success: false, error: "Debe indicar el pie de imagen de la fotografía." };

    const fotos = (ctx.visita?.fotos || []) as FotoVisita[];
    if (fotos.length >= MAX_FOTOS_VISITA) {
      return { success: false, error: `Se admite un máximo de ${MAX_FOTOS_VISITA} fotografías.` };
    }

    const buffer = Buffer.from(await archivo.arrayBuffer());
    const nuevas = [...fotos, { url: `data:${archivo.type};base64,${buffer.toString("base64")}`, leyenda: leyenda.slice(0, 255) }];
    if (ctx.visita) {
      await db.update(informesVisita).set({ fotos: nuevas, actualizadoEn: new Date() }).where(eq(informesVisita.propuestaId, propuestaId));
    } else {
      await db.insert(informesVisita).values({ propuestaId, fotos: nuevas, asesorId: ctx.session.userId });
    }

    await registrarEvento({
      propuestaId,
      actorId: ctx.session.userId,
      actorRol: "asesor",
      tipo: "visita_actualizada",
      descripcion: `Adjuntó una fotografía de la visita a la empresa: «${leyenda.slice(0, 255)}».`,
      referencia: "visita",
    });

    revalidatePath(`/asesor/seguimiento/${propuestaId}/visita`);
    return { success: true };
  } catch (err: any) {
    console.error("Error al subir fotografía de visita:", err);
    return { success: false, error: err.message || "Error al subir la fotografía" };
  }
}

/** Correo de autorización del decanato para la visita virtual (PDF o imagen). */
export async function subirAutorizacionVisita(propuestaId: number, formData: FormData) {
  try {
    const ctx = await cargarParaEditar(propuestaId);
    if ("error" in ctx) return { success: false, error: ctx.error };

    const archivo = formData.get("archivo");
    if (!archivo || typeof archivo === "string") return { success: false, error: "Debe seleccionar el archivo del correo de autorización." };
    if (!TIPOS_AUTORIZACION.includes(archivo.type)) return { success: false, error: "El archivo debe ser PDF, PNG o JPG." };
    if (archivo.size > TAMANO_MAXIMO_AUTORIZACION) return { success: false, error: "El archivo excede el tamaño máximo de 5 MB." };

    const buffer = Buffer.from(await archivo.arrayBuffer());
    const autorizacion: AutorizacionVisita = {
      url: `data:${archivo.type};base64,${buffer.toString("base64")}`,
      nombre: (archivo.name || "autorizacion").slice(0, 200),
    };
    if (ctx.visita) {
      await db.update(informesVisita).set({ autorizacion, actualizadoEn: new Date() }).where(eq(informesVisita.propuestaId, propuestaId));
    } else {
      await db.insert(informesVisita).values({ propuestaId, autorizacion, asesorId: ctx.session.userId });
    }

    await registrarEvento({
      propuestaId,
      actorId: ctx.session.userId,
      actorRol: "asesor",
      tipo: "visita_actualizada",
      descripcion: `Adjuntó el correo de autorización del decanato para la visita virtual (${autorizacion.nombre}).`,
      referencia: "visita",
    });

    revalidatePath(`/asesor/seguimiento/${propuestaId}/visita`);
    return { success: true };
  } catch (err: any) {
    console.error("Error al subir la autorización de la visita:", err);
    return { success: false, error: err.message || "Error al subir el archivo" };
  }
}

export async function eliminarAutorizacionVisita(propuestaId: number) {
  try {
    const ctx = await cargarParaEditar(propuestaId);
    if ("error" in ctx) return { success: false, error: ctx.error };
    if (!ctx.visita) return { success: false, error: "No hay un correo de autorización registrado." };
    // Sin la autorización, una visita virtual deja de estar completa.
    const virtual = esVisitaVirtual((ctx.visita.respuestas || {}) as Respuestas);
    const estado = virtual && ctx.visita.estado === "completado" ? "borrador" : ctx.visita.estado;
    await db
      .update(informesVisita)
      .set({ autorizacion: null, estado, completadoEn: estado === "completado" ? ctx.visita.completadoEn : null, actualizadoEn: new Date() })
      .where(eq(informesVisita.propuestaId, propuestaId));
    revalidatePath(`/asesor/seguimiento/${propuestaId}/visita`);
    return { success: true };
  } catch (err: any) {
    console.error("Error al eliminar la autorización de la visita:", err);
    return { success: false, error: err.message || "Error al eliminar el archivo" };
  }
}

export async function eliminarFotoVisita(propuestaId: number, indice: number) {
  try {
    const ctx = await cargarParaEditar(propuestaId);
    if ("error" in ctx) return { success: false, error: ctx.error };
    if (!ctx.visita) return { success: false, error: "No hay fotografías registradas." };

    const fotos = (ctx.visita.fotos || []) as FotoVisita[];
    if (indice < 0 || indice >= fotos.length) return { success: false, error: "Fotografía no encontrada." };
    const restantes = fotos.filter((_, i) => i !== indice);
    // Sin fotografías el informe deja de estar completo.
    const estado = restantes.length === 0 && ctx.visita.estado === "completado" ? "borrador" : ctx.visita.estado;

    await db
      .update(informesVisita)
      .set({ fotos: restantes, estado, completadoEn: estado === "completado" ? ctx.visita.completadoEn : null, actualizadoEn: new Date() })
      .where(eq(informesVisita.propuestaId, propuestaId));

    revalidatePath(`/asesor/seguimiento/${propuestaId}/visita`);
    return { success: true };
  } catch (err: any) {
    console.error("Error al eliminar fotografía de visita:", err);
    return { success: false, error: err.message || "Error al eliminar la fotografía" };
  }
}
