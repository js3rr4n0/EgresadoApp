"use server";

// Informe final por capítulos (entrega I5, investigación; respuesta Q8). Es la tesis, así que la regla es no perder nada:
//   - cada guardado de un capítulo es una fila nueva en versiones_capitulo (nunca se actualiza ni se borra una versión);
//   - el guardado lleva la versión sobre la que se escribió: si otro integrante guardó antes, se rechaza y se devuelve
//     la versión más reciente para que nadie pise el trabajo de otro (la unicidad de la base cubre los guardados simultáneos);
//   - lo enviado, aprobado o entregado no se modifica; la versión entregada queda con su huella.
// Participa todo el equipo (respuesta del 12-nov-2026): cualquier integrante redacta y envía capítulos; el líder entrega
// la versión final después de que todos la ratifican. El asesor revisa por capítulo y aprueba el documento completo.
import crypto from "crypto";
import { db } from "@/lib/db";
import {
  carreras, detallesProyecto, entregasObjetivo, evidenciasPlan, productosObjetivo as productosTabla, facultades, informesFinalesFicha, notificaciones, propuestas, ratificacionesInformeFinal, registrosPlan, respuestasEspacios,
  usuarios, versionesCapitulo,
} from "@/lib/schema";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { fichaDePropuesta, espaciosPropuesta } from "@/lib/fichas/fichaDePropuesta";
import { esCronogramaInvestigacion, esEtapaInformeFinal, esEtapaProtocolo, productosObjetivo, type Espacio, type EtapaInformeFinal } from "@/lib/fichas/tipos";
import { hojasElemento, procesoPorObjetivo } from "@/lib/fichas/elementosEjecucion";
import { aplanar, type NodoPlan } from "@/lib/fichas/planTrabajo";
import { columnasTabla, enlaceValido, limitesRecurso, TIPOS_ARCHIVO, type ArchivoEspacio } from "@/lib/fichas/elementosRecurso";
import { fechaLimiteDictamen } from "@/lib/fichas/protocolo";
import { guardarComoTexto, leerApartado, leerTabla, parteVacia, tipoApartado } from "@/lib/fichas/apartadosAcademicos";
import {
  CAPITULO_NUEVO, capituloEditable, capituloGenerado, capitulosPendientes, editandoOtro, leerCapitulos, precargaCapitulo, problemasInformeFinal,
  textoConclusionesObjetivos, textoMarcoRegistros, type EstadoDeCapitulo, type EstadoInformeFinal,
} from "@/lib/fichas/informeFinalFicha";
import { getPlanTrabajo, type DatosPlan } from "./planTrabajo";
import { notificarEquipo } from "@/lib/notificarEquipo";
import { AUTORIDADES_ACADEMICAS } from "@/lib/informeFinal";
import { resultadosPorObjetivo } from "@/lib/fichas/resultadosObjetivos";
import { bloquesBitacora, entradasBitacora } from "@/lib/fichas/bitacora";
import { referenciasOrdenadas } from "@/lib/fichas/fuentes";
import { fuentesDePropuesta } from "./fuentesTrabajo";
import { notaImagen } from "@/lib/fuenteImagen";
import { limpiarRespuesta } from "@/lib/fichas/respuestasPropias";
import { apartadosInformeFinal, portadaInformeFinal, type AnexoDocumento, type BloqueDocumento, type DocumentoInformeFinal } from "@/lib/fichas/documentoInformeFinal";

const MAX_TEXTO = 200_000;
const ESTADOS_PROPUESTA = ["en_ejecucion", "finalizada"];

export interface VersionResumen {
  numero: number;
  autor: string;
  creadoEn: string;
  automatica: boolean;
}

export interface CapituloDatos {
  espacio: Espacio;
  estado: EstadoDeCapitulo;
  ultima: (VersionResumen & { contenido: string }) | null;
  /** Contenido inicial si todavía no hay versiones y el capítulo se precarga. */
  precarga: string | null;
  /** Otro integrante que lo está editando ahora (aviso). */
  editando: { nombre: string; desde: string } | null;
  editable: boolean;
}

export interface DatosInformeFinal {
  etapa: EtapaInformeFinal;
  plan: DatosPlan;
  estado: EstadoInformeFinal;
  capitulos: CapituloDatos[];
  problemas: { espacioId: string; mensaje: string }[];
  pendientesAprobacion: string[];
  ratificacion: { requerida: boolean; firmas: { usuarioId: number; nombre: string; vigente: boolean }[]; completa: boolean };
  huellaActual: string;
  huellaFinal: string | null;
  comentarioFinal: string | null;
  entregadoEn: string | null;
  /** Fecha límite de revisión del asesor para la entrega final (ISO), si se entregó. */
  fechaLimite: string | null;
  /** Vista previa de los capítulos que genera el sistema (resultados por objetivo, reporte de modificaciones), por espacio. */
  generados: Record<string, BloqueDocumento[]>;
  /** Cronograma de investigación (E4): conclusiones preliminares de consulta, por espacio de conclusiones finales. */
  consulta: Record<string, { titulo: string; texto: string }[]>;
}

type Resultado<T = object> = ({ success: true } & T) | { success: false; error: string };
type ResultadoGuardado =
  | { success: true; numero: number }
  | { success: false; error: string; conflicto?: VersionResumen & { contenido: string } };

const huella = (contenidos: [string, number | null, string][]) =>
  crypto.createHash("sha256").update(JSON.stringify(contenidos)).digest("hex");

async function ultimasVersiones(propuestaId: number) {
  const filas = await db.execute(sql`
    SELECT DISTINCT ON (v.espacio_id) v.espacio_id, v.numero, v.contenido, v.automatica, v.creado_en, u.nombre_completo AS autor
    FROM versiones_capitulo v LEFT JOIN usuarios u ON u.id = v.autor_id
    WHERE v.propuesta_id = ${propuestaId}
    ORDER BY v.espacio_id, v.numero DESC`);
  const r = new Map<string, VersionResumen & { contenido: string }>();
  for (const f of filas.rows as { espacio_id: string; numero: number; contenido: string; automatica: boolean; creado_en: string | Date; autor: string | null }[]) {
    r.set(f.espacio_id, { numero: f.numero, contenido: f.contenido, automatica: f.automatica, creadoEn: new Date(f.creado_en).toISOString(), autor: f.autor ?? "" });
  }
  return r;
}

