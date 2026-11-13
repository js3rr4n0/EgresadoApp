"use server";

// Protocolo de investigación (entrega I3). Se redacta después de aprobada la propuesta, junto con el plan de trabajo
// (su cronograma de actividades), y se envía con él al asesor, que emite un solo dictamen escrito.
//   - Redacta el líder; las respuestas se guardan en respuestas_espacios (actions/respuestasEspacios.ts).
//   - En equipo, si la ficha lo pide, cada integrante ratifica la versión final (protocolo + plan) antes del envío.
import crypto from "crypto";
import { db } from "@/lib/db";
import { detallesProyecto, ratificacionesPlan, respuestasEspacios } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { fichaDePropuesta, espaciosPropuesta } from "@/lib/fichas/fichaDePropuesta";
import { esEtapaProtocolo, type EtapaProtocolo } from "@/lib/fichas/tipos";
import { fechaLimiteDictamen, precargaEspacio, problemasProtocolo } from "@/lib/fichas/protocolo";
import { validarPlanEquipo, type NodoPlan } from "@/lib/fichas/planTrabajo";
import { getPlanTrabajo, type DatosPlan } from "./planTrabajo";

export interface FirmaProtocolo {
  usuarioId: number;
  nombre: string;
  vigente: boolean;
  momento: string | null;
}

export interface DatosProtocolo {
  etapa: EtapaProtocolo;
  /** Respuestas guardadas del protocolo, por id de espacio. */
  respuestas: Record<string, string>;
  /** Texto con que empieza un espacio que todavía no tiene respuesta y se precarga desde la propuesta. */
  precargas: Record<string, string>;
  problemas: { espacioId: string; mensaje: string }[];
  ratificacion: { requerida: boolean; firmas: FirmaProtocolo[]; completa: boolean };
  /** Fecha límite del dictamen del asesor (ISO), si ya se envió. */
  fechaLimite: string | null;
}

type Resultado<T = object> = ({ success: true } & T) | { success: false; error: string };

function huella(respuestas: Record<string, string>, arbol: NodoPlan) {
  const ordenadas = Object.keys(respuestas).sort().map((k) => [k, respuestas[k]]);
  return crypto.createHash("sha256").update(JSON.stringify({ r: ordenadas, a: arbol })).digest("hex");
}

async function armar(propuestaId: number, plan: DatosPlan): Promise<{ datos: DatosProtocolo; huella: string } | null> {
  const ficha = await fichaDePropuesta(propuestaId);
  const etapa = ficha?.definicion.etapas.find(esEtapaProtocolo);
  if (!ficha || !etapa) return null;

  const filas = await db.select({ id: respuestasEspacios.espacioId, contenido: respuestasEspacios.contenido }).from(respuestasEspacios).where(eq(respuestasEspacios.propuestaId, propuestaId));
  const todas = Object.fromEntries(filas.map((f) => [f.id, f.contenido ?? ""]));
  const ids = new Set(etapa.espacios.map((e) => e.id));
  const respuestas = Object.fromEntries(Object.entries(todas).filter(([k]) => ids.has(k)));

  const [det] = await db.select().from(detallesProyecto).where(eq(detallesProyecto.propuestaId, propuestaId));
  const espaciosProp = espaciosPropuesta(ficha.definicion);
  const precargas: Record<string, string> = {};
  for (const e of etapa.espacios) {
    if ((e.elemento !== "texto" && e.elemento !== "apartado") || !e.precargarDe || respuestas[e.id]?.trim()) continue;
    const texto = precargaEspacio(e, espaciosProp, { ...det, respuestas: todas });
    if (texto) precargas[e.id] = texto;
  }

  const h = huella(respuestas, plan.plan.arbol);
  const firmadas = await db.select().from(ratificacionesPlan).where(eq(ratificacionesPlan.propuestaId, propuestaId));
  const firmas: FirmaProtocolo[] = plan.equipo.map((i) => {
    const f = firmadas.find((x) => x.usuarioId === i.id);
    return { usuarioId: i.id, nombre: i.nombre, vigente: f?.huellaFirmada === h, momento: f?.momento.toISOString() ?? null };
  });
  const requerida = etapa.revision.ratificacion && plan.equipo.length > 1;
  const enviado = plan.plan.enviadoEn && (plan.plan.estado === "enviado" || plan.plan.estado === "aprobado");
  return {
    huella: h,
    datos: {
      etapa,
      respuestas,
      precargas,
      // Lo precargado cuenta como respuesta: el egresado puede enviarlo tal cual si no necesita ajustes.
      problemas: problemasProtocolo(etapa, { ...precargas, ...respuestas }),
      ratificacion: { requerida, firmas, completa: !requerida || firmas.every((f) => f.vigente) },
      fechaLimite: enviado ? fechaLimiteDictamen(new Date(plan.plan.enviadoEn!), etapa).toISOString() : null,
    },
  };
}

