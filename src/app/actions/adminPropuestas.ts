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
  empresas,
} from "@/lib/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { opcionesAsesor, reglaDePropuesta } from "@/lib/asignacionServidor";
import { alcanceAdmin, puedeAsignarPropuesta } from "@/lib/permisos";
import { notificarEquipo } from "@/lib/notificarEquipo";

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

    await notificarEquipo(propuesta.id, `propuesta_${estado}`, notifMsg);

    revalidatePath("/admin/propuestas");
    revalidatePath(`/admin/propuestas/${propuestaId}`);

    return { success: true };
  } catch (error: any) {
    console.error("Error al revisar propuesta:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Coordinadores con su carga. Con `soloIds` (entrega C2) se devuelven solo esos usuarios, que pueden incluir al
 * administrador de facultad (rol decanato) cuando la configuración de la cohorte lo permite.
 */
export async function getCoordinadoresConEstadisticas(empresaId?: number | null, soloIds?: number[] | null) {
  try {
    if (soloIds && soloIds.length === 0) return { success: true, data: [] };
    const coords = await db
      .select({
        id: usuarios.id,
        nombreCompleto: usuarios.nombreCompleto,
        correo: usuarios.correo,
        rol: usuarios.rol,
        facultadId: usuarios.facultadId,
        facultadNombre: facultades.nombre,
      })
      .from(usuarios)
      .leftJoin(facultades, eq(usuarios.facultadId, facultades.id))
      .where(soloIds ? inArray(usuarios.id, soloIds) : inArray(usuarios.rol, ["coordinador", "admin"]));

    const coordinadoresConStats = await Promise.all(
      coords.map(async (c) => {
        const result = await db
          .select({
            id: propuestas.id,
            numero: propuestas.numero,
            titulo: propuestas.titulo,
            tipo: propuestas.tipo,
            estado: propuestas.estado,
            empresaId: propuestas.empresaId,
            empresaNombre: empresas.nombre,
          })
          .from(propuestas)
          .leftJoin(empresas, eq(propuestas.empresaId, empresas.id))
          .where(
            and(
              eq(propuestas.coordinadorId, c.id),
              inArray(propuestas.estado, ["coordinador_asignado", "aprobada", "enviada"])
            )
          );

        const proyectosDetalle = result.map((p) => ({
          id: p.id,
          numero: p.numero,
          titulo: p.titulo || `Propuesta #${p.numero}`,
          tipo: p.tipo,
          estado: p.estado,
          empresaId: p.empresaId,
          empresaNombre: p.empresaNombre || null,
        }));

        let proyectosEmpresaCount = 0;
        if (empresaId) {
          const empResult = await db
            .select({ id: propuestas.id })
            .from(propuestas)
            .where(
              and(
                eq(propuestas.coordinadorId, c.id),
                eq(propuestas.empresaId, empresaId)
              )
            );
          proyectosEmpresaCount = empResult.length;
        }

        return {
          id: c.id,
          nombreCompleto: c.nombreCompleto,
          correo: c.correo,
          rol: c.rol,
          facultadNombre: c.facultadNombre || (c.rol === "admin" ? "Administración Central" : "Sin Facultad"),
          proyectosAsignadosCount: result.length,
          proyectosEmpresaCount,
          proyectosDetalle,
        };
      })
    );

    // Prioritize coordinators who have worked with the company, then sort by lower workload
    coordinadoresConStats.sort((a, b) => {
      if (b.proyectosEmpresaCount !== a.proyectosEmpresaCount) {
        return b.proyectosEmpresaCount - a.proyectosEmpresaCount;
      }
      return a.proyectosAsignadosCount - b.proyectosAsignadosCount;
    });

    return { success: true, data: coordinadoresConStats };
  } catch (error: any) {
    console.error("Error al obtener coordinadores:", error);
    return { success: false, error: "Error al cargar coordinadores", data: [] };
  }
}

export async function asignarPropuestaACoordinador(propuestaId: number, coordinadorId: number) {
  try {
    // Superadministrador o administrador de facultad con permiso en la cohorte (C3)
    const alcance = await alcanceAdmin();
    if (!alcance || !(await puedeAsignarPropuesta(alcance, propuestaId))) return { success: false, error: "No autorizado" };
    const session = alcance.session;

    const [propuesta] = await db.select().from(propuestas).where(eq(propuestas.id, propuestaId)).limit(1);
    if (!propuesta) return { success: false, error: "Propuesta no encontrada" };

    const [coordinador] = await db.select().from(usuarios).where(eq(usuarios.id, coordinadorId)).limit(1);
    if (!coordinador) return { success: false, error: "Coordinador no encontrado" };

    // Entrega C2: solo los coordinadores que la configuración de la cohorte permite para la carrera del egresado
    const regla = await reglaDePropuesta(propuestaId);
    if (regla?.configurada) {
      if (regla.sinCoordinador) return { success: false, error: "Esta propuesta no lleva coordinador en su cohorte: asigna el asesor directamente." };
      const permitidos = [...(regla.coordinadores ?? []), ...(regla.adminFacultadId ? [regla.adminFacultadId] : [])];
      if (!permitidos.includes(coordinadorId)) return { success: false, error: "Ese coordinador no está configurado para la carrera de esta propuesta en su cohorte." };
    } else if (!["coordinador", "admin"].includes(coordinador.rol)) {
      return { success: false, error: "El usuario elegido no es coordinador." };
    }

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

/**
 * Entrega C2: cuando la facultad (o la carrera) no tiene coordinador en la cohorte, el superadministrador envía la
 * solicitud de asesoría directamente. Se usa el mismo mecanismo que el coordinador (solicitudes_asesor): el asesor
 * acepta o rechaza desde su panel. La propuesta queda sin coordinador.
 */
export async function asignarAsesorDirecto(propuestaId: number, asesorId: number) {
  try {
    const alcance = await alcanceAdmin();
    if (!alcance || !(await puedeAsignarPropuesta(alcance, propuestaId))) return { success: false, error: "No autorizado" };
    const session = alcance.session;

    const [propuesta] = await db.select().from(propuestas).where(eq(propuestas.id, propuestaId)).limit(1);
    if (!propuesta) return { success: false, error: "Propuesta no encontrada" };
    if (propuesta.asesorId) return { success: false, error: "La propuesta ya tiene asesor." };
    if (!["enviada", "coordinador_asignado"].includes(propuesta.estado)) return { success: false, error: "La propuesta no está en espera de asignación." };

    const regla = await reglaDePropuesta(propuestaId);
    if (!regla?.configurada || !regla.sinCoordinador) return { success: false, error: "Esta propuesta lleva coordinador según la configuración de su cohorte." };
    const opciones = await opcionesAsesor(regla);
    const asesor = opciones.find((a) => a.id === asesorId);
    if (!asesor) return { success: false, error: "Ese asesor no participa en esta cohorte para la carrera de la propuesta." };

    const [pendiente] = await db
      .select({ id: solicitudesAsesor.id })
      .from(solicitudesAsesor)
      .where(and(eq(solicitudesAsesor.propuestaId, propuestaId), eq(solicitudesAsesor.asesorId, asesorId), eq(solicitudesAsesor.estado, "pendiente")));
    if (pendiente) return { success: false, error: "Ya hay una solicitud pendiente para ese asesor." };

    // Una sola solicitud viva: las anteriores pendientes se reemplazan
    await db
      .update(solicitudesAsesor)
      .set({ estado: "rechazada", justificacionRechazo: "Reemplazada por una nueva solicitud del superadministrador", respondidoEn: new Date() })
      .where(and(eq(solicitudesAsesor.propuestaId, propuestaId), eq(solicitudesAsesor.estado, "pendiente")));
    await db.insert(solicitudesAsesor).values({ propuestaId, asesorId, coordinadorId: session.userId, estado: "pendiente", creadaEn: new Date() });
    // Si antes tenía coordinador (configuración cambiada), se quita: en esta cohorte la facultad no lo usa
    if (propuesta.coordinadorId) await db.update(propuestas).set({ coordinadorId: null }).where(eq(propuestas.id, propuestaId));
    await db.insert(historialEstados).values({ propuestaId, de: propuesta.estado, a: "asesor_solicitado_directo", usuarioId: session.userId });

    const [estudiante] = await db.select().from(usuarios).where(eq(usuarios.id, propuesta.egresadoId)).limit(1);
    const tipo = propuesta.tipo === "pasantia" ? "Pasantía" : propuesta.tipo === "proyecto" ? "Proyecto" : "Investigación";
    await db.insert(notificaciones).values({
      usuarioId: asesorId,
      tipo: "solicitud_asesoria",
      mensaje: `La administración le solicita asesorar una propuesta de ${tipo} del estudiante ${estudiante?.nombreCompleto ?? "Estudiante"} (carnet ${estudiante?.carnet ?? "N/A"}). ¿Está dispuesto a asesorar?`,
      leida: false,
      creadoEn: new Date(),
    });

    revalidatePath("/admin/propuestas");
    revalidatePath(`/admin/propuestas/${propuestaId}`);
    revalidatePath("/asesor");
    return { success: true, message: `Solicitud de asesoría enviada a ${asesor.nombre}.` };
  } catch (error: any) {
    console.error("Error al asignar asesor directo:", error);
    return { success: false, error: "No se pudo enviar la solicitud al asesor." };
  }
}

export async function eliminarPropuestaBorrador(propuestaId: number) {
  try {
    const session = await getSession();
    // Solo el superadministrador elimina propuestas (C3)
    if (!session || session.rol !== "admin") {
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