interface Contexto {
  plan: DatosPlan;
  etapa: EtapaInformeFinal;
  fila: typeof informesFinalesFicha.$inferSelect;
  estados: Record<string, EstadoDeCapitulo>;
  ultimas: Map<string, VersionResumen & { contenido: string }>;
}

async function contexto(propuestaId: number): Promise<Resultado<{ ctx: Contexto }>> {
  const res = await getPlanTrabajo(propuestaId);
  if (!res.success) return { success: false, error: res.error };
  const plan = res.datos;
  const ficha = await fichaDePropuesta(propuestaId);
  const etapa = ficha?.definicion.etapas.find(esEtapaInformeFinal);
  if (!etapa) return { success: false, error: "La ficha de esta propuesta no tiene informe final por capítulos." };
  if (!ESTADOS_PROPUESTA.includes(plan.propuesta.estado)) return { success: false, error: "El informe final se redacta durante la ejecución." };
  let [fila] = await db.select().from(informesFinalesFicha).where(eq(informesFinalesFicha.propuestaId, propuestaId));
  if (!fila) {
    [fila] = await db.insert(informesFinalesFicha).values({ propuestaId }).onConflictDoNothing().returning();
    if (!fila) [fila] = await db.select().from(informesFinalesFicha).where(eq(informesFinalesFicha.propuestaId, propuestaId));
  }
  return { success: true, ctx: { plan, etapa, fila, estados: leerCapitulos(fila.capitulos), ultimas: await ultimasVersiones(propuestaId) } };
}

const enEquipo = (ctx: Contexto) => ctx.plan.rol === "lider" || ctx.plan.rol === "integrante";
const estadoDe = (ctx: Contexto, id: string) => ctx.estados[id] ?? CAPITULO_NUEVO;

async function guardarEstados(propuestaId: number, estados: Record<string, EstadoDeCapitulo>, extra: Partial<typeof informesFinalesFicha.$inferInsert> = {}) {
  await db.update(informesFinalesFicha).set({ capitulos: estados, actualizadoEn: new Date(), ...extra }).where(eq(informesFinalesFicha.propuestaId, propuestaId));
}

function refrescar(propuestaId: number) {
  revalidatePath("/egresado/informe-final");
  revalidatePath(`/asesor/informe-final/${propuestaId}`);
}

/** Contenidos vigentes (última versión) y su huella, en el orden de la ficha. */
function vigentes(ctx: Contexto) {
  const contenidos: Record<string, string> = {};
  const partes: [string, number | null, string][] = [];
  for (const e of ctx.etapa.espacios) {
    const u = ctx.ultimas.get(e.id);
    contenidos[e.id] = u?.contenido ?? "";
    partes.push([e.id, u?.numero ?? null, u?.contenido ?? ""]);
  }
  return { contenidos, huella: huella(partes) };
}

async function precargas(propuestaId: number, ctx: Contexto): Promise<Record<string, string>> {
  const sin = ctx.etapa.espacios.filter((e) => e.precargarDe && !ctx.ultimas.has(e.id));
  if (sin.length === 0) return {};
  const ficha = await fichaDePropuesta(propuestaId);
  const fuentes = [...espaciosPropuesta(ficha!.definicion), ...(ficha!.definicion.etapas.find(esEtapaProtocolo)?.espacios ?? [])];
  const [det] = await db.select().from(detallesProyecto).where(eq(detallesProyecto.propuestaId, propuestaId));
  const resp = await db.select({ id: respuestasEspacios.espacioId, c: respuestasEspacios.contenido }).from(respuestasEspacios).where(eq(respuestasEspacios.propuestaId, propuestaId));
  // Marco teórico de las actividades, en el orden del plan (el último registro con marco de cada actividad).
  const regs = await db.select({ nodo: registrosPlan.nodoId, marco: registrosPlan.marcoTeorico, periodo: registrosPlan.periodo })
    .from(registrosPlan).where(eq(registrosPlan.propuestaId, propuestaId)).orderBy(desc(registrosPlan.periodo));
  const marcoPorNodo = new Map<string, string>();
  for (const r of regs) if (r.marco?.trim() && !marcoPorNodo.has(r.nodo)) marcoPorNodo.set(r.nodo, r.marco);
  const marco = textoMarcoRegistros(
    aplanar(ctx.plan.plan.arbol as NodoPlan).filter((n) => marcoPorNodo.has(n.id)).map((n) => ({ codigo: n.codigo, titulo: n.titulo, marco: marcoPorNodo.get(n.id)! }))
  );
  const datos = { ...det, respuestas: Object.fromEntries(resp.map((r) => [r.id, r.c ?? ""])) };
  const entregas = await db.select({ nodoId: entregasObjetivo.nodoId, estado: entregasObjetivo.estado, conclusion: entregasObjetivo.conclusion })
    .from(entregasObjetivo).where(eq(entregasObjetivo.propuestaId, propuestaId));
  const conclusiones = textoConclusionesObjetivos((ctx.plan.plan.arbol as NodoPlan).hijos, entregas);
  return Object.fromEntries(sin.map((e) => [e.id, precargaCapitulo(e, fuentes, datos, marco, conclusiones)]).filter(([, t]) => t));
}

/**
 * Productos por objetivo (notas del 13-nov-2026): objetivos específicos cuyos productos todavía no aprobó el asesor.
 * Mientras haya alguno no se ratifica ni se entrega el informe final. Vacío si la ficha no pide productos.
 */