/** Protocolo de la propuesta para el equipo o el asesor (los mismos permisos que el plan de trabajo). */
export async function getProtocolo(propuestaId: number): Promise<Resultado<{ datos: DatosProtocolo }>> {
  const res = await getPlanTrabajo(propuestaId);
  if (!res.success) return { success: false, error: res.error };
  const armado = await armar(propuestaId, res.datos);
  if (!armado) return { success: false, error: "La ficha de esta propuesta no tiene protocolo." };
  return { success: true, datos: armado.datos };
}

/** Cada integrante firma la versión actual del protocolo y el plan. Solo se puede con ambos completos. */
export async function ratificarProtocolo(propuestaId: number): Promise<Resultado> {
  const session = await getSession();
  if (!session || session.rol !== "egresado") return { success: false, error: "No autorizado" };
  const res = await getPlanTrabajo(propuestaId);
  if (!res.success) return { success: false, error: res.error };
  const plan = res.datos;
  if (plan.rol !== "lider" && plan.rol !== "integrante") return { success: false, error: "Solo el equipo ratifica el protocolo." };
  if (plan.plan.estado !== "redactando" && plan.plan.estado !== "observado") return { success: false, error: "El protocolo ya se envió al asesor." };
  const armado = await armar(propuestaId, plan);
  if (!armado) return { success: false, error: "La ficha de esta propuesta no tiene protocolo." };
  if (Object.keys(armado.datos.precargas).length > 0) return { success: false, error: "Guarda primero los textos precargados desde la propuesta (revísalos y guárdalos)." };
  if (armado.datos.problemas.length > 0) return { success: false, error: `El protocolo está incompleto: ${armado.datos.problemas[0].mensaje}` };
  if (validarPlanEquipo(plan.plan.arbol, plan.etapa, plan.equipo.map((i) => i.id), plan.columnas.length).length > 0) {
    return { success: false, error: "El plan de trabajo todavía tiene pendientes: complétalo antes de ratificar." };
  }
  await db
    .insert(ratificacionesPlan)
    .values({ propuestaId, usuarioId: session.userId, huellaFirmada: armado.huella, momento: new Date() })
    .onConflictDoUpdate({ target: [ratificacionesPlan.propuestaId, ratificacionesPlan.usuarioId], set: { huellaFirmada: armado.huella, momento: new Date() } });
  revalidatePath("/egresado/plan");
  return { success: true };
}

/** Comprobación previa al envío del plan (la llama enviarPlanTrabajo). null si se puede enviar o no hay protocolo. */
export async function motivoProtocoloNoEnviable(propuestaId: number): Promise<string | null> {
  const res = await getPlanTrabajo(propuestaId);
  if (!res.success) return res.error;
  const armado = await armar(propuestaId, res.datos);
  if (!armado) return null;
  const { datos } = armado;
  if (Object.keys(datos.precargas).length > 0) return "Revisa y guarda los textos del protocolo que se precargaron desde la propuesta.";
  if (datos.problemas.length > 0) return `El protocolo está incompleto: ${datos.problemas[0].mensaje}`;
  if (!datos.ratificacion.completa) {
    const faltan = datos.ratificacion.firmas.filter((f) => !f.vigente).map((f) => f.nombre);
    return `Falta que ratifiquen la versión final del protocolo y el plan: ${faltan.join(", ")}.`;
  }
  return null;
}

