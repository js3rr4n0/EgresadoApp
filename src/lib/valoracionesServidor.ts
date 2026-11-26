import "server-only";
// Valoraciones al cierre (entrega V3): qué procesos están cerrados, quién participa, qué valoraciones le faltan a cada
// usuario y los promedios por empresa. Lo usan páginas y acciones que ya validan la sesión.

import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  empresas,
  informesFinalesFicha,
  informesMensuales,
  informesVisita,
  integrantesProyecto,
  periodos,
  propuestas,
  usuarios,
  valoraciones,
} from "@/lib/schema";
import { reglasPasantiaDePropuesta } from "@/lib/reglasPasantiaPropuesta";
import type { Respuestas } from "@/lib/formularioVisita";
import {
  notaAsesorEmpresa,
  notaGeneral,
  promedio,
  puntajeVisita,
  resumir,
  type EvaluadorRol,
  type Objetivo,
  type ResumenValoracion,
  type TipoValoracion,
  type ValoracionGuardada,
} from "@/lib/valoraciones";

const ESTADOS_ACTIVOS = ["aprobada", "primer_contacto_completado", "en_ejecucion"];

/**
 * Fecha de cierre de cada proceso cerrado. Un proceso se cierra cuando el asesor aprueba el informe final:
 * proyecto, investigación y pasantía con ficha que tenga informe final por capítulos → informes_finales_ficha aprobado;
 * pasantía → el último informe de período (el informe final) aprobado.
 */
export async function cierreDeProcesos(ids: number[]): Promise<Map<number, string>> {
  const cierre = new Map<number, string>();
  if (ids.length === 0) return cierre;

  const finales = await db
    .select({ propuestaId: informesFinalesFicha.propuestaId, aprobadoEn: informesFinalesFicha.aprobadoEn })
    .from(informesFinalesFicha)
    .where(and(inArray(informesFinalesFicha.propuestaId, ids), eq(informesFinalesFicha.estado, "aprobado")));
  finales.forEach((f) => cierre.set(f.propuestaId, (f.aprobadoEn ?? new Date()).toISOString()));

  const pasantias = await db
    .select({ id: propuestas.id })
    .from(propuestas)
    .where(and(inArray(propuestas.id, ids), eq(propuestas.tipo, "pasantia")));
  const restantes = pasantias.map((p) => p.id).filter((id) => !cierre.has(id));
  if (restantes.length) {
    const aprobados = await db
      .select({ propuestaId: informesMensuales.propuestaId, numero: informesMensuales.numero, revisadoEn: informesMensuales.revisadoEn })
      .from(informesMensuales)
      .where(and(inArray(informesMensuales.propuestaId, restantes), eq(informesMensuales.estado, "aprobado")));
    for (const id of restantes) {
      const suyos = aprobados.filter((a) => a.propuestaId === id);
      if (!suyos.length) continue;
      const { periodos: total } = await reglasPasantiaDePropuesta(id);
      const final = suyos.find((a) => a.numero === total);
      if (final) cierre.set(id, (final.revisadoEn ?? new Date()).toISOString());
    }
  }
  return cierre;
}

export interface ProcesoParaValorar {
  propuestaId: number;
  titulo: string;
  tipo: string;
  cohorte: string;
  cerradoEn: string;
  empresa: { id: number; nombre: string } | null;
  asesor: { id: number; nombre: string } | null;
  egresados: { id: number; nombre: string }[];
}

