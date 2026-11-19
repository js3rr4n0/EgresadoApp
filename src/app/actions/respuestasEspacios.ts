"use server";

// Respuestas de los espacios de la ficha que no existían en la fase 1 (entrega P2): bloques de texto y, desde el
// catálogo ampliado, imágenes, archivos, enlaces y listas (guardados como JSON en el mismo campo).
// Las reglas (obligatorio, palabras, cantidades y formatos) salen de la ficha ligada a la propuesta.
import { db } from "@/lib/db";
import { planesTrabajo, propuestas, respuestasEspacios } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { espaciosPropuesta, fichaDePropuesta } from "@/lib/fichas/fichaDePropuesta";
import { esEtapaProtocolo, type ClaveElemento, type Espacio } from "@/lib/fichas/tipos";
import {
  leerItems,
  limitesRecurso,
  problemasRecurso,
  TIPOS_ARCHIVO,
  columnasTabla,
  type ArchivoEspacio,
  type EnlaceEspacio,
  type ImagenEspacio,
} from "@/lib/fichas/elementosRecurso";
import { leerFuenteImagen, leerOrigenImagen, validarOrigenImagen } from "@/lib/fuenteImagen";
import { MAX_CARACTERES_LEYENDA } from "@/lib/reglasRegistroActividad";
import { guardarComoTexto, leerTabla, tipoApartado, type ContenidoApartado } from "@/lib/fichas/apartadosAcademicos";
import { conCitas, guardarParrafos, leerParrafos } from "@/lib/fichas/fuentes";
import { limpiarRecursos, reglasRecursos } from "@/lib/fichas/recursos";
import { fuentesDePropuesta } from "./fuentesTrabajo";

const palabras = (t: string) => (t.trim() ? t.trim().split(/\s+/).length : 0);

export async function guardarRespuestaEspacio(propuestaId: number, espacioId: string, contenido: string) {
  try {
    const ctx = await espacioEditable(propuestaId, espacioId, ["texto"]);
    if (!ctx.ok) return { success: false, error: ctx.error };
    const { espacio, session } = ctx;
    if (espacio.origenFase1) return { success: false, error: "Este paso no existe en la ficha de la propuesta." };

    const texto = contenido.trim();
    const n = palabras(texto);
    const min = Number(espacio.parametros.minPalabras) || 0;
    const max = Number(espacio.parametros.maxPalabras) || 0;
    if (espacio.obligatorio && !texto) return { success: false, error: `"${espacio.titulo}" es obligatorio.` };
    if (texto && min > 0 && n < min) return { success: false, error: `"${espacio.titulo}" necesita al menos ${min} palabras (lleva ${n}).` };
    if (max > 0 && n > max) return { success: false, error: `"${espacio.titulo}" admite hasta ${max} palabras (lleva ${n}).` };

    await db
      .insert(respuestasEspacios)
      .values({ propuestaId, espacioId, contenido: texto, actualizadoPor: session.userId, actualizadoEn: new Date() })
      .onConflictDoUpdate({
        target: [respuestasEspacios.propuestaId, respuestasEspacios.espacioId],
        set: { contenido: texto, actualizadoPor: session.userId, actualizadoEn: new Date() },
      });

    refrescar();
    return { success: true };
  } catch (error) {
    console.error("Error guardarRespuestaEspacio:", error);
    return { success: false, error: "No se pudo guardar el paso." };
  }
}

/** Respuestas de la propuesta, por id de espacio. */
export async function getRespuestasEspacios(propuestaId: number): Promise<Record<string, string>> {
  const session = await getSession();
  if (!session) return {};
  const filas = await db
    .select({ espacioId: respuestasEspacios.espacioId, contenido: respuestasEspacios.contenido })
    .from(respuestasEspacios)
    .where(and(eq(respuestasEspacios.propuestaId, propuestaId)));
  return Object.fromEntries(filas.map((f) => [f.espacioId, f.contenido ?? ""]));
}

// ─────────────── Recursos: imagen, archivo, enlace y lista (catálogo ampliado, parte 1) ───────────────

type ResultadoEspacio = { success: true } | { success: false; error: string };

/** Estados de la propuesta en los que el equipo redacta el protocolo y el plan de trabajo. */
const ESTADOS_CON_PLAN = ["aprobada", "primer_contacto_completado", "en_ejecucion"];

function refrescar() {
  revalidatePath("/egresado/redactar");
  revalidatePath("/egresado/plan");
}

