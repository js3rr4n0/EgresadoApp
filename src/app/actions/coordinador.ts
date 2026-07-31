"use server";

import { db } from "@/lib/db";
import {
  propuestas,
  usuarios,
  carreras,
  facultades,
  solicitudesAsesor,
  solicitudesBaja,
  actividades,
  cartasAceptacion,
  detallesProyecto,
  empresas,
  supervisores,
  documentosEgresado,
  integrantesProyecto,
  notificaciones,
  historialEstados,
} from "@/lib/schema";
import { eq, and, desc, asc, inArray } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

/**
 * Fetch proposals assigned by Admin to the logged-in Coordinator for advisor assignment
 */
export async function getPropuestasPendientesCoordinador() {
  try {
    const session = await getSession();
    if (!session || session.rol !== "coordinador") {
      return { success: false, error: "No autorizado" };
    }

    const userCoord = await db
      .select()
      .from(usuarios)
      .where(eq(usuarios.id, session.userId))
      .limit(1);

    const coordFacultadId = userCoord[0]?.facultadId;

    // Fetch proposals assigned to coordinator (or matching coordinator's faculty if not explicitly assigned)
    const rawPropuestas = await db
      .select({
        propuesta: propuestas,
        estudiante: usuarios,
        carreraNombre: carreras.nombre,
      })
      .from(propuestas)
      .innerJoin(usuarios, eq(propuestas.egresadoId, usuarios.id))
      .leftJoin(carreras, eq(usuarios.carreraId, carreras.id))
      .where(
        and(
          eq(propuestas.coordinadorId, session.userId),
          inArray(propuestas.estado, ["coordinador_asignado", "aprobada"])
        )
      )
      .orderBy(desc(propuestas.enviadaEn), desc(propuestas.id));

    const result = await Promise.all(
      rawPropuestas.map(async (row) => {
        // Fetch student team if multi-user
        let estudiantesNombres = row.estudiante.nombreCompleto;
        if (row.propuesta.tipo === "proyecto" || row.propuesta.tipo === "investigacion") {
          const team = await db
            .select({ nombre: usuarios.nombreCompleto })
            .from(integrantesProyecto)
            .innerJoin(usuarios, eq(integrantesProyecto.egresadoId, usuarios.id))
            .where(
              and(
                eq(integrantesProyecto.propuestaId, row.propuesta.id),
                eq(integrantesProyecto.estado, "aceptado")
              )
            );
          if (team.length > 0) {
            estudiantesNombres += ", " + team.map((t) => t.nombre).join(", ");
          }
        }

        // Fetch latest advisor request status for this proposal
        const [lastSolicitud] = await db
          .select({
            solicitud: solicitudesAsesor,
            asesor: usuarios,
          })
          .from(solicitudesAsesor)
          .innerJoin(usuarios, eq(solicitudesAsesor.asesorId, usuarios.id))
          .where(eq(solicitudesAsesor.propuestaId, row.propuesta.id))
          .orderBy(desc(solicitudesAsesor.creadaEn))
          .limit(1);

        return {
          id: row.propuesta.id,
          numero: row.propuesta.numero,
          tipo: row.propuesta.tipo,
          titulo: row.propuesta.titulo || `Propuesta #${row.propuesta.numero}`,
          fechaAprobacion: row.propuesta.fechaAprobacion || row.propuesta.enviadaEn,
          estudiantes: estudiantesNombres,
          carrera: row.carreraNombre || "Sin Carrera",
          asesorAsignadoId: row.propuesta.asesorId,
          solicitudActual: lastSolicitud
            ? {
                id: lastSolicitud.solicitud.id,
                asesorId: lastSolicitud.asesor.id,
                asesorNombre: lastSolicitud.asesor.nombreCompleto,
                estado: lastSolicitud.solicitud.estado,
                justificacionRechazo: lastSolicitud.solicitud.justificacionRechazo,
                creadaEn: lastSolicitud.solicitud.creadaEn,
              }
            : null,
        };
      })
    );

    return { success: true, data: result };
  } catch (error: any) {
    console.error("Error al obtener propuestas pendientes del coordinador:", error);
    return { success: false, error: "Error interno: " + error.message };
  }
}

/**
 * Fetch advisers belonging to the Coordinator's faculty
 */