/** Datos de los procesos indicados: empresa, asesor y egresados (responsable e integrantes aceptados o concluidos). */
async function datosProcesos(ids: number[], cierre: Map<number, string>): Promise<ProcesoParaValorar[]> {
  if (ids.length === 0) return [];
  const props = await db
    .select({
      id: propuestas.id,
      titulo: propuestas.titulo,
      tipo: propuestas.tipo,
      egresadoId: propuestas.egresadoId,
      asesorId: propuestas.asesorId,
      empresaId: propuestas.empresaId,
      empresa: empresas.nombre,
      cohorte: periodos.nombre,
    })
    .from(propuestas)
    .innerJoin(periodos, eq(periodos.id, propuestas.periodoId))
    .leftJoin(empresas, eq(empresas.id, propuestas.empresaId))
    .where(inArray(propuestas.id, ids));
  const miembros = await db
    .select({ propuestaId: integrantesProyecto.propuestaId, egresadoId: integrantesProyecto.egresadoId })
    .from(integrantesProyecto)
    .where(and(inArray(integrantesProyecto.propuestaId, ids), inArray(integrantesProyecto.estado, ["aceptado", "concluido"])));
  const idsGente = [...new Set([...props.flatMap((p) => [p.egresadoId, p.asesorId]), ...miembros.map((m) => m.egresadoId)].filter((x): x is number => !!x))];
  const gente = idsGente.length
    ? await db.select({ id: usuarios.id, nombre: usuarios.nombreCompleto }).from(usuarios).where(inArray(usuarios.id, idsGente))
    : [];
  const nombre = (id: number) => gente.find((g) => g.id === id)?.nombre ?? "Usuario";

  return props.map((p) => ({
    propuestaId: p.id,
    titulo: p.titulo ?? "(sin título)",
    tipo: p.tipo,
    cohorte: p.cohorte,
    cerradoEn: cierre.get(p.id)!,
    empresa: p.empresaId ? { id: p.empresaId, nombre: p.empresa ?? "Empresa" } : null,
    asesor: p.asesorId ? { id: p.asesorId, nombre: nombre(p.asesorId) } : null,
    egresados: [...new Set([p.egresadoId, ...miembros.filter((m) => m.propuestaId === p.id).map((m) => m.egresadoId)])].map((id) => ({ id, nombre: nombre(id) })),
  }));
}

export interface ObjetivoPendiente {
  objetivo: Objetivo;
  evaluadoId: number;
  nombre: string;
  hecha: boolean;
}

export interface ProcesoConObjetivos extends ProcesoParaValorar {
  objetivos: ObjetivoPendiente[];
}

/** Lo que el usuario debe valorar en un proceso cerrado: egresado → empresa y asesor; asesor → empresa y cada egresado. */
function objetivosDe(p: ProcesoParaValorar, rol: EvaluadorRol, usuarioId: number, hechas: Set<string>): ObjetivoPendiente[] {
  const lista: Omit<ObjetivoPendiente, "hecha">[] = [];
  if (p.empresa) lista.push({ objetivo: "empresa", evaluadoId: p.empresa.id, nombre: p.empresa.nombre });
  if (rol === "egresado" && p.asesor) lista.push({ objetivo: "asesor", evaluadoId: p.asesor.id, nombre: p.asesor.nombre });
  if (rol === "asesor") p.egresados.forEach((e) => lista.push({ objetivo: "egresado", evaluadoId: e.id, nombre: e.nombre }));
  return lista.map((o) => ({ ...o, hecha: hechas.has(`${p.propuestaId}:${usuarioId}:${o.objetivo}:${o.evaluadoId}`) }));
}