/**
 * Espacio de la ficha que el usuario puede editar ahora. En la propuesta: el líder, mientras se redacta. En el
 * protocolo (I3): el líder, después de aprobada la propuesta y mientras el plan no esté enviado ni aprobado.
 */
async function espacioEditable<E extends ClaveElemento>(propuestaId: number, espacioId: string, elementos: E[]) {
  const session = await getSession();
  if (!session || session.rol !== "egresado") return { ok: false, error: "No autorizado" } as const;
  const [prop] = await db.select().from(propuestas).where(eq(propuestas.id, propuestaId)).limit(1);
  const ficha = await fichaDePropuesta(propuestaId);
  const enPropuesta = ficha ? espaciosPropuesta(ficha.definicion).find((e) => e.id === espacioId) : undefined;
  const enProtocolo = !enPropuesta ? ficha?.definicion.etapas.find(esEtapaProtocolo)?.espacios.find((e) => e.id === espacioId) : undefined;
  const espacio = enPropuesta ?? enProtocolo;
  if (!prop || !ficha?.version || !espacio || !(elementos as string[]).includes(espacio.elemento)) return { ok: false, error: "Este paso no existe en la ficha de la propuesta." } as const;
  if (prop.egresadoId !== session.userId) return { ok: false, error: `Solo el líder del equipo puede redactar ${enProtocolo ? "el protocolo" : "la propuesta"}.` } as const;
  if (enPropuesta && (prop.estado !== "redactando" || prop.bloqueada)) return { ok: false, error: "La propuesta no se puede modificar en su estado actual." } as const;
  if (enProtocolo) {
    if (!ESTADOS_CON_PLAN.includes(prop.estado)) return { ok: false, error: "El protocolo se redacta después de aprobada la propuesta." } as const;
    const [plan] = await db.select({ estado: planesTrabajo.estado }).from(planesTrabajo).where(eq(planesTrabajo.propuestaId, propuestaId));
    if (plan && (plan.estado === "enviado" || plan.estado === "aprobado")) return { ok: false, error: "El protocolo ya se envió al asesor; no se puede modificar." } as const;
  }
  const [fila] = await db
    .select({ contenido: respuestasEspacios.contenido })
    .from(respuestasEspacios)
    .where(and(eq(respuestasEspacios.propuestaId, propuestaId), eq(respuestasEspacios.espacioId, espacioId)));
  return { ok: true, session, espacio: espacio as Espacio & { elemento: E }, actual: fila?.contenido ?? null } as const;
}

async function guardarItems(propuestaId: number, espacioId: string, usuarioId: number, items: unknown[]) {
  const contenido = JSON.stringify(items);
  await db
    .insert(respuestasEspacios)
    .values({ propuestaId, espacioId, contenido, actualizadoPor: usuarioId, actualizadoEn: new Date() })
    .onConflictDoUpdate({
      target: [respuestasEspacios.propuestaId, respuestasEspacios.espacioId],
      set: { contenido, actualizadoPor: usuarioId, actualizadoEn: new Date() },
    });
  refrescar();
}

/** Recursos y presupuesto (ajustes al protocolo, 19-nov-2026): se guarda la lista limpia; el mínimo se exige al enviar. */
export async function guardarRespuestaRecursos(propuestaId: number, espacioId: string, items: unknown[]): Promise<ResultadoEspacio> {
  try {
    const ctx = await espacioEditable(propuestaId, espacioId, ["recursos_presupuesto"]);
    if (!ctx.ok) return { success: false, error: ctx.error };
    await guardarItems(propuestaId, espacioId, ctx.session.userId, limpiarRecursos(items, reglasRecursos(ctx.espacio)));
    return { success: true };
  } catch (error) {
    console.error("Error guardarRespuestaRecursos:", error);
    return { success: false, error: "No se pudieron guardar los recursos." };
  }
}

