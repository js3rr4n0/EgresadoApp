"use server";

import crypto from "crypto";
import { db } from "@/lib/db";
import {
  propuestas,
  usuarios,
  integrantesProyecto,
  detallesProyecto,
  notificaciones,
  carreras,
  ratificacionesPropuesta,
  actividades,
  documentosEgresado,
} from "@/lib/schema";
import { eq, and, ne, or, inArray, asc } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

/**
 * Invitaciones y Equipo del Proyecto (Especificación Colaboración Grupal Rev 2)
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

export async function invitarIntegrante(propuestaId: number, carnetOrEmail: string) {
  const session = await getSession();
  if (!session || session.rol !== "egresado") {
    return { success: false, error: "No autorizado" };
  }

  const cleanInput = carnetOrEmail.trim();
  if (!cleanInput) {
    return { success: false, error: "Debes ingresar un número de carnet o correo electrónico." };
  }

  // 1. Verify proposal exists and current user is coordinator/leader
  const propRows = await db
    .select()
    .from(propuestas)
    .where(and(eq(propuestas.id, propuestaId), eq(propuestas.egresadoId, session.userId)))
    .limit(1);

  if (propRows.length === 0) {
    return { success: false, error: "NO_COORDINA: Propuesta no encontrada o no tienes permisos de líder del equipo." };
  }

  const propuesta = propRows[0];

  // 2. Search target user by carnet OR email
  const targetUsers = await db
    .select({
      id: usuarios.id,
      nombreCompleto: usuarios.nombreCompleto,
      carnet: usuarios.carnet,
      correo: usuarios.correo,
      rol: usuarios.rol,
    })
    .from(usuarios)
    .where(
      or(
        eq(usuarios.carnet, cleanInput),
        eq(usuarios.correo, cleanInput.toLowerCase())
      )
    )
    .limit(1);

  if (targetUsers.length === 0) {
    return { success: false, error: `NO_ELEGIBLE: No se encontró ningún egresado con el carnet o correo "${cleanInput}".` };
  }

  const targetUser = targetUsers[0];

  if (targetUser.rol !== "egresado") {
    return { success: false, error: "NO_ELEGIBLE: El usuario encontrado no es un egresado." };
  }

  if (targetUser.id === session.userId) {
    return { success: false, error: "No puedes invitarte a ti mismo." };
  }

  // 3. Invariante I1 (Exclusividad Global): Check if target user already occupies a slot (pendiente / aceptado)
  const targetUserSlots = await db
    .select()
    .from(integrantesProyecto)
    .where(
      and(
        eq(integrantesProyecto.egresadoId, targetUser.id),
        inArray(integrantesProyecto.estado, ["pendiente", "aceptado"])
      )
    );

  const targetUserOwnedProps = await db
    .select()
    .from(propuestas)
    .where(and(eq(propuestas.egresadoId, targetUser.id), ne(propuestas.estado, "rechazada")));

  if (targetUserSlots.length > 0 || targetUserOwnedProps.length > 0) {
    return { success: false, error: `CUPO_OCUPADO: El egresado ${targetUser.nombreCompleto} ya forma parte de otro equipo de trabajo o posee un cupo ocupado.` };
  }

  // 4. Invariante I2 (Tamaño Máximo): Leader (1) + active/pending members < MAX_INTEGRANTES (3)
  const currentMembers = await db
    .select()
    .from(integrantesProyecto)
    .where(
      and(
        eq(integrantesProyecto.propuestaId, propuestaId),
        inArray(integrantesProyecto.estado, ["pendiente", "aceptado"])
      )
    );

  const totalCupos = 1 + currentMembers.length;
  if (totalCupos >= 3) {
    return { success: false, error: `GRUPO_LLENO: El equipo ya alcanzó el límite máximo de 3 integrantes (incluyendo invitaciones pendientes).` };
  }

  // 5. Check existing invitation record for this proposal
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
    // Update state to pending
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

  // 6. Send notification to invited student
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
    return { success: false, error: "INVITACION_RESUELTA: Invitación no encontrada." };
  }

  const invite = integranteRows[0];
  if (invite.estado !== "pendiente") {
    return { success: false, error: "INVITACION_RESUELTA: Esta invitación ya fue resuelta anteriormente." };
  }

  if (!aceptar) {
    await db
      .update(integrantesProyecto)
      .set({ estado: "rechazado" })
      .where(eq(integrantesProyecto.id, integranteId));

    revalidatePath("/egresado");
    revalidatePath("/egresado/redactar");
    return { success: true, message: "Invitación declinada." };
  }

  // ATOMIC RE-VERIFICATION AT ACCEPTANCE (§5 & §2 INVARIANTS I1, I2)
  // 1. Re-verify I1 (Exclusividad Global)
  const existingActiveTeam = await db
    .select()
    .from(integrantesProyecto)
    .where(
      and(
        eq(integrantesProyecto.egresadoId, session.userId),
        eq(integrantesProyecto.estado, "aceptado"),
        ne(integrantesProyecto.id, integranteId)
      )
    );

  const activeOwnedProps = await db
    .select()
    .from(propuestas)
    .where(
      and(
        eq(propuestas.egresadoId, session.userId),
        ne(propuestas.id, invite.propuestaId),
        ne(propuestas.estado, "rechazada")
      )
    );

  if (existingActiveTeam.length > 0 || activeOwnedProps.length > 0) {
    await db.update(integrantesProyecto).set({ estado: "rechazado" }).where(eq(integrantesProyecto.id, integranteId));
    return { success: false, error: "CUPO_OCUPADO: Ya formas parte de otro equipo de trabajo o posees una propuesta activa." };
  }

  // 2. Re-verify I2 (Tamaño del Grupo)
  const activeMembersInProp = await db
    .select()
    .from(integrantesProyecto)
    .where(
      and(
        eq(integrantesProyecto.propuestaId, invite.propuestaId),
        eq(integrantesProyecto.estado, "aceptado")
      )
    );

  if (1 + activeMembersInProp.length >= 3) {
    await db.update(integrantesProyecto).set({ estado: "rechazado" }).where(eq(integrantesProyecto.id, integranteId));
    return { success: false, error: "GRUPO_LLENO: El equipo ya cuenta con el número máximo de 3 integrantes." };
  }

  // Double validation passed -> set state to 'aceptado'
  await db
    .update(integrantesProyecto)
    .set({ estado: "aceptado" })
    .where(eq(integrantesProyecto.id, integranteId));

  revalidatePath("/egresado");
  revalidatePath("/egresado/redactar");
  return { success: true, message: "¡Te has unido exitosamente al equipo de trabajo!" };
}

export async function expulsarIntegrante(integranteId: number) {
  const session = await getSession();
  if (!session || session.rol !== "egresado") {
    return { success: false, error: "No autorizado" };
  }

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
    return { success: false, error: "NO_COORDINA: No tienes permisos para retirar a este integrante." };
  }

  // Retain record in terminal membership state without deleting student portfolio files
  await db
    .update(integrantesProyecto)
    .set({ estado: "retirado" })
    .where(eq(integrantesProyecto.id, integranteId));

  revalidatePath("/egresado");
  revalidatePath("/egresado/redactar");
  return { success: true, message: "El integrante ha sido retirado del equipo." };
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

  // Mark status as 'retirado' preserving portfolio files
  await db
    .update(integrantesProyecto)
    .set({ estado: "retirado" })
    .where(eq(integrantesProyecto.id, integranteId));

  revalidatePath("/egresado");
  revalidatePath("/egresado/redactar");
  return { success: true, message: "Te has retirado del equipo." };
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

/**
 * ─────────────────────────── Ratificación y Versionado por Huella (§8) ───────────────────────────
 */

