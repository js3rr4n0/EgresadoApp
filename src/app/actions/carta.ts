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

    // VALIDACION: fecha_inicio >= HOY + 21 dias
    const inicioDate = new Date(fechaInicio);
    const today = new Date();
    today.setHours(0,0,0,0);
    const minInicio = new Date(today);
    minInicio.setDate(minInicio.getDate() + 21);

    if (inicioDate < minInicio) {
      return { success: false, error: "Las fechas colocadas no concuerdan con el periodo establecido, por favor ingrese otra fecha" };
    }

    // VALIDACION: fecha_fin - fecha_inicio entre 150 y 155 dias
    const finDate = new Date(fechaFin);
    const diffTime = Math.abs(finDate.getTime() - inicioDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 150 || diffDays > 155) {
      return { success: false, error: "Las fechas colocadas no concuerdan con el periodo establecido, por favor ingrese otra fecha" };
    }

    const cartaData = {
      propuestaId,
      fechaEmision,
      fechaInicio,
      fechaFin,
      supTitulo: formData.get("supTitulo") as string,
      supNombres: formData.get("supNombres") as string,
      supApellidos: formData.get("supApellidos") as string,
      supCargo: formData.get("supCargo") as string,
      supTelefono: formData.get("supTelefono") as string,
      supCorreo: formData.get("supCorreo") as string,
      emisorNombre: formData.get("emisorNombre") as string,
      emisorCargo: formData.get("emisorCargo") as string,
      // Emisor Firma and Archivo URL would be handled by actual file uploads, mocked here for now
      archivoUrl: "https://mock.storage/carta.pdf",
      emisorFirmaUrl: "https://mock.storage/firma.png",
      bloqueada: true // Se bloquea al guardar exitosamente, según req 5.2
    };

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
