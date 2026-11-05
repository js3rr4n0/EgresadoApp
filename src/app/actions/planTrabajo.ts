"use server";

// Plan de trabajo del equipo (entrega P3, proyecto). Se elabora después de aprobada la propuesta, con las reglas
// de la etapa "Plan de trabajo" de su ficha. El líder estructura y asigna responsables; cada integrante completa
// lo que está a su cargo; el líder lo envía y el asesor lo aprueba u observa.
import crypto from "crypto";
import { db } from "@/lib/db";
import { detallesProyecto, integrantesProyecto, notificaciones, planesTrabajo, propuestas, usuarios } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { fichaDePropuesta } from "@/lib/fichas/fichaDePropuesta";
import { esEtapaEjecucion, esEtapaPlan, type EtapaEjecucion, type EtapaPlan } from "@/lib/fichas/tipos";
import { cambioNoPermitido, numerar, validarPlanEquipo, type NodoPlan, type ProblemaPlan } from "@/lib/fichas/planTrabajo";
import { notificarEquipo } from "@/lib/notificarEquipo";

/** Estados de la propuesta en los que ya existe (o puede crearse) el plan de trabajo. */
const ESTADOS_CON_PLAN = ["aprobada", "primer_contacto_completado", "en_ejecucion"];
const MAX_NODOS = 400;

export type RolPlan = "lider" | "integrante" | "asesor" | "lectura";

export interface IntegrantePlan {
  id: number;
  nombre: string;
  carnet: string | null;
  lider: boolean;
}

export interface DatosPlan {
  propuesta: { id: number; numero: number; titulo: string | null; estado: string };
  etapa: EtapaPlan;
  columnas: { periodo: number; sub: number | null; texto: string }[];
  equipo: IntegrantePlan[];
  rol: RolPlan;
  miId: number;
  plan: { arbol: NodoPlan; version: number; estado: string; comentarioAsesor: string | null; enviadoEn: string | null; revisadoEn: string | null };
}

type Resultado<T = object> = ({ success: true } & T) | { success: false; error: string; problemas?: ProblemaPlan[] };

function columnasDe(etapa: EtapaPlan, ejec: EtapaEjecucion) {
  const periodos = Math.min(ejec.periodos, 36);
  if (etapa.granularidad === "periodo") return Array.from({ length: periodos }, (_, p) => ({ periodo: p + 1, sub: null, texto: `P${p + 1}` }));
  return Array.from({ length: periodos * ejec.subperiodos }, (_, i) => {
    const periodo = Math.floor(i / ejec.subperiodos) + 1;
    const sub = (i % ejec.subperiodos) + 1;
    return { periodo, sub, texto: `P${periodo}·S${sub}` };
  });
}

async function equipoDe(propuestaId: number, liderId: number): Promise<IntegrantePlan[]> {
  const [lider] = await db.select({ id: usuarios.id, nombre: usuarios.nombreCompleto, carnet: usuarios.carnet }).from(usuarios).where(eq(usuarios.id, liderId));
  const otros = await db
    .select({ id: usuarios.id, nombre: usuarios.nombreCompleto, carnet: usuarios.carnet })
    .from(integrantesProyecto)
    .innerJoin(usuarios, eq(integrantesProyecto.egresadoId, usuarios.id))
    .where(and(eq(integrantesProyecto.propuestaId, propuestaId), eq(integrantesProyecto.estado, "aceptado")));
  return [{ ...lider, lider: true }, ...otros.map((o) => ({ ...o, lider: false }))];
}

/** Árbol inicial: el objetivo general y los objetivos específicos de la propuesta aprobada. */
async function arbolInicial(propuestaId: number): Promise<NodoPlan> {
  const [det] = await db.select().from(detallesProyecto).where(eq(detallesProyecto.propuestaId, propuestaId));
  const especificos = (Array.isArray(det?.objetivosEspecificos) ? det.objetivosEspecificos : []) as { titulo?: string }[];
  return numerar({
    id: "og",
    codigo: "1",
    nivel: 1,
    titulo: det?.objetivoGeneral?.trim() || "Objetivo general",
    responsable: null,
    montos: [],
    hijos: especificos.map((o) => ({ id: crypto.randomUUID(), codigo: "", nivel: 2, titulo: o.titulo?.trim() || "", responsable: null, montos: [], hijos: [] })),
  });
}

