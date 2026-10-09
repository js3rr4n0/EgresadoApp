"use server";

import { db } from "@/lib/db";
import { informesMensuales, propuestas } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { registrarEvento } from "@/lib/bitacora";
import { esInformeFinal } from "@/lib/periodosPasantia";
import { normalizarTexto } from "@/lib/reglasRegistroActividad";
import { leerCartaFinalizacion, validarAgradecimientos, type CartaFinalizacion } from "@/lib/informeFinal";

const TAMANO_MAXIMO_CARTA = 5 * 1024 * 1024;
const TIPOS_CARTA = ["image/png", "image/jpeg"];

/** El egresado edita los elementos del informe final mientras el informe no esté enviado ni aprobado. */
async function cargarParaEgresado(informeId: number) {
  const session = await getSession();
  if (!session?.userId || session.rol !== "egresado") return { error: "No autorizado" as const };
  const [informe] = await db.select().from(informesMensuales).where(eq(informesMensuales.id, informeId)).limit(1);
  if (!informe) return { error: "Informe no encontrado" as const };
  const [prop] = await db.select().from(propuestas).where(eq(propuestas.id, informe.propuestaId)).limit(1);
  if (!prop || prop.egresadoId !== session.userId) return { error: "No tiene permisos sobre este informe." as const };
  if (!esInformeFinal(informe.numero)) return { error: "Este apartado corresponde únicamente al informe final." as const };
  if (informe.estado !== "redactando" && informe.estado !== "observado") {
    return { error: "El informe final ya fue enviado; no admite cambios salvo que el asesor solicite correcciones." as const };
  }
  return { session, informe, prop };
}

function revalidar(informeId: number, propuestaId: number) {
  revalidatePath(`/egresado/reportes/informe/${informeId}`);
  revalidatePath(`/asesor/seguimiento/${propuestaId}/informe/${informeId}`);
  revalidatePath(`/informes/${informeId}/imprimir`);
}

/** Agradecimientos del informe final: opcionales, una página y máximo 4 párrafos. */
export async function guardarAgradecimientos(informeId: number, texto: string) {
  try {
    const ctx = await cargarParaEgresado(informeId);
    if ("error" in ctx) return { success: false, error: ctx.error };
    const limpio = normalizarTexto(texto || "");
    const problemas = validarAgradecimientos(limpio);
    if (problemas.length > 0) return { success: false, error: problemas.join(" ") };

    await db
      .update(informesMensuales)
      .set({ agradecimientos: limpio || null, actualizadoEn: new Date() })
      .where(eq(informesMensuales.id, informeId));
    await registrarEvento({
      propuestaId: ctx.prop.id,
      actorId: ctx.session.userId,
      actorRol: "egresado",
      tipo: "informe_final_elemento",
      descripcion: limpio ? "Registró los agradecimientos del informe final." : "Quitó los agradecimientos del informe final.",
      referencia: `informe:${informeId}`,
      agruparMinutos: 60,
    });
    revalidar(informeId, ctx.prop.id);
    return { success: true, texto: limpio };
  } catch (err) {
    console.error("Error al guardar los agradecimientos:", err);
    return { success: false, error: err instanceof Error ? err.message : "Error al guardar los agradecimientos" };
  }
}

