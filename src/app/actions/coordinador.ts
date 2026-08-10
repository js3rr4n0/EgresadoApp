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
import { eq, and, desc, asc, inArray, isNotNull, or, isNull } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

/**
 * Fetch proposals assigned by Admin to the logged-in Coordinator for advisor assignment
 */
export async function getPropuestasPendientesCoordinador() {
  try {
    const session = await getSession();
    if (!session || (session.rol !== "coordinador" && session.rol !== "admin")) {
      return { success: false, error: "No autorizado" };
    }

    const isAdmin = session.rol === "admin";

    const adminUsers = await db
      .select({ id: usuarios.id })
      .from(usuarios)
      .where(eq(usuarios.rol, "admin"));
    const adminIds = adminUsers.map((u) => u.id);
    if (!adminIds.includes(session.userId)) adminIds.push(session.userId);

    // Fetch proposals assigned specifically to this coordinator/admin
    const rawPropuestas = await db
      .select({
        propuesta: propuestas,
        estudiante: usuarios,
        carreraNombre: carreras.nombre,
      })
      .from(propuestas)
      .leftJoin(usuarios, eq(propuestas.egresadoId, usuarios.id))
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
        let estudiantesNombres = row.estudiante?.nombreCompleto || "Estudiante";
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
    if (!session || (session.rol !== "coordinador" && session.rol !== "admin")) {
      return { success: false, error: "No autorizado" };
    }

    const isAdmin = session.rol === "admin";

    const [userCoord] = await db
      .select()
      .from(usuarios)
      .where(eq(usuarios.id, session.userId))
      .limit(1);

    const coordFacultadId = userCoord?.facultadId;

    let asesoresList: any[] = [];

    // 1. Try to fetch advisers belonging to the same faculty
    if (coordFacultadId && !isAdmin) {
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
            or(eq(usuarios.activo, true), isNull(usuarios.activo))
          )
        );
    }

    // 2. Fallback: If no advisers found for faculty or user is admin, fetch all active advisers
    if (asesoresList.length === 0) {
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
            or(eq(usuarios.activo, true), isNull(usuarios.activo))
          )
        );
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
    if (!session || (session.rol !== "coordinador" && session.rol !== "admin")) {
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

    // Cancel any previous pending requests for this proposal to other advisors
    try {
      await db
        .update(solicitudesAsesor)
        .set({
          estado: "rechazada",
          justificacionRechazo: "Reemplazada por nueva solicitud enviada por el coordinador",
          respondidoEn: new Date(),
        })
        .where(
          and(
            eq(solicitudesAsesor.propuestaId, propuestaId),
            eq(solicitudesAsesor.estado, "pendiente")
          )
        );
    } catch (e) {
      console.log("Error al cancelar solicitudes previas:", e);
    }

    // Ensure coordinatorId is attached to the proposal
    try {
      await db
        .update(propuestas)
        .set({
          coordinadorId: prop.coordinadorId || session.userId,
        })
        .where(eq(propuestas.id, propuestaId));
    } catch (e) {
      console.log("Error non-fatal al actualizar coordinadorId en propuesta:", e);
    }

    // Insert request with fallback if coordinadorId column is missing in production DB
    try {
      await db.insert(solicitudesAsesor).values({
        propuestaId,
        asesorId,
        coordinadorId: session.userId,
        estado: "pendiente",
        creadaEn: new Date(),
      });
    } catch (err: any) {
      console.warn("Fallo inserción primaria en solicitudesAsesor, intentando fallback sin coordinadorId:", err?.message);
      await db.insert(solicitudesAsesor).values({
        propuestaId,
        asesorId,
        estado: "pendiente",
        creadaEn: new Date(),
      });
    }

    // Log in proposal history
    try {
      await db.insert(historialEstados).values({
        propuestaId,
        de: prop.estado,
        a: `solicitud_asesor_enviada`,
        usuarioId: session.userId,
      });
    } catch (e) {
      console.log("Error non-fatal al registrar en historial:", e);
    }

    // Notify Advisor
    try {
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
    } catch (e) {
      console.log("Error non-fatal al enviar notificacion:", e);
    }

    revalidatePath("/coordinador");
    revalidatePath(`/coordinador/propuestas/${propuestaId}`);
    revalidatePath(`/coordinador/propuestas/${propuestaId}/dictamen`);
    revalidatePath("/asesor");
    revalidatePath(`/asesor/propuestas/${propuestaId}`);
    revalidatePath("/admin/propuestas");
    revalidatePath(`/admin/propuestas/${propuestaId}`);

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
    if (!session || (session.rol !== "coordinador" && session.rol !== "admin")) {
      return { success: false, error: "No autorizado" };
    }

    // Fetch all proposals assigned specifically to this logged-in coordinator
    const acceptedRows = await db
      .select({
        propuesta: propuestas,
        asesor: usuarios,
      })
      .from(propuestas)
      .leftJoin(usuarios, eq(propuestas.asesorId, usuarios.id))
      .where(eq(propuestas.coordinadorId, session.userId))
      .orderBy(desc(propuestas.enviadaEn), desc(propuestas.id));

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

        let fechaInicio = "N/A";
        if (carta?.fechaInicio) {
          fechaInicio = String(carta.fechaInicio);
        } else if (row.propuesta.fechaAprobacion) {
          try {
            const d = new Date(row.propuesta.fechaAprobacion);
            if (!isNaN(d.getTime())) {
              fechaInicio = d.toISOString().split("T")[0];
            }
          } catch (e) {}
        }
        const fechaFin = carta?.fechaFin ? String(carta.fechaFin) : "N/A";

        return {
          id: row.propuesta.id,
          numero: row.propuesta.numero,
          tipo: row.propuesta.tipo,
          titulo: row.propuesta.titulo || `Propuesta #${row.propuesta.numero}`,
          asesorNombre: row.asesor ? row.asesor.nombreCompleto : "Sin Asesor Asignado",
          estudiantes: estudiantesNombres,
          fechaInicio,
          fechaFin,
          estado: row.propuesta.estado,
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
    if (!session) {
      return { success: false, error: "No autorizado" };
    }

    const [propRow] = await db
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

    if (!propRow || !propRow.propuesta) {
      return { success: false, error: "Propuesta no encontrada" };
    }

    const prop = propRow.propuesta;

    let estudianteObj = null;
    if (propRow.estudiante) {
      estudianteObj = {
        nombreCompleto: propRow.estudiante.nombreCompleto || "Estudiante",
        carnet: propRow.estudiante.carnet || "N/A",
        correo: propRow.estudiante.correo || "N/A",
        carrera: propRow.carreraNombre || "Sin Carrera",
      };
    } else if (prop.egresadoId) {
      try {
        const [u] = await db.select().from(usuarios).where(eq(usuarios.id, prop.egresadoId)).limit(1);
        if (u) {
          estudianteObj = {
            nombreCompleto: u.nombreCompleto || "Estudiante",
            carnet: u.carnet || "N/A",
            correo: u.correo || "N/A",
            carrera: "Sin Carrera",
          };
        }
      } catch (e) {}
    }

    let asesorObj = null;
    if (prop.asesorId) {
      try {
        const [ase] = await db.select().from(usuarios).where(eq(usuarios.id, prop.asesorId)).limit(1);
        asesorObj = ase || null;
      } catch (e) {}
    }

    let empresa = null;
    let supervisor = null;
    if (prop.empresaId) {
      try {
        const [emp] = await db.select().from(empresas).where(eq(empresas.id, prop.empresaId)).limit(1);
        if (emp) {
          empresa = {
            ...emp,
            nombre: (emp as any).nombreEmpresa || (emp as any).nombre || "Empresa",
            direccion: (emp as any).direccionFormatoTexto || (emp as any).direccion || "Sin dirección",
          };
        }
      } catch (e) {}
    }

    if (prop.supervisorId) {
      try {
        const [sup] = await db.select().from(supervisores).where(eq(supervisores.id, prop.supervisorId)).limit(1);
        if (sup) {
          supervisor = {
            ...sup,
            nombres: (sup as any).nombreCompleto || (sup as any).nombres || "",
            apellidos: (sup as any).apellidos || "",
            cargo: sup.cargo || "Supervisor",
          };
        }
      } catch (e) {}
    }

    let carta = null;
    try {
      const [c] = await db.select().from(cartasAceptacion).where(eq(cartasAceptacion.propuestaId, propuestaId)).limit(1);
      carta = c || null;
    } catch (e) {}

    let actividadesList: any[] = [];
    try {
      actividadesList = await db
        .select()
        .from(actividades)
        .where(eq(actividades.propuestaId, propuestaId))
        .orderBy(asc(actividades.periodo), asc(actividades.semana), asc(actividades.numero));
    } catch (e) {}

    let detalles = null;
    try {
      const [d] = await db.select().from(detallesProyecto).where(eq(detallesProyecto.propuestaId, propuestaId)).limit(1);
      detalles = d || null;
    } catch (e) {}

    let docs: any[] = [];
    if (prop.egresadoId) {
      try {
        docs = await db.select().from(documentosEgresado).where(eq(documentosEgresado.egresadoId, prop.egresadoId));
      } catch (e) {}
    }

    let teamMembers: any[] = [];
    if (prop.tipo === "proyecto" || prop.tipo === "investigacion") {
      try {
        const teamRows = await db
          .select({
            id: usuarios.id,
            carnet: usuarios.carnet,
            nombreCompleto: usuarios.nombreCompleto,
            correo: usuarios.correo,
          })
          .from(integrantesProyecto)
          .innerJoin(usuarios, eq(integrantesProyecto.egresadoId, usuarios.id))
          .where(
            and(
              eq(integrantesProyecto.propuestaId, propuestaId),
              eq(integrantesProyecto.estado, "aceptado")
            )
          );
        teamMembers = teamRows;
      } catch (e) {}
    }

    let historialList: any[] = [];
    try {
      const hRes = await getHistorialCompletoProyecto(propuestaId);
      if (hRes.success) {
        historialList = hRes.data;
      }
    } catch (e) {}

    return {
      success: true,
      data: {
        propuesta: prop,
        estudiante: estudianteObj || {
          nombreCompleto: "Estudiante Solicitante",
          carnet: "N/A",
          correo: "N/A",
          carrera: "N/A",
        },
        teamMembers,
        asesor: asesorObj,
        empresa,
        supervisor,
        carta,
        actividades: actividadesList,
        detallesProyecto: detalles,
        documentos: docs,
        historial: historialList,
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
    if (!session || (session.rol !== "coordinador" && session.rol !== "admin")) {
      return { success: false, error: "No autorizado" };
    }

    const isAdmin = session.rol === "admin";

    const adminUsers = await db
      .select({ id: usuarios.id })
      .from(usuarios)
      .where(eq(usuarios.rol, "admin"));
    const adminIds = adminUsers.map((u) => u.id);
    if (!adminIds.includes(session.userId)) adminIds.push(session.userId);

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
    if (!session || (session.rol !== "coordinador" && session.rol !== "admin")) {
      return { success: false, error: "No autorizado" };
    }

    const isAdmin = session.rol === "admin";

    const [solBaja] = await db
      .select()
      .from(solicitudesBaja)
      .where(
        isAdmin
          ? eq(solicitudesBaja.id, solicitudBajaId)
          : and(
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
    if (!session || (session.rol !== "coordinador" && session.rol !== "admin")) {
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

/**
 * Coordinator starts the work plan, changing state to 'en_ejecucion'
 */
export async function darInicioPlanTrabajo(propuestaId: number) {
  try {
    const session = await getSession();
    if (!session || (session.rol !== "coordinador" && session.rol !== "admin")) {
      return { success: false, error: "No autorizado" };
    }

    const [prop] = await db.select().from(propuestas).where(eq(propuestas.id, propuestaId)).limit(1);
    if (!prop) return { success: false, error: "Propuesta no encontrada." };

    const estadoAnterior = prop.estado;

    await db
      .update(propuestas)
      .set({ estado: "en_ejecucion" })
      .where(eq(propuestas.id, propuestaId));

    await db.insert(historialEstados).values({
      propuestaId,
      de: estadoAnterior,
      a: "en_ejecucion",
      usuarioId: session.userId,
    });

    // Notify Student
    await db.insert(notificaciones).values({
      usuarioId: prop.egresadoId,
      tipo: "plan_trabajo_inicio",
      mensaje: `¡El Plan de Trabajo de tu propuesta #${prop.numero} ha iniciado oficialmente! Estado actual: EN EJECUCIÓN.`,
      leida: false,
      creadoEn: new Date(),
    });

    // Notify Advisor if assigned
    if (prop.asesorId) {
      await db.insert(notificaciones).values({
        usuarioId: prop.asesorId,
        tipo: "plan_trabajo_inicio",
        mensaje: `La Coordinación de Facultad ha dado INICIO OFICIAL al Plan de Trabajo de la propuesta #${prop.numero}. Estado actual: EN EJECUCIÓN.`,
        leida: false,
        creadoEn: new Date(),
      });
    }

    revalidatePath(`/coordinador/propuestas/${propuestaId}`);
    revalidatePath(`/asesor/propuestas/${propuestaId}`);
    revalidatePath(`/egresado`);
    revalidatePath(`/coordinador`);

    return {
      success: true,
      message: "¡El Plan de Trabajo ha iniciado exitosamente! Estado actualizado a En Ejecución.",
    };
  } catch (error: any) {
    console.error("Error al dar inicio al plan de trabajo:", error);
    return { success: false, error: "Error interno: " + error.message };
  }
}

/**
 * Fetch full comprehensive history timeline for a proposal (Status changes, coordinator reassignments, advisor requests, acceptances/rejections with justification, and documents).
 */
export async function getHistorialCompletoProyecto(propuestaId: number) {
  try {
    const events: Array<{
      id: string | number;
      fecha: Date;
      fechaStr: string;
      usuarioNombre: string;
      rol: string;
      titulo: string;
      detalle?: string;
      de?: string;
      a?: string;
      tipoEvento: "estado" | "coordinador" | "asesor" | "documento" | "baja";
    }> = [];

    // 1. Raw historialEstados entries
    const histRows = await db
      .select({
        historial: historialEstados,
        usuario: usuarios,
      })
      .from(historialEstados)
      .leftJoin(usuarios, eq(historialEstados.usuarioId, usuarios.id))
      .where(eq(historialEstados.propuestaId, propuestaId))
      .orderBy(asc(historialEstados.creadoEn));

    for (const h of histRows) {
      const u = h.usuario;
      const uNombre = u ? `${u.nombreCompleto} (${u.rol})` : "Sistema";
      const uRol = u ? u.rol : "sistema";
      const d = h.historial.creadoEn ? new Date(h.historial.creadoEn) : new Date();

      let titulo = `Cambio de estado: ${h.historial.de} ➔ ${h.historial.a}`;
      let tipoEvento: "estado" | "coordinador" | "asesor" | "documento" | "baja" = "estado";

      if (h.historial.a.startsWith("coordinador_asignado") || h.historial.a.startsWith("coordinador_reasignado")) {
        titulo = "Asignación / Reasignación de Coordinador de Facultad";
        tipoEvento = "coordinador";
      } else if (h.historial.a.startsWith("asesor_asignado") || h.historial.a === "solicitud_asesor_enviada") {
        titulo = "Solicitud de Asesoría enviada al docente";
        tipoEvento = "asesor";
      } else if (h.historial.a.startsWith("asesor_acepto")) {
        titulo = "✅ Solicitud de Asesoría ACEPTADA por el docente";
        tipoEvento = "asesor";
      } else if (h.historial.a.startsWith("asesor_rechazo")) {
        const parts = h.historial.a.split(":");
        const just = parts.slice(1).join(":");
        titulo = `❌ Solicitud de Asesoría RECHAZADA por el docente${just ? `: "${just}"` : ""}`;
        tipoEvento = "asesor";
      } else if (h.historial.a === "en_ejecucion") {
        titulo = "🚀 Inicio Oficial del Plan de Trabajo (En Ejecución)";
        tipoEvento = "estado";
      }

      events.push({
        id: `hist_${h.historial.id}`,
        fecha: d,
        fechaStr: d.toLocaleString("es-SV", {
          timeZone: "America/El_Salvador",
          dateStyle: "short",
          timeStyle: "short",
        }),
        usuarioNombre: uNombre,
        rol: uRol,
        titulo,
        de: h.historial.de,
        a: h.historial.a,
        tipoEvento,
      });
    }

    // 2. Solicitudes de Asesor (Advisor requests, acceptances, rejections)
    const solAsesor = await db
      .select({
        solicitud: solicitudesAsesor,
        asesor: usuarios,
      })
      .from(solicitudesAsesor)
      .innerJoin(usuarios, eq(solicitudesAsesor.asesorId, usuarios.id))
      .where(eq(solicitudesAsesor.propuestaId, propuestaId));

    for (const sa of solAsesor) {
      const createdDate = sa.solicitud.creadaEn ? new Date(sa.solicitud.creadaEn) : new Date();
      events.push({
        id: `sol_asesor_sent_${sa.solicitud.id}`,
        fecha: createdDate,
        fechaStr: createdDate.toLocaleString("es-SV", {
          timeZone: "America/El_Salvador",
          dateStyle: "short",
          timeStyle: "short",
        }),
        usuarioNombre: "Coordinación de Facultad",
        rol: "coordinador",
        titulo: `Solicitud de asesoría enviada/asignada a ${sa.asesor.nombreCompleto}`,
        detalle: `Estado de la solicitud: ${sa.solicitud.estado.toUpperCase()}`,
        de: "coordinador_asignado",
        a: "solicitud_asesor_enviada",
        tipoEvento: "asesor",
      });

      if (sa.solicitud.respondidoEn) {
        const respDate = new Date(sa.solicitud.respondidoEn);
        const isAceptada = sa.solicitud.estado === "aceptada";
        events.push({
          id: `sol_asesor_resp_${sa.solicitud.id}`,
          fecha: respDate,
          fechaStr: respDate.toLocaleString("es-SV", {
            timeZone: "America/El_Salvador",
            dateStyle: "short",
            timeStyle: "short",
          }),
          usuarioNombre: `${sa.asesor.nombreCompleto} (asesor)`,
          rol: "asesor",
          titulo: isAceptada
            ? `✅ Asesoría ACEPTADA por ${sa.asesor.nombreCompleto}`
            : `❌ Asesoría RECHAZADA por ${sa.asesor.nombreCompleto}`,
          detalle: isAceptada
            ? "El docente ha aceptado asesorar el proyecto/pasantía del estudiante."
            : `Justificación del rechazo: "${sa.solicitud.justificacionRechazo || "Sin motivo especificado"}"`,
          de: "solicitud_asesor_enviada",
          a: isAceptada ? "asesor_acepto" : "asesor_rechazo",
          tipoEvento: "asesor",
        });
      }
    }

    // 3. Solicitudes de Baja de Proyecto
    const solBaja = await db
      .select({
        baja: solicitudesBaja,
        asesor: usuarios,
      })
      .from(solicitudesBaja)
      .innerJoin(usuarios, eq(solicitudesBaja.asesorId, usuarios.id))
      .where(eq(solicitudesBaja.propuestaId, propuestaId));

    for (const sb of solBaja) {
      const createdDate = sb.baja.creadaEn ? new Date(sb.baja.creadaEn) : new Date();
      events.push({
        id: `sol_baja_created_${sb.baja.id}`,
        fecha: createdDate,
        fechaStr: createdDate.toLocaleString("es-SV", {
          timeZone: "America/El_Salvador",
          dateStyle: "short",
          timeStyle: "short",
        }),
        usuarioNombre: `${sb.asesor.nombreCompleto} (asesor)`,
        rol: "asesor",
        titulo: "⚠️ Solicitud de Baja de Proyecto enviada por Asesor",
        detalle: `Motivo expuesto: "${sb.baja.motivo}"`,
        de: "aprobada",
        a: "solicitud_baja",
        tipoEvento: "baja",
      });

      if (sb.baja.respondidoEn) {
        const respDate = new Date(sb.baja.respondidoEn);
        events.push({
          id: `sol_baja_resp_${sb.baja.id}`,
          fecha: respDate,
          fechaStr: respDate.toLocaleString("es-SV", {
            timeZone: "America/El_Salvador",
            dateStyle: "short",
            timeStyle: "short",
          }),
          usuarioNombre: "Coordinación de Facultad",
          rol: "coordinador",
          titulo: sb.baja.estado === "aprobada" ? "🚫 Baja del Proyecto APROBADA" : "ℹ️ Solicitud de Baja RECHAZADA",
          detalle: sb.baja.respuestaCoordinador ? `Respuesta: "${sb.baja.respuestaCoordinador}"` : undefined,
          de: "solicitud_baja",
          a: sb.baja.estado === "aprobada" ? "anulada" : "aprobada",
          tipoEvento: "baja",
        });
      }
    }

    // Deduplicate events by id
    const uniqueEventsMap = new Map<string, typeof events[0]>();
    for (const ev of events) {
      uniqueEventsMap.set(String(ev.id), ev);
    }
    const resultEvents = Array.from(uniqueEventsMap.values());

    // Sort chronologically (oldest to newest)
    resultEvents.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());

    return { success: true, data: resultEvents };
  } catch (error: any) {
    console.error("Error al obtener historial completo del proyecto:", error);
    return { success: false, error: error.message, data: [] };
  }
}

