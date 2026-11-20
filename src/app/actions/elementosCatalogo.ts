"use server";

// Catálogo editable, entrega C1 (specs/fichas/CATALOGO_EDITABLE.md): elementos propios del catálogo de fichas.
// Solo el administrador los crea y los edita (Q1). Un borrador se guarda aunque tenga pendientes; para publicarlo no
// debe tener ninguno. Las fichas que ya los usen guardan una copia (C2), así que editarlos o eliminarlos no las cambia.
import { asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { elementosCatalogo } from "@/lib/schema";
import {
  elementoPropioNuevo, problemasElementoPropio, tieneFormaElementoPropio,
  type DefinicionElementoPropio, type EstadoElementoPropio,
} from "@/lib/fichas/elementosPropios";

const RUTA = "/admin/bloques-propuestas";

export interface ElementoPropio {
  id: number;
  estado: EstadoElementoPropio;
  definicion: DefinicionElementoPropio;
  actualizadoEn: string;
  publicadoEn: string | null;
}

type Resultado<T = object> = ({ success: true } & T) | { success: false; error: string; problemas?: string[] };

async function esAdmin() {
  const session = await getSession();
  return session && session.rol === "admin" ? session : null;
}

function aElemento(f: typeof elementosCatalogo.$inferSelect): ElementoPropio | null {
  if (!tieneFormaElementoPropio(f.definicion)) return null;
  return {
    id: f.id,
    estado: f.estado as EstadoElementoPropio,
    definicion: f.definicion,
    actualizadoEn: f.actualizadoEn.toISOString(),
    publicadoEn: f.publicadoEn?.toISOString() ?? null,
  };
}

/** Elementos propios en el orden en que se crearon. */
export async function listarElementosPropios(): Promise<ElementoPropio[]> {
  if (!(await esAdmin())) return [];
  const filas = await db.select().from(elementosCatalogo).orderBy(asc(elementosCatalogo.id));
  return filas.map(aElemento).filter((x): x is ElementoPropio => x !== null);
}

export async function crearElementoPropio(): Promise<Resultado<{ elemento: ElementoPropio }>> {
  const session = await esAdmin();
  if (!session) return { success: false, error: "Solo el administrador crea elementos del catálogo." };
  const definicion = elementoPropioNuevo(`campo-${Date.now().toString(36)}`);
  const [fila] = await db.insert(elementosCatalogo).values({ nombre: definicion.nombre, definicion, creadoPor: session.userId }).returning();
  revalidatePath(RUTA);
  return { success: true, elemento: aElemento(fila)! };
}

/** Guarda los cambios. Un elemento publicado sigue publicado solo si queda sin pendientes. */
export async function guardarElementoPropio(id: number, definicion: unknown): Promise<Resultado<{ elemento: ElementoPropio }>> {
  if (!(await esAdmin())) return { success: false, error: "Solo el administrador edita elementos del catálogo." };
  if (!tieneFormaElementoPropio(definicion)) return { success: false, error: "La definición del elemento no tiene la forma esperada." };
  const [actual] = await db.select().from(elementosCatalogo).where(eq(elementosCatalogo.id, id));
  if (!actual) return { success: false, error: "El elemento no existe." };
  const problemas = problemasElementoPropio(definicion);
  if (actual.estado === "publicado" && problemas.length > 0) {
    return { success: false, error: "Un elemento publicado no puede quedar con pendientes. Corrígelos o vuelve a borrador.", problemas };
  }
  const [fila] = await db
    .update(elementosCatalogo)
    .set({ nombre: definicion.nombre.trim().slice(0, 150) || "Elemento sin nombre", definicion, actualizadoEn: new Date() })
    .where(eq(elementosCatalogo.id, id))
    .returning();
  revalidatePath(RUTA);
  return { success: true, elemento: aElemento(fila)! };
}

/** Publicar: queda disponible para agregarlo a las fichas (C2). */
export async function publicarElementoPropio(id: number): Promise<Resultado<{ elemento: ElementoPropio }>> {
  if (!(await esAdmin())) return { success: false, error: "Solo el administrador publica elementos del catálogo." };
  const [actual] = await db.select().from(elementosCatalogo).where(eq(elementosCatalogo.id, id));
  if (!actual || !tieneFormaElementoPropio(actual.definicion)) return { success: false, error: "El elemento no existe." };
  const problemas = problemasElementoPropio(actual.definicion);
  if (problemas.length > 0) return { success: false, error: "El elemento todavía tiene pendientes.", problemas };
  const [fila] = await db
    .update(elementosCatalogo)
    .set({ estado: "publicado", publicadoEn: new Date(), actualizadoEn: new Date() })
    .where(eq(elementosCatalogo.id, id))
    .returning();
  revalidatePath(RUTA);
  return { success: true, elemento: aElemento(fila)! };
}

/** Volver a borrador: deja de ofrecerse para fichas nuevas; las que ya lo usan conservan su copia. */
export async function despublicarElementoPropio(id: number): Promise<Resultado<{ elemento: ElementoPropio }>> {
  if (!(await esAdmin())) return { success: false, error: "Solo el administrador edita elementos del catálogo." };
  const [fila] = await db
    .update(elementosCatalogo)
    .set({ estado: "borrador", actualizadoEn: new Date() })
    .where(eq(elementosCatalogo.id, id))
    .returning();
  if (!fila) return { success: false, error: "El elemento no existe." };
  revalidatePath(RUTA);
  return { success: true, elemento: aElemento(fila)! };
}

/** Solo un borrador se elimina; uno publicado primero vuelve a borrador. */
export async function eliminarElementoPropio(id: number): Promise<Resultado> {
  if (!(await esAdmin())) return { success: false, error: "Solo el administrador elimina elementos del catálogo." };
  const [actual] = await db.select({ estado: elementosCatalogo.estado }).from(elementosCatalogo).where(eq(elementosCatalogo.id, id));
  if (!actual) return { success: false, error: "El elemento no existe." };
  if (actual.estado !== "borrador") return { success: false, error: "Vuelve el elemento a borrador antes de eliminarlo." };
  await db.delete(elementosCatalogo).where(eq(elementosCatalogo.id, id));
  revalidatePath(RUTA);
  return { success: true };
}
