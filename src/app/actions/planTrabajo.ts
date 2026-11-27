"use server";

// Plan de trabajo del equipo (entrega P3, proyecto). Se elabora después de aprobada la propuesta, con las reglas
// de la etapa "Plan de trabajo" de su ficha. El líder estructura y asigna responsables; cada integrante completa
// lo que está a su cargo; el líder lo envía y el asesor lo aprueba u observa.
import { db } from "@/lib/db";
import { detallesProyecto, integrantesProyecto, notificaciones, planesTrabajo, propuestas, usuarios } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { fichaDePropuesta } from "@/lib/fichas/fichaDePropuesta";
import { esEtapaEjecucion, esEtapaInformeFinal, esEtapaPlan, esEtapaPropuesta, esEtapaProtocolo, type EtapaEjecucion, type EtapaPlan } from "@/lib/fichas/tipos";
import { fechaLimiteDictamen } from "@/lib/fichas/protocolo";
import { reglaObjetivosDe, reglaUniforme, rangoObjetivos, rangoPorPersona, type RangoObjetivos } from "@/lib/fichas/objetivos";

const fechaCorta = (d: Date) => d.toLocaleDateString("es-SV", { day: "numeric", month: "long", year: "numeric" });
import { cambioNoPermitido, normalizarArbol, numerar, validarPlanEquipo, type NodoPlan, type ProblemaPlan, objetivosCoinciden, sincronizarObjetivos, problemasPeriodos, type ObjetivoPropuesta } from "@/lib/fichas/planTrabajo";
import { COMPONENTES_CIERRE, COMPONENTES_INVESTIGACION, type Espacio } from "@/lib/fichas/tipos";
import { arbolConCitas, metodologiaValida, pideMetodologia } from "@/lib/fichas/metodologiaPlan";
import { leerApartado, parteVacia, textoParte, tipoApartado } from "@/lib/fichas/apartadosAcademicos";
import { respuestasEspacios } from "@/lib/schema";
import type { Fuente } from "@/lib/fichas/fuentes";

const CLAVES_COMPONENTE: unknown[] = [...COMPONENTES_INVESTIGACION, ...COMPONENTES_CIERRE].map((c) => c.clave);
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
  propuesta: { id: number; numero: number; titulo: string | null; estado: string; tipo: string };
  etapa: EtapaPlan;
  columnas: { periodo: number; sub: number | null; texto: string }[];
  equipo: IntegrantePlan[];
  rol: RolPlan;
  miId: number;
  plan: { arbol: NodoPlan; version: number; estado: string; comentarioAsesor: string | null; enviadoEn: string | null; revisadoEn: string | null };
  /** Investigación (I3): el plan es el cronograma del protocolo y se envía y dictamina junto con él. */
  protocolo: { nombre: string; diasRevision: number; diasHabiles: boolean; fechaLimite: string | null } | null;
  /** La ficha tiene informe final por capítulos (investigación, I5). */
  informeFinal: boolean;
  /**
   * Cronograma de investigación con metodología por objetivo (entrega E2): el registro de fuentes del trabajo, para citar,
   * y la metodología del protocolo por subapartados, para partir de ella. null si la ficha no la pide.
   */
  metodologia: { fuentes: Fuente[]; protocolo: string[] } | null;
  /** Objetivos específicos del trabajo en total (H19/H27): de 3 a 4 por integrante por la cantidad de integrantes. */
  rangoObjetivos: RangoObjetivos;
  /** P1: objetivos tal como se redactaron en la propuesta (el plan los muestra en solo lectura). */
  objetivosPropuesta: { general: string; especificos: ObjetivoPropuesta[] };
}