/** Procesos cerrados del usuario con lo que le toca valorar (hechas y pendientes). */
export async function procesosParaValorar(usuarioId: number, rol: EvaluadorRol, propuestaId?: number): Promise<ProcesoConObjetivos[]> {
  let ids: number[];
  if (rol === "asesor") {
    const filas = await db
      .select({ id: propuestas.id })
      .from(propuestas)
      .where(and(eq(propuestas.asesorId, usuarioId), inArray(propuestas.estado, ESTADOS_ACTIVOS), propuestaId ? eq(propuestas.id, propuestaId) : undefined));
    ids = filas.map((f) => f.id);
  } else {
    const propias = await db
      .select({ id: propuestas.id })
      .from(propuestas)
      .where(and(eq(propuestas.egresadoId, usuarioId), inArray(propuestas.estado, ESTADOS_ACTIVOS)));
    const comoIntegrante = await db
      .select({ id: integrantesProyecto.propuestaId })
      .from(integrantesProyecto)
      .innerJoin(propuestas, eq(propuestas.id, integrantesProyecto.propuestaId))
      .where(
        and(
          eq(integrantesProyecto.egresadoId, usuarioId),
          inArray(integrantesProyecto.estado, ["aceptado", "concluido"]),
          inArray(propuestas.estado, ESTADOS_ACTIVOS),
        ),
      );
    ids = [...new Set([...propias, ...comoIntegrante].map((f) => f.id))];
    if (propuestaId) ids = ids.filter((id) => id === propuestaId);
  }
  const cierre = await cierreDeProcesos(ids);
  const cerrados = ids.filter((id) => cierre.has(id));
  if (cerrados.length === 0) return [];

  const procesos = await datosProcesos(cerrados, cierre);
  const ya = await db
    .select({ propuestaId: valoraciones.propuestaId, objetivo: valoraciones.objetivo, evaluadoId: valoraciones.evaluadoId })
    .from(valoraciones)
    .where(and(eq(valoraciones.evaluadorId, usuarioId), inArray(valoraciones.propuestaId, cerrados)));
  const hechas = new Set(ya.map((v) => `${v.propuestaId}:${usuarioId}:${v.objetivo}:${v.evaluadoId}`));
  return procesos
    .map((p) => ({ ...p, objetivos: objetivosDe(p, rol, usuarioId, hechas) }))
    .filter((p) => p.objetivos.length > 0)
    .sort((a, b) => (a.cerradoEn < b.cerradoEn ? 1 : -1));
}

/** Solo los procesos con al menos una valoración pendiente (para el aviso del panel). */
export async function valoracionesPendientes(usuarioId: number, rol: EvaluadorRol) {
  return (await procesosParaValorar(usuarioId, rol)).filter((p) => p.objetivos.some((o) => !o.hecha));
}

/** Valoraciones guardadas que el propio usuario hizo en un proceso (para mostrarle lo que envió). */
export async function misValoraciones(usuarioId: number, propuestaId: number) {
  return db
    .select()
    .from(valoraciones)
    .where(and(eq(valoraciones.evaluadorId, usuarioId), eq(valoraciones.propuestaId, propuestaId)));
}

// ── Promedios por empresa (catálogo y Ver más) ──

export interface ValoracionEmpresa {
  egresados: ResumenValoracion;
  /** Nota de los asesores: por proceso, promedio de su valoración al cierre y de la visita de 90 días. */
  asesores: { promedio: number | null; procesos: number; ultima: { promedio: number; cohorte: string; fecha: string } | null };
  asesoresCierre: ResumenValoracion;
  visitas: { promedio: number | null; cantidad: number };
  general: number | null;
  comentarios: { tipo: TipoValoracion; texto: string; cohorte: string; fecha: string }[];
}