export async function getAsesoresFacultad() {
  try {
    const session = await getSession();
    if (!session || session.rol !== "coordinador") {
      return { success: false, error: "No autorizado" };
    }

    const [userCoord] = await db
      .select()
      .from(usuarios)
      .where(eq(usuarios.id, session.userId))
      .limit(1);

    const coordFacultadId = userCoord?.facultadId;

    let asesoresList;
    if (coordFacultadId) {
      asesoresList = await db
        .select({
          id: usuarios.id,
          nombreCompleto: usuarios.nombreCompleto,
          correo: usuarios.correo,
        })
        .from(usuarios)
        .where(
          and(
            eq(usuarios.rol, "asesor"),
            eq(usuarios.facultadId, coordFacultadId),
            eq(usuarios.activo, true)
          )
        );
    } else {
      asesoresList = await db
        .select({
          id: usuarios.id,
          nombreCompleto: usuarios.nombreCompleto,
          correo: usuarios.correo,
        })
        .from(usuarios)
        .where(and(eq(usuarios.rol, "asesor"), eq(usuarios.activo, true)));
    }

    return { success: true, data: asesoresList };
  } catch (error: any) {
    console.error("Error al obtener asesores:", error);
    return { success: false, error: "Error interno: " + error.message };
  }
}

/**
 * Coordinator sends request to an Advisor to mentor a proposal
 */
export async function asignarAsesorCoordinador(propuestaId: number, asesorId: number) {
  try {
    const session = await getSession();
    if (!session || session.rol !== "coordinador") {
      return { success: false, error: "No autorizado" };
    }

    const [prop] = await db
      .select()
      .from(propuestas)
      .where(eq(propuestas.id, propuestaId))
      .limit(1);

    if (!prop) return { success: false, error: "Propuesta no encontrada." };

    const [asesor] = await db
      .select()
      .from(usuarios)
      .where(and(eq(usuarios.id, asesorId), eq(usuarios.rol, "asesor")))
      .limit(1);

    if (!asesor) return { success: false, error: "El asesor seleccionado no es válido." };

    // Check if there is already a pending request for this proposal and advisor
    const [existingReq] = await db
      .select()
      .from(solicitudesAsesor)
      .where(
        and(
          eq(solicitudesAsesor.propuestaId, propuestaId),
          eq(solicitudesAsesor.asesorId, asesorId),
          eq(solicitudesAsesor.estado, "pendiente")
        )
      )
      .limit(1);

    if (existingReq) {
      return { success: false, error: "Ya existe una solicitud pendiente enviada a este asesor." };
    }

    // Insert request with coordinatorId recorded
    await db.insert(solicitudesAsesor).values({
      propuestaId,
      asesorId,
      coordinadorId: session.userId,
      estado: "pendiente",
      creadaEn: new Date(),
    });

    // Notify Advisor
    const [estudiante] = await db
      .select()
      .from(usuarios)
      .where(eq(usuarios.id, prop.egresadoId))
      .limit(1);

    const tipoPropStr =
      prop.tipo === "pasantia"
        ? "Pasantía"
        : prop.tipo === "proyecto"
        ? "Proyecto Específico"
        : "Investigación";

    const nombreEst = estudiante ? estudiante.nombreCompleto : "Estudiante";
    const carnetEst = estudiante?.carnet || "N/A";

    await db.insert(notificaciones).values({
      usuarioId: asesorId,
      tipo: "solicitud_asesoria",
      mensaje: `Se ha asignado una propuesta de ${tipoPropStr} de parte del estudiante ${nombreEst} con carnet ${carnetEst}, ¿estaría dispuesto a asesorar?`,
      leida: false,
      creadoEn: new Date(),
    });

    revalidatePath("/coordinador");
    revalidatePath("/asesor");

    return {
      success: true,
      message: `Solicitud de asesoría enviada a ${asesor.nombreCompleto} exitosamente.`,
    };
  } catch (error: any) {
    console.error("Error al asignar asesor por coordinador:", error);
    return { success: false, error: "Error interno: " + error.message };
  }
}

/**
 * Fetch "Mis propuestas asignadas" for Coordinator (Proposals where advisor accepted)
 */