/**
 * Cronograma de investigación (E4): antes de entregar el informe final, cada objetivo (y el bloque de preparación del
 * informe) tiene validados por el asesor todos sus elementos que cuentan.
 */
async function objetivosSinValidar(propuestaId: number, ctx: Contexto): Promise<string[]> {
  if (!esCronogramaInvestigacion(ctx.plan.etapa)) return [];
  const regs = await db.select({ nodoId: registrosPlan.nodoId, periodo: registrosPlan.periodo, avance: registrosPlan.avance, estado: registrosPlan.estado })
    .from(registrosPlan).where(eq(registrosPlan.propuestaId, propuestaId));
  return procesoPorObjetivo(ctx.plan.plan.arbol as NodoPlan, regs).filter((p) => !p.cerrado)
    .map((p) => (p.nodo.cierre ? `Validación de «${p.nodo.titulo}»` : `Validación de los elementos del objetivo ${p.nodo.codigo}`));
}

/**
 * Conclusiones preliminares de cada objetivo y el registro de conclusiones finales del bloque de cierre, para consultarlas
 * al redactar el capítulo de conclusiones finales (no se precargan: son distintas). Por espacio de tipo "conclusiones".
 */
async function consultaConclusiones(propuestaId: number, ctx: Contexto): Promise<Record<string, { titulo: string; texto: string }[]>> {
  if (!esCronogramaInvestigacion(ctx.plan.etapa)) return {};
  const espacios = ctx.etapa.espacios.filter((e) => e.elemento === "apartado" && tipoApartado(e)?.clave === "conclusiones");
  if (espacios.length === 0) return {};
  const regs = (await db.select({ nodoId: registrosPlan.nodoId, periodo: registrosPlan.periodo, estado: registrosPlan.estado, resultado: registrosPlan.resultado })
    .from(registrosPlan).where(eq(registrosPlan.propuestaId, propuestaId))).filter((r) => r.estado === "enviado" || r.estado === "aprobado");
  const texto = (n: NodoPlan) => hojasElemento(n).map((h) => regs.filter((r) => r.nodoId === h.id).sort((a, b) => b.periodo - a.periodo)[0]?.resultado?.trim() ?? "").filter(Boolean).join("\n\n");
  const items: { titulo: string; texto: string }[] = [];
  for (const o of (ctx.plan.plan.arbol as NodoPlan).hijos) {
    const e = o.hijos.find((x) => x.componente === (o.cierre ? "conclusiones_finales" : "conclusiones"));
    if (!e) continue;
    items.push({ titulo: o.cierre ? `${e.titulo} (registro del bloque «${o.titulo}»)` : `Objetivo ${o.codigo}: ${o.titulo}`, texto: texto(e) });
  }
  return Object.fromEntries(espacios.map((e) => [e.id, items]));
}

async function objetivosSinProductos(propuestaId: number, ctx: Contexto): Promise<string[]> {
  if (productosObjetivo(ctx.plan.etapa) === "no") return [];
  const aprobadas = await db.select({ nodoId: entregasObjetivo.nodoId }).from(entregasObjetivo)
    .where(and(eq(entregasObjetivo.propuestaId, propuestaId), eq(entregasObjetivo.estado, "aprobado")));
  return (ctx.plan.plan.arbol as NodoPlan).hijos.filter((o) => !aprobadas.some((a) => a.nodoId === o.id)).map((o) => `Productos del objetivo ${o.codigo}`);
}

export async function getInformeFinal(propuestaId: number): Promise<Resultado<{ datos: DatosInformeFinal }>> {
  const r = await contexto(propuestaId);
  if (!r.success) return r;
  const { ctx } = r;
  const pre = await precargas(propuestaId, ctx);
  const { contenidos, huella: h } = vigentes(ctx);
  const firmadas = await db.select().from(ratificacionesInformeFinal).where(eq(ratificacionesInformeFinal.propuestaId, propuestaId));
  const requerida = ctx.etapa.revision.ratificacion && ctx.plan.equipo.length > 1;
  const firmas = ctx.plan.equipo.map((i) => ({ usuarioId: i.id, nombre: i.nombre, vigente: firmadas.some((f) => f.usuarioId === i.id && f.huellaFirmada === h) }));
  const estado = ctx.fila.estado as EstadoInformeFinal;
  return {
    success: true,
    datos: {
      etapa: ctx.etapa,
      plan: ctx.plan,
      estado,
      capitulos: ctx.etapa.espacios.map((e) => {
        const est = estadoDe(ctx, e.id);
        const otro = editandoOtro(est, ctx.plan.miId);
        return {
          espacio: e,
          estado: est,
          ultima: ctx.ultimas.get(e.id) ?? null,
          precarga: pre[e.id] ?? null,
          editando: otro ? { nombre: otro.nombre, desde: otro.desde } : null,
          editable: enEquipo(ctx) && capituloEditable(estado, est),
        };
      }),
      problemas: problemasInformeFinal(ctx.etapa, contenidos, integrantesDe(ctx)),
      pendientesAprobacion: [...capitulosPendientes(ctx.etapa, ctx.estados, contenidos).map((e) => e.titulo), ...(await objetivosSinProductos(propuestaId, ctx)), ...(await objetivosSinValidar(propuestaId, ctx))],
      ratificacion: { requerida, firmas, completa: !requerida || firmas.every((f) => f.vigente) },
      huellaActual: h,
      huellaFinal: ctx.fila.huellaFinal,
      comentarioFinal: ctx.fila.comentarioFinal,
      entregadoEn: ctx.fila.entregadoEn?.toISOString() ?? null,
      fechaLimite: estado === "entregado" && ctx.fila.entregadoEn ? fechaLimiteDictamen(ctx.fila.entregadoEn, ctx.etapa).toISOString() : null,
      generados: await capitulosGenerados(propuestaId, ctx),
      consulta: await consultaConclusiones(propuestaId, ctx),
    },
  };
}

