"use server";

// Ejecución del proyecto en equipo (entrega P4). Cada integrante registra, período a período, las actividades de su
// plan individual (avance, acciones, resultado y marco teórico opcional) con las reglas de la ficha. El asesor revisa
// cada registro y ve quién hizo qué. No toca la ejecución de pasantía (registrosActividad.ts), que sigue igual.
import { db } from "@/lib/db";
import { cartasAceptacion, evidenciasPlan, informesPlan, notificaciones, registrosPlan } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { and, asc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { fichaDePropuesta } from "@/lib/fichas/fichaDePropuesta";
import { esEtapaEjecucion, opcionesRegistro } from "@/lib/fichas/tipos";
import { actividadesDelPeriodo, aplanar, responsables, validarRegistroProyecto, type ReglasRegistroProyecto } from "@/lib/fichas/planTrabajo";
import { aISOLocal, fechaLocalDesdeISO, sumarDiasISO } from "@/lib/periodosPasantia";
import { getPlanTrabajo, type DatosPlan } from "./planTrabajo";
import { armarInformePeriodo } from "@/lib/fichas/informePeriodo";
import { notificarEquipo } from "@/lib/notificarEquipo";

export interface RegistroPlan {
  id: number;
  nodoId: string;
  periodo: number;
  egresadoId: number;
  avance: number | null;
  acciones: string;
  resultado: string;
  marcoTeorico: string;
  estado: string;
  comentarioAsesor: string | null;
  enviadoEn: string | null;
  /** Evidencias adjuntas (sin el contenido del archivo; ver getEvidenciasRegistro). */
  evidencias: EvidenciaResumen[];
}

export interface EvidenciaResumen {
  id: number;
  tipo: "imagen" | "documento" | "enlace";
  nombre: string | null;
  leyenda: string;
  /** Solo los enlaces traen su dirección aquí. */
  enlace: string | null;
}

export interface DatosEjecucion {
  plan: DatosPlan;
  reglas: ReglasRegistroProyecto;
  /** Evidencias por actividad que pide la ficha (máximo 0: no se piden). */
  evidencias: { min: number; max: number };
  informe: "unico" | "individual_y_general";
  periodos: { numero: number; desde: string | null; hasta: string | null }[];
  periodoActual: number;
  registros: RegistroPlan[];
  /** Informes del período ya entregados. egresadoId null = informe general del equipo. */
  informes: { periodo: number; egresadoId: number | null; estado: string; comentarioAsesor: string | null }[];
  /** La ficha exige que las actividades estén aprobadas antes de entregar el informe. */
  exigirAprobadas: boolean;
}

type Resultado<T = object> = ({ success: true } & T) | { success: false; error: string; problemas?: string[] };

const hoyISO = () => aISOLocal(new Date());

export async function getEjecucionProyecto(propuestaId: number): Promise<Resultado<{ datos: DatosEjecucion }>> {
  const res = await getPlanTrabajo(propuestaId);
  if (!res.success) return { success: false, error: res.error };
  const plan = res.datos;
  if (plan.propuesta.estado !== "en_ejecucion") return { success: false, error: "La ejecución empieza cuando coordinación da inicio al plan de trabajo." };
  if (plan.plan.estado !== "aprobado") return { success: false, error: "El plan de trabajo todavía no está aprobado." };

  const ficha = await fichaDePropuesta(propuestaId);
  const ejec = ficha?.definicion.etapas.find(esEtapaEjecucion);
  if (!ejec) return { success: false, error: "La ficha de esta propuesta no tiene etapa de ejecución." };
  const op = opcionesRegistro(ejec);
  if (op.modo !== "actividad") return { success: false, error: "La ficha de esta propuesta registra por subperíodo (flujo de pasantía)." };

  // Fechas de cada período desde el inicio de la carta (en días). Sin carta: el período 1 queda abierto.
  const [carta] = await db.select({ inicio: cartasAceptacion.fechaInicio }).from(cartasAceptacion).where(eq(cartasAceptacion.propuestaId, propuestaId));
  const inicio = carta?.inicio ? String(carta.inicio).slice(0, 10) : null;
  const periodos = Array.from({ length: Math.min(ejec.periodos, 36) }, (_, i) => ({
    numero: i + 1,
    desde: inicio && ejec.unidad === "dias" ? sumarDiasISO(inicio, i * ejec.duracionPeriodo) : null,
    hasta: inicio && ejec.unidad === "dias" ? sumarDiasISO(inicio, (i + 1) * ejec.duracionPeriodo - 1) : null,
  }));
  const hoy = hoyISO();
  const transcurridos = inicio ? Math.floor((fechaLocalDesdeISO(hoy).getTime() - fechaLocalDesdeISO(inicio).getTime()) / 86_400_000) : 0;
  // El período 1 está abierto desde que coordinación da inicio, aunque la fecha de la carta sea posterior.
  const periodoActual = Math.min(periodos.length, Math.max(1, Math.floor(transcurridos / ejec.duracionPeriodo) + 1));

  const filas = await db.select().from(registrosPlan).where(eq(registrosPlan.propuestaId, propuestaId));
  const evs = filas.length
    ? await db
        .select({ id: evidenciasPlan.id, registroId: evidenciasPlan.registroId, tipo: evidenciasPlan.tipo, nombre: evidenciasPlan.nombre, leyenda: evidenciasPlan.leyenda, url: evidenciasPlan.url })
        .from(evidenciasPlan)
        .where(and(inArray(evidenciasPlan.registroId, filas.map((f) => f.id)), eq(evidenciasPlan.tipo, "enlace")))
        .orderBy(asc(evidenciasPlan.id))
    : [];
  // Los archivos (imagen o documento) se listan sin su contenido, que puede pesar varios MB.
  const archivos = filas.length
    ? await db
        .select({ id: evidenciasPlan.id, registroId: evidenciasPlan.registroId, tipo: evidenciasPlan.tipo, nombre: evidenciasPlan.nombre, leyenda: evidenciasPlan.leyenda })
        .from(evidenciasPlan)
        .where(and(inArray(evidenciasPlan.registroId, filas.map((f) => f.id)), inArray(evidenciasPlan.tipo, ["imagen", "documento"])))
        .orderBy(asc(evidenciasPlan.id))
    : [];
  const resumen = [...evs.map((e) => ({ ...e, enlace: e.url })), ...archivos.map((e) => ({ ...e, enlace: null }))].sort((a, b) => a.id - b.id);
  const informes = await db.select().from(informesPlan).where(eq(informesPlan.propuestaId, propuestaId));
  return {
    success: true,
    datos: {
      plan,
      reglas: { acciones: ejec.registro.descripcion, resultado: ejec.registro.conclusion, marcoTeorico: op.marcoTeorico, avance: op.avance },
      evidencias: op.evidencias,
      // Con un solo integrante no hay informe individual y general: se entrega uno solo.
      informe: plan.equipo.length === 1 ? "unico" : op.informe,
      periodos,
      periodoActual,
      informes: informes.map((i) => ({ periodo: i.periodo, egresadoId: i.egresadoId, estado: i.estado, comentarioAsesor: i.comentarioAsesor })),
      exigirAprobadas: ejec.informe.exigirActividadesAprobadas,
      registros: filas.map((f) => ({
        id: f.id, nodoId: f.nodoId, periodo: f.periodo, egresadoId: f.egresadoId, avance: f.avance,
        acciones: f.acciones ?? "", resultado: f.resultado ?? "", marcoTeorico: f.marcoTeorico ?? "",
        estado: f.estado, comentarioAsesor: f.comentarioAsesor, enviadoEn: f.enviadoEn?.toISOString() ?? null,
        evidencias: resumen
          .filter((e) => e.registroId === f.id)
          .map((e) => ({ id: e.id, tipo: e.tipo as EvidenciaResumen["tipo"], nombre: e.nombre, leyenda: e.leyenda, enlace: e.enlace })),
      })),
    },
  };
}

export async function guardarRegistroPlan(
  propuestaId: number,
  nodoId: string,
  periodo: number,
  datos: { avance: number | null; acciones: string; resultado: string; marcoTeorico: string },
  enviar: boolean
): Promise<Resultado> {
  try {
    const res = await getEjecucionProyecto(propuestaId);
    if (!res.success) return res;
    const { plan, reglas, periodoActual, registros, evidencias } = res.datos;
    if (plan.rol !== "lider" && plan.rol !== "integrante") return { success: false, error: "Solo los integrantes registran actividades." };
    if (!Number.isInteger(periodo) || periodo < 1 || periodo > periodoActual) return { success: false, error: "Ese período todavía no está abierto." };

    const nodo = aplanar(plan.plan.arbol).find((n) => n.id === nodoId);
    if (!nodo || !actividadesDelPeriodo(plan.plan.arbol, periodo, plan.columnas, reglas.avance ? registros : null).some((n) => n.id === nodoId)) {
      return { success: false, error: "Esa actividad no está planificada en este período." };
    }
    if (responsables(plan.plan.arbol).get(nodoId) !== plan.miId) return { success: false, error: "Esta actividad está a cargo de otro integrante." };

    const previo = registros.find((r) => r.nodoId === nodoId && r.periodo === periodo);
    if (previo && (previo.estado === "enviado" || previo.estado === "aprobado")) return { success: false, error: "El registro ya fue enviado al asesor." };

    const limpio = {
      avance: datos.avance === null || Number.isNaN(datos.avance) ? null : Math.round(datos.avance),
      acciones: datos.acciones.trim().slice(0, 20000),
      resultado: datos.resultado.trim().slice(0, 20000),
      marcoTeorico: reglas.marcoTeorico === "no" ? "" : datos.marcoTeorico.trim().slice(0, 20000),
    };
    if (limpio.avance !== null && (limpio.avance < 0 || limpio.avance > 100)) return { success: false, error: "El avance va de 0 a 100 %." };
    if (enviar) {
      const problemas = validarRegistroProyecto(limpio, reglas);
      const adjuntas = previo?.evidencias.length ?? 0;
      if (evidencias.max > 0 && adjuntas < evidencias.min) problemas.push(`Adjunta al menos ${evidencias.min} evidencia(s) de la actividad (imagen, documento o enlace).`);
      if (problemas.length > 0) return { success: false, error: "El registro todavía no cumple las reglas de la ficha.", problemas };
    }

    const valores = { ...limpio, estado: enviar ? "enviado" : previo?.estado === "observado" ? "observado" : "borrador", enviadoEn: enviar ? new Date() : null, actualizadoEn: new Date() };
    await db
      .insert(registrosPlan)
      .values({ propuestaId, nodoId, periodo, egresadoId: plan.miId, ...valores })
      .onConflictDoUpdate({ target: [registrosPlan.propuestaId, registrosPlan.nodoId, registrosPlan.periodo], set: { ...valores, egresadoId: plan.miId } });

    if (enviar) {
      const [prop] = await db.select().from(registrosPlan).where(and(eq(registrosPlan.propuestaId, propuestaId), eq(registrosPlan.nodoId, nodoId), eq(registrosPlan.periodo, periodo)));
      const { propuestas } = await import("@/lib/schema");
      const [p] = await db.select({ asesorId: propuestas.asesorId, numero: propuestas.numero }).from(propuestas).where(eq(propuestas.id, propuestaId));
      if (p?.asesorId && prop) {
        await db.insert(notificaciones).values({ usuarioId: p.asesorId, tipo: "registro_plan_enviado", mensaje: `Propuesta #${p.numero}: se envió el registro de "${nodo.titulo}" (período ${periodo}).` });
      }
    }
    revalidatePath("/egresado/ejecucion");
    return { success: true };
  } catch (error) {
    console.error("Error guardarRegistroPlan:", error);
    return { success: false, error: "No se pudo guardar el registro." };
  }
}

export async function revisarRegistroPlan(propuestaId: number, registroId: number, decision: "aprobar" | "observar", comentario: string): Promise<Resultado> {
  const session = await getSession();
  if (!session || session.rol !== "asesor") return { success: false, error: "No autorizado" };
  const res = await getEjecucionProyecto(propuestaId);
  if (!res.success) return res;
  if (res.datos.plan.rol !== "asesor") return { success: false, error: "Solo el asesor asignado revisa los registros." };
  const reg = res.datos.registros.find((r) => r.id === registroId);
  if (!reg) return { success: false, error: "El registro no existe." };
  if (reg.estado !== "enviado") return { success: false, error: "El registro no está pendiente de revisión." };
  const texto = comentario.trim();
  if (decision === "observar" && texto.length < 10) return { success: false, error: "Escribe la observación (al menos 10 caracteres)." };

  await db
    .update(registrosPlan)
    .set({ estado: decision === "aprobar" ? "aprobado" : "observado", comentarioAsesor: texto || null, revisadoPor: session.userId, revisadoEn: new Date() })
    .where(eq(registrosPlan.id, registroId));
  const nodo = aplanar(res.datos.plan.plan.arbol).find((n) => n.id === reg.nodoId);
  await db.insert(notificaciones).values({
    usuarioId: reg.egresadoId,
    tipo: decision === "aprobar" ? "registro_plan_aprobado" : "registro_plan_observado",
    mensaje: decision === "aprobar" ? `El asesor aprobó tu registro de "${nodo?.titulo ?? "actividad"}" (período ${reg.periodo}).` : `El asesor hizo observaciones a tu registro de "${nodo?.titulo ?? "actividad"}" (período ${reg.periodo}): ${texto}`,
  });
  revalidatePath(`/asesor/ejecucion/${propuestaId}`);
  return { success: true };
}

// ─────────────── Informes del período (entrega P5) ───────────────

async function guardarInforme(propuestaId: number, periodo: number, egresadoId: number | null) {
  const cond = and(eq(informesPlan.propuestaId, propuestaId), eq(informesPlan.periodo, periodo), egresadoId === null ? isNull(informesPlan.egresadoId) : eq(informesPlan.egresadoId, egresadoId));
  const [previo] = await db.select().from(informesPlan).where(cond);
  if (previo) {
    await db.update(informesPlan).set({ estado: "enviado", enviadoEn: new Date(), comentarioAsesor: null, revisadoPor: null, revisadoEn: null }).where(eq(informesPlan.id, previo.id));
  } else {
    await db.insert(informesPlan).values({ propuestaId, periodo, egresadoId, estado: "enviado" });
  }
}

/** El integrante entrega su informe individual del período (se arma con sus registros). */
export async function enviarInformeIndividual(propuestaId: number, periodo: number): Promise<Resultado> {
  const res = await getEjecucionProyecto(propuestaId);
  if (!res.success) return res;
  const { plan, registros, periodoActual, informes, exigirAprobadas, reglas } = res.datos;
  if (plan.rol !== "lider" && plan.rol !== "integrante") return { success: false, error: "Solo los integrantes entregan informes." };
  if (periodo < 1 || periodo > periodoActual) return { success: false, error: "Ese período todavía no está abierto." };
  const previo = informes.find((i) => i.periodo === periodo && i.egresadoId === plan.miId);
  if (previo && previo.estado !== "observado") return { success: false, error: "Ya entregaste tu informe de este período." };
  const general = informes.find((i) => i.periodo === periodo && i.egresadoId === null);
  if (general && general.estado !== "observado") return { success: false, error: "El informe general del período ya fue enviado." };

  const inf = armarInformePeriodo({ arbol: plan.plan.arbol, columnas: plan.columnas, periodo, registros, integrante: plan.miId, arrastre: reglas.avance });
  if (inf.filas.length === 0) return { success: false, error: "No tienes actividades planificadas en este período." };
  if (inf.sinRegistro > 0) return { success: false, error: `Te faltan ${inf.sinRegistro} actividad(es) del período por registrar y enviar.` };
  if (exigirAprobadas && inf.filas.some((f) => f.registro && f.registro.estado !== "aprobado")) {
    return { success: false, error: "La ficha exige que el asesor apruebe todas tus actividades del período antes del informe." };
  }
  await guardarInforme(propuestaId, periodo, plan.miId);
  revalidatePath("/egresado/ejecucion");
  return { success: true };
}

/** El líder envía el informe general del período cuando todos los integrantes con actividades entregaron el suyo. */
export async function enviarInformeGeneral(propuestaId: number, periodo: number): Promise<Resultado> {
  const res = await getEjecucionProyecto(propuestaId);
  if (!res.success) return res;
  const { plan, registros, informes, informe: modoInforme, reglas } = res.datos;
  if (plan.rol !== "lider") return { success: false, error: "Solo el líder envía el informe general." };
  const general = informes.find((i) => i.periodo === periodo && i.egresadoId === null);
  if (general && general.estado !== "observado") return { success: false, error: "El informe general ya fue enviado." };
  // Con informe "unico" no hay informes individuales: el líder envía directamente el del trabajo.
  const faltan = modoInforme === "unico" ? [] : plan.equipo.filter((i) => {
    const suyo = armarInformePeriodo({ arbol: plan.plan.arbol, columnas: plan.columnas, periodo, registros, integrante: i.id, arrastre: reglas.avance });
    if (suyo.filas.length === 0) return false;
    const inf = informes.find((x) => x.periodo === periodo && x.egresadoId === i.id);
    return !inf || inf.estado === "observado";
  });
  if (faltan.length > 0) return { success: false, error: `Falta el informe individual de: ${faltan.map((i) => i.nombre).join(", ")}.` };

  await guardarInforme(propuestaId, periodo, null);
  const { propuestas } = await import("@/lib/schema");
  const [p] = await db.select({ asesorId: propuestas.asesorId, numero: propuestas.numero }).from(propuestas).where(eq(propuestas.id, propuestaId));
  if (p?.asesorId) await db.insert(notificaciones).values({ usuarioId: p.asesorId, tipo: "informe_plan_enviado", mensaje: `Propuesta #${p.numero}: el equipo envió el informe general del período ${periodo}.` });
  await notificarEquipo(propuestaId, "informe_plan_enviado", `Se envió al asesor el informe general del período ${periodo}.`);
  revalidatePath("/egresado/ejecucion");
  return { success: true };
}

/** El asesor aprueba u observa el informe general del período. */
export async function revisarInformeGeneral(propuestaId: number, periodo: number, decision: "aprobar" | "observar", comentario: string): Promise<Resultado> {
  const res = await getEjecucionProyecto(propuestaId);
  if (!res.success) return res;
  const { plan, informes } = res.datos;
  if (plan.rol !== "asesor") return { success: false, error: "Solo el asesor asignado revisa el informe." };
  const general = informes.find((i) => i.periodo === periodo && i.egresadoId === null);
  if (!general || general.estado !== "enviado") return { success: false, error: "El informe general no está pendiente de revisión." };
  const texto = comentario.trim();
  if (decision === "observar" && texto.length < 10) return { success: false, error: "Escribe la observación (al menos 10 caracteres)." };
  await db
    .update(informesPlan)
    .set({ estado: decision === "aprobar" ? "aprobado" : "observado", comentarioAsesor: texto || null, revisadoPor: plan.miId, revisadoEn: new Date() })
    .where(and(eq(informesPlan.propuestaId, propuestaId), eq(informesPlan.periodo, periodo), isNull(informesPlan.egresadoId)));
  if (decision === "aprobar") {
    // El general aprueba también los individuales con los que se armó.
    await db
      .update(informesPlan)
      .set({ estado: "aprobado", revisadoPor: plan.miId, revisadoEn: new Date() })
      .where(and(eq(informesPlan.propuestaId, propuestaId), eq(informesPlan.periodo, periodo), isNotNull(informesPlan.egresadoId)));
  }
  await notificarEquipo(
    propuestaId,
    decision === "aprobar" ? "informe_plan_aprobado" : "informe_plan_observado",
    decision === "aprobar" ? `El asesor aprobó el informe general del período ${periodo}.` : `El asesor hizo observaciones al informe general del período ${periodo}: ${texto}`
  );
  revalidatePath(`/asesor/ejecucion/${propuestaId}`);
  return { success: true };
}