export async function getPropuestasAsignadasCoordinador() {
  try {
    const session = await getSession();
    if (!session || session.rol !== "coordinador") {
      return { success: false, error: "No autorizado" };
    }

    // Fetch accepted advisor requests made by this coordinator (or proposals assigned to this coordinator with an advisor)
    const acceptedRows = await db
      .select({
        propuesta: propuestas,
        asesor: usuarios,
      })
      .from(propuestas)
      .innerJoin(usuarios, eq(propuestas.asesorId, usuarios.id))
      .where(
        and(
          eq(propuestas.coordinadorId, session.userId),
          eq(propuestas.estado, "aprobada")
        )
      )
      .orderBy(desc(propuestas.fechaAprobacion));

    const result = await Promise.all(
      acceptedRows.map(async (row) => {
        const [estudiante] = await db
          .select()
          .from(usuarios)
          .where(eq(usuarios.id, row.propuesta.egresadoId))
          .limit(1);

        let estudiantesNombres = estudiante?.nombreCompleto || "Estudiante";
        if (row.propuesta.tipo === "proyecto" || row.propuesta.tipo === "investigacion") {
          const team = await db
            .select({ nombre: usuarios.nombreCompleto })
            .from(integrantesProyecto)
            .innerJoin(usuarios, eq(integrantesProyecto.egresadoId, usuarios.id))
            .where(
              and(
                eq(integrantesProyecto.propuestaId, row.propuesta.id),
                eq(integrantesProyecto.estado, "aceptado")
              )
            );
          if (team.length > 0) {
            estudiantesNombres += ", " + team.map((t) => t.nombre).join(", ");
          }
        }

        const [carta] = await db
          .select()
          .from(cartasAceptacion)
          .where(eq(cartasAceptacion.propuestaId, row.propuesta.id))
          .limit(1);

        const fechaInicio = carta?.fechaInicio || (row.propuesta.fechaAprobacion ? row.propuesta.fechaAprobacion.toISOString().split("T")[0] : "N/A");
        const fechaFin = carta?.fechaFin || "N/A";

        return {
          id: row.propuesta.id,
          numero: row.propuesta.numero,
          tipo: row.propuesta.tipo,
          titulo: row.propuesta.titulo || `Propuesta #${row.propuesta.numero}`,
          asesorNombre: row.asesor.nombreCompleto,
          estudiantes: estudiantesNombres,
          fechaInicio,
          fechaFin,
        };
      })
    );

    return { success: true, data: result };
  } catch (error: any) {
    console.error("Error al obtener propuestas asignadas por coordinador:", error);
    return { success: false, error: "Error interno: " + error.message };
  }
}

/**
 * Fetch details of a proposal for Coordinator view (Read-only progress)
 */
export async function getDetallePropuestaCoordinador(propuestaId: number) {
  try {
    const session = await getSession();
    if (!session || (session.rol !== "coordinador" && session.rol !== "admin" && session.rol !== "decanato")) {
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

    if (!prop) return { success: false, error: "Propuesta no encontrada" };

    let asesorObj = null;
    if (prop.propuesta.asesorId) {
      const [ase] = await db.select().from(usuarios).where(eq(usuarios.id, prop.propuesta.asesorId)).limit(1);
      asesorObj = ase || null;
    }

    let empresa = null;
    let supervisor = null;
    if (prop.propuesta.empresaId) {
      const [emp] = await db.select().from(empresas).where(eq(empresas.id, prop.propuesta.empresaId)).limit(1);
      empresa = emp || null;
    }
    if (prop.propuesta.supervisorId) {
      const [sup] = await db.select().from(supervisores).where(eq(supervisores.id, prop.propuesta.supervisorId)).limit(1);
      supervisor = sup || null;
    }

    const [carta] = await db.select().from(cartasAceptacion).where(eq(cartasAceptacion.propuestaId, propuestaId)).limit(1);
    const actividadesList = await db
      .select()
      .from(actividades)
      .where(eq(actividades.propuestaId, propuestaId))
      .orderBy(asc(actividades.periodo), asc(actividades.semana), asc(actividades.numero));

    const [detalles] = await db.select().from(detallesProyecto).where(eq(detallesProyecto.propuestaId, propuestaId)).limit(1);
    const docs = await db.select().from(documentosEgresado).where(eq(documentosEgresado.egresadoId, prop.propuesta.egresadoId));

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
        asesor: asesorObj,
        empresa,
        supervisor,
        carta,
        actividades: actividadesList,
        detallesProyecto: detalles || null,
        documentos: docs,
      },
    };
  } catch (error: any) {
    console.error("Error al obtener detalle para coordinador:", error);
    return { success: false, error: "Error interno: " + error.message };
  }
}

/**
 * Advisor requests to cancel / dar de baja a project
 */
