"use server";

// Evidencias de cada actividad en la ejecución del proyecto (reunión 6-nov-2026): imágenes, documentos PDF o enlaces
// (por ejemplo, a un video) que respaldan su resultado. Las sube el responsable de la actividad mientras el registro
// no esté enviado; se numeran en el informe del período. Las imágenes piden su pie y su origen, como en pasantía.
import { db } from "@/lib/db";
import { evidenciasPlan, registrosPlan } from "@/lib/schema";
import { and, asc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { actividadesDelPeriodo, responsables } from "@/lib/fichas/planTrabajo";
import { leerFuenteImagen, leerOrigenImagen, validarOrigenImagen, type FuenteImagen } from "@/lib/fuenteImagen";
import { MAX_CARACTERES_LEYENDA } from "@/lib/reglasRegistroActividad";
import { getEjecucionProyecto } from "./ejecucionProyecto";

// Las páginas que muestran evidencias: la ejecución y la actividad (egresado y asesor).
function refrescar() {
  revalidatePath("/egresado/ejecucion");
  revalidatePath("/egresado/ejecucion/actividad");
  revalidatePath("/asesor/ejecucion/[propuestaId]", "layout");
}

const MB = 1024 * 1024;
const MAX_IMAGEN = 8 * MB;
const MAX_DOCUMENTO = 10 * MB;

type Resultado = { success: true } | { success: false; error: string };

export interface EvidenciaCompleta {
  id: number;
  registroId: number;
  tipo: "imagen" | "documento" | "enlace";
  url: string;
  nombre: string | null;
  leyenda: string;
  origen: string | null;
  fuente: unknown;
}

function leerOrigen(formData: FormData) {
  const origen = leerOrigenImagen(formData.get("origen"));
  let fuente: FuenteImagen | null = null;
  try {
    fuente = leerFuenteImagen(JSON.parse(String(formData.get("fuente") || "null")));
  } catch {
    fuente = null;
  }
  return { origen, fuente: origen === "externa" ? fuente : null };
}

const enlaceValido = (t: string) => {
  try {
    const u = new URL(t);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
};

export async function subirEvidenciaPlan(propuestaId: number, nodoId: string, periodo: number, formData: FormData): Promise<Resultado> {
  try {
    const res = await getEjecucionProyecto(propuestaId);
    if (!res.success) return res;
    const { plan, reglas, periodoActual, registros, evidencias } = res.datos;
    if (plan.rol !== "lider" && plan.rol !== "integrante") return { success: false, error: "Solo los integrantes adjuntan evidencias." };
    if (evidencias.max === 0) return { success: false, error: "La ficha de esta propuesta no pide evidencias." };
    if (!Number.isInteger(periodo) || periodo < 1 || periodo > periodoActual) return { success: false, error: "Ese período todavía no está abierto." };
    if (!actividadesDelPeriodo(plan.plan.arbol, periodo, plan.columnas, reglas.avance ? registros : null).some((n) => n.id === nodoId)) {
      return { success: false, error: "Esa actividad no está planificada en este período." };
    }
    if (responsables(plan.plan.arbol).get(nodoId) !== plan.miId) return { success: false, error: "Esta actividad está a cargo de otro integrante." };
    const previo = registros.find((r) => r.nodoId === nodoId && r.periodo === periodo);
    if (previo && (previo.estado === "enviado" || previo.estado === "aprobado")) return { success: false, error: "El registro ya fue enviado al asesor." };
    if ((previo?.evidencias.length ?? 0) >= evidencias.max) return { success: false, error: `Cada actividad admite como máximo ${evidencias.max} evidencia(s).` };

    const tipo = String(formData.get("tipo"));
    const leyenda = String(formData.get("leyenda") || "").trim();
    if (leyenda.length < 3) return { success: false, error: "Escribe una descripción breve de la evidencia." };
    if (leyenda.length > MAX_CARACTERES_LEYENDA) return { success: false, error: `La descripción admite como máximo ${MAX_CARACTERES_LEYENDA} caracteres.` };

    let valores: { tipo: string; url: string; nombre: string | null; origen: string | null; fuente: FuenteImagen | null };
    if (tipo === "enlace") {
      const url = String(formData.get("url") || "").trim();
      if (!enlaceValido(url)) return { success: false, error: "El enlace debe ser una dirección completa (https://…)." };
      valores = { tipo, url: url.slice(0, 2000), nombre: null, origen: null, fuente: null };
    } else if (tipo === "imagen" || tipo === "documento") {
      const raw = formData.get("archivo");
      if (!raw || typeof raw === "string") return { success: false, error: "Selecciona un archivo." };
      const archivo = raw as File;
      if (tipo === "imagen") {
        if (!/^image\/(png|jpe?g)$/.test(archivo.type)) return { success: false, error: "La imagen debe ser PNG o JPG." };
        if (archivo.size > MAX_IMAGEN) return { success: false, error: "La imagen excede el tamaño máximo de 8 MB." };
      } else {
        if (archivo.type !== "application/pdf") return { success: false, error: "El documento debe ser un PDF." };
        if (archivo.size > MAX_DOCUMENTO) return { success: false, error: "El documento excede el tamaño máximo de 10 MB." };
      }
      const { origen, fuente } = tipo === "imagen" ? leerOrigen(formData) : { origen: null, fuente: null };
      if (tipo === "imagen") {
        const problemas = validarOrigenImagen(origen, fuente);
        if (problemas.length > 0) return { success: false, error: problemas[0] };
      }
      const buffer = Buffer.from(await archivo.arrayBuffer());
      valores = { tipo, url: `data:${archivo.type};base64,${buffer.toString("base64")}`, nombre: archivo.name.slice(0, 255) || null, origen, fuente };
    } else {
      return { success: false, error: "Tipo de evidencia no válido." };
    }

    // La evidencia cuelga del registro: si todavía no existe, se crea como borrador.
    let registroId = previo?.id;
    if (!registroId) {
      await db
        .insert(registrosPlan)
        .values({ propuestaId, nodoId, periodo, egresadoId: plan.miId, estado: "borrador", actualizadoEn: new Date() })
        .onConflictDoNothing();
      const [r] = await db
        .select({ id: registrosPlan.id })
        .from(registrosPlan)
        .where(and(eq(registrosPlan.propuestaId, propuestaId), eq(registrosPlan.nodoId, nodoId), eq(registrosPlan.periodo, periodo)));
      registroId = r?.id;
    }
    if (!registroId) return { success: false, error: "No se pudo preparar el registro de la actividad." };

    await db.insert(evidenciasPlan).values({ registroId, ...valores, leyenda });
    await db.update(registrosPlan).set({ actualizadoEn: new Date() }).where(eq(registrosPlan.id, registroId));
    refrescar();
    return { success: true };
  } catch (error) {
    console.error("Error subirEvidenciaPlan:", error);
    return { success: false, error: "No se pudo adjuntar la evidencia." };
  }
}

export async function eliminarEvidenciaPlan(propuestaId: number, evidenciaId: number): Promise<Resultado> {
  try {
    const res = await getEjecucionProyecto(propuestaId);
    if (!res.success) return res;
    const { plan, registros } = res.datos;
    const registro = registros.find((r) => r.evidencias.some((e) => e.id === evidenciaId));
    if (!registro) return { success: false, error: "La evidencia no existe." };
    if (registro.egresadoId !== plan.miId || (plan.rol !== "lider" && plan.rol !== "integrante")) return { success: false, error: "Solo el responsable de la actividad quita sus evidencias." };
    if (registro.estado === "enviado" || registro.estado === "aprobado") return { success: false, error: "El registro ya fue enviado al asesor." };
    await db.delete(evidenciasPlan).where(and(eq(evidenciasPlan.id, evidenciaId), eq(evidenciasPlan.registroId, registro.id)));
    refrescar();
    return { success: true };
  } catch (error) {
    console.error("Error eliminarEvidenciaPlan:", error);
    return { success: false, error: "No se pudo quitar la evidencia." };
  }
}

/** Evidencias con su contenido, para la página de la actividad y el informe. Solo de registros de la propuesta. */
export async function getEvidenciasRegistro(propuestaId: number, registroIds: number[]): Promise<EvidenciaCompleta[]> {
  const res = await getEjecucionProyecto(propuestaId);
  if (!res.success) return [];
  const propios = new Set(res.datos.registros.map((r) => r.id));
  const ids = registroIds.filter((id) => propios.has(id));
  if (ids.length === 0) return [];
  const filas = await db.select().from(evidenciasPlan).where(inArray(evidenciasPlan.registroId, ids)).orderBy(asc(evidenciasPlan.id));
  return filas.map((f) => ({
    id: f.id, registroId: f.registroId, tipo: f.tipo as EvidenciaCompleta["tipo"], url: f.url, nombre: f.nombre, leyenda: f.leyenda, origen: f.origen, fuente: f.fuente,
  }));
}
