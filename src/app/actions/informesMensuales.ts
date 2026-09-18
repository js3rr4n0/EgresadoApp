"use server";

import { db } from "@/lib/db";
import {
  informesMensuales,
  bitacorasSemanales,
  evidenciasInformeMensual,
  propuestas,
  periodos,
  usuarios,
  supervisores,
  empresas,
  actividades,
  semanasJustificadas,
  notificaciones,
} from "@/lib/schema";
import { getSession } from "@/lib/session";
import { eq, and, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

async function assertAccesoPropuesta(propuestaId: number) {
  const session = await getSession();
  if (!session || !session.userId) {
    return { ok: false as const, error: "No autenticado" };
  }

  const [prop] = await db.select().from(propuestas).where(eq(propuestas.id, propuestaId)).limit(1);
  if (!prop) {
    return { ok: false as const, error: "Propuesta no encontrada" };
  }

  const isOwner = session.rol === "egresado" && prop.egresadoId === session.userId;
  const isAsesor = session.rol === "asesor" && prop.asesorId === session.userId;
  const isAdmin = session.rol === "admin" || session.rol === "coordinador";

  if (!isOwner && !isAsesor && !isAdmin) {
    return { ok: false as const, error: "No tiene permisos sobre esta propuesta." };
  }

  return { ok: true as const, session, prop };
}

async function ensureInformesMensuales(propuestaId: number) {
  const [prop] = await db.select().from(propuestas).where(eq(propuestas.id, propuestaId)).limit(1);
  if (!prop) return { error: "Propuesta no encontrada" as const };

  if (prop.tipo !== "pasantia") {
    return { error: "Los informes mensuales están disponibles por ahora únicamente para propuestas de Pasantía." as const };
  }

  const [periodo] = await db.select().from(periodos).where(eq(periodos.id, prop.periodoId)).limit(1);
  if (!periodo) return { error: "Periodo académico no encontrado." as const };

  const deadlines = [
    periodo.maxPrimerInforme,
    periodo.maxSegundoInforme,
    periodo.maxTercerInforme,
    periodo.maxCuartoInforme,
  ];

  let existentes = await db
    .select()
    .from(informesMensuales)
    .where(eq(informesMensuales.propuestaId, propuestaId))
    .orderBy(asc(informesMensuales.numero));

  const existentesPorNumero = new Set(existentes.map((i) => i.numero));
  const faltantes = [1, 2, 3, 4].filter((n) => !existentesPorNumero.has(n));

  if (faltantes.length > 0) {
    await db.insert(informesMensuales).values(
      faltantes.map((n) => ({
        propuestaId,
        numero: n,
        fechaLimite: deadlines[n - 1],
        estado: "redactando",
      }))
    );
    existentes = await db
      .select()
      .from(informesMensuales)
      .where(eq(informesMensuales.propuestaId, propuestaId))
      .orderBy(asc(informesMensuales.numero));
  }

  return { prop, informes: existentes };
}

export async function getInformesMensuales(propuestaId: number) {
  try {
    const access = await assertAccesoPropuesta(propuestaId);
    if (!access.ok) return { success: false, error: access.error };

    const result = await ensureInformesMensuales(propuestaId);
    if ("error" in result) return { success: false, error: result.error };
    const { prop, informes } = result;

    const [egresado] = await db.select().from(usuarios).where(eq(usuarios.id, prop.egresadoId)).limit(1);
    const asesor = prop.asesorId
      ? (await db.select().from(usuarios).where(eq(usuarios.id, prop.asesorId)).limit(1))[0] || null
      : null;
    const empresa = prop.empresaId
      ? (await db.select().from(empresas).where(eq(empresas.id, prop.empresaId)).limit(1))[0] || null
      : null;
    const supervisor = prop.supervisorId
      ? (await db.select().from(supervisores).where(eq(supervisores.id, prop.supervisorId)).limit(1))[0] || null
      : null;

    return { success: true, propuesta: prop, egresado, asesor, empresa, supervisor, informes };
  } catch (err: any) {
    console.error("Error en getInformesMensuales:", err);
    return { success: false, error: err.message || "Error al obtener los informes mensuales" };
  }
}

export async function getInformesMensualesAsesor(propuestaId: number) {
  try {
    const session = await getSession();
    if (!session || !session.userId || session.rol !== "asesor") {
      return { success: false, error: "No autorizado" };
    }

    const [prop] = await db.select().from(propuestas).where(eq(propuestas.id, propuestaId)).limit(1);
    if (!prop || prop.asesorId !== session.userId) {
      return { success: false, error: "No tiene permisos sobre esta propuesta." };
    }

    const result = await ensureInformesMensuales(propuestaId);
    if ("error" in result) return { success: false, error: result.error };

    const [egresado] = await db.select().from(usuarios).where(eq(usuarios.id, prop.egresadoId)).limit(1);

    return { success: true, propuesta: prop, egresado, informes: result.informes };
  } catch (err: any) {
    console.error("Error en getInformesMensualesAsesor:", err);
    return { success: false, error: err.message || "Error al obtener los informes mensuales" };
  }
}

export async function getInformeMensualDetalle(informeId: number) {
  try {
    const [informe] = await db.select().from(informesMensuales).where(eq(informesMensuales.id, informeId)).limit(1);
    if (!informe) return { success: false, error: "Informe no encontrado" };

    const access = await assertAccesoPropuesta(informe.propuestaId);
    if (!access.ok) return { success: false, error: access.error };
    const { prop, session } = access;

    const [egresado] = await db.select().from(usuarios).where(eq(usuarios.id, prop.egresadoId)).limit(1);
    const asesor = prop.asesorId
      ? (await db.select().from(usuarios).where(eq(usuarios.id, prop.asesorId)).limit(1))[0] || null
      : null;
    const empresa = prop.empresaId
      ? (await db.select().from(empresas).where(eq(empresas.id, prop.empresaId)).limit(1))[0] || null
      : null;
    const supervisor = prop.supervisorId
      ? (await db.select().from(supervisores).where(eq(supervisores.id, prop.supervisorId)).limit(1))[0] || null
      : null;

    const acts = await db
      .select()
      .from(actividades)
      .where(and(eq(actividades.propuestaId, informe.propuestaId), eq(actividades.periodo, informe.numero)))
      .orderBy(asc(actividades.semana), asc(actividades.numero));

    const justificadas = await db
      .select()
      .from(semanasJustificadas)
      .where(
        and(
          eq(semanasJustificadas.propuestaId, informe.propuestaId),
          eq(semanasJustificadas.periodo, informe.numero)
        )
      );

    const bitacoras = await db
      .select()
      .from(bitacorasSemanales)
      .where(eq(bitacorasSemanales.informeId, informeId))
      .orderBy(asc(bitacorasSemanales.semana));

    const evidencias = await db
      .select()
      .from(evidenciasInformeMensual)
      .where(eq(evidenciasInformeMensual.informeId, informeId))
      .orderBy(asc(evidenciasInformeMensual.semana), asc(evidenciasInformeMensual.id));

    const semanasSet = new Set<number>([...acts.map((a) => a.semana), ...justificadas.map((j) => j.semana)]);
    const semanas = Array.from(semanasSet).sort((a, b) => a - b);

    return {
      success: true,
      informe,
      propuesta: prop,
      egresado,
      asesor,
      empresa,
      supervisor,
      actividades: acts,
      justificadas,
      semanas,
      bitacoras,
      evidencias,
      rol: session.rol,
    };
  } catch (err: any) {
    console.error("Error en getInformeMensualDetalle:", err);
    return { success: false, error: err.message || "Error al obtener el informe" };
  }
}

export async function guardarBorradorInformeMensual(
  informeId: number,
  datos: {
    periodoDesde?: string | null;
    periodoHasta?: string | null;
    bitacoras: { semana: number; descripcion: string }[];
  }
) {
  try {
    const session = await getSession();
    if (!session || !session.userId || session.rol !== "egresado") {
      return { success: false, error: "No autorizado" };
    }

    const [informe] = await db.select().from(informesMensuales).where(eq(informesMensuales.id, informeId)).limit(1);
    if (!informe) return { success: false, error: "Informe no encontrado" };

    const [prop] = await db.select().from(propuestas).where(eq(propuestas.id, informe.propuestaId)).limit(1);
    if (!prop || prop.egresadoId !== session.userId) {
      return { success: false, error: "No tiene permisos sobre este informe." };
    }

    if (informe.estado !== "redactando" && informe.estado !== "observado") {
      return { success: false, error: "Este informe ya fue enviado y no admite cambios." };
    }

    await db
      .update(informesMensuales)
      .set({
        periodoDesde: datos.periodoDesde ?? informe.periodoDesde,
        periodoHasta: datos.periodoHasta ?? informe.periodoHasta,
        actualizadoEn: new Date(),
      })
      .where(eq(informesMensuales.id, informeId));

    for (const b of datos.bitacoras) {
      await db
        .insert(bitacorasSemanales)
        .values({ informeId, semana: b.semana, descripcion: b.descripcion })
        .onConflictDoUpdate({
          target: [bitacorasSemanales.informeId, bitacorasSemanales.semana],
          set: { descripcion: b.descripcion, actualizadoEn: new Date() },
        });
    }

    revalidatePath(`/egresado/reportes/${informeId}`);
    return { success: true };
  } catch (err: any) {
    console.error("Error al guardar borrador de informe mensual:", err);
    return { success: false, error: err.message || "Error al guardar el borrador" };
  }
}

export async function enviarInformeMensual(informeId: number) {
  try {
    const session = await getSession();
    if (!session || !session.userId || session.rol !== "egresado") {
      return { success: false, error: "No autorizado" };
    }

    const [informe] = await db.select().from(informesMensuales).where(eq(informesMensuales.id, informeId)).limit(1);
    if (!informe) return { success: false, error: "Informe no encontrado" };

    const [prop] = await db.select().from(propuestas).where(eq(propuestas.id, informe.propuestaId)).limit(1);
    if (!prop || prop.egresadoId !== session.userId) {
      return { success: false, error: "No tiene permisos sobre este informe." };
    }

    if (informe.estado !== "redactando" && informe.estado !== "observado") {
      return { success: false, error: "Este informe ya fue enviado." };
    }

    if (!informe.periodoDesde || !informe.periodoHasta) {
      return { success: false, error: "Debe indicar el periodo reportado (fecha de inicio y fin) antes de enviar." };
    }

    const acts = await db
      .select()
      .from(actividades)
      .where(and(eq(actividades.propuestaId, informe.propuestaId), eq(actividades.periodo, informe.numero)));

    if (acts.length === 0) {
      return {
        success: false,
        error: "Este periodo no tiene actividades registradas en el cronograma de tu plan de trabajo.",
      };
    }

    const justificadas = await db
      .select()
      .from(semanasJustificadas)
      .where(
        and(
          eq(semanasJustificadas.propuestaId, informe.propuestaId),
          eq(semanasJustificadas.periodo, informe.numero)
        )
      );

    const bitacoras = await db.select().from(bitacorasSemanales).where(eq(bitacorasSemanales.informeId, informeId));

    const semanasConActividad = new Set(acts.map((a) => a.semana));
    const semanasJustificadasSet = new Set(justificadas.map((j) => j.semana));
    const bitacorasPorSemana = new Map(bitacoras.map((b) => [b.semana, b.descripcion || ""]));

    for (const semana of semanasConActividad) {
      if (semanasJustificadasSet.has(semana)) continue;
      const desc = bitacorasPorSemana.get(semana) || "";
      if (desc.trim().length < 10) {
        return {
          success: false,
          error: `Debe redactar el desarrollo de actividades de la semana ${semana} antes de enviar el informe.`,
        };
      }
    }

    const enviadoEn = new Date();
    const fechaLimite = new Date(`${informe.fechaLimite}T23:59:59`);
    const esATiempo = enviadoEn <= fechaLimite;
    const desviacionDias = Math.floor((enviadoEn.getTime() - fechaLimite.getTime()) / (1000 * 60 * 60 * 24));

    await db
      .update(informesMensuales)
      .set({
        estado: "enviado",
        fechaPresentacion: enviadoEn.toISOString().slice(0, 10),
        enviadoEn,
        cumplimiento: esATiempo ? "a_tiempo" : "fuera_de_tiempo",
        desviacionDias,
        comentarioAsesor: null,
        actualizadoEn: enviadoEn,
      })
      .where(eq(informesMensuales.id, informeId));

    if (prop.asesorId) {
      await db.insert(notificaciones).values({
        usuarioId: prop.asesorId,
        tipo: "informe_mensual_enviado",
        mensaje: `El estudiante de la propuesta #${prop.numero} envió su Informe Mensual #${informe.numero} para revisión.`,
      });
    }

    revalidatePath(`/egresado/reportes`);
    revalidatePath(`/egresado/reportes/${informeId}`);
    revalidatePath(`/asesor/informes/mensual/${informe.propuestaId}`);
    return { success: true };
  } catch (err: any) {
    console.error("Error al enviar informe mensual:", err);
    return { success: false, error: err.message || "Error al enviar el informe" };
  }
}

export async function uploadEvidenciaInformeMensual(informeId: number, semana: number, formData: FormData) {
  try {
    const session = await getSession();
    if (!session || !session.userId || session.rol !== "egresado") {
      return { success: false, error: "No autorizado" };
    }

    const [informe] = await db.select().from(informesMensuales).where(eq(informesMensuales.id, informeId)).limit(1);
    if (!informe) return { success: false, error: "Informe no encontrado" };
    if (informe.estado !== "redactando" && informe.estado !== "observado") {
      return { success: false, error: "Este informe ya fue enviado y no admite cambios." };
    }

    const rawFile = formData.get("archivo");
    if (!rawFile || typeof rawFile === "string") {
      return { success: false, error: "Debe seleccionar un archivo válido." };
    }
    const archivo = rawFile as File;

    if (archivo.size > 10 * 1024 * 1024) {
      return { success: false, error: "El archivo excede el tamaño máximo permitido de 10MB." };
    }
    if (!archivo.type.startsWith("image/")) {
      return { success: false, error: "Solo se permiten fotografías (imágenes) como evidencia." };
    }

    const leyenda = (formData.get("leyenda") as string) || null;
    const buffer = Buffer.from(await archivo.arrayBuffer());
    const archivoUrl = `data:${archivo.type};base64,${buffer.toString("base64")}`;

    const [nueva] = await db
      .insert(evidenciasInformeMensual)
      .values({ informeId, semana, nombreArchivo: archivo.name, archivoUrl, leyenda })
      .returning();

    revalidatePath(`/egresado/reportes/${informeId}`);
    return { success: true, evidencia: nueva };
  } catch (err: any) {
    console.error("Error al subir evidencia de informe mensual:", err);
    return { success: false, error: err.message || "Error al subir la evidencia" };
  }
}

export async function deleteEvidenciaInformeMensual(evidenciaId: number, informeId: number) {
  try {
    const session = await getSession();
    if (!session || !session.userId || session.rol !== "egresado") {
      return { success: false, error: "No autorizado" };
    }

    const [informe] = await db.select().from(informesMensuales).where(eq(informesMensuales.id, informeId)).limit(1);
    if (!informe) return { success: false, error: "Informe no encontrado" };
    if (informe.estado !== "redactando" && informe.estado !== "observado") {
      return { success: false, error: "Este informe ya fue enviado y no admite cambios." };
    }

    await db.delete(evidenciasInformeMensual).where(eq(evidenciasInformeMensual.id, evidenciaId));

    revalidatePath(`/egresado/reportes/${informeId}`);
    return { success: true };
  } catch (err: any) {
    console.error("Error al eliminar evidencia:", err);
    return { success: false, error: err.message || "Error al eliminar la evidencia" };
  }
}

export async function aprobarInformeMensual(informeId: number, comentario?: string) {
  try {
    const session = await getSession();
    if (!session || !session.userId || session.rol !== "asesor") {
      return { success: false, error: "No autorizado" };
    }

    const [informe] = await db.select().from(informesMensuales).where(eq(informesMensuales.id, informeId)).limit(1);
    if (!informe) return { success: false, error: "Informe no encontrado" };
    if (informe.estado !== "enviado") {
      return { success: false, error: "Este informe no está pendiente de revisión." };
    }

    const [prop] = await db.select().from(propuestas).where(eq(propuestas.id, informe.propuestaId)).limit(1);
    if (!prop || prop.asesorId !== session.userId) {
      return { success: false, error: "No tiene permisos sobre esta propuesta." };
    }

    await db
      .update(informesMensuales)
      .set({
        estado: "aprobado",
        comentarioAsesor: comentario?.trim() || null,
        revisadoPor: session.userId,
        revisadoEn: new Date(),
        actualizadoEn: new Date(),
      })
      .where(eq(informesMensuales.id, informeId));

    await db.insert(notificaciones).values({
      usuarioId: prop.egresadoId,
      tipo: "informe_mensual_aprobado",
      mensaje: `Tu Informe Mensual #${informe.numero} fue revisado y aprobado por tu docente asesor.`,
    });

    revalidatePath(`/asesor/informes/mensual/${informe.propuestaId}`);
    revalidatePath(`/egresado/reportes`);
    return { success: true };
  } catch (err: any) {
    console.error("Error al aprobar informe mensual:", err);
    return { success: false, error: err.message || "Error al aprobar el informe" };
  }
}

export async function solicitarCorreccionInformeMensual(informeId: number, comentario: string) {
  try {
    const session = await getSession();
    if (!session || !session.userId || session.rol !== "asesor") {
      return { success: false, error: "No autorizado" };
    }
    if (!comentario || comentario.trim().length < 5) {
      return { success: false, error: "Debe escribir una observación detallada para el estudiante." };
    }

    const [informe] = await db.select().from(informesMensuales).where(eq(informesMensuales.id, informeId)).limit(1);
    if (!informe) return { success: false, error: "Informe no encontrado" };
    if (informe.estado !== "enviado") {
      return { success: false, error: "Este informe no está pendiente de revisión." };
    }

    const [prop] = await db.select().from(propuestas).where(eq(propuestas.id, informe.propuestaId)).limit(1);
    if (!prop || prop.asesorId !== session.userId) {
      return { success: false, error: "No tiene permisos sobre esta propuesta." };
    }

    await db
      .update(informesMensuales)
      .set({
        estado: "observado",
        comentarioAsesor: comentario.trim(),
        revisadoPor: session.userId,
        revisadoEn: new Date(),
        actualizadoEn: new Date(),
      })
      .where(eq(informesMensuales.id, informeId));

    await db.insert(notificaciones).values({
      usuarioId: prop.egresadoId,
      tipo: "informe_mensual_observado",
      mensaje: `Tu docente asesor solicitó correcciones en tu Informe Mensual #${informe.numero}. Revisa las observaciones y vuelve a enviarlo.`,
    });

    revalidatePath(`/asesor/informes/mensual/${informe.propuestaId}`);
    revalidatePath(`/egresado/reportes`);
    return { success: true };
  } catch (err: any) {
    console.error("Error al solicitar corrección de informe mensual:", err);
    return { success: false, error: err.message || "Error al registrar la observación" };
  }
}
