"use server";

import { db } from "@/lib/db";
import {
  informesPrimerContacto,
  evidenciasInformePrimerContacto,
  propuestas,
  usuarios,
  supervisores,
  actividades,
  empresas,
  carreras,
  notificaciones,
} from "@/lib/schema";
import { getSession } from "@/lib/session";
import { eq, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getOrCreateInformePrimerContacto(propuestaId: number) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return { success: false, error: "No autenticado" };
    }

    // Fetch Proposal with linked details
    const [prop] = await db
      .select()
      .from(propuestas)
      .where(eq(propuestas.id, propuestaId))
      .limit(1);

    if (!prop) {
      return { success: false, error: "Propuesta no encontrada" };
    }

    // Check if an report already exists
    let [informe] = await db
      .select()
      .from(informesPrimerContacto)
      .where(eq(informesPrimerContacto.propuestaId, propuestaId))
      .limit(1);

    // If not existing, generate draft report automatically
    if (!informe) {
      const asesorId = prop.asesorId || session.userId;
      let supervisorId = prop.supervisorId;

      // Fallback: If supervisorId not on proposal, query supervisor of corporate proposal
      if (!supervisorId && prop.empresaId) {
        const [sup] = await db
          .select()
          .from(supervisores)
          .where(eq(supervisores.empresaId, prop.empresaId))
          .limit(1);
        if (sup) supervisorId = sup.id;
      }

      if (!supervisorId) {
        return {
          success: false,
          error: "La propuesta no tiene un supervisor empresarial asignado.",
        };
      }

      // Deadline: 7 calendar days from now
      const fechaLimite = new Date();
      fechaLimite.setDate(fechaLimite.getDate() + 7);

      const [newInforme] = await db
        .insert(informesPrimerContacto)
        .values({
          propuestaId: prop.id,
          asesorId: asesorId,
          supervisorId: supervisorId,
          estado: "borrador",
          fechaLimite: fechaLimite,
        })
        .returning();

      informe = newInforme;
    }

    // Fetch Egresado user details
    const [egresado] = await db
      .select()
      .from(usuarios)
      .where(eq(usuarios.id, prop.egresadoId))
      .limit(1);

    // Fetch Supervisor details
    const [supervisor] = await db
      .select()
      .from(supervisores)
      .where(eq(supervisores.id, informe.supervisorId))
      .limit(1);

    // Fetch Empresa details
    let empresa = null;
    if (prop.empresaId) {
      const [emp] = await db
        .select()
        .from(empresas)
        .where(eq(empresas.id, prop.empresaId))
        .limit(1);
      empresa = emp || null;
    }

    // Fetch Carrera details if available
    let carrera = null;
    if (egresado && egresado.carreraId) {
      const [car] = await db
        .select()
        .from(carreras)
        .where(eq(carreras.id, egresado.carreraId))
        .limit(1);
      carrera = car || null;
    }

    // Fetch proposal activities
    const acts = await db
      .select()
      .from(actividades)
      .where(eq(actividades.propuestaId, propuestaId))
      .orderBy(actividades.periodo, actividades.semana, actividades.numero);

    // Fetch evidence files table records
    const evidencias = await db
      .select()
      .from(evidenciasInformePrimerContacto)
      .where(eq(evidenciasInformePrimerContacto.informeId, informe.id))
      .orderBy(evidenciasInformePrimerContacto.id);

    return {
      success: true,
      informe,
      propuesta: prop,
      egresado,
      supervisor,
      empresa,
      carrera,
      actividades: acts,
      evidencias,
    };
  } catch (err: any) {
    console.error("Error en getOrCreateInformePrimerContacto:", err);
    return { success: false, error: err.message || "Error al obtener informe" };
  }
}

