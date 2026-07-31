"use server";

import { db } from "@/lib/db";
import {
  propuestas,
  usuarios,
  carreras,
  empresas,
  supervisores,
  solicitudesAsesor,
  actividades,
  cartasAceptacion,
  detallesProyecto,
  notificaciones,
} from "@/lib/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

/**
 * Obtain accepted proposals for the logged in advisor ("Mis propuestas")
 */
export async function getMisPropuestasAsesor() {
  try {
    const session = await getSession();
    if (!session || session.rol !== "asesor") {
      return { success: false, error: "No autorizado" };
    }

    const acceptedRows = await db
      .select({
        solicitud: solicitudesAsesor,
        propuesta: propuestas,
        estudiante: usuarios,
        carreraNombre: carreras.nombre,
      })
      .from(solicitudesAsesor)
      .innerJoin(propuestas, eq(solicitudesAsesor.propuestaId, propuestas.id))
      .innerJoin(usuarios, eq(propuestas.egresadoId, usuarios.id))
      .leftJoin(carreras, eq(usuarios.carreraId, carreras.id))
      .where(
        and(
          eq(solicitudesAsesor.asesorId, session.userId),
          eq(solicitudesAsesor.estado, "aceptada")
        )
      )
      .orderBy(desc(solicitudesAsesor.respondidoEn));

    // Map rows with details
    const result = await Promise.all(
      acceptedRows.map(async (row) => {
        let empresa = null;
        let supervisor = null;
        let carta = null;

        if (row.propuesta.empresaId) {
          const [emp] = await db
            .select()
            .from(empresas)
            .where(eq(empresas.id, row.propuesta.empresaId))
            .limit(1);
          empresa = emp || null;
        }

        if (row.propuesta.supervisorId) {
          const [sup] = await db
            .select()
            .from(supervisores)
            .where(eq(supervisores.id, row.propuesta.supervisorId))
            .limit(1);
          supervisor = sup || null;
        }

        const [car] = await db
          .select()
          .from(cartasAceptacion)
          .where(eq(cartasAceptacion.propuestaId, row.propuesta.id))
          .limit(1);
        carta = car || null;

        return {
          id: row.propuesta.id,
          solicitudId: row.solicitud.id,
          tipo: row.propuesta.tipo,
          numero: row.propuesta.numero,
          estado: row.propuesta.estado,
          fechaAceptacion: row.solicitud.respondidoEn,
          estudiante: {
            id: row.estudiante.id,
            nombreCompleto: row.estudiante.nombreCompleto,
            carnet: row.estudiante.carnet || "N/A",
            correo: row.estudiante.correo,
            carrera: row.carreraNombre || "Sin Carrera",
          },
          empresa,
          supervisor,
          carta,
        };
      })
    );

    return { success: true, data: result };
  } catch (error: any) {
    console.error("Error al obtener propuestas de asesor:", error);
    return { success: false, error: "Error interno: " + error.message };
  }
}

/**
 * Obtain pending proposal requests assigned to the advisor
 */
export async function getSolicitudesAsesor() {
  try {
    const session = await getSession();
    if (!session || session.rol !== "asesor") {
      return { success: false, error: "No autorizado" };
    }

    const pendingRows = await db
      .select({
        solicitud: solicitudesAsesor,
        propuesta: propuestas,
        estudiante: usuarios,
        carreraNombre: carreras.nombre,
      })
      .from(solicitudesAsesor)
      .innerJoin(propuestas, eq(solicitudesAsesor.propuestaId, propuestas.id))
      .innerJoin(usuarios, eq(propuestas.egresadoId, usuarios.id))
      .leftJoin(carreras, eq(usuarios.carreraId, carreras.id))
      .where(
        and(
          eq(solicitudesAsesor.asesorId, session.userId),
          eq(solicitudesAsesor.estado, "pendiente")
        )
      )
      .orderBy(desc(solicitudesAsesor.creadaEn));

    const result = await Promise.all(
      pendingRows.map(async (row) => {
        const [carta] = await db
          .select()
          .from(cartasAceptacion)
          .where(eq(cartasAceptacion.propuestaId, row.propuesta.id))
          .limit(1);

        const [detalles] = await db
          .select()
          .from(detallesProyecto)
          .where(eq(detallesProyecto.propuestaId, row.propuesta.id))
          .limit(1);

        return {
          id: row.solicitud.id,
          propuestaId: row.propuesta.id,
          tipo: row.propuesta.tipo,
          numero: row.propuesta.numero,
          creadaEn: row.solicitud.creadaEn,
          estudiante: {
            nombreCompleto: row.estudiante.nombreCompleto,
            carnet: row.estudiante.carnet || "N/A",
            carrera: row.carreraNombre || "Sin Carrera",
          },
          cartaUrl: carta?.archivoUrl || null,
          detalles,
        };
      })
    );

    return { success: true, data: result };
  } catch (error: any) {
    console.error("Error al obtener solicitudes de asesor:", error);
    return { success: false, error: "Error interno: " + error.message };
  }
}

/**
 * Respond to an advisor proposal request (Accept / Reject with mandatory justification)
 * MUST record respondidoEn with exact timestamp (date & time).
 */
