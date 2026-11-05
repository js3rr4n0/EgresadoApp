"use server";

// Respuestas de los espacios de la ficha que no existían en la fase 1 (entrega P2). Por ahora: bloques de texto.
// Las reglas (obligatorio, palabras mínimas y máximas) salen de la ficha ligada a la propuesta.
import { db } from "@/lib/db";
import { propuestas, respuestasEspacios } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { espaciosPropuesta, fichaDePropuesta } from "@/lib/fichas/fichaDePropuesta";

const palabras = (t: string) => (t.trim() ? t.trim().split(/\s+/).length : 0);

export async function guardarRespuestaEspacio(propuestaId: number, espacioId: string, contenido: string) {
  try {
    const session = await getSession();
    if (!session || session.rol !== "egresado") return { success: false, error: "No autorizado" };

    const [prop] = await db.select().from(propuestas).where(eq(propuestas.id, propuestaId)).limit(1);
    // Como en el resto de la propuesta en equipo, solo el líder redacta.
    if (!prop || prop.egresadoId !== session.userId) return { success: false, error: "Solo el líder del equipo puede redactar la propuesta." };
    if (prop.estado !== "redactando" || prop.bloqueada) return { success: false, error: "La propuesta no se puede modificar en su estado actual." };

    const ficha = await fichaDePropuesta(propuestaId);
    const espacio = ficha ? espaciosPropuesta(ficha.definicion).find((e) => e.id === espacioId) : undefined;
    if (!ficha?.version || !espacio || espacio.elemento !== "texto" || espacio.origenFase1) {
      return { success: false, error: "Este paso no existe en la ficha de la propuesta." };
    }

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

    revalidatePath("/egresado/redactar");
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
