"use server";
// Constructor de fichas (entrega 2 del módulo de fichas dinámicas). Solo el administrador.
// Reglas de versiones: una ficha tiene como máximo un borrador; las versiones habilitadas no se editan
// (se crea una versión nueva a partir de ellas); las fichas base describen la fase 1 y son solo de lectura.

import { and, desc, eq, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { fichas, fichasVersiones } from "@/lib/schema";
import { definicionBase } from "@/lib/fichas/fichasBase";
import { tieneFormaDeDefinicion, validarDefinicion, type ProblemaFicha } from "@/lib/fichas/validar";
import type { DefinicionFicha, Modalidad } from "@/lib/fichas/tipos";

type Resultado<T = object> = ({ success: true } & T) | { success: false; error: string; problemas?: ProblemaFicha[] };

const MODALIDADES: Modalidad[] = ["pasantia", "proyecto", "investigacion"];
const RUTA = "/admin/bloques-propuestas";

async function exigirAdmin() {
  const session = await getSession();
  if (!session || session.rol !== "admin") throw new Error("No autorizado.");
  return session;
}

function refrescar(fichaId?: number) {
  revalidatePath(RUTA);
  if (fichaId) revalidatePath(`${RUTA}/${fichaId}`);
}

async function versionConFicha(versionId: number) {
  const [fila] = await db
    .select({ version: fichasVersiones, ficha: fichas })
    .from(fichasVersiones)
    .innerJoin(fichas, eq(fichasVersiones.fichaId, fichas.id))
    .where(eq(fichasVersiones.id, versionId));
  return fila ?? null;
}

export async function crearFicha(datos: {
  nombre: string;
  modalidad: Modalidad;
  facultadId: number | null;
  carreraId: number | null;
  partirDeVersionId: number | null;
}): Promise<Resultado<{ fichaId: number }>> {
  try {
    const session = await exigirAdmin();
    const nombre = datos.nombre.trim();
    if (nombre.length < 3 || nombre.length > 150) return { success: false, error: "El nombre debe tener entre 3 y 150 caracteres." };
    if (!MODALIDADES.includes(datos.modalidad)) return { success: false, error: "La modalidad no es válida." };

    let definicion: DefinicionFicha = definicionBase(datos.modalidad);
    let basadaEnId: number | null = null;
    let origenId = datos.partirDeVersionId;
    if (!origenId) {
      // Sin origen elegido se parte de la ficha base sembrada, para poder comparar contra ella en "Cambios".
      const [base] = await db
        .select({ id: fichasVersiones.id })
        .from(fichasVersiones)
        .innerJoin(fichas, eq(fichasVersiones.fichaId, fichas.id))
        .where(and(eq(fichas.esBase, true), eq(fichas.modalidad, datos.modalidad), eq(fichasVersiones.estado, "habilitada")))
        .orderBy(desc(fichasVersiones.numero))
        .limit(1);
      origenId = base?.id ?? null;
    }
    if (origenId) {
      const origen = await versionConFicha(origenId);
      if (!origen) return { success: false, error: "La versión de origen no existe." };
      if (origen.ficha.modalidad !== datos.modalidad) {
        return { success: false, error: "Solo se puede partir de una ficha de la misma modalidad." };
      }
      definicion = origen.version.definicion as DefinicionFicha;
      basadaEnId = origen.version.id;
    }

    const [ficha] = await db
      .insert(fichas)
      .values({ nombre, modalidad: datos.modalidad, facultadId: datos.facultadId, carreraId: datos.carreraId, creadaPor: session.userId })
      .returning({ id: fichas.id });
    await db.insert(fichasVersiones).values({
      fichaId: ficha.id,
      numero: 1,
      estado: "borrador",
      definicion,
      basadaEnId,
      creadaPor: session.userId,
    });
    refrescar();
    return { success: true, fichaId: ficha.id };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "No se pudo crear la ficha." };
  }
}

export async function actualizarDatosFicha(
  fichaId: number,
  datos: { nombre: string; facultadId: number | null; carreraId: number | null }
): Promise<Resultado> {
  try {
    await exigirAdmin();
    const nombre = datos.nombre.trim();
    if (nombre.length < 3 || nombre.length > 150) return { success: false, error: "El nombre debe tener entre 3 y 150 caracteres." };
    const [ficha] = await db.select().from(fichas).where(eq(fichas.id, fichaId));
    if (!ficha) return { success: false, error: "La ficha no existe." };
    if (ficha.esBase) return { success: false, error: "Las fichas base describen la fase 1 y no se modifican." };
    await db
      .update(fichas)
      .set({ nombre, facultadId: datos.facultadId, carreraId: datos.carreraId, actualizadaEn: new Date() })
      .where(eq(fichas.id, fichaId));
    refrescar(fichaId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "No se pudo actualizar la ficha." };
  }
}