/** Comprueba la forma del árbol recibido del navegador (no las reglas de la ficha). */
function arbolValido(x: unknown, columnas: number): x is NodoPlan {
  let total = 0;
  const rec = (n: unknown, nivel: number): boolean => {
    if (typeof n !== "object" || n === null) return false;
    const o = n as Record<string, unknown>;
    total++;
    return (
      total <= MAX_NODOS &&
      typeof o.id === "string" && o.id.length > 0 && o.id.length <= 64 &&
      typeof o.titulo === "string" && o.titulo.length <= 500 &&
      o.nivel === nivel &&
      (o.responsable === null || (typeof o.responsable === "number" && Number.isInteger(o.responsable))) &&
      Array.isArray(o.montos) && o.montos.length <= columnas && o.montos.every((m) => typeof m === "number" && Number.isFinite(m) && m >= 0 && m <= 1e9) &&
      Array.isArray(o.hijos) && (nivel < 5 || o.hijos.length === 0) && o.hijos.every((h) => rec(h, nivel + 1))
    );
  };
  return rec(x, 1);
}

export async function getPlanTrabajo(propuestaId: number): Promise<Resultado<{ datos: DatosPlan }>> {
  const session = await getSession();
  if (!session) return { success: false, error: "No autorizado" };
  const [prop] = await db.select().from(propuestas).where(eq(propuestas.id, propuestaId));
  if (!prop) return { success: false, error: "La propuesta no existe." };

  const equipo = await equipoDe(propuestaId, prop.egresadoId);
  const enEquipo = equipo.some((i) => i.id === session.userId);
  const rol: RolPlan =
    session.rol === "egresado" ? (prop.egresadoId === session.userId ? "lider" : enEquipo ? "integrante" : "lectura")
      : session.rol === "asesor" && prop.asesorId === session.userId ? "asesor"
      : "lectura";
  if (session.rol === "egresado" && !enEquipo) return { success: false, error: "No formas parte de esta propuesta." };
  if (session.rol === "asesor" && rol !== "asesor") return { success: false, error: "Esta propuesta no está asignada a ti." };

  const ficha = await fichaDePropuesta(propuestaId);
  const etapa = ficha?.definicion.etapas.find(esEtapaPlan);
  const ejec = ficha?.definicion.etapas.find(esEtapaEjecucion);
  if (!ficha?.version || !etapa || !ejec) return { success: false, error: "La ficha de esta propuesta no tiene plan de trabajo." };
  if (!ESTADOS_CON_PLAN.includes(prop.estado)) return { success: false, error: "El plan de trabajo se elabora después de aprobada la propuesta." };

  const columnas = columnasDe(etapa, ejec);
  let [fila] = await db.select().from(planesTrabajo).where(eq(planesTrabajo.propuestaId, propuestaId));
  if (!fila) {
    if (rol !== "lider" && rol !== "integrante") return { success: false, error: "El equipo todavía no ha empezado su plan de trabajo." };
    [fila] = await db
      .insert(planesTrabajo)
      .values({ propuestaId, fichaVersionId: ficha.version.id, arbol: await arbolInicial(propuestaId), columnas: columnas.length, actualizadoPor: session.userId })
      .onConflictDoNothing()
      .returning();
    if (!fila) [fila] = await db.select().from(planesTrabajo).where(eq(planesTrabajo.propuestaId, propuestaId));
  }

  return {
    success: true,
    datos: {
      propuesta: { id: prop.id, numero: prop.numero, titulo: prop.titulo, estado: prop.estado },
      etapa,
      columnas,
      equipo,
      rol,
      miId: session.userId,
      plan: {
        arbol: fila.arbol as NodoPlan,
        version: fila.version,
        estado: fila.estado,
        comentarioAsesor: fila.comentarioAsesor,
        enviadoEn: fila.enviadoEn?.toISOString() ?? null,
        revisadoEn: fila.revisadoEn?.toISOString() ?? null,
      },
    },
  };
}