/** Carta de finalización satisfactoria (imagen PNG o JPG). Al reemplazarla, la verificación del asesor se reinicia. */
export async function subirCartaFinalizacion(informeId: number, formData: FormData) {
  try {
    const ctx = await cargarParaEgresado(informeId);
    if ("error" in ctx) return { success: false, error: ctx.error };
    const archivo = formData.get("archivo");
    if (!archivo || typeof archivo === "string") return { success: false, error: "Debe seleccionar la imagen de la carta." };
    if (!TIPOS_CARTA.includes(archivo.type)) return { success: false, error: "La carta debe ser una imagen PNG o JPG." };
    if (archivo.size > TAMANO_MAXIMO_CARTA) return { success: false, error: "La imagen excede el tamaño máximo de 5 MB." };

    const buffer = Buffer.from(await archivo.arrayBuffer());
    const carta: CartaFinalizacion = {
      url: `data:${archivo.type};base64,${buffer.toString("base64")}`,
      nombre: (archivo.name || "carta-finalizacion").slice(0, 200),
      subidaEn: new Date().toISOString(),
    };
    await db
      .update(informesMensuales)
      .set({ cartaFinalizacion: carta, cartaFinalizacionVerificadaEn: null, cartaFinalizacionVerificadaPor: null, actualizadoEn: new Date() })
      .where(eq(informesMensuales.id, informeId));
    await registrarEvento({
      propuestaId: ctx.prop.id,
      actorId: ctx.session.userId,
      actorRol: "egresado",
      tipo: "informe_final_elemento",
      descripcion: `Adjuntó la carta de finalización satisfactoria (${carta.nombre}).`,
      referencia: `informe:${informeId}`,
    });
    revalidar(informeId, ctx.prop.id);
    return { success: true, carta: { nombre: carta.nombre, url: carta.url } };
  } catch (err) {
    console.error("Error al subir la carta de finalización:", err);
    return { success: false, error: err instanceof Error ? err.message : "Error al subir la carta" };
  }
}

export async function eliminarCartaFinalizacion(informeId: number) {
  try {
    const ctx = await cargarParaEgresado(informeId);
    if ("error" in ctx) return { success: false, error: ctx.error };
    await db
      .update(informesMensuales)
      .set({ cartaFinalizacion: null, cartaFinalizacionVerificadaEn: null, cartaFinalizacionVerificadaPor: null, actualizadoEn: new Date() })
      .where(eq(informesMensuales.id, informeId));
    revalidar(informeId, ctx.prop.id);
    return { success: true };
  } catch (err) {
    console.error("Error al quitar la carta de finalización:", err);
    return { success: false, error: err instanceof Error ? err.message : "Error al quitar la carta" };
  }
}

/**
 * El asesor verifica que la carta esté en orden (emitida por la empresa en su papelería oficial y firmada por quien emitió
 * la carta de aceptación); es requisito para aprobar el informe final.
 */
export async function verificarCartaFinalizacion(informeId: number) {
  try {
    const session = await getSession();
    if (!session?.userId || session.rol !== "asesor") return { success: false, error: "No autorizado" };
    const [informe] = await db.select().from(informesMensuales).where(eq(informesMensuales.id, informeId)).limit(1);
    if (!informe || !esInformeFinal(informe.numero)) return { success: false, error: "Informe final no encontrado." };
    const [prop] = await db.select().from(propuestas).where(eq(propuestas.id, informe.propuestaId)).limit(1);
    if (!prop || prop.asesorId !== session.userId) return { success: false, error: "No tiene permisos sobre este informe." };
    if (informe.estado !== "enviado") return { success: false, error: "La carta se verifica cuando el informe final está en revisión." };
    const carta = leerCartaFinalizacion(informe.cartaFinalizacion);
    if (!carta) return { success: false, error: "El egresado aún no adjunta la carta de finalización." };

    await db
      .update(informesMensuales)
      .set({ cartaFinalizacionVerificadaEn: new Date(), cartaFinalizacionVerificadaPor: session.userId, actualizadoEn: new Date() })
      .where(eq(informesMensuales.id, informeId));
    await registrarEvento({
      propuestaId: prop.id,
      actorId: session.userId,
      actorRol: "asesor",
      tipo: "carta_finalizacion_verificada",
      descripcion: `Verificó la carta de finalización satisfactoria (${carta.nombre}).`,
      referencia: `informe:${informeId}`,
    });
    revalidar(informeId, prop.id);
    return { success: true };
  } catch (err) {
    console.error("Error al verificar la carta de finalización:", err);
    return { success: false, error: err instanceof Error ? err.message : "Error al verificar la carta" };
  }
}