export async function getPropuestaVersionHash(propuestaId: number): Promise<string> {
  const propRows = await db.select().from(propuestas).where(eq(propuestas.id, propuestaId)).limit(1);
  if (propRows.length === 0) return "";
  const prop = propRows[0];

  const detalles = await db.select().from(detallesProyecto).where(eq(detallesProyecto.propuestaId, propuestaId)).limit(1);
  const det = detalles[0] || {};

  const members = await db
    .select({ id: usuarios.id, carnet: usuarios.carnet, nombre: usuarios.nombreCompleto })
    .from(integrantesProyecto)
    .innerJoin(usuarios, eq(integrantesProyecto.egresadoId, usuarios.id))
    .where(and(eq(integrantesProyecto.propuestaId, propuestaId), eq(integrantesProyecto.estado, "aceptado")))
    .orderBy(asc(usuarios.carnet));

  const leaderUser = await db.select({ id: usuarios.id, carnet: usuarios.carnet, nombre: usuarios.nombreCompleto }).from(usuarios).where(eq(usuarios.id, prop.egresadoId)).limit(1);
  const allActiveUsers = [...leaderUser, ...members].sort((a, b) => (a.carnet || "").localeCompare(b.carnet || ""));

  const acts = await db.select().from(actividades).where(eq(actividades.propuestaId, propuestaId)).orderBy(asc(actividades.periodo), asc(actividades.numero));

  const versionObject = {
    titulo: prop.titulo || "",
    tipo: prop.tipo,
    actores: {
      patrocinador: det.actorPatrocinador || "",
      beneficiario: det.actorBeneficiario || "",
      ejecutor: det.actorEjecutor || "",
      financista: det.actorFinancista || "",
    },
    descripcion: det.descripcionProblema || "",
    justificacion: det.justificacion || "",
    alcance: det.alcance || "",
    objetivoGeneral: det.objetivoGeneral || "",
    objetivosEspecificos: det.objetivosEspecificos || [],
    integrantes: allActiveUsers.map(u => ({ id: u.id, carnet: u.carnet })),
    actividades: acts.map(a => ({ p: a.periodo, s: a.semana, n: a.numero, t: a.titulo, d: a.descripcion })),
  };

  const jsonCanonical = JSON.stringify(versionObject);
  return crypto.createHash("sha256").update(jsonCanonical).digest("hex");
}