export async function guardarPlanTrabajo(propuestaId: number, arbol: unknown, version: number): Promise<Resultado<{ version: number }>> {
  try {
    const res = await getPlanTrabajo(propuestaId);
    if (!res.success) return res;
    const { datos } = res;
    if (datos.rol !== "lider" && datos.rol !== "integrante") return { success: false, error: "Solo el equipo edita su plan de trabajo." };
    if (datos.plan.estado === "enviado" || datos.plan.estado === "aprobado") return { success: false, error: "El plan ya fue enviado al asesor; no se puede modificar." };
    if (datos.plan.version !== version) return { success: false, error: "Otro integrante guardó cambios mientras editabas. Recarga la página para ver la última versión." };
    if (!arbolValido(arbol, datos.columnas.length)) return { success: false, error: "El plan recibido no tiene una forma válida." };

    const nuevo = numerar(arbol);
    if (datos.rol === "integrante") {
      const motivo = cambioNoPermitido(datos.plan.arbol, nuevo, datos.miId);
      if (motivo) return { success: false, error: motivo };
    }
    const [act] = await db
      .update(planesTrabajo)
      .set({ arbol: nuevo, version: version + 1, actualizadoPor: datos.miId, actualizadoEn: new Date() })
      .where(and(eq(planesTrabajo.propuestaId, propuestaId), eq(planesTrabajo.version, version)))
      .returning({ version: planesTrabajo.version });
    if (!act) return { success: false, error: "Otro integrante guardó cambios mientras editabas. Recarga la página para ver la última versión." };
    revalidatePath("/egresado/plan");
    return { success: true, version: act.version };
  } catch (error) {
    console.error("Error guardarPlanTrabajo:", error);
    return { success: false, error: "No se pudo guardar el plan." };
  }
}

export async function enviarPlanTrabajo(propuestaId: number): Promise<Resultado> {
  const res = await getPlanTrabajo(propuestaId);
  if (!res.success) return res;
  const { datos } = res;
  if (datos.rol !== "lider") return { success: false, error: "Solo el líder envía el plan al asesor." };
  if (datos.plan.estado !== "redactando" && datos.plan.estado !== "observado") return { success: false, error: "El plan ya fue enviado." };
  const problemas = validarPlanEquipo(datos.plan.arbol, datos.etapa, datos.equipo.map((i) => i.id), datos.columnas.length);
  if (problemas.length > 0) return { success: false, error: "El plan todavía no cumple las reglas de la ficha.", problemas };

  await db.update(planesTrabajo).set({ estado: "enviado", enviadoEn: new Date() }).where(eq(planesTrabajo.propuestaId, propuestaId));
  const [prop] = await db.select({ asesorId: propuestas.asesorId, numero: propuestas.numero }).from(propuestas).where(eq(propuestas.id, propuestaId));
  if (prop?.asesorId) {
    await db.insert(notificaciones).values({ usuarioId: prop.asesorId, tipo: "plan_trabajo_enviado", mensaje: `El equipo de la propuesta #${prop.numero} envió su plan de trabajo para revisión.` });
  }
  await notificarEquipo(propuestaId, "plan_trabajo_enviado", `El plan de trabajo de la propuesta #${prop?.numero ?? ""} se envió al asesor.`);
  revalidatePath("/egresado/plan");
  return { success: true };
}

export async function revisarPlanTrabajo(propuestaId: number, decision: "aprobar" | "observar", comentario: string): Promise<Resultado> {
  const res = await getPlanTrabajo(propuestaId);
  if (!res.success) return res;
  const { datos } = res;
  if (datos.rol !== "asesor") return { success: false, error: "Solo el asesor asignado revisa el plan." };
  if (datos.plan.estado !== "enviado") return { success: false, error: "El plan no está pendiente de revisión." };
  const texto = comentario.trim();
  if (decision === "observar" && texto.length < 10) return { success: false, error: "Escribe las observaciones para el equipo (al menos 10 caracteres)." };

  await db
    .update(planesTrabajo)
    .set({ estado: decision === "aprobar" ? "aprobado" : "observado", comentarioAsesor: texto || null, revisadoPor: datos.miId, revisadoEn: new Date() })
    .where(eq(planesTrabajo.propuestaId, propuestaId));
  await notificarEquipo(
    propuestaId,
    decision === "aprobar" ? "plan_trabajo_aprobado" : "plan_trabajo_observado",
    decision === "aprobar" ? `El asesor aprobó el plan de trabajo de la propuesta #${datos.propuesta.numero}.` : `El asesor hizo observaciones al plan de trabajo de la propuesta #${datos.propuesta.numero}: ${texto}`
  );
  revalidatePath(`/asesor/plan/${propuestaId}`);
  return { success: true };
}

/** Estado del plan para otras pantallas (dar inicio, paneles). null si la ficha de la propuesta no tiene plan. */
export async function estadoPlanDePropuesta(propuestaId: number): Promise<string | null> {
  const ficha = await fichaDePropuesta(propuestaId);
  if (!ficha?.version || !ficha.definicion.etapas.some(esEtapaPlan)) return null;
  const [fila] = await db.select({ estado: planesTrabajo.estado }).from(planesTrabajo).where(eq(planesTrabajo.propuestaId, propuestaId));
  return fila?.estado ?? "sin_plan";
}
