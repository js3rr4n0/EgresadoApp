"use server";

import { db } from "@/lib/db";
import {
  propuestas,
  usuarios,
  integrantesProyecto,
  detallesProyecto,
  notificaciones,
  carreras,
} from "@/lib/schema";
import { eq, and, ne } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

/**
 * Invitaciones y Equipo del Proyecto
 */

export async function getUserPendingInvitations() {
  const session = await getSession();
  if (!session || session.rol !== "egresado") return [];

  const invitations = await db
    .select({
      id: integrantesProyecto.id,
      propuestaId: integrantesProyecto.propuestaId,
      creadoEn: integrantesProyecto.creadoEn,
      invitadorNombre: usuarios.nombreCompleto,
      invitadorCarnet: usuarios.carnet,
      propuestaTipo: propuestas.tipo,
    })
    .from(integrantesProyecto)
    .innerJoin(usuarios, eq(integrantesProyecto.invitadoPorId, usuarios.id))
    .innerJoin(propuestas, eq(integrantesProyecto.propuestaId, propuestas.id))
    .where(
      and(
        eq(integrantesProyecto.egresadoId, session.userId),
        eq(integrantesProyecto.estado, "pendiente")
      )
    );

  return invitations;
}

export async function getUserAcceptedTeamProposal() {
  const session = await getSession();
  if (!session || session.rol !== "egresado") return null;

  const accepted = await db
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

  return accepted.length > 0 ? accepted[0] : null;
}

export async function invitarIntegrante(propuestaId: number, carnet: string) {
  const session = await getSession();
  if (!session || session.rol !== "egresado") {
    return { success: false, error: "No autorizado" };
  }

  const cleanCarnet = carnet.trim();
  if (!cleanCarnet) {
    return { success: false, error: "Debes ingresar un número de carnet." };
  }

  // 1. Verify proposal exists and belongs to current user
  const propRows = await db
    .select()
    .from(propuestas)
    .where(and(eq(propuestas.id, propuestaId), eq(propuestas.egresadoId, session.userId)))
    .limit(1);

  if (propRows.length === 0) {
    return { success: false, error: "Propuesta no encontrada o no tienes permisos." };
  }

  const propuesta = propRows[0];

  // 2. Search target user by carnet
  const targetUsers = await db
    .select({
      id: usuarios.id,
      nombreCompleto: usuarios.nombreCompleto,
      carnet: usuarios.carnet,
      rol: usuarios.rol,
    })
    .from(usuarios)
    .where(eq(usuarios.carnet, cleanCarnet))
    .limit(1);

  if (targetUsers.length === 0) {
    return { success: false, error: `No se encontró ningún egresado con el carnet "${cleanCarnet}".` };
  }

  const targetUser = targetUsers[0];

  if (targetUser.rol !== "egresado") {
    return { success: false, error: "El usuario encontrado no es un egresado." };
  }

  if (targetUser.id === session.userId) {
    return { success: false, error: "No puedes invitarte a ti mismo." };
  }

  // 3. Check if target user is already in an accepted team
  const existingTeam = await db
    .select()
    .from(integrantesProyecto)
    .where(
      and(
        eq(integrantesProyecto.egresadoId, targetUser.id),
        eq(integrantesProyecto.estado, "aceptado")
      )
    )
    .limit(1);

  if (existingTeam.length > 0) {
    return { success: false, error: `El egresado ${targetUser.nombreCompleto} ya forma parte de otro equipo de trabajo.` };
  }

  // 4. Check if already invited to this proposal
  const existingInvite = await db
    .select()
    .from(integrantesProyecto)
    .where(
      and(
        eq(integrantesProyecto.propuestaId, propuestaId),
        eq(integrantesProyecto.egresadoId, targetUser.id)
      )
    )
    .limit(1);

  if (existingInvite.length > 0) {
    if (existingInvite[0].estado === "pendiente") {
      return { success: false, error: `Ya existe una invitación pendiente para ${targetUser.nombreCompleto}.` };
    }
    if (existingInvite[0].estado === "aceptado") {
      return { success: false, error: `${targetUser.nombreCompleto} ya es parte de tu equipo.` };
    }
    // If rejected previously, update to pending
    await db
      .update(integrantesProyecto)
      .set({ estado: "pendiente", creadoEn: new Date() })
      .where(eq(integrantesProyecto.id, existingInvite[0].id));
  } else {
    // Insert new invitation
    await db.insert(integrantesProyecto).values({
      propuestaId,
      egresadoId: targetUser.id,
      invitadoPorId: session.userId,
      estado: "pendiente",
    });
  }

  // 5. Send notification to invited student
  const inviterUsers = await db
    .select({ nombreCompleto: usuarios.nombreCompleto, carnet: usuarios.carnet })
    .from(usuarios)
    .where(eq(usuarios.id, session.userId))
    .limit(1);

  const inviter = inviterUsers[0];
  const tipoLabel = propuesta.tipo === "investigacion" ? "Investigación" : propuesta.tipo === "proyecto" ? "Proyecto" : "Pasantía";
  const mensaje = `${inviter.nombreCompleto} (${inviter.carnet || 'Sin carnet'}) te ha invitado a unirte a su propuesta de tipo ${tipoLabel}.`;

  await db.insert(notificaciones).values({
    usuarioId: targetUser.id,
    tipo: "invitacion_proyecto",
    mensaje,
  });

  revalidatePath("/egresado");
  revalidatePath("/egresado/redactar");
  return { success: true };
}

