"use server";

import { db } from "@/lib/db";
import { cartasAceptacion } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getCartaAceptacion(propuestaId: number) {
  const session = await getSession();
  if (!session || session.rol !== "egresado") return null;

  const results = await db.select().from(cartasAceptacion).where(eq(cartasAceptacion.propuestaId, propuestaId)).limit(1);
  return results.length > 0 ? results[0] : null;
}

export async function saveCartaAceptacion(formData: FormData) {
  try {
    const session = await getSession();
    if (!session || session.rol !== "egresado") {
      return { success: false, error: "No autorizado" };
    }

    const propuestaId = parseInt(formData.get("propuestaId") as string);
    const fechaEmision = formData.get("fechaEmision") as string;
    const fechaInicio = formData.get("fechaInicio") as string;
    const fechaFin = formData.get("fechaFin") as string;
    const isPartial = formData.get("isPartial") === "true";

    // Only validate dates if they are provided
    if (fechaInicio && fechaFin && !isPartial) {
      // VALIDACION: fecha_inicio >= HOY + 21 dias (WAIT, rule was 3 weeks from fechaEmision, not today!)
      const emisionDate = fechaEmision ? new Date(fechaEmision) : new Date();
      const minInicio = new Date(emisionDate);
      minInicio.setDate(minInicio.getDate() + 21);
      
      const inicioDate = new Date(fechaInicio);

      if (inicioDate < minInicio) {
        return { success: false, error: "La fecha de inicio debe ser al menos 3 semanas después de la fecha de emisión." };
      }

      // VALIDACION: fecha_fin - fecha_inicio entre 150 y 155 dias
      const finDate = new Date(fechaFin);
      const diffTime = Math.abs(finDate.getTime() - inicioDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 150 || diffDays > 155) {
        return { success: false, error: "Las fechas colocadas no concuerdan con el periodo establecido (150 días)" };
      }
    }

    const archivoFile = formData.get("archivoPdf") as File | null;
    const firmaFile = formData.get("emisorFirma") as File | null;

    let archivoUrl = undefined;
    if (archivoFile && archivoFile.size > 0) {
      const buffer = Buffer.from(await archivoFile.arrayBuffer());
      const base64String = buffer.toString("base64");
      archivoUrl = `data:${archivoFile.type};base64,${base64String}`;
    }

    let emisorFirmaUrl = undefined;
    if (firmaFile && firmaFile.size > 0) {
      const buffer = Buffer.from(await firmaFile.arrayBuffer());
      const base64String = buffer.toString("base64");
      emisorFirmaUrl = `data:${firmaFile.type};base64,${base64String}`;
    }

    const cartaData: any = {
      propuestaId,
      bloqueada: !isPartial // Se bloquea al guardar exitosamente si NO es parcial
    };
    
    if (fechaEmision) cartaData.fechaEmision = fechaEmision;
    if (fechaInicio) cartaData.fechaInicio = fechaInicio;
    if (fechaFin) cartaData.fechaFin = fechaFin;
    if (formData.get("emisorNombre")) cartaData.emisorNombre = formData.get("emisorNombre") as string;
    if (formData.get("emisorCargo")) cartaData.emisorCargo = formData.get("emisorCargo") as string;

    if (archivoUrl) cartaData.archivoUrl = archivoUrl;
    if (emisorFirmaUrl) cartaData.emisorFirmaUrl = emisorFirmaUrl;

    // Upsert logic
    const existing = await db.select().from(cartasAceptacion).where(eq(cartasAceptacion.propuestaId, propuestaId)).limit(1);
    
    if (existing.length > 0) {
      await db.update(cartasAceptacion).set(cartaData).where(eq(cartasAceptacion.propuestaId, propuestaId));
    } else {
      await db.insert(cartasAceptacion).values(cartaData);
    }

    revalidatePath("/egresado");
    return { success: true };
  } catch (error: any) {
    console.error("Error saving carta:", error);
    return { success: false, error: "Error al guardar la carta de aceptación." };
  }
}