export async function solicitarBajaProyectoAsesor(propuestaId: number, motivo: string) {
  try {
    const session = await getSession();
    if (!session || session.rol !== "asesor") {
      return { success: false, error: "No autorizado" };
    }

    if (!motivo || !motivo.trim()) {
      return { success: false, error: "Debe ingresar el motivo de la baja del proyecto." };
    }

    const [prop] = await db.select().from(propuestas).where(eq(propuestas.id, propuestaId)).limit(1);
    if (!prop) return { success: false, error: "Propuesta no encontrada." };

    let coordinadorTargetId = prop.coordinadorId;

    if (!coordinadorTargetId) {
      // Find coordinator who sent the advisor request
      const [sol] = await db
        .select()
        .from(solicitudesAsesor)
        .where(
          and(
            eq(solicitudesAsesor.propuestaId, propuestaId),
            eq(solicitudesAsesor.asesorId, session.userId)
          )
        )
        .limit(1);
      coordinadorTargetId = sol?.coordinadorId || null;
    }

    if (!coordinadorTargetId) {
      // Find any coordinator
      const [firstCoord] = await db.select().from(usuarios).where(eq(usuarios.rol, "coordinador")).limit(1);
      coordinadorTargetId = firstCoord?.id || null;
    }

    if (!coordinadorTargetId) {
      return { success: false, error: "No se encontró un coordinador asignado para recibir la solicitud." };
    }

    // Insert cancellation request
    await db.insert(solicitudesBaja).values({
      propuestaId,
      asesorId: session.userId,
      coordinadorId: coordinadorTargetId,
      motivo: motivo.trim(),
      estado: "pendiente",
      creadaEn: new Date(),
    });

    // Notify Coordinator
    await db.insert(notificaciones).values({
      usuarioId: coordinadorTargetId,
      tipo: "solicitud_baja_proyecto",
      mensaje: `El asesor de la propuesta #${prop.numero} (${prop.titulo || "Sin Título"}) ha solicitado DAR DE BAJA el proyecto.`,
      leida: false,
      creadoEn: new Date(),
    });

    revalidatePath(`/asesor/propuestas/${propuestaId}`);
    return { success: true, message: "Solicitud de baja enviada al coordinador exitosamente." };
  } catch (error: any) {
    console.error("Error al solicitar baja del proyecto:", error);
    return { success: false, error: "Error interno: " + error.message };
  }
}

/**
 * Fetch pending cancellation requests for Coordinator
 */
export async function getSolicitudesBajaCoordinador() {
  try {
    const session = await getSession();
    if (!session || session.rol !== "coordinador") {
      return { success: false, error: "No autorizado" };
    }

    const rows = await db
      .select({
        solicitud: solicitudesBaja,
        propuesta: propuestas,
        asesor: usuarios,
      })
      .from(solicitudesBaja)
      .innerJoin(propuestas, eq(solicitudesBaja.propuestaId, propuestas.id))
      .innerJoin(usuarios, eq(solicitudesBaja.asesorId, usuarios.id))
      .where(eq(solicitudesBaja.coordinadorId, session.userId))
      .orderBy(desc(solicitudesBaja.creadaEn));

    const result = await Promise.all(
      rows.map(async (r) => {
        const [est] = await db.select().from(usuarios).where(eq(usuarios.id, r.propuesta.egresadoId)).limit(1);
        return {
          id: r.solicitud.id,
          propuestaId: r.propuesta.id,
          titulo: r.propuesta.titulo || `Propuesta #${r.propuesta.numero}`,
          tipo: r.propuesta.tipo,
          asesorNombre: r.asesor.nombreCompleto,
          estudianteNombre: est?.nombreCompleto || "Estudiante",
          motivo: r.solicitud.motivo,
          estado: r.solicitud.estado,
          respuestaCoordinador: r.solicitud.respuestaCoordinador,
          creadaEn: r.solicitud.creadaEn,
        };
      })
    );

    return { success: true, data: result };
  } catch (error: any) {
    console.error("Error al obtener solicitudes de baja:", error);
    return { success: false, error: "Error interno: " + error.message };
  }
}

/**
 * Coordinator approves or rejects a cancellation request ("Dar de baja proyecto")
 */
