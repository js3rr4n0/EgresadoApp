"use server";

import { db } from "@/lib/db";
import { propuestas, historialEstados, solicitudesAsesor, usuarios, notificaciones } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function reviewPropuesta(
  propuestaId: number,
  estado: string,
  asesorId: number | null,
  observaciones: string
) {
  try {
    const session = await getSession();
    if (!session || session.rol !== "admin") return { success: false, error: "No autorizado" };

    const [propuesta] = await db.select().from(propuestas).where(eq(propuestas.id, propuestaId)).limit(1);
    if (!propuesta) return { success: false, error: "Propuesta no encontrada" };

    const estadoAnterior = propuesta.estado;

    await db.update(propuestas)
      .set({
        estado,
        asesorId,
        observaciones: observaciones || null
      })
      .where(eq(propuestas.id, propuestaId));

    if (asesorId) {
      // Check if request already exists
      const [existingReq] = await db
        .select()
        .from(solicitudesAsesor)
        .where(
          and(
            eq(solicitudesAsesor.propuestaId, propuestaId),
            eq(solicitudesAsesor.asesorId, asesorId)
          )
        )
        .limit(1);

      if (!existingReq) {
        await db.insert(solicitudesAsesor).values({
          propuestaId,
          asesorId,
          estado: "pendiente",
          creadaEn: new Date()
        });

        // Insert notification
        const [estudiante] = await db
          .select()
          .from(usuarios)
          .where(eq(usuarios.id, propuesta.egresadoId))
          .limit(1);

        const tipoProp = propuesta.tipo === "pasantia" ? "Pasantía" : (propuesta.tipo === "proyecto" ? "Proyecto Específico" : "Investigación");
        const nombreEst = estudiante ? estudiante.nombreCompleto : "Estudiante";
        const carnetEst = estudiante?.carnet || "N/A";

        await db.insert(notificaciones).values({
          usuarioId: asesorId,
          tipo: "solicitud_asesoria",
          mensaje: `Se ha asignado una propuesta de ${tipoProp} de parte del estudiante ${nombreEst} con carnet ${carnetEst}, ¿estaría dispuesto a asesorar?`,
          leida: false,
          creadoEn: new Date()
        });
      }
    }

    if (estadoAnterior !== estado) {
      await db.insert(historialEstados).values({
        propuestaId,
        de: estadoAnterior,
        a: estado,
        usuarioId: session.userId,
      });
    }

    revalidatePath(`/admin/propuestas/${propuestaId}`);
    revalidatePath("/admin/propuestas");

    return { success: true };
  } catch (error: any) {
    console.error("Error al revisar propuesta:", error);
    return { success: false, error: "Error interno: " + error.message };
  }
}
