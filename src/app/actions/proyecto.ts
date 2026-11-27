"use server";

import { db } from "@/lib/db";
import {
  propuestas,
  usuarios,
  integrantesProyecto,
  detallesProyecto,
  notificaciones,
  carreras,
  ratificacionesPropuesta,
} from "@/lib/schema";
import { eq, and, ne, or, inArray } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { errorCohorteEquipo, errorCarreraEquipo } from "@/lib/cohortes";
import { limitesObjetivos, maxIntegrantesDePropuesta } from "@/lib/fichas/fichaDePropuesta";
import { textoRangoObjetivos, reglaUniforme } from "@/lib/fichas/objetivos";

/** "de 4 a 5" o "12 (4 por integrante, 3 integrantes)". */
const cantidadObjetivos = (lim: { porIntegrante: { min: number; max: number }; integrantes: number }) =>
  textoRangoObjetivos(reglaUniforme(lim.porIntegrante), lim.integrantes);
import { huellaPropuesta } from "@/lib/huellaPropuesta";
import { tituloDeCarrera } from "@/lib/tituloCarrera";
import { fortalezaDePropuesta } from "@/lib/fortalezaServidor";
import { UMBRAL_FORTALEZA } from "@/lib/fortaleza";

// Líder + integrantes. En la entrega P2 saldrá de la ficha de la propuesta (participantes.max).
const MAX_INTEGRANTES_EQUIPO = 3;

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

  // Misma cohorte que la propuesta (regla del trabajo en equipo).
  const errorCohorte = (await errorCohorteEquipo(propuestaId, targetUser.id)) ?? (await errorCarreraEquipo(propuestaId, targetUser.id));
  if (errorCohorte) return { success: false, error: errorCohorte };

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
  const maxEquipo = await maxIntegrantesDePropuesta(propuestaId, MAX_INTEGRANTES_EQUIPO);
  if (totalCupos >= maxEquipo) {
    return { success: false, error: `GRUPO_LLENO: El equipo ya alcanzó el límite máximo de ${maxEquipo} integrantes (incluyendo invitaciones pendientes).` };
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

  // Misma cohorte que la propuesta.
  const errorCohorte = (await errorCohorteEquipo(invite.propuestaId, session.userId)) ?? (await errorCarreraEquipo(invite.propuestaId, session.userId));
  if (errorCohorte) {
    await db.update(integrantesProyecto).set({ estado: "rechazado" }).where(eq(integrantesProyecto.id, integranteId));
    return { success: false, error: errorCohorte };
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

  const maxEquipo = await maxIntegrantesDePropuesta(invite.propuestaId, MAX_INTEGRANTES_EQUIPO);
  if (1 + activeMembersInProp.length >= maxEquipo) {
    await db.update(integrantesProyecto).set({ estado: "rechazado" }).where(eq(integrantesProyecto.id, integranteId));
    return { success: false, error: `GRUPO_LLENO: El equipo ya cuenta con el número máximo de ${maxEquipo} integrantes.` };
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
      carrera: carreras.nombre,
      tituloOficial: carreras.titulo,
    })
    .from(integrantesProyecto)
    .innerJoin(usuarios, eq(integrantesProyecto.egresadoId, usuarios.id))
    .leftJoin(carreras, eq(carreras.id, usuarios.carreraId))
    .where(eq(integrantesProyecto.propuestaId, propuestaId));

  // Título al que opta cada integrante, para mostrarlo en la portada (R1)
  return team.map(({ carrera, tituloOficial, ...m }) => ({ ...m, tituloCarrera: tituloDeCarrera(carrera, tituloOficial) }));
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

  const lim = await limitesObjetivos(propuestaId);
  if (!Array.isArray(data.objetivosEspecificos) || data.objetivosEspecificos.length < lim.min || data.objetivosEspecificos.length > lim.max) {
    return { success: false, error: `Debes registrar ${cantidadObjetivos(lim)} objetivos específicos.` };
  }

  const existing = await db
    .select()
    .from(detallesProyecto)
    .where(eq(detallesProyecto.propuestaId, propuestaId))
    .limit(1);

  if (existing.length > 0) {
    const current = existing[0];
    const prevGeneral =
      current.objetivoGeneralAnterior !== null && current.objetivoGeneralAnterior !== undefined
        ? current.objetivoGeneralAnterior
        : current.objetivoGeneral && current.objetivoGeneral !== data.objetivoGeneral
        ? current.objetivoGeneral
        : null;

    const prevEspecificos =
      current.objetivosEspecificosAnteriores !== null && current.objetivosEspecificosAnteriores !== undefined
        ? current.objetivosEspecificosAnteriores
        : current.objetivosEspecificos
        ? current.objetivosEspecificos
        : null;

    await db
      .update(detallesProyecto)
      .set({
        objetivoGeneral: data.objetivoGeneral,
        objetivosEspecificos: data.objetivosEspecificos,
        objetivoGeneralAnterior: prevGeneral,
        objetivosEspecificosAnteriores: prevEspecificos,
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
  return huellaPropuesta(propuestaId);
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

/**
 * Estado de las firmas para la pantalla (recorrido integral, H26): quién ratificó la versión actual y quién falta o tiene
 * una firma que ya no vale (la propuesta o el equipo cambió). Solo para los integrantes de la propuesta.
 */
export async function getEstadoFirmasPropuesta(propuestaId: number) {
  const session = await getSession();
  if (!session) return null;
  const info = await getRatificacionesEstado(propuestaId);
  if (!info || !info.miembrosEstado.some((m) => m.usuarioId === session.userId)) return null;
  return {
    todosFirmaron: info.todosFirmaron,
    miembros: info.miembrosEstado.map((m) => ({
      usuarioId: m.usuarioId,
      nombre: m.nombreCompleto,
      esLider: m.esLider,
      firmado: m.firmado,
      /** Firmó una versión anterior: su firma ya no vale. */
      vencida: !m.firmado && !!m.momento,
    })),
  };
}

/**
 * Lo que falta para enviar. `incluirRevision: false` deja fuera la confirmación de la revisión del documento (R6): el
 * paso «Revisión y envío» la muestra aparte.
 */
export async function verificarCapacidadEnvio(propuestaId: number, opciones: { incluirRevision?: boolean; /** Trabajo individual: enviar es la ratificación (H15). */ ratificaAlEnviar?: boolean } = {}) {
  const errores: string[] = [];
  const propRows = await db.select().from(propuestas).where(eq(propuestas.id, propuestaId)).limit(1);
  if (propRows.length === 0) return { puedeEnviar: false, errores: ["Propuesta no encontrada."] };
  const prop = propRows[0];

  // 1. Documentos de soporte por integrante activo (§6). R6: dice qué le falta a cada quien.
  const { documentosPorIntegrante } = await import("@/lib/revisionPropuestaServidor");
  for (const u of await documentosPorIntegrante(propuestaId)) {
    if (u.faltan.length) {
      errores.push(`Documentos de soporte: a ${u.nombre} (${u.carnet || "sin carnet"}) le falta ${u.faltan.map((d) => d.toLowerCase()).join(", ")}. Cada integrante los sube desde su panel principal.`);
    }
  }

  // 1b. Objetivos específicos (R4: individual de 4 a 5, en grupo 4 por integrante): el equipo pudo cambiar después de escribirlos.
  const [det] = await db.select({ especificos: detallesProyecto.objetivosEspecificos }).from(detallesProyecto).where(eq(detallesProyecto.propuestaId, propuestaId));
  const lim = await limitesObjetivos(propuestaId);
  const cuantos = Array.isArray(det?.especificos) ? det.especificos.length : 0;
  if (cuantos < lim.min || cuantos > lim.max) {
    errores.push(`Objetivos específicos: la propuesta necesita ${cantidadObjetivos(lim)} y tiene ${cuantos}. Ajústalos en el paso Objetivos.`);
  }

  // 1c. R3: fortaleza de la propuesta (problema, justificación y alcance) de al menos 75 % en cada apartado y en total
  const fortaleza = await fortalezaDePropuesta(propuestaId);
  const debiles = fortaleza.elementos.filter((e) => e.porcentaje < UMBRAL_FORTALEZA);
  if (debiles.length) {
    errores.push(`Fortaleza insuficiente: ${debiles.map((e) => `${e.titulo} (${e.porcentaje} %)`).join(", ")}. Cada apartado necesita al menos ${UMBRAL_FORTALEZA} %.`);
  } else if (fortaleza.porcentaje != null && fortaleza.porcentaje < UMBRAL_FORTALEZA) {
    errores.push(`La fortaleza total de la propuesta es ${fortaleza.porcentaje} %; necesita al menos ${UMBRAL_FORTALEZA} %.`);
  }

  // 1d. R5: firmantes y supervisor de la carta elegidos y validados (sin solicitudes pendientes de la administración)
  if (prop.tipo !== "pasantia") {
    const { fichaDePropuesta, espaciosPropuesta } = await import("@/lib/fichas/fichaDePropuesta");
    const ficha = await fichaDePropuesta(propuestaId);
    if (ficha && espaciosPropuesta(ficha.definicion).some((e) => e.elemento === "carta")) {
      const { estadoPersonasCartaDe } = await import("@/lib/personasCartaServidor");
      const estado = await estadoPersonasCartaDe(propuestaId).catch(() => null);
      if (estado && estado.pendiente) {
        errores.push("Carta de aceptación: la administración todavía no valida los firmantes o el supervisor nuevos (o la falta de supervisor).");
      } else if (estado && !estado.listo) {
        errores.push("Carta de aceptación: elige los firmantes y el supervisor empresarial en el paso Carta de aceptación.");
      }
    }
  }

  // 1e. R6: el líder confirmó que revisó el documento completo, en su versión actual
  if (prop.tipo !== "pasantia" && opciones.incluirRevision !== false) {
    const { estadoRevision } = await import("@/lib/revisionPropuestaServidor");
    const rev = await estadoRevision(propuestaId).catch(() => null);
    if (rev && !rev.confirmada) {
      errores.push(rev.cambioDespues
        ? "Revisión del documento: la propuesta cambió después de tu confirmación. Revísala de nuevo y confirma en el paso Revisión y envío."
        : "Revisión del documento: confirma en el paso Revisión y envío que revisaste el documento completo.");
    }
  }

  // 2. Verificación de ratificación unánime (§8)
  const ratInfo = await getRatificacionesEstado(propuestaId);
  const individualAlEnviar = opciones.ratificaAlEnviar && ratInfo?.totalMiembros === 1;
  if (!individualAlEnviar && (!ratInfo || !ratInfo.todosFirmaron)) {
    // H15/H26: decir quién falta, en lugar del código interno.
    const faltan = (ratInfo?.miembrosEstado ?? []).filter((m) => !m.firmado).map((m) => m.nombreCompleto);
    errores.push(faltan.length
      ? `Falta ratificar la versión actual de la propuesta (en el paso Equipo de trabajo): ${faltan.join(", ")}. Cualquier cambio en la propuesta o en el equipo invalida las firmas anteriores.`
      : "Falta ratificar la versión actual de la propuesta (en el paso Equipo de trabajo). Cualquier cambio en la propuesta o en el equipo invalida las firmas anteriores.");
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