/** Limpia el contenido según el elemento del capítulo (texto o JSON). */
/** Integrantes del trabajo, para los elementos propios que piden una respuesta por integrante (C3). */
const integrantesDe = (ctx: { plan: DatosPlan }) => ctx.plan.equipo.map((i) => ({ id: i.id, nombre: i.nombre }));

function limpiar(e: Espacio, contenido: string): { ok: true; valor: string } | { ok: false; error: string } {
  if (capituloGenerado(e)) return { ok: false, error: "Este capítulo lo genera el sistema con los registros y los productos de la ejecución." };
  if (e.elemento === "apartado") {
    // Apartado académico: solo los subapartados del tipo, con su formato; la autoevaluación por índice.
    const tipo = tipoApartado(e);
    if (!tipo) return { ok: false, error: "El tipo de este apartado no existe." };
    if (contenido.length > MAX_TEXTO * 2) return { ok: false, error: "El capítulo es demasiado extenso." };
    const c = leerApartado(tipo, contenido);
    const partes: Record<string, string> = {};
    for (const p of tipo.partes) {
      const v = c.partes[p.id];
      if (typeof v !== "string" || parteVacia(p, v)) continue;
      if (p.formato === "tabla") partes[p.id] = JSON.stringify(leerTabla(v, p.columnas?.length ?? 1).map((f) => f.map((x) => x.trim().slice(0, 2000))).filter((f) => f.some(Boolean)).slice(0, 50));
      else if (p.formato === "seleccion") { if (p.opciones?.some((o) => o.valor === v)) partes[p.id] = v; }
      else partes[p.id] = v.replace(/\r\n/g, "\n").slice(0, MAX_TEXTO);
    }
    const autoevaluacion = [...new Set(c.autoevaluacion.filter((n) => n >= 0 && n < tipo.autoevaluacion.length))];
    return { ok: true, valor: guardarComoTexto({ partes, autoevaluacion }) };
  }
  // Elemento propio (C3): solo sus campos, con su tipo; archivos con formato y tamaño permitidos.
  if (e.elemento === "propio") return e.propio ? limpiarRespuesta(e.propio.definicion, contenido) : { ok: false, error: "Falta la copia del elemento en la ficha." };
  if (e.elemento === "texto") {
    if (contenido.length > MAX_TEXTO) return { ok: false, error: `El capítulo admite hasta ${MAX_TEXTO.toLocaleString("es-SV")} caracteres.` };
    return { ok: true, valor: contenido.replace(/\r\n/g, "\n") };
  }
  let items: unknown[];
  try {
    const v = JSON.parse(contenido || "[]");
    items = Array.isArray(v) ? v : [];
  } catch {
    return { ok: false, error: "El contenido no tiene una forma válida." };
  }
  const { max } = limitesRecurso(e);
  if (e.elemento === "lista") items = items.map((x) => String(x ?? "").trim().slice(0, 2000)).filter(Boolean);
  else if (e.elemento === "tabla") {
    const n = columnasTabla(e).length;
    items = items.map((f) => Array.from({ length: n }, (_, i) => String((Array.isArray(f) ? f[i] : "") ?? "").trim().slice(0, 2000))).filter((f) => f.some(Boolean));
  } else if (e.elemento === "enlace") {
    items = items
      .map((x) => ({ url: String((x as { url?: string })?.url ?? "").trim().slice(0, 2000), descripcion: String((x as { descripcion?: string })?.descripcion ?? "").trim().slice(0, 255) }))
      .filter((x) => x.url || x.descripcion);
    if (items.some((x) => !enlaceValido((x as { url: string }).url))) return { ok: false, error: "Hay un enlace que no es una dirección válida." };
  } else return { ok: false, error: "Los archivos se adjuntan con su botón." };
  if (max > 0 && items.length > max) return { ok: false, error: `"${e.titulo}" admite como máximo ${max}.` };
  return { ok: true, valor: JSON.stringify(items) };
}

async function insertarVersion(propuestaId: number, espacioId: string, contenido: string, autorId: number, automatica: boolean, base: number | null, ctx: Contexto): Promise<ResultadoGuardado> {
  const actual = ctx.ultimas.get(espacioId);
  // Otro integrante guardó después de la versión sobre la que se escribió: no se pisa su trabajo.
  if ((actual?.numero ?? null) !== base) {
    return { success: false, error: `${actual?.autor || "Otro integrante"} guardó una versión más reciente de este capítulo mientras escribías. Tu texto sigue en pantalla: compáralo con la versión nueva antes de guardar.`, conflicto: actual };
  }
  if (actual && actual.contenido === contenido) return { success: true, numero: actual.numero };
  const numero = (actual?.numero ?? 0) + 1;
  try {
    await db.insert(versionesCapitulo).values({ propuestaId, espacioId, numero, contenido, autorId, automatica });
  } catch {
    const ultimas = await ultimasVersiones(propuestaId);
    return { success: false, error: "Otro integrante guardó este capítulo al mismo tiempo. Tu texto sigue en pantalla: revisa la versión nueva antes de guardar.", conflicto: ultimas.get(espacioId) };
  }
  return { success: true, numero };
}

/** Guarda una versión nueva del capítulo (a mano o automática). `base`: número de la versión sobre la que se escribió. */
export async function guardarCapitulo(propuestaId: number, espacioId: string, contenido: string, base: number | null, automatica = false): Promise<ResultadoGuardado> {
  try {
    const r = await contexto(propuestaId);
    if (!r.success) return r;
    const { ctx } = r;
    const e = ctx.etapa.espacios.find((x) => x.id === espacioId);
    if (!e) return { success: false, error: "El capítulo no existe en la ficha." };
    if (!enEquipo(ctx)) return { success: false, error: "Solo el equipo redacta el informe final." };
    if (!capituloEditable(ctx.fila.estado, estadoDe(ctx, espacioId))) return { success: false, error: "Este capítulo no se puede modificar ahora (está en revisión, aprobado o el informe ya se entregó)." };
    const limpio = limpiar(e, contenido);
    if (!limpio.ok) return { success: false, error: limpio.error };
    const res = await insertarVersion(propuestaId, espacioId, limpio.valor, ctx.plan.miId, automatica, base, ctx);
    if (res.success) {
      const yo = ctx.plan.equipo.find((i) => i.id === ctx.plan.miId);
      ctx.estados[espacioId] = { ...estadoDe(ctx, espacioId), editando: { usuarioId: ctx.plan.miId, nombre: yo?.nombre ?? "", desde: new Date().toISOString() } };
      await guardarEstados(propuestaId, ctx.estados);
      if (!automatica) refrescar(propuestaId);
    }
    return res;
  } catch (error) {
    console.error("Error guardarCapitulo:", error);
    return { success: false, error: "No se pudo guardar el capítulo. Tu texto sigue en pantalla; intenta de nuevo." };
  }
}