export async function guardarBorradorInforme(
  informeId: number,
  datos: {
    contactoPrevio?: boolean | null;
    medioContacto?: string | null;
    fechaCita?: string | null;
    modalidadCita?: string | null;
    evidenciaUrls?: string[] | null;
    objetivosEntrevista?: string[] | null;
    mecanismosComunicacion?: string[] | null;
    aceptaInformesMensuales?: boolean | null;
    resultadoValidacion?: string | null;
    justificacionResultado?: string | null;
  }
) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return { success: false, error: "No autenticado" };
    }

    const [informe] = await db
      .select()
      .from(informesPrimerContacto)
      .where(eq(informesPrimerContacto.id, informeId))
      .limit(1);

    if (!informe) {
      return { success: false, error: "Informe no encontrado" };
    }

    if (informe.estado !== "borrador") {
      return { success: false, error: "Este informe ya fue enviado o anulado." };
    }

    await db
      .update(informesPrimerContacto)
      .set({
        contactoPrevio: datos.contactoPrevio ?? informe.contactoPrevio,
        medioContacto: datos.medioContacto ?? informe.medioContacto,
        fechaCita: datos.fechaCita ?? informe.fechaCita,
        modalidadCita: datos.modalidadCita ?? informe.modalidadCita,
        evidenciaUrls: datos.evidenciaUrls ?? informe.evidenciaUrls,
        objetivosEntrevista: datos.objetivosEntrevista ?? informe.objetivosEntrevista,
        mecanismosComunicacion: datos.mecanismosComunicacion ?? informe.mecanismosComunicacion,
        aceptaInformesMensuales: datos.aceptaInformesMensuales ?? informe.aceptaInformesMensuales,
        resultadoValidacion: datos.resultadoValidacion ?? informe.resultadoValidacion,
        justificacionResultado: datos.justificacionResultado ?? informe.justificacionResultado,
        actualizadoEn: new Date(),
      })
      .where(eq(informesPrimerContacto.id, informeId));

    return { success: true };
  } catch (err: any) {
    console.error("Error al guardar borrador:", err);
    return { success: false, error: err.message || "Error al guardar borrador" };
  }
}

