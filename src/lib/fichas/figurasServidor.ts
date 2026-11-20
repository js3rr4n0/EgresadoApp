import "server-only";
// Figuras de los apartados académicos (entrega F2): las imágenes para armar el documento. Solo servidor: lo llaman las
// acciones que ya revisaron el acceso a la propuesta.
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { figurasDocumento } from "@/lib/schema";

/** Imágenes de las figuras pedidas que son de la propuesta (id → data URL). */
export async function urlsFiguras(propuestaId: number, ids: number[]): Promise<Map<number, string>> {
  const validos = [...new Set(ids.filter((x) => Number.isInteger(x)))];
  if (!validos.length) return new Map();
  const filas = await db.select({ id: figurasDocumento.id, url: figurasDocumento.url }).from(figurasDocumento)
    .where(and(eq(figurasDocumento.propuestaId, propuestaId), inArray(figurasDocumento.id, validos)));
  return new Map(filas.map((f) => [f.id, f.url]));
}