/** Avisa al resto del equipo que este integrante está editando el capítulo (se llama al abrirlo y al escribir). */
export async function marcarEditando(propuestaId: number, espacioId: string): Promise<Resultado> {
  const r = await contexto(propuestaId);
  if (!r.success) return r;
  const { ctx } = r;
  if (!enEquipo(ctx) || !ctx.etapa.espacios.some((e) => e.id === espacioId)) return { success: false, error: "No autorizado" };
  const yo = ctx.plan.equipo.find((i) => i.id === ctx.plan.miId);
  ctx.estados[espacioId] = { ...estadoDe(ctx, espacioId), editando: { usuarioId: ctx.plan.miId, nombre: yo?.nombre ?? "", desde: new Date().toISOString() } };
  await guardarEstados(propuestaId, ctx.estados);
  return { success: true };
}

export async function getVersionesCapitulo(propuestaId: number, espacioId: string): Promise<Resultado<{ versiones: (VersionResumen & { contenido: string })[] }>> {
  const r = await contexto(propuestaId);
  if (!r.success) return r;
  const filas = await db
    .select({ numero: versionesCapitulo.numero, contenido: versionesCapitulo.contenido, automatica: versionesCapitulo.automatica, creadoEn: versionesCapitulo.creadoEn, autor: usuarios.nombreCompleto })
    .from(versionesCapitulo).leftJoin(usuarios, eq(versionesCapitulo.autorId, usuarios.id))
    .where(and(eq(versionesCapitulo.propuestaId, propuestaId), eq(versionesCapitulo.espacioId, espacioId)))
    .orderBy(desc(versionesCapitulo.numero)).limit(200);
  return { success: true, versiones: filas.map((f) => ({ ...f, autor: f.autor ?? "", creadoEn: f.creadoEn.toISOString() })) };
}

/** Vuelve a una versión anterior creando una versión nueva con su contenido (el historial no se pierde). */
export async function restaurarVersion(propuestaId: number, espacioId: string, numero: number, base: number | null): Promise<ResultadoGuardado> {
  const r = await contexto(propuestaId);
  if (!r.success) return r;
  const { ctx } = r;
  if (!enEquipo(ctx) || !capituloEditable(ctx.fila.estado, estadoDe(ctx, espacioId))) return { success: false, error: "Este capítulo no se puede modificar ahora." };
  const [v] = await db.select().from(versionesCapitulo).where(and(eq(versionesCapitulo.propuestaId, propuestaId), eq(versionesCapitulo.espacioId, espacioId), eq(versionesCapitulo.numero, numero)));
  if (!v) return { success: false, error: "La versión no existe." };
  const res = await insertarVersion(propuestaId, espacioId, v.contenido, ctx.plan.miId, false, base, ctx);
  if (res.success) refrescar(propuestaId);
  return res;
}

/** Adjunta un archivo a un capítulo de anexos (crea una versión nueva con la lista completa). */
export async function agregarArchivoCapitulo(propuestaId: number, espacioId: string, base: number | null, formData: FormData): Promise<ResultadoGuardado> {
  try {
    const r = await contexto(propuestaId);
    if (!r.success) return r;
    const { ctx } = r;
    const e = ctx.etapa.espacios.find((x) => x.id === espacioId);
    if (!e || e.elemento !== "archivo") return { success: false, error: "Este capítulo no admite archivos." };
    if (!enEquipo(ctx) || !capituloEditable(ctx.fila.estado, estadoDe(ctx, espacioId))) return { success: false, error: "Este capítulo no se puede modificar ahora." };
    const actuales = (JSON.parse(ctx.ultimas.get(espacioId)?.contenido || "[]") as ArchivoEspacio[]) ?? [];
    const { max } = limitesRecurso(e);
    if (actuales.length >= max) return { success: false, error: `"${e.titulo}" admite como máximo ${max} archivos.` };
    const archivo = formData.get("archivo");
    if (!archivo || typeof archivo === "string") return { success: false, error: "Selecciona un archivo." };
    const permitidos = (Array.isArray(e.parametros.tipos) ? e.parametros.tipos : ["pdf"]) as string[];
    const tipo = TIPOS_ARCHIVO.find((t) => permitidos.includes(t.valor) && t.mime.includes(archivo.type));
    if (!tipo) return { success: false, error: `Formato no permitido. Se aceptan: ${TIPOS_ARCHIVO.filter((t) => permitidos.includes(t.valor)).map((t) => t.etiqueta).join(", ")}.` };
    const maxMB = Number(e.parametros.maxMB) || 5;
    if (archivo.size > maxMB * 1024 * 1024) return { success: false, error: `El archivo excede el tamaño máximo de ${maxMB} MB.` };
    const nuevo: ArchivoEspacio = { url: `data:${archivo.type};base64,${Buffer.from(await archivo.arrayBuffer()).toString("base64")}`, nombre: archivo.name.slice(0, 255), tipo: tipo.valor };
    const res = await insertarVersion(propuestaId, espacioId, JSON.stringify([...actuales, nuevo]), ctx.plan.miId, false, base, ctx);
    if (res.success) refrescar(propuestaId);
    return res;
  } catch (error) {
    console.error("Error agregarArchivoCapitulo:", error);
    return { success: false, error: "No se pudo adjuntar el archivo." };
  }
}