/** Guarda el borrador aunque tenga problemas; los problemas solo impiden habilitarlo. */
export async function guardarBorrador(versionId: number, definicion: unknown): Promise<Resultado<{ problemas: ProblemaFicha[] }>> {
  try {
    await exigirAdmin();
    const fila = await versionConFicha(versionId);
    if (!fila) return { success: false, error: "La versión no existe." };
    if (fila.version.estado !== "borrador") return { success: false, error: "Solo se puede modificar una versión en borrador." };
    if (!tieneFormaDeDefinicion(definicion)) return { success: false, error: "La definición recibida no tiene el formato esperado." };
    if (definicion.modalidad !== fila.ficha.modalidad) return { success: false, error: "No se puede cambiar la modalidad de la ficha." };

    await db
      .update(fichasVersiones)
      .set({ definicion, actualizadaEn: new Date() })
      .where(eq(fichasVersiones.id, versionId));
    refrescar(fila.ficha.id);
    return { success: true, problemas: validarDefinicion(definicion) };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "No se pudo guardar el borrador." };
  }
}

export async function habilitarVersion(versionId: number, notas: string): Promise<Resultado> {
  try {
    await exigirAdmin();
    const fila = await versionConFicha(versionId);
    if (!fila) return { success: false, error: "La versión no existe." };
    if (fila.version.estado !== "borrador") return { success: false, error: "Solo se puede habilitar una versión en borrador." };
    const definicion = fila.version.definicion as DefinicionFicha;
    const problemas = validarDefinicion(definicion);
    if (problemas.length > 0) return { success: false, error: "La ficha tiene problemas que deben corregirse antes de habilitarla.", problemas };

    await db
      .update(fichasVersiones)
      .set({ estado: "habilitada", habilitadaEn: new Date(), notas: notas.trim() || null, actualizadaEn: new Date() })
      .where(eq(fichasVersiones.id, versionId));
    refrescar(fila.ficha.id);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "No se pudo habilitar la versión." };
  }
}

/** Crea un borrador nuevo a partir de la última versión de la ficha. */
export async function nuevaVersion(fichaId: number): Promise<Resultado<{ versionId: number }>> {
  try {
    const session = await exigirAdmin();
    const [ficha] = await db.select().from(fichas).where(eq(fichas.id, fichaId));
    if (!ficha) return { success: false, error: "La ficha no existe." };
    if (ficha.esBase) return { success: false, error: "Las fichas base no se modifican: crea una ficha nueva a partir de ella." };

    const [borrador] = await db
      .select({ id: fichasVersiones.id })
      .from(fichasVersiones)
      .where(and(eq(fichasVersiones.fichaId, fichaId), eq(fichasVersiones.estado, "borrador")));
    if (borrador) return { success: false, error: "La ficha ya tiene un borrador." };

    const [ultima] = await db
      .select()
      .from(fichasVersiones)
      .where(eq(fichasVersiones.fichaId, fichaId))
      .orderBy(desc(fichasVersiones.numero))
      .limit(1);
    const [{ mayor }] = await db
      .select({ mayor: max(fichasVersiones.numero) })
      .from(fichasVersiones)
      .where(eq(fichasVersiones.fichaId, fichaId));

    const [nueva] = await db
      .insert(fichasVersiones)
      .values({
        fichaId,
        numero: (mayor ?? 0) + 1,
        estado: "borrador",
        definicion: ultima ? ultima.definicion : definicionBase(ficha.modalidad as Modalidad),
        basadaEnId: ultima?.id ?? null,
        creadaPor: session.userId,
      })
      .returning({ id: fichasVersiones.id });
    refrescar(fichaId);
    return { success: true, versionId: nueva.id };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "No se pudo crear la versión." };
  }
}

export async function retirarVersion(versionId: number): Promise<Resultado> {
  try {
    await exigirAdmin();
    const fila = await versionConFicha(versionId);
    if (!fila) return { success: false, error: "La versión no existe." };
    if (fila.ficha.esBase) return { success: false, error: "Las fichas base no se retiran." };
    if (fila.version.estado !== "habilitada") return { success: false, error: "Solo se puede retirar una versión habilitada." };
    await db
      .update(fichasVersiones)
      .set({ estado: "retirada", retiradaEn: new Date(), actualizadaEn: new Date() })
      .where(eq(fichasVersiones.id, versionId));
    refrescar(fila.ficha.id);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "No se pudo retirar la versión." };
  }
}

/** Descarta un borrador. Si era la única versión de la ficha, también se elimina la ficha. */
export async function descartarBorrador(versionId: number): Promise<Resultado<{ fichaEliminada: boolean }>> {
  try {
    await exigirAdmin();
    const fila = await versionConFicha(versionId);
    if (!fila) return { success: false, error: "La versión no existe." };
    if (fila.version.estado !== "borrador") return { success: false, error: "Solo se puede descartar un borrador." };

    const otras = await db
      .select({ id: fichasVersiones.id })
      .from(fichasVersiones)
      .where(eq(fichasVersiones.fichaId, fila.ficha.id));
    if (otras.length === 1) {
      await db.delete(fichas).where(eq(fichas.id, fila.ficha.id));
      refrescar();
      return { success: true, fichaEliminada: true };
    }
    await db.delete(fichasVersiones).where(eq(fichasVersiones.id, versionId));
    refrescar(fila.ficha.id);
    return { success: true, fichaEliminada: false };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "No se pudo descartar el borrador." };
  }
}
