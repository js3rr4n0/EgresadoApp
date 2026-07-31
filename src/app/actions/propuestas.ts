"use server";

import { db } from "@/lib/db";
import { propuestas, periodos, usuarios, carreras, facultades } from "@/lib/schema";
import { eq, desc, and, inArray } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function getActivePropuesta() {
  const session = await getSession();
  if (!session || session.rol !== "egresado") return null;

  // 1. Get active period
  const activePeriodRows = await db.select().from(periodos).where(eq(periodos.activo, true)).limit(1);
  if (activePeriodRows.length === 0) return { error: "No hay periodo activo actualmente." };
  const periodo = activePeriodRows[0];

  // 2. Check for existing proposal owned by user
  const props = await db
    .select()
    .from(propuestas)
    .where(
      and(
        eq(propuestas.egresadoId, session.userId),
        eq(propuestas.periodoId, periodo.id)
      )
    )
    .orderBy(desc(propuestas.numero));

  let propuesta = props.length > 0 ? props[0] : null;
  let isLeader = true;
  let memberInfo = null;

  // If user doesn't own a proposal, check if they are part of an accepted project team
  if (!propuesta) {
    const { integrantesProyecto, usuarios } = await import("@/lib/schema");
    const teamMemberRows = await db
      .select({
        integranteId: integrantesProyecto.id,
        propuesta: propuestas,
        liderNombre: usuarios.nombreCompleto,
        liderCarnet: usuarios.carnet,
      })
      .from(integrantesProyecto)
      .innerJoin(propuestas, eq(integrantesProyecto.propuestaId, propuestas.id))
      .innerJoin(usuarios, eq(propuestas.egresadoId, usuarios.id))
      .where(
        and(
          eq(integrantesProyecto.egresadoId, session.userId),
          eq(integrantesProyecto.estado, "aceptado")
        )
      )
      .limit(1);

    if (teamMemberRows.length > 0) {
      propuesta = teamMemberRows[0].propuesta;
      isLeader = false;
      memberInfo = {
        integranteId: teamMemberRows[0].integranteId,
        liderNombre: teamMemberRows[0].liderNombre,
        liderCarnet: teamMemberRows[0].liderCarnet,
      };
    }
  }

  // 3. Return error if no proposal exists or assigned
  if (!propuesta) {
    return { error: "No has creado ninguna propuesta aún." };
  }

  // 4. Fetch User details for Portada
  const userRows = await db
    .select({
      nombreCompleto: usuarios.nombreCompleto,
      carnet: usuarios.carnet,
      carrera: carreras.nombre,
      facultad: facultades.nombre,
    })
    .from(usuarios)
    .leftJoin(carreras, eq(usuarios.carreraId, carreras.id))
    .leftJoin(facultades, eq(usuarios.facultadId, facultades.id))
    .where(eq(usuarios.id, session.userId))
    .limit(1);

  const userDetails = userRows[0];

  // 5. Month of sending (from current date as it is being drafted)
  const mesEnvio = new Intl.DateTimeFormat('es-SV', { month: 'long' }).format(new Date());

  return { propuesta, userDetails, mesEnvio, periodo, isLeader, memberInfo };
}

export async function updatePortada(formData: FormData) {
  const session = await getSession();
  if (!session || session.rol !== "egresado") return { success: false, error: "No autorizado" };

  const nombreCompleto = formData.get("nombreCompleto") as string;
  const carnet = formData.get("carnet") as string;
  
  if (nombreCompleto || carnet) {
    const updateData: any = {};
    if (nombreCompleto) updateData.nombreCompleto = nombreCompleto;
    if (carnet) updateData.carnet = carnet;
    
    await db.update(usuarios).set(updateData).where(eq(usuarios.id, session.userId));
  }

  revalidatePath("/egresado");
  return { success: true };
}

export async function initPropuesta(tipo: string) {
  try {
    const session = await getSession();
    if (!session || session.rol !== "egresado") return { success: false, error: "No autorizado" };

    const activePeriodRows = await db.select().from(periodos).where(eq(periodos.activo, true)).limit(1);
    if (activePeriodRows.length === 0) return { success: false, error: "No hay periodo activo actualmente." };
    const periodo = activePeriodRows[0];

    const isRecepcionAbierta = new Date() <= new Date(periodo.finRecepcion + 'T23:59:59');
    if (!isRecepcionAbierta) {
      return { success: false, error: `La recepción de nuevas propuestas para el ciclo ${periodo.nombre} ha finalizado.` };
    }

    const props = await db
      .select()
      .from(propuestas)
      .where(
        and(
          eq(propuestas.egresadoId, session.userId),
          eq(propuestas.periodoId, periodo.id)
        )
      )
      .orderBy(desc(propuestas.numero));

    let propuesta = props.length > 0 ? props[0] : null;

    if (propuesta) {
      if (propuesta.estado === "redactando") {
        await db.update(propuestas).set({ tipo }).where(eq(propuestas.id, propuesta.id));
        revalidatePath("/egresado");
        revalidatePath("/egresado/redactar");
        return { success: true };
      }
      
      if (propuesta.estado === "rechazada") {
        await db.insert(propuestas).values({
          egresadoId: session.userId,
          periodoId: periodo.id,
          tipo,
          numero: propuesta.numero + 1,
          estado: "redactando"
        });
        revalidatePath("/egresado");
        revalidatePath("/egresado/redactar");
        return { success: true };
      }

      return { success: false, error: "Ya existe una propuesta activa enviada o aprobada." };
    } else {
      await db.insert(propuestas).values({
        egresadoId: session.userId,
        periodoId: periodo.id,
        tipo,
        numero: 1,
        estado: "redactando"
      });
      revalidatePath("/egresado");
      revalidatePath("/egresado/redactar");
      return { success: true };
    }
  } catch (error: any) {
    console.error("Error initPropuesta:", error);
    return { success: false, error: "Error interno del servidor al crear la propuesta: " + error.message };
  }
}