export async function responderSolicitudAsesor(
  solicitudId: number,
  respuesta: "aceptada" | "rechazada",
  justificacion?: string
) {
  try {
    const session = await getSession();
    if (!session || session.rol !== "asesor") {
      return { success: false, error: "No autorizado" };
    }

    if (respuesta === "rechazada" && (!justificacion || !justificacion.trim())) {
      return {
        success: false,
        error: "Debe ingresar obligatoriamente la justificación del rechazo.",
      };
    }

    const [solicitud] = await db
      .select()
      .from(solicitudesAsesor)
      .where(
        and(
          eq(solicitudesAsesor.id, solicitudId),
          eq(solicitudesAsesor.asesorId, session.userId)
        )
      )
      .limit(1);

    if (!solicitud) {
      return { success: false, error: "Solicitud no encontrada." };
    }

    const now = new Date();

    await db
      .update(solicitudesAsesor)
      .set({
        estado: respuesta,
        justificacionRechazo: respuesta === "rechazada" ? justificacion?.trim() : null,
        respondidoEn: now,
      })
      .where(eq(solicitudesAsesor.id, solicitudId));

    if (respuesta === "aceptada") {
      await db
        .update(propuestas)
        .set({ asesorId: session.userId })
        .where(eq(propuestas.id, solicitud.propuestaId));
    }

    // Mark related notification as read
    await db
      .update(notificaciones)
      .set({ leida: true })
      .where(
        and(
          eq(notificaciones.usuarioId, session.userId),
          eq(notificaciones.tipo, "solicitud_asesoria")
        )
      );

    revalidatePath("/asesor");
    revalidatePath(`/asesor/propuestas/${solicitud.propuestaId}`);

    return {
      success: true,
      message:
        respuesta === "aceptada"
          ? "¡Has aceptado asesorar esta propuesta exitosamente!"
          : "Has rechazado la propuesta y registrado la justificación.",
    };
  } catch (error: any) {
    console.error("Error al responder solicitud de asesor:", error);
    return { success: false, error: "Error interno: " + error.message };
  }
}

/**
 * Fetch detailed proposal info for advisor progress view
 */
export async function getDetallePropuestaAsesor(propuestaId: number) {
  try {
    const session = await getSession();
    if (!session || session.rol !== "asesor") {
      return { success: false, error: "No autorizado" };
    }

    const [prop] = await db
      .select({
        propuesta: propuestas,
        estudiante: usuarios,
        carreraNombre: carreras.nombre,
      })
      .from(propuestas)
      .innerJoin(usuarios, eq(propuestas.egresadoId, usuarios.id))
      .leftJoin(carreras, eq(usuarios.carreraId, carreras.id))
      .where(eq(propuestas.id, propuestaId))
      .limit(1);

    if (!prop) {
      return { success: false, error: "Propuesta no encontrada" };
    }

    let empresa = null;
    let supervisor = null;

    if (prop.propuesta.empresaId) {
      const [emp] = await db
        .select()
        .from(empresas)
        .where(eq(empresas.id, prop.propuesta.empresaId))
        .limit(1);
      empresa = emp || null;
    }

    if (prop.propuesta.supervisorId) {
      const [sup] = await db
        .select()
        .from(supervisores)
        .where(eq(supervisores.id, prop.propuesta.supervisorId))
        .limit(1);
      supervisor = sup || null;
    }

    const [carta] = await db
      .select()
      .from(cartasAceptacion)
      .where(eq(cartasAceptacion.propuestaId, propuestaId))
      .limit(1);

    const actividadesList = await db
      .select()
      .from(actividades)
      .where(eq(actividades.propuestaId, propuestaId))
      .orderBy(asc(actividades.periodo), asc(actividades.semana), asc(actividades.numero));

    const [detalles] = await db
      .select()
      .from(detallesProyecto)
      .where(eq(detallesProyecto.propuestaId, propuestaId))
      .limit(1);

    return {
      success: true,
      data: {
        propuesta: prop.propuesta,
        estudiante: {
          nombreCompleto: prop.estudiante.nombreCompleto,
          carnet: prop.estudiante.carnet || "N/A",
          correo: prop.estudiante.correo,
          carrera: prop.carreraNombre || "Sin Carrera",
        },
        empresa,
        supervisor,
        carta,
        actividades: actividadesList,
        detallesProyecto: detalles || null,
      },
    };
  } catch (error: any) {
    console.error("Error al obtener detalle para asesor:", error);
    return { success: false, error: "Error interno: " + error.message };
  }
}

/**
 * Allows the advisor to modify an activity in the student's work plan
 */
export async function updateActividadAsesor(actividadId: number, descripcion: string) {
  try {
    const session = await getSession();
    if (!session || session.rol !== "asesor") {
      return { success: false, error: "No autorizado" };
    }

    if (!descripcion || !descripcion.trim()) {
      return { success: false, error: "La descripción no puede estar vacía" };
    }

    const [act] = await db
      .select()
      .from(actividades)
      .where(eq(actividades.id, actividadId))
      .limit(1);

    if (!act) return { success: false, error: "Actividad no encontrada" };

    await db
      .update(actividades)
      .set({ descripcion: descripcion.trim() })
      .where(eq(actividades.id, actividadId));

    revalidatePath(`/asesor/propuestas/${act.propuestaId}`);

    return { success: true, message: "Actividad actualizada correctamente." };
  } catch (error: any) {
    console.error("Error al actualizar actividad por asesor:", error);
    return { success: false, error: "Error interno: " + error.message };
  }
}
