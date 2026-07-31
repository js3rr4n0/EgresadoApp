"use server";

import { db } from "@/lib/db";
import { propuestas, historialEstados, solicitudesAsesor, usuarios, notificaciones, facultades, carreras } from "@/lib/schema";
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

export async function getCoordinadoresConEstadisticas() {
  try {
    const session = await getSession();
    if (!session || session.rol !== "admin") return { success: false, error: "No autorizado", data: [] };

    const coords = await db
      .select({
        id: usuarios.id,
        nombreCompleto: usuarios.nombreCompleto,
        correo: usuarios.correo,
        facultadId: usuarios.facultadId,
        carreraId: usuarios.carreraId,
      })
      .from(usuarios)
      .where(eq(usuarios.rol, "coordinador"));

    // Fetch all facultades
    const facs = await db.select().from(facultades);
    const cars = await db.select().from(carreras);
    const propsList = await db.select({
      id: propuestas.id,
      coordinadorId: propuestas.coordinadorId,
      estado: propuestas.estado,
    }).from(propuestas);

    const data = coords.map((c) => {
      // Determine facultad name
      let facNombre = "Facultad General";
      if (c.facultadId) {
        const f = facs.find((item) => item.id === c.facultadId);
        if (f) facNombre = f.nombre;
      } else if (c.carreraId) {
        const car = cars.find((item) => item.id === c.carreraId);
        if (car && car.facultadId) {
          const f = facs.find((item) => item.id === car.facultadId);
          if (f) facNombre = f.nombre;
        }
      }

      // Count assigned non-rejected proposals
      const count = propsList.filter(
        (p) => p.coordinadorId === c.id && p.estado !== "rechazada"
      ).length;

      return {
        id: c.id,
        nombreCompleto: c.nombreCompleto,
        correo: c.correo,
        facultadNombre: facNombre,
        proyectosAsignadosCount: count,
      };
    });

    return { success: true, data };
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
        estado: "aprobada",
        fechaAprobacion: propuesta.fechaAprobacion || new Date(),
      })
      .where(eq(propuestas.id, propuestaId));

    if (estadoAnterior !== "aprobada") {
      await db.insert(historialEstados).values({
        propuestaId,
        de: estadoAnterior,
        a: "aprobada",
        usuarioId: session.userId,
      });
    }

    // Send notification to coordinator
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
