"use server";

import { db } from "@/lib/db";
import {
  propuestas,
  historialEstados,
  solicitudesAsesor,
  usuarios,
  notificaciones,
  facultades,
  carreras,
  actividades,
  cartasAceptacion,
  detallesProyecto,
  integrantesProyecto,
} from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function reviewPropuesta(
  propuestaId: number,
  estado: string,
  asesorId: number | null,
  observaciones: string,
  coordinadorId?: number | null
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
        coordinadorId: coordinadorId ?? propuesta.coordinadorId,
        fechaAprobacion: estado === "aprobada" && !propuesta.fechaAprobacion ? new Date() : propuesta.fechaAprobacion,
        observaciones,
      })
      .where(eq(propuestas.id, propuestaId));

    if (estadoAnterior !== estado) {
      await db.insert(historialEstados).values({
        propuestaId,
        de: estadoAnterior,
        a: estado,
        usuarioId: session.userId,
      });
    }

    if (asesorId && estadoAnterior !== estado) {
      await db.insert(solicitudesAsesor).values({
        propuestaId,
        asesorId,
        estado: "pendiente",
      });
    }

    let notifMsg = `El estado de tu propuesta ha sido actualizado a: ${estado}.`;
    if (estado === "aprobada") {
      notifMsg = "¡Felicidades! Tu propuesta ha sido APROBADA por la administración.";
    } else if (estado === "rechazada") {
      notifMsg = `Tu propuesta ha sido RECHAZADA. Observaciones: ${observaciones || "Sin observaciones."}`;
    }

    await db.insert(notificaciones).values({
      usuarioId: propuesta.egresadoId,
      tipo: `propuesta_${estado}`,
      mensaje: notifMsg,
      leida: false,
      creadoEn: new Date(),
    });

    revalidatePath("/admin/propuestas");
    revalidatePath(`/admin/propuestas/${propuestaId}`);

    return { success: true };
  } catch (error: any) {
    console.error("Error al revisar propuesta:", error);
    return { success: false, error: error.message };
  }
}

export async function getCoordinadoresConEstadisticas() {
  try {
    const coords = await db
      .select({
        id: usuarios.id,
        nombreCompleto: usuarios.nombreCompleto,
        correo: usuarios.correo,
        facultadId: usuarios.facultadId,
        facultadNombre: facultades.nombre,
      })
      .from(usuarios)
      .leftJoin(facultades, eq(usuarios.facultadId, facultades.id))
      .where(eq(usuarios.rol, "coordinador"));

    const coordinadoresConStats = await Promise.all(
      coords.map(async (c) => {
        const result = await db
          .select({ id: propuestas.id })
          .from(propuestas)
          .where(
            and(
              eq(propuestas.coordinadorId, c.id),
              eq(propuestas.estado, "coordinador_asignado")
            )
          );

        return {
          id: c.id,
          nombreCompleto: c.nombreCompleto,
          correo: c.correo,
          facultadNombre: c.facultadNombre || "Sin Facultad",
          proyectosAsignadosCount: result.length,
        };
      })
    );

    return { success: true, data: coordinadoresConStats };
  } catch (error: any) {
    console.error("Error al obtener coordinadores:", error);
    return { success: false, error: "Error al cargar coordinadores", data: [] };
  }
}

export async function asignarPropuestaACoordinador(propuestaId: number, coordinadorId: number) {
  try {
    const session = await getSession();
    if (!session || session.rol !== "admin") return { success: false, error: "No autorizado" };

    const [propuesta] = await db.select().from(propuestas).where(eq(propuestas.id, propuestaId)).limit(1);
    if (!propuesta) return { success: false, error: "Propuesta no encontrada" };

    const [coordinador] = await db.select().from(usuarios).where(eq(usuarios.id, coordinadorId)).limit(1);
    if (!coordinador) return { success: false, error: "Coordinador no encontrado" };

    const estadoAnterior = propuesta.estado;

    await db.update(propuestas)
      .set({
        coordinadorId: coordinadorId,
        estado: "coordinador_asignado",
      })
      .where(eq(propuestas.id, propuestaId));

    if (estadoAnterior !== "coordinador_asignado") {
      await db.insert(historialEstados).values({
        propuestaId,
        de: estadoAnterior,
        a: "coordinador_asignado",
        usuarioId: session.userId,
      });
    }

    const [estudiante] = await db.select().from(usuarios).where(eq(usuarios.id, propuesta.egresadoId)).limit(1);
    const estNombre = estudiante ? estudiante.nombreCompleto : "Estudiante";

    await db.insert(notificaciones).values({
      usuarioId: coordinadorId,
      tipo: "asignacion_coordinador",
      mensaje: `Se le ha asignado la propuesta "${propuesta.titulo || `Propuesta #${propuesta.numero}`}" del estudiante ${estNombre} para asignación de asesor.`,
      leida: false,
      creadoEn: new Date(),
    });

    revalidatePath("/admin/propuestas");
    revalidatePath(`/admin/propuestas/${propuestaId}`);

    return { success: true, message: `Propuesta asignada exitosamente a ${coordinador.nombreCompleto}` };
  } catch (error: any) {
    console.error("Error al asignar coordinador:", error);
    return { success: false, error: "Error al asignar coordinador: " + error.message };
  }
}

export async function eliminarPropuestaBorrador(propuestaId: number) {
  try {
    const session = await getSession();
    if (!session || (session.rol !== "admin" && session.rol !== "decanato")) {
      return { success: false, error: "No autorizado" };
    }

    const [propuesta] = await db.select().from(propuestas).where(eq(propuestas.id, propuestaId)).limit(1);
    if (!propuesta) return { success: false, error: "Propuesta no encontrada" };

    const isBorrador = propuesta.estado === "borrador" || propuesta.estado === "redactando" || propuesta.estado.startsWith("pend_") || propuesta.estado.includes("empresa") || propuesta.estado.includes("datos");

    if (!isBorrador) {
      return { success: false, error: "Solo se pueden eliminar propuestas en estado borrador o redactando." };
    }

    // Delete child dependencies first
    await db.delete(actividades).where(eq(actividades.propuestaId, propuestaId));
    await db.delete(cartasAceptacion).where(eq(cartasAceptacion.propuestaId, propuestaId));
    await db.delete(detallesProyecto).where(eq(detallesProyecto.propuestaId, propuestaId));
    await db.delete(integrantesProyecto).where(eq(integrantesProyecto.propuestaId, propuestaId));
    await db.delete(historialEstados).where(eq(historialEstados.propuestaId, propuestaId));
    await db.delete(solicitudesAsesor).where(eq(solicitudesAsesor.propuestaId, propuestaId));

    // Delete main proposal record
    await db.delete(propuestas).where(eq(propuestas.id, propuestaId));

    revalidatePath("/admin/propuestas");
    return { success: true, message: `Propuesta #${propuesta.numero} en borrador eliminada definitivamente.` };
  } catch (error: any) {
    console.error("Error al eliminar propuesta en borrador:", error);
    return { success: false, error: "Error al eliminar propuesta: " + error.message };
  }
}
