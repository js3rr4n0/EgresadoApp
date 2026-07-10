"use server";

import { db } from "@/lib/db";
import { documentosEgresado } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function uploadDocumento(formData: FormData) {
  try {
    const session = await getSession();
    if (!session || session.rol !== "egresado") {
      return { success: false, error: "No autorizado." };
    }

    const file = formData.get("file") as File;
    const tipo = formData.get("tipo") as string;

    if (!file || file.size === 0) {
      return { success: false, error: "Archivo inválido." };
    }

    if (!["servicio_social", "certificacion_notas", "pago_tg"].includes(tipo)) {
      return { success: false, error: "Tipo de documento inválido." };
    }

    // Convert file to Base64 to store directly in DB
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64String = buffer.toString("base64");
    
    // We append the mime type so it can be easily opened in the browser as a data URI
    const dataUrl = `data:${file.type};base64,${base64String}`;

    // Guardar en base de datos
    await db.insert(documentosEgresado).values({
      egresadoId: session.userId,
      tipo,
      archivoUrl: dataUrl,
    });

    revalidatePath("/egresado");
    return { success: true };
  } catch (error: any) {
    console.error("Error al subir documento:", error);
    if (error.code === '23505') {
      return { success: false, error: "Ya subiste este documento anteriormente." };
    }
    return { success: false, error: "Ocurrió un error en el servidor." };
  }
}