export async function responderSolicitudBajaCoordinador(
  solicitudBajaId: number,
  decision: "aprobada" | "rechazada",
  respuesta?: string
) {
  try {
    const session = await getSession();
    if (!session || session.rol !== "coordinador") {
      return { success: false, error: "No autorizado" };
    }

    const [solBaja] = await db
      .select()
      .from(solicitudesBaja)
      .where(
        and(
          eq(solicitudesBaja.id, solicitudBajaId),
          eq(solicitudesBaja.coordinadorId, session.userId)
        )
      )
      .limit(1);

    if (!solBaja) return { success: false, error: "Solicitud de baja no encontrada." };

    await db
      .update(solicitudesBaja)
      .set({
        estado: decision,
        respuestaCoordinador: respuesta?.trim() || null,
        respondidoEn: new Date(),
      })
      .where(eq(solicitudesBaja.id, solicitudBajaId));

    if (decision === "aprobada") {
      // Set proposal state to 'anulada'
      await db
        .update(propuestas)
        .set({ estado: "anulada" })
        .where(eq(propuestas.id, solBaja.propuestaId));

      // Notify Advisor & Student
      const [prop] = await db.select().from(propuestas).where(eq(propuestas.id, solBaja.propuestaId)).limit(1);
      if (prop) {
        await db.insert(notificaciones).values({
          usuarioId: prop.egresadoId,
          tipo: "proyecto_anulado",
          mensaje: `Tu propuesta "${prop.titulo || "N/A"}" ha sido DADA DE BAJA / ANULADA por solicitud académica.`,
          leida: false,
          creadoEn: new Date(),
        });

        await db.insert(notificaciones).values({
          usuarioId: solBaja.asesorId,
          tipo: "solicitud_baja_aprobada",
          mensaje: `La solicitud de baja para la propuesta "${prop.titulo || "N/A"}" ha sido APROBADA.`,
          leida: false,
          creadoEn: new Date(),
        });
      }
    }

    revalidatePath("/coordinador");
    return {
      success: true,
      message: decision === "aprobada" ? "El proyecto ha sido dado de baja (anulado) exitosamente." : "La solicitud de baja fue rechazada.",
    };
  } catch (error: any) {
    console.error("Error al responder solicitud de baja:", error);
    return { success: false, error: "Error interno: " + error.message };
  }
}

/**
 * Coordinator accepts or rejects proposal assignment from Admin
 */
export async function responderAsignacionCoordinador(
  propuestaId: number,
  aceptada: boolean,
  motivoRechazo?: string
) {
  try {
    const session = await getSession();
    if (!session || session.rol !== "coordinador") {
      return { success: false, error: "No autorizado" };
    }

    const [propuesta] = await db.select().from(propuestas).where(eq(propuestas.id, propuestaId)).limit(1);
    if (!propuesta) return { success: false, error: "Propuesta no encontrada." };

    const estadoAnterior = propuesta.estado;

    if (aceptada) {
      // Coordinator accepts proposal assignment
      await db.update(propuestas)
        .set({
          estado: "aprobada",
          fechaAprobacion: propuesta.fechaAprobacion || new Date(),
        })
        .where(eq(propuestas.id, propuestaId));

      await db.insert(historialEstados).values({
        propuestaId,
        de: estadoAnterior,
        a: "aprobada",
        usuarioId: session.userId,
      });

      revalidatePath("/coordinador");
      revalidatePath("/admin/propuestas");
      revalidatePath(`/admin/propuestas/${propuestaId}`);

      return { success: true, message: "Has aceptado la asignación de la propuesta exitosamente." };
    } else {
      // Coordinator rejects assignment -> Reverts back to 'enviada' (Pendiente de Revisión)
      await db.update(propuestas)
        .set({
          estado: "enviada",
          coordinadorId: null,
        })
        .where(eq(propuestas.id, propuestaId));

      await db.insert(historialEstados).values({
        propuestaId,
        de: estadoAnterior,
        a: "enviada",
        usuarioId: session.userId,
      });

      // Notify Admins
      const admins = await db.select().from(usuarios).where(eq(usuarios.rol, "admin"));
      const [coordUser] = await db.select().from(usuarios).where(eq(usuarios.id, session.userId)).limit(1);
      const coordNombre = coordUser ? coordUser.nombreCompleto : "Coordinador";

      for (const admin of admins) {
        await db.insert(notificaciones).values({
          usuarioId: admin.id,
          tipo: "coordinador_rechazo",
          mensaje: `El coordinador ${coordNombre} NO aceptó la asignación de la propuesta #${propuesta.numero} (${propuesta.titulo || "Sin Título"}). La propuesta ha regresado a Pendiente de Revisión. ${motivoRechazo ? `Motivo: ${motivoRechazo}` : ""}`,
          leida: false,
          creadoEn: new Date(),
        });
      }

      revalidatePath("/coordinador");
      revalidatePath("/admin/propuestas");
      revalidatePath(`/admin/propuestas/${propuestaId}`);

      return {
        success: true,
        message: "Asignación rechazada. La propuesta ha regresado a Pendiente de Revisión para el Administrador.",
      };
    }
  } catch (error: any) {
    console.error("Error al responder asignación de coordinador:", error);
    return { success: false, error: "Error interno: " + error.message };
  }
}
