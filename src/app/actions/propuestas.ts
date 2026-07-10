"use server";

import { db } from "@/lib/db";
import { propuestas, periodos, usuarios, carreras, facultades } from "@/lib/schema";
import { eq, desc, and } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function getActivePropuesta() {
  const session = await getSession();
  if (!session || session.rol !== "egresado") return null;

  // 1. Get active period
  const activePeriodRows = await db.select().from(periodos).where(eq(periodos.activo, true)).limit(1);
  if (activePeriodRows.length === 0) return { error: "No hay periodo activo actualmente." };
  const periodo = activePeriodRows[0];

  // 2. Check for existing proposal
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

  // 3. Return null if no proposal exists yet, let the user create it via modal
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

  return { propuesta, userDetails, mesEnvio, periodo };
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
      return { success: true };
    }
  } catch (error: any) {
    console.error("Error initPropuesta:", error);
    return { success: false, error: "Error interno del servidor al crear la propuesta: " + error.message };
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