export async function ratificarPropuesta(propuestaId: number) {
  const session = await getSession();
  if (!session || session.rol !== "egresado") return { success: false, error: "No autorizado" };

  const hash = await getPropuestaVersionHash(propuestaId);
  if (!hash) return { success: false, error: "Error al generar la huella de la versión." };

  await db
    .insert(ratificacionesPropuesta)
    .values({
      propuestaId,
      usuarioId: session.userId,
      huellaFirmada: hash,
      momento: new Date(),
    })
    .onConflictDoUpdate({
      target: [ratificacionesPropuesta.propuestaId, ratificacionesPropuesta.usuarioId],
      set: {
        huellaFirmada: hash,
        momento: new Date(),
      },
    });

  revalidatePath("/egresado");
  revalidatePath("/egresado/redactar");
  return { success: true, message: "Has ratificado exitosamente la versión actual de la propuesta.", hash };
}

export async function getRatificacionesEstado(propuestaId: number) {
  const currentHash = await getPropuestaVersionHash(propuestaId);
  const propRows = await db.select().from(propuestas).where(eq(propuestas.id, propuestaId)).limit(1);
  if (propRows.length === 0) return null;
  const prop = propRows[0];

  const leaderUser = await db.select({ id: usuarios.id, carnet: usuarios.carnet, nombre: usuarios.nombreCompleto }).from(usuarios).where(eq(usuarios.id, prop.egresadoId)).limit(1);

  const members = await db
    .select({ id: usuarios.id, carnet: usuarios.carnet, nombre: usuarios.nombreCompleto })
    .from(integrantesProyecto)
    .innerJoin(usuarios, eq(integrantesProyecto.egresadoId, usuarios.id))
    .where(and(eq(integrantesProyecto.propuestaId, propuestaId), eq(integrantesProyecto.estado, "aceptado")));

  const activeUsers = [...leaderUser, ...members];

  const sigs = await db.select().from(ratificacionesPropuesta).where(eq(ratificacionesPropuesta.propuestaId, propuestaId));

  const miembrosEstado = activeUsers.map(u => {
    const sig = sigs.find(s => s.usuarioId === u.id);
    const firmado = sig && sig.huellaFirmada === currentHash;
    return {
      usuarioId: u.id,
      nombreCompleto: u.nombre,
      carnet: u.carnet,
      esLider: u.id === prop.egresadoId,
      firmado: !!firmado,
      momento: sig?.momento || null,
    };
  });

  const todosFirmaron = miembrosEstado.every(m => m.firmado);

  return {
    versionHash: currentHash,
    totalMiembros: activeUsers.length,
    firmasValidasCount: miembrosEstado.filter(m => m.firmado).length,
    todosFirmaron,
    miembrosEstado,
  };
}

