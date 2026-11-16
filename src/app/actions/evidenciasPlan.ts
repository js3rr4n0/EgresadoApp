"use server";

// Evidencias de cada actividad en la ejecución del proyecto (reunión 6-nov-2026): imágenes, documentos PDF o enlaces
// (por ejemplo, a un video) que respaldan su resultado. Las sube el responsable de la actividad mientras el registro
// no esté enviado; se numeran en el informe del período. Las imágenes piden su pie y su origen, como en pasantía.
import { db } from "@/lib/db";
import { evidenciasPlan, registrosPlan } from "@/lib/schema";
import { and, asc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { responsables } from "@/lib/fichas/planTrabajo";
import { leerEvidenciaFormulario } from "@/lib/evidenciaArchivo";
import { getEjecucionProyecto, registrable } from "./ejecucionProyecto";

// Las páginas que muestran evidencias: la ejecución y la actividad (egresado y asesor).
function refrescar() {
  revalidatePath("/egresado/ejecucion");
  revalidatePath("/egresado/ejecucion/actividad");
  revalidatePath("/asesor/ejecucion/[propuestaId]", "layout");
}

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

export async function subirEvidenciaPlan(propuestaId: number, nodoId: string, periodo: number, formData: FormData): Promise<Resultado> {
  try {
    const res = await getEjecucionProyecto(propuestaId);
    if (!res.success) return res;
    const { plan, periodoActual, registros, evidencias } = res.datos;
    if (plan.rol !== "lider" && plan.rol !== "integrante") return { success: false, error: "Solo los integrantes adjuntan evidencias." };
    if (evidencias.max === 0) return { success: false, error: "La ficha de esta propuesta no pide evidencias." };
    if (!Number.isInteger(periodo) || periodo < 1 || periodo > periodoActual) return { success: false, error: "Ese período todavía no está abierto." };
    if (!(await registrable(res.datos, nodoId, periodo))) {
      return { success: false, error: "Esa actividad no está planificada en este período." };
    }
    if (responsables(plan.plan.arbol).get(nodoId) !== plan.miId) return { success: false, error: "Esta actividad está a cargo de otro integrante." };
    const previo = registros.find((r) => r.nodoId === nodoId && r.periodo === periodo);
    if (previo && (previo.estado === "enviado" || previo.estado === "aprobado")) return { success: false, error: "El registro ya fue enviado al asesor." };
    if ((previo?.evidencias.length ?? 0) >= evidencias.max) return { success: false, error: `Cada actividad admite como máximo ${evidencias.max} evidencia(s).` };

    const leida = await leerEvidenciaFormulario(formData);
    if (!leida.ok) return { success: false, error: leida.error };
    const { leyenda, ...valores } = leida.valores;

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