export async function valoracionesDeEmpresas(empresaId?: number): Promise<Record<number, ValoracionEmpresa>> {
  const filas = await db
    .select({
      propuestaId: valoraciones.propuestaId,
      evaluadorRol: valoraciones.evaluadorRol,
      evaluadoId: valoraciones.evaluadoId,
      puntajes: valoraciones.puntajes,
      promedio: valoraciones.promedio,
      comentario: valoraciones.comentario,
      creadoEn: valoraciones.creadoEn,
      cohorte: periodos.nombre,
    })
    .from(valoraciones)
    .innerJoin(propuestas, eq(propuestas.id, valoraciones.propuestaId))
    .innerJoin(periodos, eq(periodos.id, propuestas.periodoId))
    .where(and(eq(valoraciones.objetivo, "empresa"), empresaId ? eq(valoraciones.evaluadoId, empresaId) : undefined));

  const visitas = await db
    .select({ propuestaId: informesVisita.propuestaId, respuestas: informesVisita.respuestas, completadoEn: informesVisita.completadoEn, empresaId: propuestas.empresaId, cohorte: periodos.nombre })
    .from(informesVisita)
    .innerJoin(propuestas, eq(propuestas.id, informesVisita.propuestaId))
    .innerJoin(periodos, eq(periodos.id, propuestas.periodoId))
    .where(and(eq(informesVisita.estado, "completado"), empresaId ? eq(propuestas.empresaId, empresaId) : isNotNull(propuestas.empresaId)));

  const guardadas = (rol: string): (ValoracionGuardada & { empresaId: number })[] =>
    filas
      .filter((f) => f.evaluadorRol === rol)
      .map((f) => ({
        propuestaId: f.propuestaId,
        tipo: `${rol}_empresa` as TipoValoracion,
        evaluadoId: f.evaluadoId,
        empresaId: f.evaluadoId,
        promedio: Number(f.promedio),
        puntajes: f.puntajes as Record<string, number>,
        comentario: f.comentario,
        creadoEn: f.creadoEn.toISOString(),
        cohorte: f.cohorte,
      }));
  const deEgresados = guardadas("egresado");
  const deAsesores = guardadas("asesor");

  const ids = new Set<number>([...filas.map((f) => f.evaluadoId), ...visitas.map((v) => v.empresaId).filter((x): x is number => !!x)]);
  const resultado: Record<number, ValoracionEmpresa> = {};
  for (const id of ids) {
    const eg = deEgresados.filter((v) => v.empresaId === id);
    const as = deAsesores.filter((v) => v.empresaId === id);
    const vis = visitas
      .filter((v) => v.empresaId === id)
      .map((v) => ({ ...v, puntaje: puntajeVisita(v.respuestas as Respuestas).puntaje }))
      .filter((v) => v.puntaje != null);

    // Nota del asesor por proceso: valoración al cierre + visita
    const procesos = new Set([...as.map((v) => v.propuestaId), ...vis.map((v) => v.propuestaId)]);
    const porProceso = [...procesos].map((pid) => {
      const cierreV = promedio(as.filter((v) => v.propuestaId === pid).map((v) => v.promedio));
      const visita = vis.find((v) => v.propuestaId === pid)?.puntaje ?? null;
      const fechas = [...as.filter((v) => v.propuestaId === pid).map((v) => v.creadoEn), vis.find((v) => v.propuestaId === pid)?.completadoEn?.toISOString()].filter(
        (x): x is string => !!x,
      );
      const cohorte = as.find((v) => v.propuestaId === pid)?.cohorte ?? vis.find((v) => v.propuestaId === pid)?.cohorte ?? "";
      return { nota: notaAsesorEmpresa(cierreV, visita), fecha: fechas.sort().at(-1) ?? "", cohorte };
    });
    const conNota = porProceso.filter((p): p is { nota: number; fecha: string; cohorte: string } => p.nota != null);
    const ultimaA = [...conNota].sort((a, b) => (a.fecha < b.fecha ? 1 : -1))[0];
    const asesores = {
      promedio: promedio(conNota.map((p) => p.nota)),
      procesos: conNota.length,
      ultima: ultimaA ? { promedio: ultimaA.nota, cohorte: ultimaA.cohorte, fecha: ultimaA.fecha } : null,
    };
    const egresados = resumir("egresado_empresa", eg);

    resultado[id] = {
      egresados,
      asesores,
      asesoresCierre: resumir("asesor_empresa", as),
      visitas: { promedio: promedio(vis.map((v) => v.puntaje!)), cantidad: vis.length },
      general: notaGeneral(egresados.promedio, asesores.promedio),
      comentarios: [...eg, ...as]
        .filter((v) => v.comentario)
        .sort((a, b) => (a.creadoEn < b.creadoEn ? 1 : -1))
        .map((v) => ({ tipo: v.tipo, texto: v.comentario!, cohorte: v.cohorte, fecha: v.creadoEn })),
    };
  }
  return resultado;
}
