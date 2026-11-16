"use server";

// Productos por objetivo específico (notas del 13-nov-2026). Cuando todas las actividades de un objetivo llegan al
// 100 %, quien lo tiene a cargo entrega los productos prometidos en el plan y la conclusión del objetivo; el asesor
// revisa todo junto (aprueba o pide correcciones). Las reglas puras están en lib/fichas/entregasObjetivo.ts.
import { db } from "@/lib/db";
import { entregasObjetivo, notificaciones, productosObjetivo, propuestas } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { aplanar, productosDe } from "@/lib/fichas/planTrabajo";
import { avanceObjetivo, problemasEntrega, quienesEntregan } from "@/lib/fichas/entregasObjetivo";
import { leerEvidenciaFormulario } from "@/lib/evidenciaArchivo";
import { limpiarModificacion } from "@/lib/fichas/bitacora";
import { getEjecucionProyecto, type DatosEjecucion } from "./ejecucionProyecto";

type Resultado = { success: true } | { success: false; error: string; problemas?: string[] };

const MAX_ARCHIVOS_POR_PRODUCTO = 5;

function refrescar() {
  revalidatePath("/egresado/ejecucion");
  revalidatePath("/egresado/ejecucion/objetivo");
  revalidatePath("/asesor/ejecucion/[propuestaId]", "layout");
}

export interface ArchivoProductoCompleto {
  id: number;
  producto: number;
  tipo: "imagen" | "documento" | "enlace";
  url: string;
  nombre: string | null;
  leyenda: string;
  origen: string | null;
  fuente: unknown;
}

/** Objetivo, entrega y permisos del integrante que la edita. */
function contexto(datos: DatosEjecucion, objetivoId: string) {
  const { plan } = datos;
  const objetivo = aplanar(plan.plan.arbol).find((n) => n.id === objetivoId && n.nivel === 2);
  if (!objetivo) return { error: "El objetivo no existe en el plan." } as const;
  if (datos.productos === "no") return { error: "La ficha de esta propuesta no pide productos por objetivo." } as const;
  const entrega = datos.entregas.find((e) => e.nodoId === objetivoId) ?? null;
  const propia = quienesEntregan(plan.plan.arbol, objetivoId).includes(plan.miId);
  const avance = avanceObjetivo(objetivo, datos.registros);
  return { objetivo, entrega, propia, avance, productos: productosDe(objetivo) } as const;
}

const editable = (estado: string | undefined) => !estado || estado === "borrador" || estado === "observado";

/** Crea la entrega en borrador si todavía no existe y devuelve su id. */
async function asegurarEntrega(propuestaId: number, nodoId: string, egresadoId: number): Promise<number | null> {
  await db.insert(entregasObjetivo).values({ propuestaId, nodoId, egresadoId, estado: "borrador" }).onConflictDoNothing();
  const [e] = await db.select({ id: entregasObjetivo.id }).from(entregasObjetivo).where(and(eq(entregasObjetivo.propuestaId, propuestaId), eq(entregasObjetivo.nodoId, nodoId)));
  return e?.id ?? null;
}

