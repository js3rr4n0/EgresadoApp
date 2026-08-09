"use server";

import { db } from "@/lib/db";
import { propuestas, periodos, usuarios, carreras, facultades } from "@/lib/schema";
import { eq, asc, desc, and, inArray } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function getActivePropuesta(targetPropuestaId?: number) {
  const session = await getSession();
  if (!session || session.rol !== "egresado") return null;

  // 1. Get active period
  const activePeriodRows = await db.select().from(periodos).where(eq(periodos.activo, true)).limit(1);
  if (activePeriodRows.length === 0) return { error: "No hay periodo activo actualmente." };
  const periodo = activePeriodRows[0];

  // 2. Check for existing proposals owned by user
  const props = await db
    .select()
    .from(propuestas)
    .where(
      and(
        eq(propuestas.egresadoId, session.userId),
        eq(propuestas.periodoId, periodo.id)
      )
    )
    .orderBy(asc(propuestas.id));

  let propuesta = null;
  if (targetPropuestaId) {
    propuesta = props.find((p) => p.id === targetPropuestaId) || null;
  }
  if (!propuesta && props.length > 0) {
    propuesta = props[0];
  }

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

  // Calculate sequential display number for current proposal
  const currentPropIndex = props.findIndex((p) => p.id === propuesta!.id);
  const displayNumero = currentPropIndex !== -1 ? currentPropIndex + 1 : (propuesta.numero || 1);
  const propuestaConNumero = { ...propuesta, numero: displayNumero };

  // Check if ANY proposal of the user is submitted or approved
  const submittedIndex = props.findIndex((p) => p.estado === "enviada" || p.estado === "aprobada");
  const isAnySubmitted = submittedIndex !== -1;
  const isCurrentSubmitted = propuesta.estado === "enviada" || propuesta.estado === "aprobada";

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

  // 5. Month of sending
  const mesEnvio = new Intl.DateTimeFormat('es-SV', { month: 'long' }).format(new Date());

  return {
    propuesta: propuestaConNumero,
    userDetails,
    mesEnvio,
    periodo,
    isLeader,
    memberInfo,
    allPropuestas: props,
    isAnySubmitted,
    isCurrentSubmitted,
    submittedPropNumber: submittedIndex !== -1 ? submittedIndex + 1 : null,
  };
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
      .orderBy(asc(propuestas.id));

    // If user has any proposal currently submitted or approved, block creating a new one
    const activeSubmitted = props.find((p) => p.estado === "enviada" || p.estado === "aprobada");
    if (activeSubmitted) {
      return {
        success: false,
        error: `Ya tienes la Propuesta #${activeSubmitted.numero} en estado de revisión o aprobada. No puedes crear nuevas propuestas mientras una esté en proceso.`,
      };
    }

    if (props.length >= 3) {
      return { success: false, error: "Has alcanzado el límite máximo de 3 propuestas permitidas." };
    }

    const nextNumero = props.length + 1;
    const defaultTitulo = `Propuesta de ${tipo === 'pasantia' ? 'Pasantía' : tipo === 'proyecto' ? 'Proyecto Específico' : 'Investigación'} #${nextNumero}`;

    const [newProp] = await db
      .insert(propuestas)
      .values({
        egresadoId: session.userId,
        periodoId: periodo.id,
        tipo,
        numero: nextNumero,
        titulo: defaultTitulo,
        estado: "redactando",
      })
      .returning();

    revalidatePath("/egresado");
    revalidatePath("/egresado/redactar");
    return { success: true, propuestaId: newProp.id, numero: nextNumero };
  } catch (error: any) {
    console.error("Error initPropuesta:", error);
    return { success: false, error: "Error interno del servidor al crear la propuesta: " + error.message };
  }
}

