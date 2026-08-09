"use server";

import { db } from "@/lib/db";
import { documentosPropuesta } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

const TIPOS_DOCUMENTOS_REQUERIDOS = [
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
    console.error("Error en getDocumentosPropuesta:", error);
    return { success: false, error: error.message };
  }
}

export async function uploadDocumentoPropuesta(
  propuestaIdOrFormData: number | FormData,
  tipoParam?: string,
  formDataParam?: FormData
) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "No autorizado" };
    }

    let propuestaId: number;
    let tipo: string;
    let archivo: File | null = null;

    if (typeof propuestaIdOrFormData === "number") {
      propuestaId = propuestaIdOrFormData;
      tipo = tipoParam || "";
      const rawFile = formDataParam?.get("file") || formDataParam?.get("archivo");
      if (rawFile && typeof rawFile !== "string") {
        archivo = rawFile as File;
      }
    } else {
      const pStr = propuestaIdOrFormData.get("propuestaId") as string;
      propuestaId = parseInt(pStr, 10);
      tipo = propuestaIdOrFormData.get("tipo") as string;
      const rawFile = propuestaIdOrFormData.get("archivo") || propuestaIdOrFormData.get("file");
      if (rawFile && typeof rawFile !== "string") {
        archivo = rawFile as File;
      }
    }

    if (isNaN(propuestaId) || !tipo || !archivo) {
      return { success: false, error: "Faltan datos requeridos para subir el documento." };
    }

    const arrayBuffer = await archivo.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");
    const mimeType = archivo.type || "application/pdf";
    const archivoUrl = `data:${mimeType};base64,${base64}`;

    const [existing] = await db
      .select()
      .from(documentosPropuesta)
      .where(
        and(
          eq(documentosPropuesta.propuestaId, propuestaId),
          eq(documentosPropuesta.tipo, tipo)
        )
      )
      .limit(1);

    if (existing) {
      await db
        .update(documentosPropuesta)
        .set({
          nombreArchivo: archivo.name,
          archivoUrl,
          subidoEn: new Date(),
        })
        .where(eq(documentosPropuesta.id, existing.id));
    } else {
      await db.insert(documentosPropuesta).values({
        propuestaId,
        tipo,
        nombreArchivo: archivo.name,
        archivoUrl,
        subidoEn: new Date(),
      });
    }

    revalidatePath(`/coordinador/propuestas/${propuestaId}`);
    revalidatePath("/coordinador");

    return { success: true, message: "Documento subido correctamente." };
  } catch (error: any) {
    console.error("Error al subir documento:", error);
    return { success: false, error: "Error al subir documento: " + error.message };
  }
}

export async function deleteDocumentoPropuesta(propuestaIdOrDocId: number, tipoOrPropId?: string | number) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "No autorizado" };
    }

    if (typeof tipoOrPropId === "string") {
      const propuestaId = propuestaIdOrDocId;
      const tipo = tipoOrPropId;
      await db
        .delete(documentosPropuesta)
        .where(
          and(
            eq(documentosPropuesta.propuestaId, propuestaId),
            eq(documentosPropuesta.tipo, tipo)
          )
        );
      revalidatePath(`/coordinador/propuestas/${propuestaId}`);
    } else {
      const docId = propuestaIdOrDocId;
      await db.delete(documentosPropuesta).where(eq(documentosPropuesta.id, docId));
      if (tipoOrPropId) {
        revalidatePath(`/coordinador/propuestas/${tipoOrPropId}`);
      }
    }

    revalidatePath("/coordinador");
    return { success: true, message: "Documento eliminado correctamente." };
  } catch (error: any) {
    console.error("Error al eliminar documento:", error);
    return { success: false, error: "Error al eliminar documento: " + error.message };
  }
}