export async function guardarEntregaObjetivo(
  propuestaId: number,
  objetivoId: string,
  conclusion: string,
  enviar: boolean,
  modificacion: { tipo: string | null; texto: string } = { tipo: null, texto: "" }
): Promise<Resultado> {
  try {
    const res = await getEjecucionProyecto(propuestaId);
    if (!res.success) return res;
    const { plan, periodoActual } = res.datos;
    if (plan.rol !== "lider" && plan.rol !== "integrante") return { success: false, error: "Solo los integrantes entregan productos." };
    const ctx = contexto(res.datos, objetivoId);
    if ("error" in ctx) return { success: false, error: ctx.error! };
    if (!ctx.propia) return { success: false, error: "Este objetivo está a cargo de otro integrante." };
    if (!editable(ctx.entrega?.estado)) return { success: false, error: "La entrega ya fue enviada al asesor." };
    if (!ctx.avance.completo) return { success: false, error: "La entrega se habilita cuando todas las actividades del objetivo llegan al 100 %." };

    const texto = conclusion.trim().slice(0, 10000);
    if (enviar) {
      const problemas = problemasEntrega({ completo: ctx.avance.completo, productos: ctx.productos, archivos: ctx.entrega?.archivos ?? [], conclusion: texto });
      if (problemas.length > 0) return { success: false, error: "La entrega todavía no está completa.", problemas };
    }
    const estado = enviar ? "enviado" : ctx.entrega?.estado === "observado" ? "observado" : "borrador";
    const valores = { conclusion: texto, ...(res.datos.modificaciones ? limpiarModificacion(modificacion.tipo, modificacion.texto) : {}), estado, egresadoId: plan.miId, actualizadoEn: new Date(), ...(enviar ? { enviadoEn: new Date(), periodo: periodoActual } : {}) };
    await db
      .insert(entregasObjetivo)
      .values({ propuestaId, nodoId: objetivoId, ...valores })
      .onConflictDoUpdate({ target: [entregasObjetivo.propuestaId, entregasObjetivo.nodoId], set: valores });

    if (enviar) {
      const [p] = await db.select({ asesorId: propuestas.asesorId, numero: propuestas.numero }).from(propuestas).where(eq(propuestas.id, propuestaId));
      if (p?.asesorId) {
        await db.insert(notificaciones).values({
          usuarioId: p.asesorId,
          tipo: "entrega_objetivo_enviada",
          mensaje: `Propuesta #${p.numero}: se entregaron los productos del objetivo ${ctx.objetivo.codigo} "${ctx.objetivo.titulo}".`,
        });
      }
    }
    refrescar();
    return { success: true };
  } catch (error) {
    console.error("Error guardarEntregaObjetivo:", error);
    return { success: false, error: "No se pudo guardar la entrega." };
  }
}

export async function subirProductoObjetivo(propuestaId: number, objetivoId: string, producto: number, formData: FormData): Promise<Resultado> {
  try {
    const res = await getEjecucionProyecto(propuestaId);
    if (!res.success) return res;
    const { plan } = res.datos;
    if (plan.rol !== "lider" && plan.rol !== "integrante") return { success: false, error: "Solo los integrantes entregan productos." };
    const ctx = contexto(res.datos, objetivoId);
    if ("error" in ctx) return { success: false, error: ctx.error! };
    if (!ctx.propia) return { success: false, error: "Este objetivo está a cargo de otro integrante." };
    if (!editable(ctx.entrega?.estado)) return { success: false, error: "La entrega ya fue enviada al asesor." };
    if (!ctx.avance.completo) return { success: false, error: "La entrega se habilita cuando todas las actividades del objetivo llegan al 100 %." };
    if (!Number.isInteger(producto) || producto < 0 || producto >= ctx.productos.length) return { success: false, error: "Ese producto no está en el plan." };
    if ((ctx.entrega?.archivos.filter((a) => a.producto === producto).length ?? 0) >= MAX_ARCHIVOS_POR_PRODUCTO) {
      return { success: false, error: `Cada producto admite como máximo ${MAX_ARCHIVOS_POR_PRODUCTO} archivos o enlaces.` };
    }
    const leida = await leerEvidenciaFormulario(formData);
    if (!leida.ok) return { success: false, error: leida.error };
    const entregaId = ctx.entrega?.id ?? (await asegurarEntrega(propuestaId, objetivoId, plan.miId));
    if (!entregaId) return { success: false, error: "No se pudo preparar la entrega." };
    await db.insert(productosObjetivo).values({ entregaId, producto, ...leida.valores });
    await db.update(entregasObjetivo).set({ actualizadoEn: new Date() }).where(eq(entregasObjetivo.id, entregaId));
    refrescar();
    return { success: true };
  } catch (error) {
    console.error("Error subirProductoObjetivo:", error);
    return { success: false, error: "No se pudo adjuntar el producto." };
  }
}