export async function responderInvitacion(integranteId: number, aceptar: boolean) {
  const session = await getSession();
  if (!session || session.rol !== "egresado") {
    return { success: false, error: "No autorizado" };
  }

  const integranteRows = await db
    .select()
    .from(integrantesProyecto)
    .where(
      and(
        eq(integrantesProyecto.id, integranteId),
        eq(integrantesProyecto.egresadoId, session.userId)
      )
    )
    .limit(1);

  if (integranteRows.length === 0) {
    return { success: false, error: "Invitación no encontrada." };
  }

  const nuevoEstado = aceptar ? "aceptado" : "rechazado";

  await db
    .update(integrantesProyecto)
    .set({ estado: nuevoEstado })
    .where(eq(integrantesProyecto.id, integranteId));

  revalidatePath("/egresado");
  revalidatePath("/egresado/redactar");
  return { success: true };
}

export async function expulsarIntegrante(integranteId: number) {
  const session = await getSession();
  if (!session || session.rol !== "egresado") {
    return { success: false, error: "No autorizado" };
  }

  // Verify leader owns the proposal
  const integrante = await db
    .select({
      id: integrantesProyecto.id,
      propuestaId: integrantesProyecto.propuestaId,
      leaderId: propuestas.egresadoId,
    })
    .from(integrantesProyecto)
    .innerJoin(propuestas, eq(integrantesProyecto.propuestaId, propuestas.id))
    .where(eq(integrantesProyecto.id, integranteId))
    .limit(1);

  if (integrante.length === 0 || integrante[0].leaderId !== session.userId) {
    return { success: false, error: "No tienes permisos para expulsar a este integrante." };
  }

  await db.delete(integrantesProyecto).where(eq(integrantesProyecto.id, integranteId));

  revalidatePath("/egresado");
  revalidatePath("/egresado/redactar");
  return { success: true };
}

export async function salirDelGrupo(integranteId: number) {
  const session = await getSession();
  if (!session || session.rol !== "egresado") {
    return { success: false, error: "No autorizado" };
  }

  const rows = await db
    .select()
    .from(integrantesProyecto)
    .where(
      and(
        eq(integrantesProyecto.id, integranteId),
        eq(integrantesProyecto.egresadoId, session.userId)
      )
    )
    .limit(1);

  if (rows.length === 0) {
    return { success: false, error: "No perteneces a este grupo." };
  }

  await db.delete(integrantesProyecto).where(eq(integrantesProyecto.id, integranteId));

  revalidatePath("/egresado");
  revalidatePath("/egresado/redactar");
  return { success: true };
}

export async function getEquipoProyecto(propuestaId: number) {
  const team = await db
    .select({
      id: integrantesProyecto.id,
      egresadoId: integrantesProyecto.egresadoId,
      estado: integrantesProyecto.estado,
      nombreCompleto: usuarios.nombreCompleto,
      carnet: usuarios.carnet,
      correo: usuarios.correo,
    })
    .from(integrantesProyecto)
    .innerJoin(usuarios, eq(integrantesProyecto.egresadoId, usuarios.id))
    .where(eq(integrantesProyecto.propuestaId, propuestaId));

  return team;
}

/**
 * Detalles Específicos del Proyecto
 */

export async function getDetallesProyecto(propuestaId: number) {
  const rows = await db
    .select()
    .from(detallesProyecto)
    .where(eq(detallesProyecto.propuestaId, propuestaId))
    .limit(1);

  return rows.length > 0 ? rows[0] : null;
}