export async function updateEmpresa(propuestaId: number, empresaId: number | null, sucursalId: number | null = null) {
  const session = await getSession();
  if (!session || session.rol !== "egresado") return { success: false, error: "No autorizado" };

  await db.update(propuestas)
    .set({ empresaId, sucursalId })
    .where(and(eq(propuestas.id, propuestaId), eq(propuestas.egresadoId, session.userId)));
    
  revalidatePath("/egresado/redactar");
  return { success: true };
}

export async function solicitarRevisionEmpresa(propuestaId: number, data: any, mode: "edit_existing" | "create_new") {
  const session = await getSession();
  if (!session || session.rol !== "egresado") return { success: false, error: "No autorizado" };

  try {
    const { solicitudesEmpresa } = await import("@/lib/schema");

    // 1. Insert request into solicitudes_empresa
    await db.insert(solicitudesEmpresa).values({
      propuestaId,
      empresaId: data.empresa.targetEmpresaId || null,
      tipo: mode === "edit_existing" ? "actualizacion" : "nueva",
      datos: data,
      estado: "pendiente"
    });

    // 2. Update propuesta state and block it
    await db.update(propuestas)
      .set({
        estado: mode === "edit_existing" ? "pend_revision_datos" : "pend_empresa_nueva",
        bloqueada: true
      })
      .where(and(eq(propuestas.id, propuestaId), eq(propuestas.egresadoId, session.userId)));

    revalidatePath("/egresado/redactar");
    return { success: true };
  } catch (error: any) {
    console.error("Error soliciting revision:", error);
    return { success: false, error: error.message || "Error interno del servidor" };
  }
}

export async function enviarPropuesta(id: number) {
  const session = await getSession();
  if (!session || session.rol !== "egresado") return { success: false, error: "No autorizado" };

  // Verify documents
  const { documentosEgresado } = await import("@/lib/schema");
  const docs = await db.select().from(documentosEgresado).where(eq(documentosEgresado.egresadoId, session.userId));
  
  const hasServicio = docs.some(d => d.tipo === "servicio_social");
  const hasNotas = docs.some(d => d.tipo === "certificacion_notas");
  const hasPago = docs.some(d => d.tipo === "pago_tg");

  if (!hasServicio || !hasNotas || !hasPago) {
    return { success: false, error: "Debes subir OBLIGATORIAMENTE los tres archivos (Servicio, Notas, Pago) para enviar la propuesta." };
  }

  // Update proposal status
  await db.update(propuestas)
    .set({ estado: "enviada", enviadaEn: new Date() })
    .where(and(eq(propuestas.id, id), eq(propuestas.egresadoId, session.userId)));

  revalidatePath("/egresado");
  revalidatePath("/egresado/redactar");
  return { success: true };
}

export async function solicitarCorreccionDatosDecanato(formData: FormData) {
  const session = await getSession();
  if (!session || session.rol !== "egresado") return { success: false, error: "No autorizado" };

  const pIdStr = formData.get("propuestaId") as string;
  const propuestaId = pIdStr ? parseInt(pIdStr) : null;
  const nombrePropuesto = formData.get("nombrePropuesto") as string;
  const carnetPropuesto = formData.get("carnetPropuesto") as string;
  const justificacion = formData.get("justificacion") as string;

  if (!nombrePropuesto || !carnetPropuesto) {
    return { success: false, error: "Debes especificar el Nombre y Carnet solicitados." };
  }

  try {
    const { solicitudesEmpresa, notificaciones, usuarios } = await import("@/lib/schema");

    // Fetch current user info for comparisons
    const currentUser = await db.query.usuarios.findFirst({
      where: eq(usuarios.id, session.userId)
    });

    const datosPayload = {
      tipo: "datos_alumno",
      egresadoId: session.userId,
      nombrePropuesto,
      carnetPropuesto,
      justificacion: justificacion || "Sin justificación especificada",
      anteriores: {
        nombreCompleto: currentUser?.nombreCompleto || "N/A",
        carnet: currentUser?.carnet || "N/A"
      },
      nuevos: {
        nombreCompleto: nombrePropuesto,
        carnet: carnetPropuesto
      }
    };

    if (!propuestaId) {
      return { success: false, error: "Debes tener una propuesta iniciada para enviar esta solicitud." };
    }

    await db.insert(solicitudesEmpresa).values({
      propuestaId: propuestaId,
      empresaId: null,
      tipo: "datos_alumno",
      datos: datosPayload,
      estado: "pendiente",
    });

    // Notify Decanato and Admin users
    const adminOrDecanatoUsers = await db
      .select()
      .from(usuarios)
      .where(inArray(usuarios.rol, ["decanato", "admin"]));

    for (const u of adminOrDecanatoUsers) {
      await db.insert(notificaciones).values({
        usuarioId: u.id,
        tipo: "solicitud_correccion_datos",
        mensaje: `El egresado ${currentUser?.nombreCompleto} (Carnet: ${currentUser?.carnet}) ha enviado una solicitud de corrección de datos personales/carnet (${nombrePropuesto}, ${carnetPropuesto}).`,
      });
    }

    revalidatePath("/egresado/redactar");
    revalidatePath("/admin/empresas/solicitudes");
    return { success: true, message: "Solicitud enviada exitosamente para su revisión por las autoridades." };
  } catch (error: any) {
    console.error("Error al solicitar corrección de datos:", error);
    return { success: false, error: error.message || "Error al procesar la solicitud." };
  }
}