export async function eliminarProductoObjetivo(propuestaId: number, objetivoId: string, archivoId: number): Promise<Resultado> {
  try {
    const res = await getEjecucionProyecto(propuestaId);
    if (!res.success) return res;
    const ctx = contexto(res.datos, objetivoId);
    if ("error" in ctx) return { success: false, error: ctx.error! };
    if (!ctx.propia || (res.datos.plan.rol !== "lider" && res.datos.plan.rol !== "integrante")) return { success: false, error: "Este objetivo está a cargo de otro integrante." };
    if (!ctx.entrega || !ctx.entrega.archivos.some((a) => a.id === archivoId)) return { success: false, error: "El archivo no existe." };
    if (!editable(ctx.entrega.estado)) return { success: false, error: "La entrega ya fue enviada al asesor." };
    await db.delete(productosObjetivo).where(and(eq(productosObjetivo.id, archivoId), eq(productosObjetivo.entregaId, ctx.entrega.id)));
    refrescar();
    return { success: true };
  } catch (error) {
    console.error("Error eliminarProductoObjetivo:", error);
    return { success: false, error: "No se pudo quitar el archivo." };
  }
}

export async function revisarEntregaObjetivo(propuestaId: number, objetivoId: string, decision: "aprobar" | "observar", comentario: string): Promise<Resultado> {
  const session = await getSession();
  if (!session || session.rol !== "asesor") return { success: false, error: "No autorizado" };
  const res = await getEjecucionProyecto(propuestaId);
  if (!res.success) return res;
  if (res.datos.plan.rol !== "asesor") return { success: false, error: "Solo el asesor asignado revisa las entregas." };
  const ctx = contexto(res.datos, objetivoId);
  if ("error" in ctx) return { success: false, error: ctx.error! };
  if (ctx.entrega?.estado !== "enviado") return { success: false, error: "La entrega no está pendiente de revisión." };
  const texto = comentario.trim();
  if (decision === "observar" && texto.length < 10) return { success: false, error: "Escribe la observación (al menos 10 caracteres)." };
  await db
    .update(entregasObjetivo)
    .set({ estado: decision === "aprobar" ? "aprobado" : "observado", comentarioAsesor: texto || null, revisadoPor: session.userId, revisadoEn: new Date() })
    .where(eq(entregasObjetivo.id, ctx.entrega.id));
  await db.insert(notificaciones).values({
    usuarioId: ctx.entrega.egresadoId,
    tipo: decision === "aprobar" ? "entrega_objetivo_aprobada" : "entrega_objetivo_observada",
    mensaje: decision === "aprobar"
      ? `El asesor aprobó los productos del objetivo ${ctx.objetivo.codigo} "${ctx.objetivo.titulo}".`
      : `El asesor hizo observaciones a los productos del objetivo ${ctx.objetivo.codigo} "${ctx.objetivo.titulo}": ${texto}`,
  });
  refrescar();
  return { success: true };
}

/** Archivos con su contenido, para la página de la entrega y los informes. Solo de entregas de la propuesta. */
export async function getArchivosEntrega(propuestaId: number, entregaIds: number[]): Promise<(ArchivoProductoCompleto & { entregaId: number })[]> {
  const res = await getEjecucionProyecto(propuestaId);
  if (!res.success) return [];
  const propias = new Set(res.datos.entregas.map((e) => e.id));
  const ids = entregaIds.filter((id) => propias.has(id));
  if (ids.length === 0) return [];
  const filas = await Promise.all(ids.map((id) => db.select().from(productosObjetivo).where(eq(productosObjetivo.entregaId, id)).orderBy(asc(productosObjetivo.id))));
  return filas.flat().map((f) => ({
    id: f.id, entregaId: f.entregaId, producto: f.producto, tipo: f.tipo as ArchivoProductoCompleto["tipo"], url: f.url, nombre: f.nombre, leyenda: f.leyenda, origen: f.origen, fuente: f.fuente,
  }));
}