/** Enlaces, lista o tabla: se guarda la lista completa. La cantidad mínima se exige para avanzar, no para guardar. */
export async function guardarRespuestaRecurso(propuestaId: number, espacioId: string, items: unknown[]): Promise<ResultadoEspacio> {
  try {
    const ctx = await espacioEditable(propuestaId, espacioId, ["enlace", "lista", "tabla"]);
    if (!ctx.ok) return { success: false, error: ctx.error };
    const { espacio, session } = ctx;
    const lista = Array.isArray(items) ? items : [];
    const columnas = columnasTabla(espacio).length;
    const limpios =
      espacio.elemento === "tabla"
        ? lista
            .map((f) => Array.from({ length: columnas }, (_, i) => String((Array.isArray(f) ? f[i] : "") ?? "").trim().slice(0, 1000)))
            .filter((f) => f.some(Boolean))
        : espacio.elemento === "lista"
        ? lista.map((x) => String(x ?? "").trim().slice(0, 2000)).filter(Boolean)
        : lista
            .map((x) => ({
              url: String((x as EnlaceEspacio)?.url ?? "").trim().slice(0, 2000),
              descripcion: String((x as EnlaceEspacio)?.descripcion ?? "").trim().slice(0, 255),
            }))
            .filter((x) => x.url || x.descripcion);
    const problemas = problemasRecurso({ ...espacio, obligatorio: false, parametros: { ...espacio.parametros, minimo: 0 } }, limpios);
    if (problemas.length > 0) return { success: false, error: problemas[0] };
    await guardarItems(propuestaId, espacioId, session.userId, limpios);
    return { success: true };
  } catch (error) {
    console.error("Error guardarRespuestaRecurso:", error);
    return { success: false, error: "No se pudo guardar el paso." };
  }
}

/** Imagen o archivo: se agrega uno por vez (con su pie y su origen, si es imagen). */
export async function agregarArchivoEspacio(propuestaId: number, espacioId: string, formData: FormData): Promise<ResultadoEspacio> {
  try {
    const ctx = await espacioEditable(propuestaId, espacioId, ["imagen", "archivo"]);
    if (!ctx.ok) return { success: false, error: ctx.error };
    const { espacio, session, actual } = ctx;
    const items = leerItems(espacio.elemento, actual);
    const { max } = limitesRecurso(espacio);
    if (items.length >= max) return { success: false, error: `"${espacio.titulo}" admite como máximo ${max}.` };
    const raw = formData.get("archivo");
    if (!raw || typeof raw === "string") return { success: false, error: "Selecciona un archivo." };
    const archivo = raw as File;
    const comoUrl = async () => `data:${archivo.type};base64,${Buffer.from(await archivo.arrayBuffer()).toString("base64")}`;

    if (espacio.elemento === "imagen") {
      if (!/^image\/(png|jpe?g)$/.test(archivo.type)) return { success: false, error: "La imagen debe ser PNG o JPG." };
      if (archivo.size > 8 * 1024 * 1024) return { success: false, error: "La imagen excede el tamaño máximo de 8 MB." };
      const leyenda = String(formData.get("leyenda") || "").trim();
      if (leyenda.length < 3) return { success: false, error: "Escribe el pie de la imagen." };
      if (leyenda.length > MAX_CARACTERES_LEYENDA) return { success: false, error: `El pie de imagen admite como máximo ${MAX_CARACTERES_LEYENDA} caracteres.` };
      let origen: string | null = null;
      let fuente: unknown = null;
      if (espacio.parametros.pedirOrigen !== false) {
        origen = leerOrigenImagen(formData.get("origen"));
        try {
          fuente = origen === "externa" ? leerFuenteImagen(JSON.parse(String(formData.get("fuente") || "null"))) : null;
        } catch {
          fuente = null;
        }
        const problemas = validarOrigenImagen(origen, fuente);
        if (problemas.length > 0) return { success: false, error: problemas[0] };
      }
      const nueva: ImagenEspacio = { url: await comoUrl(), leyenda, origen, fuente };
      await guardarItems(propuestaId, espacioId, session.userId, [...items, nueva]);
    } else {
      const permitidos = (Array.isArray(espacio.parametros.tipos) ? espacio.parametros.tipos : ["pdf"]) as string[];
      const tipo = TIPOS_ARCHIVO.find((t) => permitidos.includes(t.valor) && t.mime.includes(archivo.type));
      if (!tipo) {
        const lista = TIPOS_ARCHIVO.filter((t) => permitidos.includes(t.valor)).map((t) => t.etiqueta).join(", ");
        return { success: false, error: `Formato no permitido. Se aceptan: ${lista}.` };
      }
      const maxMB = Number(espacio.parametros.maxMB) || 5;
      if (archivo.size > maxMB * 1024 * 1024) return { success: false, error: `El archivo excede el tamaño máximo de ${maxMB} MB.` };
      const nuevo: ArchivoEspacio = { url: await comoUrl(), nombre: archivo.name.slice(0, 255), tipo: tipo.valor };
      await guardarItems(propuestaId, espacioId, session.userId, [...items, nuevo]);
    }
    return { success: true };
  } catch (error) {
    console.error("Error agregarArchivoEspacio:", error);
    return { success: false, error: "No se pudo adjuntar el archivo." };
  }
}

