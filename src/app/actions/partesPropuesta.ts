"use server";

// R3 (specs/REDACTAR_PROPUESTA_AJUSTES.md): guardar las 4 partes de problema, justificación o alcance. Se guardan las
// partes y, en la columna de siempre, el texto armado con subtítulos (lo leen el documento, el protocolo y las demás
// vistas sin cambios).

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { detallesProyecto, propuestas } from "@/lib/schema";
import { espaciosPropuesta, fichaDePropuesta } from "@/lib/fichas/fichaDePropuesta";
import { ORIGEN_ELEMENTO } from "@/lib/fortalezaServidor";
import { PARTES, componerTexto, contarPalabras, type ElementoConPartes, type Partes } from "@/lib/fortaleza";

const COLUMNAS = {
  problema: { partes: "problemaPartes", texto: "descripcionProblema" },
  justificacion: { partes: "justificacionPartes", texto: "justificacion" },
  alcance: { partes: "alcancePartes", texto: "alcance" },
} as const;

export async function guardarPartesElemento(propuestaId: number, elemento: ElementoConPartes, partes: Partes): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const session = await getSession();
    if (!session || session.rol !== "egresado") return { success: false, error: "No autorizado" };
    if (!PARTES[elemento]) return { success: false, error: "Elemento no válido." };

    const [prop] = await db.select({ egresadoId: propuestas.egresadoId, bloqueada: propuestas.bloqueada }).from(propuestas).where(eq(propuestas.id, propuestaId));
    if (!prop) return { success: false, error: "Propuesta no encontrada." };
    if (prop.egresadoId !== session.userId) return { success: false, error: "Solo el líder del equipo puede redactar la propuesta." };
    if (prop.bloqueada) return { success: false, error: "La propuesta no se puede modificar en este momento." };

    // Solo las claves del elemento, como texto
    const limpias: Partes = {};
    for (const p of PARTES[elemento]) limpias[p.clave] = typeof partes?.[p.clave] === "string" ? partes[p.clave].slice(0, 20000) : "";

    // Máximo de palabras del elemento según la ficha (sumando las 4 partes)
    const ficha = await fichaDePropuesta(propuestaId);
    const espacio = ficha ? espaciosPropuesta(ficha.definicion).find((e) => e.origenFase1 && ORIGEN_ELEMENTO[e.origenFase1] === elemento) : undefined;
    const max = Number(espacio?.parametros.maxPalabras) || 0;
    const total = PARTES[elemento].reduce((s, p) => s + contarPalabras(limpias[p.clave]), 0);
    if (max > 0 && total > max) return { success: false, error: `El apartado admite hasta ${max} palabras en total; tiene ${total}.` };

    const col = COLUMNAS[elemento];
    const valores = { [col.partes]: limpias, [col.texto]: componerTexto(elemento, limpias) };
    const [existe] = await db.select({ id: detallesProyecto.id }).from(detallesProyecto).where(eq(detallesProyecto.propuestaId, propuestaId));
    if (existe) await db.update(detallesProyecto).set(valores).where(eq(detallesProyecto.propuestaId, propuestaId));
    else await db.insert(detallesProyecto).values({ propuestaId, ...valores });

    revalidatePath("/egresado/redactar");
    return { success: true };
  } catch (e) {
    console.error("Error al guardar las partes:", e);
    return { success: false, error: "No se pudo guardar." };
  }
}