export async function updateTituloPropuesta(propuestaId: number, titulo: string) {
  const session = await getSession();
  if (!session || session.rol !== "egresado") return { success: false, error: "No autorizado" };

  if (!titulo || !titulo.trim()) {
    return { success: false, error: "El título de la propuesta no puede estar vacío." };
  }

  await db
    .update(propuestas)
    .set({ titulo: titulo.trim() })
    .where(eq(propuestas.id, propuestaId));

  revalidatePath("/egresado");
  revalidatePath("/egresado/redactar");
  return { success: true };
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
    const { solicitudesEmpresa, notificaciones, usuarios } = await import("@/lib/schema");

    // Force mode to "edit_existing" if targetEmpresaId is present
    const effectiveMode = (data?.empresa?.targetEmpresaId || mode === "edit_existing") ? "edit_existing" : "create_new";

    // 1. Insert request into solicitudes_empresa
    await db.insert(solicitudesEmpresa).values({
      propuestaId,
      empresaId: data.empresa?.targetEmpresaId || null,
      tipo: effectiveMode === "edit_existing" ? "actualizacion" : "nueva",
      datos: data,
      estado: "pendiente"
    });

    // 2. Update propuesta state and block it
    await db.update(propuestas)
      .set({
        estado: effectiveMode === "edit_existing" ? "pend_revision_datos" : "pend_empresa_nueva",
        bloqueada: true
      })
      .where(and(eq(propuestas.id, propuestaId), eq(propuestas.egresadoId, session.userId)));

    // 3. Create notification for admin & decanato users
    const adminOrDecanatoUsers = await db
      .select()
      .from(usuarios)
      .where(inArray(usuarios.rol, ["decanato", "admin"]));

    const currentUser = await db.query.usuarios.findFirst({
      where: eq(usuarios.id, session.userId)
    });

    const tipoNombre = effectiveMode === "edit_existing" ? "corrección de datos de empresa/supervisor" : "registro de nueva empresa/supervisor";
    const empresaNombre = data.empresa?.nombre ? ` (${data.empresa.nombre})` : "";

    for (const u of adminOrDecanatoUsers) {
      await db.insert(notificaciones).values({
        usuarioId: u.id,
        tipo: effectiveMode === "edit_existing" ? "solicitud_empresa_actualizacion" : "solicitud_empresa_nueva",
        mensaje: `El egresado ${currentUser?.nombreCompleto || "Egresado"} (Carnet: ${currentUser?.carnet || "N/A"}) ha enviado una solicitud de ${tipoNombre}${empresaNombre}.`,
      });
    }

    revalidatePath("/egresado/redactar");
    revalidatePath("/admin/empresas/solicitudes");
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

  const now = new Date();

  // Update proposal status
  await db.update(propuestas)
    .set({ estado: "enviada", enviadaEn: now })
    .where(and(eq(propuestas.id, id), eq(propuestas.egresadoId, session.userId)));

  // Save official PDF snapshot record in database
  const { documentosPropuesta } = await import("@/lib/schema");
  try {
    await db.insert(documentosPropuesta).values({
      propuestaId: id,
      tipo: "pdf_oficial_enviado",
      archivoUrl: `/egresado/redactar/imprimir?id=${id}`,
      nombreArchivo: `Propuesta_Oficial_${id}.pdf`,
      subidoEn: now,
    });
  } catch (err) {
    console.log("PDF snapshot record creation handled:", err);
  }

  revalidatePath("/egresado");
  revalidatePath("/egresado/redactar");
  return { success: true };
}

export async function reenviarPropuestaAjustada(id: number) {
  const session = await getSession();
  if (!session || session.rol !== "egresado") return { success: false, error: "No autorizado" };

  const [prop] = await db.select().from(propuestas).where(and(eq(propuestas.id, id), eq(propuestas.egresadoId, session.userId))).limit(1);
  if (!prop) return { success: false, error: "Propuesta no encontrada." };

  const now = new Date();
  const nuevoEstado = prop.coordinadorId ? "coordinador_asignado" : "enviada";

  await db.update(propuestas)
    .set({
      estado: nuevoEstado,
      observaciones: null,
      enviadaEn: now,
    })
    .where(eq(propuestas.id, id));

  const { historialEstados, documentosPropuesta } = await import("@/lib/schema");
  await db.insert(historialEstados).values({
    propuestaId: id,
    de: "redactando",
    a: "ajustes_completados",
    usuarioId: session.userId,
  });

  try {
    await db.insert(documentosPropuesta).values({
      propuestaId: id,
      tipo: `pdf_revisado_${now.getTime()}`,
      archivoUrl: `/egresado/redactar/imprimir?id=${id}`,
      nombreArchivo: `Propuesta_Revisada_${id}.pdf`,
      subidoEn: now,
    });

    if (prop.asesorId) {
      const { notificaciones } = await import("@/lib/schema");
      await db.insert(notificaciones).values({
        usuarioId: prop.asesorId,
        tipo: "propuesta_ajustada",
        mensaje: `El estudiante ha enviado su propuesta ajustada con las correcciones realizadas (Propuesta #${prop.numero}).`,
        leida: false,
        creadoEn: now,
      });
    }
  } catch (err) {
    console.log("Adjusted PDF snapshot record creation handled:", err);
  }

  revalidatePath("/egresado");
  revalidatePath("/egresado/redactar");
  revalidatePath(`/asesor/propuestas/${id}`);
  revalidatePath("/asesor");
  return { success: true, message: "¡Propuesta ajustada reenviada exitosamente a revisión!" };
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

    // Lock proposal waiting for approval
    await db
      .update(propuestas)
      .set({ bloqueada: true, estado: "pend_revision_datos" })
      .where(eq(propuestas.id, propuestaId));

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
