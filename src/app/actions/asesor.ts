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
    if (!session || !session.userId) {
      return { success: false, error: "No autorizado" };
    }

    const acceptedSolicitudes = await db
      .select()
      .from(solicitudesAsesor)
      .where(
        and(
          eq(solicitudesAsesor.asesorId, session.userId),
          eq(solicitudesAsesor.estado, "aceptada")
        )
      );

    const propIdsFromSol = acceptedSolicitudes.map((s) => s.propuestaId);

    const allProps = await db
      .select({
        propuesta: propuestas,
        estudiante: usuarios,
        carreraNombre: carreras.nombre,
      })
      .from(propuestas)
      .leftJoin(usuarios, eq(propuestas.egresadoId, usuarios.id))
      .leftJoin(carreras, eq(usuarios.carreraId, carreras.id))
      .where(eq(propuestas.asesorId, session.userId));

    const propIdSet = new Set(allProps.map((p) => p.propuesta.id));
    if (propIdsFromSol.length > 0) {
      for (const sol of acceptedSolicitudes) {
        if (!propIdSet.has(sol.propuestaId)) {
          const [extraProp] = await db
            .select({
              propuesta: propuestas,
              estudiante: usuarios,
              carreraNombre: carreras.nombre,
            })
            .from(propuestas)
            .leftJoin(usuarios, eq(propuestas.egresadoId, usuarios.id))
            .leftJoin(carreras, eq(usuarios.carreraId, carreras.id))
            .where(eq(propuestas.id, sol.propuestaId))
            .limit(1);
          if (extraProp) {
            allProps.push(extraProp);
            propIdSet.add(sol.propuestaId);
          }
        }
      }
    }

    const result = await Promise.all(
      allProps.map(async (row) => {
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
          tipo: row.propuesta.tipo,
          numero: row.propuesta.numero,
          estado: row.propuesta.estado,
          estudiante: {
            id: row.estudiante?.id || 0,
            nombreCompleto: row.estudiante?.nombreCompleto || "Estudiante",
            carnet: row.estudiante?.carnet || "N/A",
            correo: row.estudiante?.correo || "N/A",
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
    if (!session || !session.userId) {
      return { success: false, error: "No autorizado" };
    }

    const [prop] = await db
      .select({
        propuesta: propuestas,
        estudiante: usuarios,
        carreraNombre: carreras.nombre,
      })
      .from(propuestas)
      .leftJoin(usuarios, eq(propuestas.egresadoId, usuarios.id))
      .leftJoin(carreras, eq(usuarios.carreraId, carreras.id))
      .where(eq(propuestas.id, propuestaId))
      .limit(1);

    if (!prop || !prop.propuesta) {
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
          nombreCompleto: prop.estudiante?.nombreCompleto || "Estudiante",
          carnet: prop.estudiante?.carnet || "N/A",
          correo: prop.estudiante?.correo || "N/A",
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

/**
 * Allows the advisor to request adjustments/corrections on a proposal/work plan from the student.
 * Saves specific observations detailing what activities or sections need to be updated.
 * Sets proposal state back to 'redactando' so the student can edit the requested areas.
 */
export async function solicitarAjustesPropuestaAsesor(propuestaId: number, observaciones: string) {
  try {
    const session = await getSession();
    if (!session || session.rol !== "asesor") {
      return { success: false, error: "No autorizado" };
    }

    if (!observaciones || !observaciones.trim()) {
      return { success: false, error: "Debe ingresar las observaciones y correcciones solicitadas." };
    }

    const [prop] = await db.select().from(propuestas).where(eq(propuestas.id, propuestaId)).limit(1);
    if (!prop) return { success: false, error: "Propuesta no encontrada." };

    const estadoAnterior = prop.estado;

    // Update proposal state to 'redactando' with observations
    await db
      .update(propuestas)
      .set({
        estado: "redactando",
        observaciones: observaciones.trim(),
      })
      .where(eq(propuestas.id, propuestaId));

    // Preserve current activity descriptions and titles as previous state for diff tracking
    const currentActs = await db.select().from(actividades).where(eq(actividades.propuestaId, propuestaId));
    for (const act of currentActs) {
      if (!act.descripcionAnterior || !act.tituloAnterior) {
        await db
          .update(actividades)
          .set({
            descripcionAnterior: act.descripcionAnterior || act.descripcion,
            tituloAnterior: act.tituloAnterior || act.titulo || null,
          })
          .where(eq(actividades.id, act.id));
      }
    }

    // Log history
    const { historialEstados } = await import("@/lib/schema");
    await db.insert(historialEstados).values({
      propuestaId,
      de: estadoAnterior,
      a: "ajustes_solicitados",
      usuarioId: session.userId,
    });

    // Notify student
    await db.insert(notificaciones).values({
      usuarioId: prop.egresadoId,
      tipo: "observaciones_propuesta",
      mensaje: `El docente asesor ha solicitado ajustes en tu propuesta #${prop.numero}: ${observaciones.trim()}`,
      leida: false,
      creadoEn: new Date(),
    });

    revalidatePath(`/asesor/propuestas/${propuestaId}`);
    revalidatePath(`/egresado/redactar`);
    revalidatePath(`/egresado`);

    return {
      success: true,
      message: "Se han enviado las observaciones de ajuste al estudiante exitosamente.",
    };
  } catch (error: any) {
    console.error("Error al solicitar ajustes de propuesta por asesor:", error);
    return { success: false, error: "Error interno: " + error.message };
  }
}

/**
 * Allows the advisor to approve (give OK) on the proposal & work plan.
 */
export async function aprobarPropuestaAsesor(propuestaId: number) {
  try {
    const session = await getSession();
    if (!session || session.rol !== "asesor") {
      return { success: false, error: "No autorizado" };
    }

    const [prop] = await db.select().from(propuestas).where(eq(propuestas.id, propuestaId)).limit(1);
    if (!prop) return { success: false, error: "Propuesta no encontrada." };

    const estadoAnterior = prop.estado;

    await db
      .update(propuestas)
      .set({
        estado: "aprobada",
        observaciones: null,
      })
      .where(eq(propuestas.id, propuestaId));

    // Consolidate approved activities: clear temporary diff markers
    const { actividades } = await import("@/lib/schema");
    await db
      .update(actividades)
      .set({
        descripcionAnterior: null,
        esModificada: false,
        esNueva: false,
      })
      .where(eq(actividades.propuestaId, propuestaId));

    const { historialEstados, notificaciones } = await import("@/lib/schema");
    await db.insert(historialEstados).values({
      propuestaId,
      de: estadoAnterior,
      a: "aprobada",
      usuarioId: session.userId,
    });

    await db.insert(notificaciones).values({
      usuarioId: prop.egresadoId,
      tipo: "propuesta_aprobada",
      mensaje: `¡Felicidades! El docente asesor ha aprobado tu plan de trabajo y propuesta #${prop.numero}.`,
      leida: false,
      creadoEn: new Date(),
    });

    revalidatePath(`/asesor/propuestas/${propuestaId}`);
    revalidatePath(`/asesor`);
    revalidatePath(`/egresado`);
    revalidatePath(`/egresado/redactar`);

    return {
      success: true,
      message: "¡Plan de Trabajo y propuesta aprobados exitosamente (OK concedido)! 🎉",
    };
  } catch (error: any) {
    console.error("Error al aprobar propuesta por asesor:", error);
    return { success: false, error: "Error interno: " + error.message };
  }
}
