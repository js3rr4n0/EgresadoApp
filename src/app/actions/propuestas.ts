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

  // 3. Auto-create if none exists
  if (!propuesta) {
    const isRecepcionAbierta = new Date() <= new Date(periodo.finRecepcion + 'T23:59:59');
    if (!isRecepcionAbierta) {
      return { error: `La recepción de nuevas propuestas para el ciclo ${periodo.nombre} ha finalizado.` };
    }

    const insertResult = await db.insert(propuestas).values({
      egresadoId: session.userId,
      periodoId: periodo.id,
      tipo: "pasantia", // default
      numero: 1,
      estado: "redactando"
    }).returning();
    propuesta = insertResult[0];
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

  // 5. Month of sending (from period)
  const mesEnvio = new Intl.DateTimeFormat('es-SV', { month: 'long' }).format(new Date(periodo.inicioRecepcion));

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
