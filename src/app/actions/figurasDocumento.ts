"use server";

// Figuras de los apartados académicos (informe final de investigación, entrega F2). El equipo sube la imagen y el
// capítulo guarda su id con la leyenda; el documento las numera (Figura N) y arma el índice de figuras.
import { db } from "@/lib/db";
import { figurasDocumento } from "@/lib/schema";
import { getPlanTrabajo } from "./planTrabajo";

const MAX_MB = 5;
const FORMATOS = ["image/png", "image/jpeg"];

type Resultado<T = object> = ({ success: true } & T) | { success: false; error: string };

/** Sube una figura del trabajo. Solo el equipo (líder o integrantes aceptados). */
export async function subirFigura(propuestaId: number, formData: FormData): Promise<Resultado<{ id: number }>> {
  try {
    const res = await getPlanTrabajo(propuestaId);
    if (!res.success) return { success: false, error: res.error };
    if (res.datos.rol !== "lider" && res.datos.rol !== "integrante") return { success: false, error: "Solo el equipo agrega figuras." };
    const raw = formData.get("archivo");
    if (!raw || typeof raw === "string") return { success: false, error: "Selecciona una imagen." };
    const archivo = raw as File;
    if (!FORMATOS.includes(archivo.type)) return { success: false, error: "La figura debe ser PNG o JPG." };
    if (archivo.size > MAX_MB * 1024 * 1024) return { success: false, error: `La figura pasa de ${MAX_MB} MB.` };
    const url = `data:${archivo.type};base64,${Buffer.from(await archivo.arrayBuffer()).toString("base64")}`;
    const [fila] = await db.insert(figurasDocumento).values({ propuestaId, url, nombre: archivo.name.slice(0, 255), subidoPor: res.datos.miId }).returning({ id: figurasDocumento.id });
    return { success: true, id: fila.id };
  } catch (error) {
    console.error("Error subirFigura:", error);
    return { success: false, error: "No se pudo subir la figura." };
  }
}