/** P1: objetivo general y específicos de la propuesta. */
async function objetivosDePropuesta(propuestaId: number): Promise<{ general: string; especificos: ObjetivoPropuesta[] }> {
  const [det] = await db.select({ general: detallesProyecto.objetivoGeneral, especificos: detallesProyecto.objetivosEspecificos }).from(detallesProyecto).where(eq(detallesProyecto.propuestaId, propuestaId));
  const lista = (Array.isArray(det?.especificos) ? det.especificos : []) as { titulo?: string; descripcion?: string }[];
  return {
    general: det?.general?.trim() ?? "",
    especificos: lista.map((o) => ({ titulo: String(o?.titulo ?? "").trim(), descripcion: String(o?.descripcion ?? "").trim() })),
  };
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

/**
 * Árbol inicial: el objetivo general y los objetivos específicos de la propuesta aprobada. En el cronograma de
 * investigación, cada objetivo con sus elementos del proceso y el bloque de preparación del informe al final.
 */
async function arbolInicial(propuestaId: number, etapa: EtapaPlan): Promise<NodoPlan> {
  const obj = await objetivosDePropuesta(propuestaId);
  const raiz: NodoPlan = { id: "og", codigo: "1", nivel: 1, titulo: obj.general || "Objetivo general", responsable: null, montos: [], hijos: [] };
  return normalizarArbol(sincronizarObjetivos(raiz, obj.general, obj.especificos), etapa);
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
      (o.componente === undefined || CLAVES_COMPONENTE.includes(o.componente)) &&
      (o.metodologia === undefined || (o.componente === "metodologia" && metodologiaValida(o.metodologia))) &&
      (o.cierre === undefined || typeof o.cierre === "boolean") &&
      (o.documento === undefined || (typeof o.documento === "string" && o.documento.length <= 300)) &&
      (o.productos === undefined || (Array.isArray(o.productos) && o.productos.length <= 15 && o.productos.every((p) => typeof p === "string" && p.length <= 200))) &&
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
  const etapaFicha = ficha?.definicion.etapas.find(esEtapaPlan);
  // R4: si la propuesta pide objetivos, el plan usa la misma regla (individual de 4 a 5, en grupo 4 por integrante).
  const objetivosProp = ficha?.definicion.etapas.find(esEtapaPropuesta)?.espacios.find((e) => e.elemento === "objetivos");
  const porPersona = objetivosProp ? rangoPorPersona(reglaObjetivosDe(ficha!.definicion), equipo.length) : null;
  const etapa: EtapaPlan | undefined = etapaFicha && porPersona
    ? { ...etapaFicha, minimos: { ...etapaFicha.minimos, objetivosPorIntegrante: porPersona.min, maxObjetivosPorIntegrante: porPersona.max } }
    : etapaFicha;
  const protocolo = ficha?.definicion.etapas.find(esEtapaProtocolo);
  const informeFinal = !!ficha?.definicion.etapas.some(esEtapaInformeFinal);
  const ejec = ficha?.definicion.etapas.find(esEtapaEjecucion);
  if (!ficha?.version || !etapa || !ejec) return { success: false, error: "La ficha de esta propuesta no tiene plan de trabajo." };
  if (!ESTADOS_CON_PLAN.includes(prop.estado)) return { success: false, error: "El plan de trabajo se elabora después de aprobada la propuesta." };

  const columnas = columnasDe(etapa, ejec);
  let [fila] = await db.select().from(planesTrabajo).where(eq(planesTrabajo.propuestaId, propuestaId));
  if (!fila) {
    if (rol !== "lider" && rol !== "integrante") return { success: false, error: "El equipo todavía no ha empezado su plan de trabajo." };
    [fila] = await db
      .insert(planesTrabajo)
      .values({ propuestaId, fichaVersionId: ficha.version.id, arbol: await arbolInicial(propuestaId, etapa), columnas: columnas.length, actualizadoPor: session.userId })
      .onConflictDoNothing()
      .returning();
    if (!fila) [fila] = await db.select().from(planesTrabajo).where(eq(planesTrabajo.propuestaId, propuestaId));
  }

  // P1: mientras el plan se puede editar, sus objetivos son los de la propuesta (si la propuesta cambió, se actualizan
  // conservando lo planificado de cada objetivo). Los planes enviados, aprobados o en ejecución no se tocan.
  const objetivosPropuesta = await objetivosDePropuesta(propuestaId);
  if (
    ["redactando", "observado"].includes(fila.estado) &&
    objetivosPropuesta.especificos.length > 0 &&
    !objetivosCoinciden(fila.arbol as NodoPlan, objetivosPropuesta.general, objetivosPropuesta.especificos)
  ) {
    const sincronizado = normalizarArbol(sincronizarObjetivos(fila.arbol as NodoPlan, objetivosPropuesta.general, objetivosPropuesta.especificos), etapa);
    const [act] = await db
      .update(planesTrabajo)
      .set({ arbol: sincronizado, version: fila.version + 1, actualizadoEn: new Date() })
      // El estado también va en la condición: una lectura vieja no debe sobrescribir un plan que ya se envió o aprobó
      .where(and(eq(planesTrabajo.propuestaId, propuestaId), eq(planesTrabajo.version, fila.version), inArray(planesTrabajo.estado, ["redactando", "observado"])))
      .returning();
    if (act) fila = act;
  }

  // Proyecto individual: no hay responsables que asignar; todo el plan es del único integrante (así lo lee la ejecución).
  const guardado = normalizarArbol(fila.arbol as NodoPlan, etapa);
  const arbol = equipo.length === 1 && guardado.responsable == null ? { ...guardado, responsable: equipo[0].id } : guardado;

  return {
    success: true,
    datos: {
      propuesta: { id: prop.id, numero: prop.numero, titulo: prop.titulo, estado: prop.estado, tipo: prop.tipo },
      etapa,
      columnas,
      equipo,
      rol,
      miId: session.userId,
      plan: {
        arbol,
        version: fila.version,
        estado: fila.estado,
        comentarioAsesor: fila.comentarioAsesor,
        enviadoEn: fila.enviadoEn?.toISOString() ?? null,
        revisadoEn: fila.revisadoEn?.toISOString() ?? null,
      },
      protocolo: protocolo
        ? {
            nombre: protocolo.nombre,
            diasRevision: protocolo.revision.diasRevision,
            diasHabiles: protocolo.revision.diasHabiles,
            fechaLimite: fila.enviadoEn && (fila.estado === "enviado" || fila.estado === "aprobado") ? fechaLimiteDictamen(fila.enviadoEn, protocolo).toISOString() : null,
          }
        : null,
      informeFinal,
      metodologia: pideMetodologia(etapa) ? { fuentes: await fuentesDe(propuestaId), protocolo: await metodologiaDelProtocolo(propuestaId, protocolo?.espacios ?? []) } : null,
      objetivosPropuesta,
      rangoObjetivos: rangoObjetivos(reglaUniforme({ min: etapa.minimos.objetivosPorIntegrante, max: etapa.minimos.maxObjetivosPorIntegrante ?? Math.max(etapa.minimos.objetivosPorIntegrante, 4) }), equipo.length),
    },
  };
}

async function fuentesDe(propuestaId: number): Promise<Fuente[]> {
  const { fuentesDePropuesta } = await import("./fuentesTrabajo");
  return fuentesDePropuesta(propuestaId);
}

/** Metodología del protocolo, un párrafo por subapartado escrito ("Población y muestra: …"), para partir de ella. */
async function metodologiaDelProtocolo(propuestaId: number, espacios: Espacio[]): Promise<string[]> {
  const e = espacios.find((x) => x.elemento === "apartado" && tipoApartado(x)?.clave === "metodologia");
  const tipo = e ? tipoApartado(e) : null;
  if (!e || !tipo) return [];
  const [fila] = await db.select({ contenido: respuestasEspacios.contenido }).from(respuestasEspacios)
    .where(and(eq(respuestasEspacios.propuestaId, propuestaId), eq(respuestasEspacios.espacioId, e.id)));
  if (!fila?.contenido) return [];
  const c = leerApartado(tipo, fila.contenido);
  return tipo.partes.filter((p) => !parteVacia(p, c.partes[p.id])).map((p) => `${p.titulo}: ${textoParte(tipo, c, p.id).trim()}`);
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

    // P1: los objetivos vienen de la propuesta; no se agregan, quitan ni renombran
    if (datos.objetivosPropuesta.especificos.length > 0 && !objetivosCoinciden(arbol, datos.objetivosPropuesta.general, datos.objetivosPropuesta.especificos)) {
      return { success: false, error: "Los objetivos vienen de la propuesta y no se pueden agregar, quitar ni cambiar en el plan. Recarga la página." };
    }
    let nuevo = numerar(normalizarArbol(arbol, datos.etapa));
    // Metodología por objetivo (E2): las citas las arma el servidor con el registro de fuentes.
    if (datos.metodologia) nuevo = arbolConCitas(nuevo, new Map(datos.metodologia.fuentes.map((f) => [f.id, f.datos])));
    if (datos.rol === "integrante") {
      const motivo = cambioNoPermitido(datos.plan.arbol, nuevo, datos.miId);
      if (motivo) return { success: false, error: motivo };
    }
    const [act] = await db
      .update(planesTrabajo)
      .set({ arbol: nuevo, version: version + 1, actualizadoPor: datos.miId, actualizadoEn: new Date() })
      .where(and(eq(planesTrabajo.propuestaId, propuestaId), eq(planesTrabajo.version, version), inArray(planesTrabajo.estado, ["redactando", "observado"])))
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
  const problemas = [
    ...validarPlanEquipo(datos.plan.arbol, datos.etapa, datos.equipo.map((i) => i.id), datos.columnas.length),
    // P2: cada período con al menos una actividad
    ...problemasPeriodos(datos.plan.arbol, datos.columnas),
  ];
  if (problemas.length > 0) return { success: false, error: "El plan todavía no cumple las reglas de la ficha.", problemas };
  if (datos.protocolo) {
    // Investigación: el protocolo completo y, en equipo, ratificado por todos (actions/protocolo.ts).
    const { motivoProtocoloNoEnviable } = await import("./protocolo");
    const motivo = await motivoProtocoloNoEnviable(propuestaId);
    if (motivo) return { success: false, error: motivo };
  }

  const enviadoEn = new Date();
  await db.update(planesTrabajo).set({ estado: "enviado", enviadoEn }).where(eq(planesTrabajo.propuestaId, propuestaId));
  const [prop] = await db.select({ asesorId: propuestas.asesorId, numero: propuestas.numero }).from(propuestas).where(eq(propuestas.id, propuestaId));
  const que = datos.protocolo ? "el protocolo y el plan de trabajo" : "el plan de trabajo";
  const plazo = datos.protocolo
    ? ` Dictamen a más tardar el ${fechaCorta(fechaLimiteDictamen(enviadoEn, { revision: { diasRevision: datos.protocolo.diasRevision, diasHabiles: datos.protocolo.diasHabiles } }))}.`
    : "";
  if (prop?.asesorId) {
    await db.insert(notificaciones).values({ usuarioId: prop.asesorId, tipo: "plan_trabajo_enviado", mensaje: `El equipo de la propuesta #${prop.numero} envió ${que} para revisión.${plazo}` });
  }
  await notificarEquipo(propuestaId, "plan_trabajo_enviado", `Se envió al asesor ${que} de la propuesta #${prop?.numero ?? ""}.${plazo}`);
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
  // Investigación: el asesor emite su dictamen del protocolo por escrito, también al aprobar.
  if (datos.protocolo && decision === "aprobar" && texto.length < 20) return { success: false, error: "Escribe el dictamen del protocolo y el plan (al menos 20 caracteres)." };

  await db
    .update(planesTrabajo)
    .set({ estado: decision === "aprobar" ? "aprobado" : "observado", comentarioAsesor: texto || null, revisadoPor: datos.miId, revisadoEn: new Date() })
    .where(eq(planesTrabajo.propuestaId, propuestaId));
  await notificarEquipo(
    propuestaId,
    decision === "aprobar" ? "plan_trabajo_aprobado" : "plan_trabajo_observado",
    decision === "aprobar"
      ? `El asesor aprobó ${datos.protocolo ? "el protocolo y el plan de trabajo" : "el plan de trabajo"} de la propuesta #${datos.propuesta.numero}.`
      : `El asesor hizo observaciones ${datos.protocolo ? "al protocolo y el plan de trabajo" : "al plan de trabajo"} de la propuesta #${datos.propuesta.numero}: ${texto}`
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