export async function quitarArchivoEspacio(propuestaId: number, espacioId: string, indice: number): Promise<ResultadoEspacio> {
  try {
    const ctx = await espacioEditable(propuestaId, espacioId, ["imagen", "archivo"]);
    if (!ctx.ok) return { success: false, error: ctx.error };
    const items = leerItems(ctx.espacio.elemento, ctx.actual);
    if (!Number.isInteger(indice) || indice < 0 || indice >= items.length) return { success: false, error: "El archivo no existe." };
    await guardarItems(propuestaId, espacioId, ctx.session.userId, items.filter((_, i) => i !== indice));
    return { success: true };
  } catch (error) {
    console.error("Error quitarArchivoEspacio:", error);
    return { success: false, error: "No se pudo quitar el archivo." };
  }
}

// ─────────────── Apartado académico (redacción académica guiada, 13-nov-2026) ───────────────

/**
 * Guarda los subapartados y la autoevaluación de un apartado académico. Se guarda aunque esté incompleto (es un
 * borrador); los mínimos se exigen al ratificar y enviar el protocolo.
 */
export async function guardarRespuestaApartado(propuestaId: number, espacioId: string, contenido: ContenidoApartado): Promise<ResultadoEspacio> {
  try {
    const ctx = await espacioEditable(propuestaId, espacioId, ["apartado"]);
    if (!ctx.ok) return { success: false, error: ctx.error };
    const tipo = tipoApartado(ctx.espacio);
    if (!tipo) return { success: false, error: "El tipo de este apartado no existe." };
    const partes: Record<string, string> = {};
    // Párrafos citados: solo fuentes del registro, y la cita se arma aquí con sus datos actuales.
    const mapa = tipo.partes.some((p) => p.formato === "citado")
      ? new Map((await fuentesDePropuesta(propuestaId)).map((f) => [f.id, f.datos]))
      : null;
    for (const p of tipo.partes) {
      const v = contenido?.partes?.[p.id];
      if (typeof v !== "string") continue;
      if (p.formato === "citado" && mapa) {
        const parrafos = leerParrafos(v).slice(0, 80).map((x) => ({ texto: x.texto.slice(0, 6000), fuentes: x.fuentes.slice(0, 20) }));
        const limpios = conCitas(parrafos, mapa).filter((x) => x.texto.trim() || x.fuentes.length);
        if (limpios.length) partes[p.id] = guardarParrafos(limpios);
      } else if (p.formato === "tabla") {
        const filas = leerTabla(v, p.columnas?.length ?? 1).map((f) => f.map((x) => x.trim().slice(0, 2000))).filter((f) => f.some(Boolean));
        if (filas.length) partes[p.id] = JSON.stringify(filas.slice(0, 50));
      } else if (p.formato === "seleccion") {
        if (p.opciones?.some((o) => o.valor === v)) partes[p.id] = v;
      } else if (v.trim()) partes[p.id] = v.trim().slice(0, 60000);
    }
    const autoevaluacion = (Array.isArray(contenido?.autoevaluacion) ? contenido.autoevaluacion : [])
      .filter((n) => Number.isInteger(n) && n >= 0 && n < tipo.autoevaluacion.length);
    await guardarTexto(propuestaId, espacioId, ctx.session.userId, guardarComoTexto({ partes, autoevaluacion: [...new Set(autoevaluacion)] }));
    return { success: true };
  } catch (error) {
    console.error("Error guardarRespuestaApartado:", error);
    return { success: false, error: "No se pudo guardar el apartado." };
  }
}

async function guardarTexto(propuestaId: number, espacioId: string, usuarioId: number, contenido: string) {
  await db
    .insert(respuestasEspacios)
    .values({ propuestaId, espacioId, contenido, actualizadoPor: usuarioId, actualizadoEn: new Date() })
    .onConflictDoUpdate({
      target: [respuestasEspacios.propuestaId, respuestasEspacios.espacioId],
      set: { contenido, actualizadoPor: usuarioId, actualizadoEn: new Date() },
    });
  refrescar();
}
