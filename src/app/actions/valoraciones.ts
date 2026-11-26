"use server";

// Entrega V3 (specs/VALORACIONES_EMPRESAS_ASESORES.md): guardar una valoración al cierre del proceso.
// Cada usuario valora una sola vez cada objetivo de un proceso cerrado; después la valoración queda congelada.

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { valoraciones } from "@/lib/schema";
import { procesosParaValorar } from "@/lib/valoracionesServidor";
import { LARGO_MAXIMO_COMENTARIO, promedioPuntajes, tipoDe, validarPuntajes, type Objetivo } from "@/lib/valoraciones";

type Resultado = { success: true } | { success: false; error: string };

export async function guardarValoracion(
  propuestaId: number,
  objetivo: Objetivo,
  evaluadoId: number,
  puntajes: Record<string, number>,
  comentario: string,
): Promise<Resultado> {
  try {
    const s = await getSession();
    if (!s || (s.rol !== "egresado" && s.rol !== "asesor")) return { success: false, error: "No autorizado." };
    const rol = s.rol;

    const [proceso] = await procesosParaValorar(s.userId, rol, propuestaId);
    if (!proceso) return { success: false, error: "Este proceso todavía no está cerrado o no te corresponde valorarlo." };
    const destino = proceso.objetivos.find((o) => o.objetivo === objetivo && o.evaluadoId === evaluadoId);
    if (!destino) return { success: false, error: "No te corresponde esta valoración." };
    if (destino.hecha) return { success: false, error: "Ya enviaste esta valoración." };

    const tipo = tipoDe(rol, objetivo);
    const error = validarPuntajes(tipo, puntajes);
    if (error) return { success: false, error };
    const texto = (comentario ?? "").trim().slice(0, LARGO_MAXIMO_COMENTARIO);

    await db
      .insert(valoraciones)
      .values({
        propuestaId,
        evaluadorId: s.userId,
        evaluadorRol: rol,
        objetivo,
        evaluadoId,
        puntajes,
        promedio: promedioPuntajes(tipo, puntajes),
        comentario: texto || null,
      })
      .onConflictDoNothing();

    revalidatePath(`/${rol}`);
    revalidatePath(`/${rol}/valoraciones/${propuestaId}`);
    revalidatePath("/admin/empresas");
    return { success: true };
  } catch (e) {
    console.error("Error al guardar la valoración:", e);
    return { success: false, error: "No se pudo guardar la valoración." };
  }
}
