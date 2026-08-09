"use server";

import { db } from "@/lib/db";
import { documentosPropuesta } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

export const TIPOS_DOCUMENTOS_REQUERIDOS = [
  { tipo: "propuesta_aceptada", label: "Propuesta Aceptada / Modificada" },
  { tipo: "plan_trabajo_firmado", label: "Plan de Trabajo Firmado" },
  { tipo: "dictamen_plan_trabajo", label: "Dictamen de Plan de Trabajo" },
  { tipo: "dictamen_propuesta", label: "Dictamen de Propuesta" },
] as const;

export async function getDocumentosPropuesta(propuestaId: number) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "No autorizado" };
    }

    const rows = await db
      .select()
      .from(documentosPropuesta)
      .where(eq(documentosPropuesta.propuestaId, propuestaId));

    const docsMap: Record<string, any> = {};
    rows.forEach((row) => {
      docsMap[row.tipo] = row;
    });

    const missingDocs: string[] = [];
    TIPOS_DOCUMENTOS_REQUERIDOS.forEach((item) => {
      if (!docsMap[item.tipo] || !docsMap[item.tipo].archivoUrl) {
        missingDocs.push(item.label);
      }
    });

    const allRequiredUploaded = missingDocs.length === 0;

    return {
      success: true,
      data: {
        docs: docsMap,
        missingDocs,
        allRequiredUploaded,
      },
    };
  } catch (error: any) {
    console.error("Error al obtener documentos de propuesta:", error);
    return { success: false, error: error.message };
  }
}

export async function uploadDocumentoPropuesta(
  propuestaId: number,
  tipo: string,
  formData: FormData
) {
  try {
    const session = await getSession();
    if (!session || (session.rol !== "admin" && session.rol !== "coordinador" && session.rol !== "asesor" && session.rol !== "egresado")) {
      return { success: false, error: "No autorizado." };
    }

    const validTipo = TIPOS_DOCUMENTOS_REQUERIDOS.find((t) => t.tipo === tipo);
    if (!validTipo) {
      return { success: false, error: "Tipo de documento no válido." };
    }

    const file = formData.get("file") as File;
    if (!file || file.size === 0) {
      return { success: false, error: "Archivo inválido o vacío." };
    }

    // Convert file to Base64 data URL
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64String = buffer.toString("base64");
    const mimeType = file.type || "application/pdf";
    const dataUrl = `data:${mimeType};base64,${base64String}`;

    await db
      .insert(documentosPropuesta)
      .values({
        propuestaId,
        tipo,
        archivoUrl: dataUrl,
        nombreArchivo: file.name,
      })
      .onConflictDoUpdate({
        target: [documentosPropuesta.propuestaId, documentosPropuesta.tipo],
        set: {
          archivoUrl: dataUrl,
          nombreArchivo: file.name,
          subidoEn: new Date(),
        },
      });

    revalidatePath(`/coordinador/propuestas/${propuestaId}`);
    revalidatePath(`/asesor/propuestas/${propuestaId}`);
    revalidatePath(`/admin/propuestas/${propuestaId}`);
    revalidatePath("/coordinador");
    revalidatePath("/asesor");

    return { success: true, message: `Documento "${validTipo.label}" subido exitosamente.` };
  } catch (error: any) {
    console.error("Error al subir documento de propuesta:", error);
    return { success: false, error: error.message || "Error al subir archivo." };
  }
}

export async function deleteDocumentoPropuesta(propuestaId: number, tipo: string) {
  try {
    const session = await getSession();
    if (!session || (session.rol !== "admin" && session.rol !== "coordinador" && session.rol !== "asesor")) {
      return { success: false, error: "No autorizado." };
    }

    await db
      .delete(documentosPropuesta)
      .where(
        and(
          eq(documentosPropuesta.propuestaId, propuestaId),
          eq(documentosPropuesta.tipo, tipo)
        )
      );

    revalidatePath(`/coordinador/propuestas/${propuestaId}`);
    revalidatePath(`/asesor/propuestas/${propuestaId}`);
    revalidatePath(`/admin/propuestas/${propuestaId}`);
    revalidatePath("/coordinador");
    revalidatePath("/asesor");

    return { success: true, message: "Documento eliminado exitosamente." };
  } catch (error: any) {
    console.error("Error al eliminar documento de propuesta:", error);
    return { success: false, error: error.message };
  }
}