export async function quitarArchivoCapitulo(propuestaId: number, espacioId: string, indice: number, base: number | null): Promise<ResultadoGuardado> {
  const r = await contexto(propuestaId);
  if (!r.success) return r;
  const { ctx } = r;
  if (!enEquipo(ctx) || !capituloEditable(ctx.fila.estado, estadoDe(ctx, espacioId))) return { success: false, error: "Este capítulo no se puede modificar ahora." };
  const actuales = JSON.parse(ctx.ultimas.get(espacioId)?.contenido || "[]") as ArchivoEspacio[];
  if (!Number.isInteger(indice) || indice < 0 || indice >= actuales.length) return { success: false, error: "El archivo no existe." };
  const res = await insertarVersion(propuestaId, espacioId, JSON.stringify(actuales.filter((_, i) => i !== indice)), ctx.plan.miId, false, base, ctx);
  if (res.success) refrescar(propuestaId);
  return res;
}

async function avisarAsesor(propuestaId: number, mensaje: string) {
  const [p] = await db.select({ asesorId: propuestas.asesorId }).from(propuestas).where(eq(propuestas.id, propuestaId));
  if (p?.asesorId) await db.insert(notificaciones).values({ usuarioId: p.asesorId, tipo: "informe_final", mensaje });
}

/** Cualquier integrante envía un capítulo completo a revisión (revisión por capítulo). */
export async function enviarCapitulo(propuestaId: number, espacioId: string): Promise<Resultado> {
  const r = await contexto(propuestaId);
  if (!r.success) return r;
  const { ctx } = r;
  const e = ctx.etapa.espacios.find((x) => x.id === espacioId);
  if (!e || !enEquipo(ctx)) return { success: false, error: "No autorizado" };
  if (!ctx.etapa.revision.porCapitulo) return { success: false, error: "En esta ficha se envía el documento completo." };
  if (capituloGenerado(e)) return { success: false, error: "Este capítulo lo genera el sistema: no se envía aparte." };
  const est = estadoDe(ctx, espacioId);
  if (!capituloEditable(ctx.fila.estado, est)) return { success: false, error: "Este capítulo ya está en revisión o aprobado." };
  const u = ctx.ultimas.get(espacioId);
  const problemas = problemasInformeFinal({ ...ctx.etapa, espacios: [e] }, { [e.id]: u?.contenido ?? "" }, integrantesDe(ctx));
  if (!u || problemas.length > 0) return { success: false, error: problemas[0]?.mensaje ?? `Guarda "${e.titulo}" antes de enviarlo.` };
  ctx.estados[espacioId] = { ...est, estado: "enviado", version: u.numero, enviadoEn: new Date().toISOString() };
  await guardarEstados(propuestaId, ctx.estados);
  await avisarAsesor(propuestaId, `El equipo de la propuesta #${ctx.plan.propuesta.numero} envió el capítulo "${e.titulo}" del informe final para revisión.`);
  await notificarEquipo(propuestaId, "informe_final", `Se envió al asesor el capítulo "${e.titulo}" del informe final.`);
  refrescar(propuestaId);
  return { success: true };
}

/** Sin revisión por capítulo: el equipo envía todos los capítulos juntos. */
export async function enviarDocumentoCompleto(propuestaId: number): Promise<Resultado> {
  const r = await contexto(propuestaId);
  if (!r.success) return r;
  const { ctx } = r;
  if (!enEquipo(ctx)) return { success: false, error: "No autorizado" };
  const { contenidos } = vigentes(ctx);
  const problemas = problemasInformeFinal(ctx.etapa, contenidos, integrantesDe(ctx));
  if (problemas.length > 0) return { success: false, error: problemas[0].mensaje };
  const ahora = new Date().toISOString();
  for (const e of ctx.etapa.espacios) {
    const est = estadoDe(ctx, e.id);
    if (capituloEditable(ctx.fila.estado, est) && ctx.ultimas.has(e.id)) ctx.estados[e.id] = { ...est, estado: "enviado", version: ctx.ultimas.get(e.id)!.numero, enviadoEn: ahora };
  }
  await guardarEstados(propuestaId, ctx.estados);
  await avisarAsesor(propuestaId, `El equipo de la propuesta #${ctx.plan.propuesta.numero} envió el informe final completo para revisión.`);
  refrescar(propuestaId);
  return { success: true };
}

/** El asesor aprueba u observa un capítulo enviado. */
export async function revisarCapitulo(propuestaId: number, espacioId: string, decision: "aprobar" | "observar", comentario: string): Promise<Resultado> {
  const r = await contexto(propuestaId);
  if (!r.success) return r;
  const { ctx } = r;
  if (ctx.plan.rol !== "asesor") return { success: false, error: "Solo el asesor asignado revisa el informe final." };
  const e = ctx.etapa.espacios.find((x) => x.id === espacioId);
  const est = estadoDe(ctx, espacioId);
  if (!e || est.estado !== "enviado") return { success: false, error: "El capítulo no está pendiente de revisión." };
  const texto = comentario.trim();
  if (decision === "observar" && texto.length < 10) return { success: false, error: "Escribe las observaciones (al menos 10 caracteres)." };
  ctx.estados[espacioId] = { ...est, estado: decision === "aprobar" ? "aprobado" : "observado", comentario: texto || null, revisadoEn: new Date().toISOString() };
  await guardarEstados(propuestaId, ctx.estados);
  await notificarEquipo(propuestaId, "informe_final", decision === "aprobar" ? `El asesor aprobó el capítulo "${e.titulo}" del informe final.` : `El asesor hizo observaciones al capítulo "${e.titulo}": ${texto}`);
  refrescar(propuestaId);
  return { success: true };
}