export async function verificarCapacidadEnvio(propuestaId: number) {
  const errores: string[] = [];
  const propRows = await db.select().from(propuestas).where(eq(propuestas.id, propuestaId)).limit(1);
  if (propRows.length === 0) return { puedeEnviar: false, errores: ["Propuesta no encontrada."] };
  const prop = propRows[0];

  // 1. Verificación de documentos de soporte por integrante activo (§6)
  const leaderUser = await db.select().from(usuarios).where(eq(usuarios.id, prop.egresadoId)).limit(1);
  const memberUsers = await db
    .select({ id: usuarios.id, nombreCompleto: usuarios.nombreCompleto, carnet: usuarios.carnet })
    .from(integrantesProyecto)
    .innerJoin(usuarios, eq(integrantesProyecto.egresadoId, usuarios.id))
    .where(and(eq(integrantesProyecto.propuestaId, propuestaId), eq(integrantesProyecto.estado, "aceptado")));

  const activeUsers = [...leaderUser, ...memberUsers];

  for (const u of activeUsers) {
    const docs = await db.select().from(documentosEgresado).where(eq(documentosEgresado.egresadoId, u.id));
    const hasServicio = docs.some(d => d.tipo === "servicio_social");
    const hasNotas = docs.some(d => d.tipo === "certificacion_notas");
    const hasPago = docs.some(d => d.tipo === "pago_tg");

    if (!hasServicio || !hasNotas || !hasPago) {
      errores.push(`ENTREGABLES_INCOMPLETOS: El integrante ${u.nombreCompleto} (${u.carnet || 'Sin carnet'}) debe adjuntar Servicio Social, Notas y Pago TG en su portafolio.`);
    }
  }

  // 2. Verificación de ratificación unánime (§8)
  const ratInfo = await getRatificacionesEstado(propuestaId);
  if (!ratInfo || !ratInfo.todosFirmaron) {
    errores.push("RATIFICACION_INCOMPLETA: Todos los integrantes activos del equipo deben ratificar la versión final del plan de trabajo antes del envío.");
  }

  return {
    puedeEnviar: errores.length === 0,
    errores,
    ratInfo,
  };
}

export async function retirarseDelProyecto(propuestaId: number) {
  const session = await getSession();
  if (!session || session.rol !== "egresado") return { success: false, error: "No autorizado" };

  const propRows = await db.select().from(propuestas).where(eq(propuestas.id, propuestaId)).limit(1);
  if (propRows.length === 0) return { success: false, error: "Propuesta no encontrada." };
  const prop = propRows[0];

  if (prop.egresadoId === session.userId) {
    const acceptedMembers = await db
      .select()
      .from(integrantesProyecto)
      .where(and(eq(integrantesProyecto.propuestaId, propuestaId), eq(integrantesProyecto.estado, "aceptado")));

    if (acceptedMembers.length > 0) {
      return { success: false, error: "DEBE_TRANSFERIR: Como líder de la propuesta, debes transferir la coordinación a otro integrante antes de retirarte." };
    }

    return { success: false, error: "Eres el único integrante de la propuesta. Puedes deshabilitarla o cancelarla directamente." };
  }

  const memberRows = await db
    .select()
    .from(integrantesProyecto)
    .where(and(eq(integrantesProyecto.propuestaId, propuestaId), eq(integrantesProyecto.egresadoId, session.userId)))
    .limit(1);

  if (memberRows.length === 0) return { success: false, error: "No perteneces a esta propuesta." };

  await db
    .update(integrantesProyecto)
    .set({ estado: "retirado" })
    .where(eq(integrantesProyecto.id, memberRows[0].id));

  revalidatePath("/egresado");
  revalidatePath("/egresado/redactar");
  return { success: true, message: "Te has retirado del equipo. Tus documentos personales se conservan intactos en tu portafolio." };
}

export async function transferirLiderazgo(propuestaId: number, nuevoLiderId: number) {
  const session = await getSession();
  if (!session || session.rol !== "egresado") return { success: false, error: "No autorizado" };

  const propRows = await db.select().from(propuestas).where(and(eq(propuestas.id, propuestaId), eq(propuestas.egresadoId, session.userId))).limit(1);
  if (propRows.length === 0) return { success: false, error: "NO_COORDINA: Solo el coordinador actual puede transferir la coordinación." };

  const newLeaderRows = await db
    .select()
    .from(integrantesProyecto)
    .where(and(eq(integrantesProyecto.propuestaId, propuestaId), eq(integrantesProyecto.egresadoId, nuevoLiderId), eq(integrantesProyecto.estado, "aceptado")))
    .limit(1);

  if (newLeaderRows.length === 0) return { success: false, error: "El nuevo líder debe ser un integrante activo y aceptado del equipo." };

  await db.update(propuestas).set({ egresadoId: nuevoLiderId }).where(eq(propuestas.id, propuestaId));

  await db.update(integrantesProyecto).set({ estado: "retirado" }).where(eq(integrantesProyecto.id, newLeaderRows[0].id));

  await db.insert(integrantesProyecto).values({
    propuestaId,
    egresadoId: session.userId,
    invitadoPorId: nuevoLiderId,
    estado: "aceptado",
  });

  revalidatePath("/egresado");
  revalidatePath("/egresado/redactar");
  return { success: true, message: "La coordinación del equipo ha sido transferida exitosamente." };
}