export async function enviarInformePrimerContacto(
  informeId: number,
  datos: {
    contactoPrevio: boolean;
    medioContacto?: string;
    fechaCita?: string;
    modalidadCita?: string;
    evidenciaUrls?: string[];
    objetivosEntrevista: string[];
    mecanismosComunicacion: string[];
    aceptaInformesMensuales: boolean;
    resultadoValidacion: "aprobada" | "con_modificaciones" | "rechazada";
    justificacionResultado?: string;
  }
) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return { success: false, error: "No autenticado" };
    }

    const [informe] = await db
      .select()
      .from(informesPrimerContacto)
      .where(eq(informesPrimerContacto.id, informeId))
      .limit(1);

    if (!informe) {
      return { success: false, error: "Informe no encontrado" };
    }

    if (informe.estado !== "borrador") {
      return { success: false, error: "Este informe ya fue enviado y no admite cambios." };
    }

    // Regla R1 y R2 / R3 / R4 / R5 Validation
    if (datos.contactoPrevio === null || datos.contactoPrevio === undefined) {
      return { success: false, error: "Debe responder si ha tenido comunicación previa con el supervisor." };
    }

    if (datos.contactoPrevio) {
      if (!datos.medioContacto) {
        return { success: false, error: "Debe especificar el medio por el cual se dio la comunicación previa." };
      }
    } else {
      if (!datos.fechaCita || !datos.modalidadCita) {
        return { success: false, error: "Debe agendar la fecha y modalidad de la cita." };
      }
      if (!datos.evidenciaUrls || datos.evidenciaUrls.length === 0) {
        return { success: false, error: "Debe adjuntar al menos un archivo de evidencia de la reunión." };
      }
    }

    // R6 & R7
    if (!datos.objetivosEntrevista || datos.objetivosEntrevista.length === 0) {
      return { success: false, error: "Debe seleccionar al menos un objetivo de la entrevista." };
    }
    if (!datos.mecanismosComunicacion || datos.mecanismosComunicacion.length === 0) {
      return { success: false, error: "Debe seleccionar al menos un mecanismo de comunicación acordado." };
    }

    // R8
    if (datos.aceptaInformesMensuales === null || datos.aceptaInformesMensuales === undefined) {
      return { success: false, error: "Debe registrar si el supervisor acepta las expectativas de informes mensuales." };
    }

    // R9 & R10
    if (!datos.resultadoValidacion) {
      return { success: false, error: "Debe seleccionar el resultado de la validación de actividades." };
    }
    if (datos.resultadoValidacion !== "aprobada" && (!datos.justificacionResultado || datos.justificacionResultado.trim().length < 5)) {
      return { success: false, error: "Debe proporcionar una justificación detallada para las observaciones o rechazo." };
    }

    // Calculate metadata & freeze compliance
    const enviadoEn = new Date();
    const fechaLimite = new Date(informe.fechaLimite);

    const esATiempo = enviadoEn <= fechaLimite;
    const diffMs = enviadoEn.getTime() - fechaLimite.getTime();
    const desviacionDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    // Update Informe state to 'enviado'
    await db
      .update(informesPrimerContacto)
      .set({
        contactoPrevio: datos.contactoPrevio,
        medioContacto: datos.contactoPrevio ? datos.medioContacto : null,
        fechaCita: !datos.contactoPrevio ? datos.fechaCita : null,
        modalidadCita: !datos.contactoPrevio ? datos.modalidadCita : null,
        evidenciaUrls: datos.evidenciaUrls || [],
        objetivosEntrevista: datos.objetivosEntrevista,
        mecanismosComunicacion: datos.mecanismosComunicacion,
        aceptaInformesMensuales: datos.aceptaInformesMensuales,
        resultadoValidacion: datos.resultadoValidacion,
        justificacionResultado: datos.justificacionResultado || null,
        estado: "enviado",
        enviadoEn: enviadoEn,
        cumplimiento: esATiempo ? "a_tiempo" : "fuera_de_tiempo",
        desviacionDias: desviacionDias,
        actualizadoEn: enviadoEn,
      })
      .where(eq(informesPrimerContacto.id, informeId));

    // Execute business effects on Proposal / TG
    const [prop] = await db
      .select()
      .from(propuestas)
      .where(eq(propuestas.id, informe.propuestaId))
      .limit(1);

    if (prop) {
      if (datos.resultadoValidacion === "aprobada") {
        await db
          .update(propuestas)
          .set({
            observaciones: null,
          })
          .where(eq(propuestas.id, prop.id));

        // Notify Egresado
        await db.insert(notificaciones).values({
          usuarioId: prop.egresadoId,
          tipo: "informe_primer_contacto_aprobado",
          mensaje: `El Informe de Primer Contacto para la propuesta #${prop.numero} fue completado y el plan de trabajo ha sido validado por la empresa.`,
        });
      } else if (datos.resultadoValidacion === "con_modificaciones") {
        await db
          .update(propuestas)
          .set({
            observaciones: `📌 OBSERVACIONES DEL SUPERVISOR EMPRESARIAL (Primer Contacto):\n${datos.justificacionResultado}`,
          })
          .where(eq(propuestas.id, prop.id));

        // Notify Egresado
        await db.insert(notificaciones).values({
          usuarioId: prop.egresadoId,
          tipo: "informe_primer_contacto_modificaciones",
          mensaje: `El supervisor empresarial solicitó ajustes en el plan de trabajo de tu propuesta #${prop.numero}. Revisa el apartado de observaciones.`,
        });
      } else if (datos.resultadoValidacion === "rechazada") {
        await db
          .update(propuestas)
          .set({
            estado: "rechazada",
            observaciones: `🔴 PROPUESTA RECHAZADA POR EL SUPERVISOR EMPRESARIAL:\n${datos.justificacionResultado}`,
          })
          .where(eq(propuestas.id, prop.id));

        // Notify Egresado
        await db.insert(notificaciones).values({
          usuarioId: prop.egresadoId,
          tipo: "informe_primer_contacto_rechazado",
          mensaje: `Tu propuesta #${prop.numero} ha sido rechazada por el supervisor empresarial. El Trabajo de Graduación entra en estado suspendido.`,
        });
      }
    }

    revalidatePath(`/asesor/propuestas/${informe.propuestaId}`);
    return { success: true };
  } catch (err: any) {
    console.error("Error al enviar informe primer contacto:", err);
    return { success: false, error: err.message || "Error al enviar el informe" };
  }
}