/** Cada integrante firma la versión completa (todos los capítulos aprobados). */
export async function ratificarInformeFinal(propuestaId: number): Promise<Resultado> {
  const r = await contexto(propuestaId);
  if (!r.success) return r;
  const { ctx } = r;
  if (!enEquipo(ctx)) return { success: false, error: "Solo el equipo ratifica el informe final." };
  if (ctx.fila.estado !== "redactando") return { success: false, error: "El informe final ya se entregó." };
  const { contenidos, huella: h } = vigentes(ctx);
  const pendientes = capitulosPendientes(ctx.etapa, ctx.estados, contenidos);
  if (pendientes.length > 0) return { success: false, error: `Antes, el asesor debe aprobar todos los capítulos. Faltan: ${pendientes.map((e) => e.titulo).join(", ")}.` };
  const sinProductos = await objetivosSinProductos(propuestaId, ctx);
  if (sinProductos.length > 0) return { success: false, error: `Antes, el asesor debe aprobar los productos de cada objetivo. Faltan: ${sinProductos.join(", ")}.` };
  await db.insert(ratificacionesInformeFinal).values({ propuestaId, usuarioId: ctx.plan.miId, huellaFirmada: h, momento: new Date() })
    .onConflictDoUpdate({ target: [ratificacionesInformeFinal.propuestaId, ratificacionesInformeFinal.usuarioId], set: { huellaFirmada: h, momento: new Date() } });
  refrescar(propuestaId);
  return { success: true };
}

/** El líder entrega la versión final: queda congelada con su huella y pasa a la revisión final del asesor. */
export async function entregarInformeFinal(propuestaId: number): Promise<Resultado> {
  const res = await getInformeFinal(propuestaId);
  if (!res.success) return res;
  const d = res.datos;
  if (d.plan.rol !== "lider") return { success: false, error: "El líder entrega la versión final." };
  if (d.estado !== "redactando") return { success: false, error: "El informe final ya se entregó." };
  if (d.pendientesAprobacion.length > 0) return { success: false, error: `Faltan capítulos por aprobar: ${d.pendientesAprobacion.join(", ")}.` };
  if (!d.ratificacion.completa) return { success: false, error: `Falta que ratifiquen la versión final: ${d.ratificacion.firmas.filter((f) => !f.vigente).map((f) => f.nombre).join(", ")}.` };
  await db.update(informesFinalesFicha).set({ estado: "entregado", huellaFinal: d.huellaActual, entregadoEn: new Date(), actualizadoEn: new Date() }).where(eq(informesFinalesFicha.propuestaId, propuestaId));
  await avisarAsesor(propuestaId, `El equipo de la propuesta #${d.plan.propuesta.numero} entregó la versión final del informe de investigación.`);
  await notificarEquipo(propuestaId, "informe_final", "Se entregó la versión final del informe de investigación al asesor.");
  refrescar(propuestaId);
  return { success: true };
}

/** El asesor aprueba la versión entregada (queda definitiva) o la devuelve: todos los capítulos vuelven a "con observaciones". */
export async function revisarInformeFinal(propuestaId: number, decision: "aprobar" | "devolver", comentario: string): Promise<Resultado> {
  const r = await contexto(propuestaId);
  if (!r.success) return r;
  const { ctx } = r;
  if (ctx.plan.rol !== "asesor") return { success: false, error: "Solo el asesor asignado revisa el informe final." };
  if (ctx.fila.estado !== "entregado") return { success: false, error: "El informe final no está entregado." };
  const texto = comentario.trim();
  if (texto.length < 20) return { success: false, error: "Escribe tu dictamen del informe final (al menos 20 caracteres)." };
  if (decision === "aprobar") {
    await db.update(informesFinalesFicha).set({ estado: "aprobado", aprobadoEn: new Date(), comentarioFinal: texto, revisadoPor: ctx.plan.miId, actualizadoEn: new Date() }).where(eq(informesFinalesFicha.propuestaId, propuestaId));
    await notificarEquipo(propuestaId, "informe_final", `El asesor aprobó el informe final de investigación: ${texto}`);
  } else {
    for (const e of ctx.etapa.espacios) if (ctx.estados[e.id]) ctx.estados[e.id] = { ...ctx.estados[e.id], estado: "observado", comentario: texto };
    await guardarEstados(propuestaId, ctx.estados, { estado: "redactando", huellaFinal: null, entregadoEn: null, comentarioFinal: texto, revisadoPor: ctx.plan.miId });
    await notificarEquipo(propuestaId, "informe_final", `El asesor devolvió el informe final con observaciones: ${texto}`);
  }
  refrescar(propuestaId);
  return { success: true };
}

/**
 * Documento completo para imprimir o descargar en Word, con el contenido vigente de cada capítulo (después de la
 * entrega, es exactamente la versión congelada) y las evidencias de las actividades como anexos numerados.
 */
/**
 * Datos de la ejecución para el capítulo de resultados por objetivo: registros, evidencias, entregas y archivos de los
 * productos. Sin "conArchivos" no se leen las direcciones (data: URL pesadas): basta para la vista previa en pantalla.
 */