export async function saveActoresIntervinientes(
  propuestaId: number,
  data: {
    patrocinador: string;
    beneficiario: string;
    ejecutor: string;
    financista: string;
  }
) {
  const session = await getSession();
  if (!session || session.rol !== "egresado") {
    return { success: false, error: "No autorizado" };
  }

  const existing = await db
    .select()
    .from(detallesProyecto)
    .where(eq(detallesProyecto.propuestaId, propuestaId))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(detallesProyecto)
      .set({
        actorPatrocinador: data.patrocinador,
        actorBeneficiario: data.beneficiario,
        actorEjecutor: data.ejecutor,
        actorFinancista: data.financista,
      })
      .where(eq(detallesProyecto.propuestaId, propuestaId));
  } else {
    await db.insert(detallesProyecto).values({
      propuestaId,
      actorPatrocinador: data.patrocinador,
      actorBeneficiario: data.beneficiario,
      actorEjecutor: data.ejecutor,
      actorFinancista: data.financista,
    });
  }

  revalidatePath("/egresado/redactar");
  return { success: true };
}

export async function saveDescripcionProblema(propuestaId: number, descripcionProblema: string) {
  const session = await getSession();
  if (!session || session.rol !== "egresado") {
    return { success: false, error: "No autorizado" };
  }

  const existing = await db
    .select()
    .from(detallesProyecto)
    .where(eq(detallesProyecto.propuestaId, propuestaId))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(detallesProyecto)
      .set({ descripcionProblema })
      .where(eq(detallesProyecto.propuestaId, propuestaId));
  } else {
    await db.insert(detallesProyecto).values({
      propuestaId,
      descripcionProblema,
    });
  }

  revalidatePath("/egresado/redactar");
  return { success: true };
}

export async function saveJustificacionProyecto(propuestaId: number, justificacion: string) {
  const session = await getSession();
  if (!session || session.rol !== "egresado") {
    return { success: false, error: "No autorizado" };
  }

  const existing = await db
    .select()
    .from(detallesProyecto)
    .where(eq(detallesProyecto.propuestaId, propuestaId))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(detallesProyecto)
      .set({ justificacion })
      .where(eq(detallesProyecto.propuestaId, propuestaId));
  } else {
    await db.insert(detallesProyecto).values({
      propuestaId,
      justificacion,
    });
  }

  revalidatePath("/egresado/redactar");
  return { success: true };
}

export async function saveAlcanceProyecto(propuestaId: number, alcance: string) {
  const session = await getSession();
  if (!session || session.rol !== "egresado") {
    return { success: false, error: "No autorizado" };
  }

  const existing = await db
    .select()
    .from(detallesProyecto)
    .where(eq(detallesProyecto.propuestaId, propuestaId))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(detallesProyecto)
      .set({ alcance })
      .where(eq(detallesProyecto.propuestaId, propuestaId));
  } else {
    await db.insert(detallesProyecto).values({
      propuestaId,
      alcance,
    });
  }

  revalidatePath("/egresado/redactar");
  return { success: true };
}

export async function saveObjetivosProyecto(
  propuestaId: number,
  data: {
    objetivoGeneral: string;
    objetivosEspecificos: { titulo: string; descripcion: string }[];
  }
) {
  const session = await getSession();
  if (!session || session.rol !== "egresado") {
    return { success: false, error: "No autorizado" };
  }

  if (!data.objetivoGeneral?.trim()) {
    return { success: false, error: "El objetivo general es obligatorio." };
  }

  if (!Array.isArray(data.objetivosEspecificos) || data.objetivosEspecificos.length < 4 || data.objetivosEspecificos.length > 6) {
    return { success: false, error: "Debes registrar entre 4 y 6 objetivos específicos." };
  }

  const existing = await db
    .select()
    .from(detallesProyecto)
    .where(eq(detallesProyecto.propuestaId, propuestaId))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(detallesProyecto)
      .set({
        objetivoGeneral: data.objetivoGeneral,
        objetivosEspecificos: data.objetivosEspecificos,
      })
      .where(eq(detallesProyecto.propuestaId, propuestaId));
  } else {
    await db.insert(detallesProyecto).values({
      propuestaId,
      objetivoGeneral: data.objetivoGeneral,
      objetivosEspecificos: data.objetivosEspecificos,
    });
  }

  revalidatePath("/egresado/redactar");
  return { success: true };
}