export async function anularInformePrimerContacto(
  informeId: number,
  motivoAnulacion: string
) {
  try {
    const session = await getSession();
    if (!session || !session.userId || (session.rol !== "coordinador" && session.rol !== "admin")) {
      return { success: false, error: "No tiene permisos para anular este informe." };
    }

    if (!motivoAnulacion || motivoAnulacion.trim().length < 5) {
      return { success: false, error: "Debe ingresar una justificación válida para la anulación." };
    }

    await db
      .update(informesPrimerContacto)
      .set({
        estado: "anulado",
        anuladoPor: session.userId,
        anuladoEn: new Date(),
        motivoAnulacion: motivoAnulacion,
        actualizadoEn: new Date(),
      })
      .where(eq(informesPrimerContacto.id, informeId));

    revalidatePath(`/coordinador`);
    return { success: true };
  } catch (err: any) {
    console.error("Error al anular informe:", err);
    return { success: false, error: err.message || "Error al anular informe" };
  }
}

export async function uploadEvidenciaInformePrimerContacto(
  informeId: number,
  formData: FormData
) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return { success: false, error: "No autenticado" };
    }

    const rawFile = formData.get("archivo") || formData.get("file");
    if (!rawFile || typeof rawFile === "string") {
      return { success: false, error: "Debe seleccionar un archivo válido." };
    }

    const archivo = rawFile as File;
    const arrayBuffer = await archivo.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");
    const mimeType = archivo.type || "application/octet-stream";
    const archivoUrl = `data:${mimeType};base64,${base64}`;

    const [newEvidencia] = await db
      .insert(evidenciasInformePrimerContacto)
      .values({
        informeId,
        nombreArchivo: archivo.name,
        archivoUrl,
        subidoEn: new Date(),
      })
      .returning();

    // Actualizar también campo legacy evidenciaUrls en informesPrimerContacto para retrocompatibilidad
    const [informe] = await db
      .select()
      .from(informesPrimerContacto)
      .where(eq(informesPrimerContacto.id, informeId))
      .limit(1);

    if (informe) {
      const currentUrls = Array.isArray(informe.evidenciaUrls)
        ? (informe.evidenciaUrls as string[])
        : [];
      await db
        .update(informesPrimerContacto)
        .set({
          evidenciaUrls: [...currentUrls, archivoUrl],
          actualizadoEn: new Date(),
        })
        .where(eq(informesPrimerContacto.id, informeId));
    }

    return { success: true, evidencia: newEvidencia };
  } catch (err: any) {
    console.error("Error al subir evidencia:", err);
    return { success: false, error: err.message || "Error al subir evidencia" };
  }
}

export async function deleteEvidenciaInformePrimerContacto(
  evidenciaId: number,
  informeId: number
) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return { success: false, error: "No autenticado" };
    }

    const [evidencia] = await db
      .select()
      .from(evidenciasInformePrimerContacto)
      .where(eq(evidenciasInformePrimerContacto.id, evidenciaId))
      .limit(1);

    if (!evidencia) {
      return { success: false, error: "Evidencia no encontrada." };
    }

    await db
      .delete(evidenciasInformePrimerContacto)
      .where(eq(evidenciasInformePrimerContacto.id, evidenciaId));

    // Sincronizar campo legacy
    const [informe] = await db
      .select()
      .from(informesPrimerContacto)
      .where(eq(informesPrimerContacto.id, informeId))
      .limit(1);

    if (informe && Array.isArray(informe.evidenciaUrls)) {
      const currentUrls = informe.evidenciaUrls as string[];
      const updatedUrls = currentUrls.filter((url) => url !== evidencia.archivoUrl);
      await db
        .update(informesPrimerContacto)
        .set({ evidenciaUrls: updatedUrls, actualizadoEn: new Date() })
        .where(eq(informesPrimerContacto.id, informeId));
    }

    return { success: true };
  } catch (err: any) {
    console.error("Error al eliminar evidencia:", err);
    return { success: false, error: err.message || "Error al eliminar evidencia" };
  }
}