async function datosResultados(propuestaId: number, ctx: Contexto, conArchivos: boolean) {
  const arbol = ctx.plan.plan.arbol as NodoPlan;
  const regs = await db.select({ id: registrosPlan.id, nodoId: registrosPlan.nodoId, periodo: registrosPlan.periodo, estado: registrosPlan.estado, avance: registrosPlan.avance,
    resultado: registrosPlan.resultado, acciones: registrosPlan.acciones, fechaInicio: registrosPlan.fechaInicio, fechaFin: registrosPlan.fechaFin,
    modificacionTipo: registrosPlan.modificacionTipo, modificacion: registrosPlan.modificacion }).from(registrosPlan).where(eq(registrosPlan.propuestaId, propuestaId));
  const validos = regs.filter((x) => x.estado === "enviado" || x.estado === "aprobado");
  const colEvid = { id: evidenciasPlan.id, registroId: evidenciasPlan.registroId, tipo: evidenciasPlan.tipo, leyenda: evidenciasPlan.leyenda, nombre: evidenciasPlan.nombre,
    origen: evidenciasPlan.origen, fuente: evidenciasPlan.fuente, url: conArchivos ? evidenciasPlan.url : sql<string>`''` };
  const evid = validos.length ? await db.select(colEvid).from(evidenciasPlan).where(inArray(evidenciasPlan.registroId, validos.map((x) => x.id))).orderBy(evidenciasPlan.id) : [];
  const reg = new Map(validos.map((x) => [x.id, x]));
  const entregas = await db.select({ id: entregasObjetivo.id, nodoId: entregasObjetivo.nodoId, estado: entregasObjetivo.estado, periodo: entregasObjetivo.periodo,
    modificacionTipo: entregasObjetivo.modificacionTipo, modificacion: entregasObjetivo.modificacion }).from(entregasObjetivo).where(eq(entregasObjetivo.propuestaId, propuestaId));
  const colProd = { entregaId: productosTabla.entregaId, producto: productosTabla.producto, tipo: productosTabla.tipo, leyenda: productosTabla.leyenda, nombre: productosTabla.nombre,
    origen: productosTabla.origen, fuente: productosTabla.fuente, url: conArchivos ? productosTabla.url : sql<string>`''` };
  const prods = entregas.length ? await db.select(colProd).from(productosTabla).where(inArray(productosTabla.entregaId, entregas.map((e) => e.id))).orderBy(productosTabla.id) : [];
  const nota = (tipo: string, origen: string | null, fuente: unknown) => (tipo === "imagen" ? notaImagen(origen, fuente).map((x) => x.texto).join("") || null : null);
  const tipoArchivo = (t: string) => t as "imagen" | "documento" | "enlace";
  return {
    arbol,
    registros: regs,
    evidencias: evid.map((e) => ({ nodoId: reg.get(e.registroId)!.nodoId, periodo: reg.get(e.registroId)!.periodo, tipo: tipoArchivo(e.tipo), leyenda: e.leyenda, nombre: e.nombre, url: e.url, nota: nota(e.tipo, e.origen, e.fuente) })),
    entregas,
    productos: prods.map((p) => ({ objetivoId: entregas.find((e) => e.id === p.entregaId)!.nodoId, producto: p.producto, tipo: tipoArchivo(p.tipo), leyenda: p.leyenda, nombre: p.nombre, url: p.url, nota: nota(p.tipo, p.origen, p.fuente) })),
  };
}

/** Vista previa de los capítulos que genera el sistema, por espacio (sin leer los archivos). */
async function capitulosGenerados(propuestaId: number, ctx: Contexto): Promise<Record<string, BloqueDocumento[]>> {
  const espacios = ctx.etapa.espacios.filter(capituloGenerado);
  if (espacios.length === 0) return {};
  const datos = await datosResultados(propuestaId, ctx, false);
  return Object.fromEntries(espacios.map((e) => [e.id,
    e.elemento === "reporte_modificaciones" ? bloquesBitacora(entradasBitacora(datos)) : resultadosPorObjetivo({ ...datos, numero: null }).bloques]));
}

export async function getDocumentoInformeFinal(propuestaId: number): Promise<Resultado<{ documento: DocumentoInformeFinal }>> {
  const r = await contexto(propuestaId);
  if (!r.success) return r;
  const { ctx } = r;
  const { contenidos } = vigentes(ctx);
  const [prop] = await db.select().from(propuestas).where(eq(propuestas.id, propuestaId));
  const [lider] = await db.select({ carrera: carreras.nombre, facultad: facultades.nombre })
    .from(usuarios).leftJoin(carreras, eq(usuarios.carreraId, carreras.id)).leftJoin(facultades, eq(carreras.facultadId, facultades.id))
    .where(eq(usuarios.id, prop.egresadoId));
  const [asesor] = prop.asesorId ? await db.select({ nombre: usuarios.nombreCompleto }).from(usuarios).where(eq(usuarios.id, prop.asesorId)) : [];
  const { portada, lugarFecha } = portadaInformeFinal({
    titulo: prop.titulo ?? "",
    facultad: lider?.facultad ?? null,
    carrera: lider?.carrera ?? null,
    integrantes: ctx.plan.equipo.map((i) => ({ nombre: i.nombre, carnet: i.carnet })),
    asesor: asesor?.nombre ?? null,
    fecha: (ctx.fila.entregadoEn ?? new Date()).toISOString(),
  });
  // Resultados por objetivo: el capítulo que genera el sistema y los anexos de productos y evidencias, en el orden del
  // plan (objetivo → productos → actividades). Sin ese capítulo en la ficha, los anexos salen en el mismo orden.
  const datosRes = await datosResultados(propuestaId, ctx, true);
  let generados = resultadosPorObjetivo({ ...datosRes, numero: null });
  const { apartados, anexosCapitulo } = apartadosInformeFinal(ctx.etapa, contenidos, (e, numero) => {
    if (e.elemento === "reporte_modificaciones") return bloquesBitacora(entradasBitacora(datosRes));
    generados = resultadosPorObjetivo({ ...datosRes, numero });
    return generados.bloques;
  }, { referencias: referenciasOrdenadas(await fuentesDePropuesta(propuestaId)).map((x) => x.referencia), integrantes: integrantesDe(ctx) });

  const anexos: AnexoDocumento[] = [
    ...generados.anexos,
    ...anexosCapitulo.map((a) => ({ etiqueta: "", descripcion: a.nombre, tipo: "documento" as const, url: a.url, nombre: a.nombre, actividad: null, nota: null })),
  ].map((a, i) => ({ ...a, etiqueta: `Anexo ${i + 1}` }));

  return {
    success: true,
    documento: { portada, autoridades: AUTORIDADES_ACADEMICAS, lugarFecha, apartados, anexos, huella: ctx.fila.huellaFinal, estado: ctx.fila.estado },
  };
}
