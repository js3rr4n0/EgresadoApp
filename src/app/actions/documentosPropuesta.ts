"use server";

import { db } from "@/lib/db";
import { propuestas, documentosPropuesta } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

import { getRequiredDocsForTipo } from "@/lib/proposalUtils";



export async function getDocumentosPropuesta(propuestaId: number) {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "No autorizado. Por favor inicie sesión de nuevo." };
    }

    const pId = Number(propuestaId);
    if (isNaN(pId) || pId <= 0) {
      return { success: false, error: "ID de propuesta inválido." };
    }

    const [prop] = await db
      .select({ tipo: propuestas.tipo })
      .from(propuestas)
      .where(eq(propuestas.id, pId))
      .limit(1);

    const tipoPropuesta = prop?.tipo || "pasantia";
    const requiredDocs = getRequiredDocsForTipo(tipoPropuesta);

    const rows = await db
      .select()
      .from(documentosPropuesta)
      .where(eq(documentosPropuesta.propuestaId, pId));

    const docsMap: Record<string, any> = {};
    rows.forEach((row) => {
      if (row.tipo) {
        docsMap[row.tipo] = row;
        docsMap[row.tipo.trim().toLowerCase()] = row;
      }
    });

    const missingDocs: string[] = [];
    requiredDocs.forEach((item) => {
      const cleanTipo = (item.tipo || "").trim().toLowerCase();
      const docObj = docsMap[cleanTipo] || docsMap[item.tipo];
      if (!docObj || !docObj.archivoUrl) {
        missingDocs.push(item.label);
      }
    });

    const allRequiredUploaded = missingDocs.length === 0;

    return {
      success: true,
      data: {
        tipo: tipoPropuesta,
        requiredDocs,
        docs: docsMap,
        missingDocs,
        allRequiredUploaded,
      },
    };
  } catch (error: any) {
    console.error("Error en getDocumentosPropuesta:", error);
    return { success: false, error: "Error en servidor: " + error.message };
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

    let propuestaId: number = 0;
    let tipo: string = "";
    let archivo: File | null = null;

    if (propuestaIdOrFormData instanceof FormData) {
      const pStr = propuestaIdOrFormData.get("propuestaId") as string;
      propuestaId = parseInt(pStr, 10);
      tipo = propuestaIdOrFormData.get("tipo") as string;
      const rawFile = propuestaIdOrFormData.get("file") || propuestaIdOrFormData.get("archivo");
      if (rawFile && typeof rawFile !== "string") {
        archivo = rawFile as File;
      }
    } else if (typeof propuestaIdOrFormData === "number") {
      propuestaId = propuestaIdOrFormData;
      tipo = tipoParam || "";
      if (formDataParam && formDataParam instanceof FormData) {
        const rawFile = formDataParam.get("file") || formDataParam.get("archivo");
        if (rawFile && typeof rawFile !== "string") {
          archivo = rawFile as File;
        }
      }
    }

    if (isNaN(propuestaId) || !propuestaId || !tipo || !archivo) {
      return { success: false, error: "Faltan datos requeridos o el archivo es inválido para subir el documento." };
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
      const targetTipo = tipoOrPropId.trim().toLowerCase();

      const allPropDocs = await db
        .select()
        .from(documentosPropuesta)
        .where(eq(documentosPropuesta.propuestaId, propuestaId));

      const matchingDocs = allPropDocs.filter(
        (d) => (d.tipo || "").trim().toLowerCase() === targetTipo
      );

      for (const mDoc of matchingDocs) {
        await db.delete(documentosPropuesta).where(eq(documentosPropuesta.id, mDoc.id));
      }

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
