"use server";
// Seguimiento de cohortes del administrador (specs/SEGUIMIENTO_COHORTES.md, entrega K1): cohortes activas y los informes
// de la cohorte que comienza (recepción y pre-ejecución de 21 días). Solo administrador.

import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import {
  carreras, documentosPropuesta, empresas, facultades, fichasVersiones, historialEstados, informesFinalesFicha, informesMensuales,
  informesPlan, informesPrimerContacto, integrantesProyecto, periodos, planesTrabajo, propuestas, usuarios,
} from "@/lib/schema";
import {
  calcularPreEjecucion, calcularSeguimiento, corteAutomatico, cumplimientoPorDia, disponibilidadAsesor, faseCohorte, grupoFase,
  isoDia, limitesInformes, NOMBRE_FASE,
  type CalculoPreEjecucion, type CalculoSeguimiento, type EntregaSeguimiento, type ClaveRequisito, type EstadoRequisito, type FaseCohorte,
} from "@/lib/seguimientoCohortes";

type Resultado<T> = { success: true; datos: T } | { success: false; error: string };

export interface FiltroInforme {
  facultadId?: number | null;
  carreraId?: number | null;
  /** Periodicidad manual (AAAA-MM-DD). Sin ellas, la automática de cada informe. */
  desde?: string | null;
  hasta?: string | null;
}

export interface CohorteActiva {
  id: number;
  nombre: string;
  fase: FaseCohorte;
  nombreFase: string;
  grupo: "comenzando" | "finalizando" | null;
  fechas: { inicioRecepcion: string; finRecepcion: string; maxInicioProceso: string; maxInformeFinal: string; maxAprobacionFinal: string };
  potenciales: number;
  propuestas: number;
  enEjecucion: number;
}

async function soloAdmin() {
  const s = await getSession();
  return s?.rol === "admin" ? s : null;
}

const hoyIso = () => isoDia(new Date());
const dia = (d: Date | string | null | undefined) => (d ? (typeof d === "string" ? d.slice(0, 10) : isoDia(d)) : null);

/** Egresados con su carrera y facultad (la del egresado o, si no tiene, la de su carrera). */
async function personas(ids?: number[]) {
  const filas = await db
    .select({ id: usuarios.id, nombre: usuarios.nombreCompleto, carnet: usuarios.carnet, cohorte: usuarios.cohorte, rol: usuarios.rol, activo: usuarios.activo,
      carreraId: usuarios.carreraId, carrera: carreras.nombre, facultadUsuario: usuarios.facultadId, facultadCarrera: carreras.facultadId })
    .from(usuarios).leftJoin(carreras, eq(usuarios.carreraId, carreras.id))
    .where(ids ? inArray(usuarios.id, ids.length ? ids : [-1]) : eq(usuarios.rol, "egresado"));
  return filas.map((f) => ({ ...f, facultadId: f.facultadUsuario ?? f.facultadCarrera ?? null }));
}

const enAlcance = (p: { facultadId: number | null; carreraId: number | null }, f: FiltroInforme) =>
  (!f.carreraId || p.carreraId === f.carreraId) && (!f.facultadId || p.facultadId === f.facultadId);

export async function getOpcionesSeguimiento(): Promise<Resultado<{ cohortes: CohorteActiva[]; facultades: { id: number; nombre: string }[]; carreras: { id: number; nombre: string; facultadId: number }[] }>> {
  if (!(await soloAdmin())) return { success: false, error: "No autorizado" };
  const hoy = hoyIso();
  const lista = await db.select().from(periodos).where(eq(periodos.activo, true)).orderBy(asc(periodos.inicioRecepcion));
  const egresados = await personas();
  const props = lista.length ? await db.select({ periodoId: propuestas.periodoId, estado: propuestas.estado }).from(propuestas).where(inArray(propuestas.periodoId, lista.map((p) => p.id))) : [];
  const cohortes: CohorteActiva[] = lista.map((p) => {
    const fechas = { inicioRecepcion: p.inicioRecepcion, finRecepcion: p.finRecepcion, maxInicioProceso: p.maxInicioProceso, maxInformeFinal: p.maxInformeFinal, maxAprobacionFinal: p.maxAprobacionFinal };
    const fase = faseCohorte(fechas, hoy);
    const deCohorte = props.filter((x) => x.periodoId === p.id && x.estado !== "anulada");
    return {
      id: p.id, nombre: p.nombre, fase, nombreFase: NOMBRE_FASE[fase], grupo: grupoFase(fase), fechas,
      potenciales: egresados.filter((e) => e.cohorte === p.nombre && e.activo).length,
      propuestas: deCohorte.length,
      enEjecucion: deCohorte.filter((x) => x.estado === "en_ejecucion").length,
    };
  });
  const facs = await db.select({ id: facultades.id, nombre: facultades.nombre }).from(facultades).where(eq(facultades.activo, true)).orderBy(asc(facultades.nombre));
  const cars = await db.select({ id: carreras.id, nombre: carreras.nombre, facultadId: carreras.facultadId }).from(carreras).where(eq(carreras.activo, true)).orderBy(asc(carreras.nombre));
  return { success: true, datos: { cohortes, facultades: facs, carreras: cars } };
}

// ── Informe 1 de la cohorte que comienza: recepción de propuestas ──

const MODALIDADES = ["pasantia", "proyecto", "investigacion"] as const;
type Modalidad = (typeof MODALIDADES)[number];

export interface FilaRecepcion {
  carrera: string;
  potenciales: number;
  recibidos: Record<Modalidad, number> & { total: number };
  pendientes: Record<Modalidad, number> & { sinPropuesta: number; total: number };
  empresas: number;
  asesores: number;
}

export async function getInformeRecepcion(periodoId: number, filtro: FiltroInforme): Promise<Resultado<{ rango: { desde: string; hasta: string; automatico: boolean }; filas: FilaRecepcion[]; total: FilaRecepcion }>> {
  if (!(await soloAdmin())) return { success: false, error: "No autorizado" };
  const [periodo] = await db.select().from(periodos).where(eq(periodos.id, periodoId));
  if (!periodo) return { success: false, error: "La cohorte no existe." };
  const automatico = !filtro.desde && !filtro.hasta;
  const desde = filtro.desde || periodo.inicioRecepcion;
  const hasta = filtro.hasta || hoyIso();

  const potenciales = (await personas()).filter((e) => e.cohorte === periodo.nombre && e.activo && enAlcance(e, filtro));
  const props = await db.select({ id: propuestas.id, egresadoId: propuestas.egresadoId, tipo: propuestas.tipo, estado: propuestas.estado, enviadaEn: propuestas.enviadaEn, empresaId: propuestas.empresaId })
    .from(propuestas).where(eq(propuestas.periodoId, periodoId));
  const vigentes = props.filter((p) => p.estado !== "anulada");
  const miembros = vigentes.length
    ? await db.select({ propuestaId: integrantesProyecto.propuestaId, egresadoId: integrantesProyecto.egresadoId }).from(integrantesProyecto)
      .where(and(inArray(integrantesProyecto.propuestaId, vigentes.map((p) => p.id)), eq(integrantesProyecto.estado, "aceptado")))
    : [];
  // Cada persona con las propuestas donde participa (como líder o integrante aceptado).
  const participa = new Map<number, typeof vigentes>();
  for (const p of vigentes) {
    for (const id of [p.egresadoId, ...miembros.filter((m) => m.propuestaId === p.id).map((m) => m.egresadoId)]) {
      participa.set(id, [...(participa.get(id) ?? []), p]);
    }
  }
  const recibida = (p: (typeof vigentes)[number]) => !!p.enviadaEn && dia(p.enviadaEn)! >= desde && dia(p.enviadaEn)! <= hasta;

  const asesores = await db.select({ id: usuarios.id, carreraId: usuarios.carreraId, asignadas: usuarios.carrerasAsignadas })
    .from(usuarios).where(and(eq(usuarios.rol, "asesor"), eq(usuarios.activo, true)));
  const atiende = (a: (typeof asesores)[number], carreraId: number | null) =>
    carreraId !== null && (a.carreraId === carreraId || (Array.isArray(a.asignadas) && (a.asignadas as number[]).includes(carreraId)));

  const vacia = (carrera: string): FilaRecepcion => ({
    carrera, potenciales: 0, empresas: 0, asesores: 0,
    recibidos: { pasantia: 0, proyecto: 0, investigacion: 0, total: 0 },
    pendientes: { pasantia: 0, proyecto: 0, investigacion: 0, sinPropuesta: 0, total: 0 },
  });
  const porCarrera = new Map<string, { fila: FilaRecepcion; carreraId: number | null; empresas: Set<number> }>();
  for (const e of potenciales) {
    const clave = e.carrera ?? "Sin carrera";
    if (!porCarrera.has(clave)) porCarrera.set(clave, { fila: vacia(clave), carreraId: e.carreraId, empresas: new Set() });
    const g = porCarrera.get(clave)!;
    g.fila.potenciales++;
    const suyas = participa.get(e.id) ?? [];
    for (const p of suyas) if (p.empresaId) g.empresas.add(p.empresaId);
    const entregada = suyas.find(recibida);
    if (entregada) {
      g.fila.recibidos[entregada.tipo as Modalidad]++;
      g.fila.recibidos.total++;
    } else {
      // Pendiente: por la modalidad que está redactando (la más reciente) o sin propuesta.
      const borrador = suyas.filter((p) => !p.enviadaEn).sort((a, b) => b.id - a.id)[0];
      if (borrador) g.fila.pendientes[borrador.tipo as Modalidad]++;
      else g.fila.pendientes.sinPropuesta++;
      g.fila.pendientes.total++;
    }
  }
  const filas = [...porCarrera.values()].map((g) => ({ ...g.fila, empresas: g.empresas.size, asesores: asesores.filter((a) => atiende(a, g.carreraId)).length }))
    .sort((a, b) => a.carrera.localeCompare(b.carrera, "es"));
  const total = filas.reduce((t, f) => {
    t.potenciales += f.potenciales;
    for (const m of MODALIDADES) { t.recibidos[m] += f.recibidos[m]; t.pendientes[m] += f.pendientes[m]; }
    t.recibidos.total += f.recibidos.total;
    t.pendientes.total += f.pendientes.total;
    t.pendientes.sinPropuesta += f.pendientes.sinPropuesta;
    return t;
  }, vacia("Total"));
  // Empresas y asesores distintos en todo el alcance (no la suma por carrera: se repetirían).
  total.empresas = new Set(potenciales.flatMap((e) => (participa.get(e.id) ?? []).map((p) => p.empresaId).filter((x): x is number => !!x))).size;
  total.asesores = asesores.filter((a) => [...porCarrera.values()].some((g) => atiende(a, g.carreraId))).length;
  return { success: true, datos: { rango: { desde, hasta, automatico }, filas, total } };
}

// ── Informe 2 de la cohorte que comienza: pre-ejecución (21 días) ──

export interface FilaPreEjecucion extends CalculoPreEjecucion {
  propuestaId: number;
  modalidad: string;
  titulo: string;
  egresado: string;
  carnet: string | null;
  integrantes: string[];
  carrera: string;
  asesor: string | null;
  coordinador: string | null;
  fechaAprobacion: string;
  inicioEjecucion: string | null;
  requisitos: Record<ClaveRequisito, EstadoRequisito>;
}

export async function getInformePreEjecucion(periodoId: number, filtro: FiltroInforme): Promise<Resultado<{
  hoy: string; rango: { desde: string | null; hasta: string | null; automatico: boolean };
  enPreEjecucion: FilaPreEjecucion[]; iniciadas: FilaPreEjecucion[]; cumplimiento: ReturnType<typeof cumplimientoPorDia>;
}>> {
  if (!(await soloAdmin())) return { success: false, error: "No autorizado" };
  const [periodo] = await db.select().from(periodos).where(eq(periodos.id, periodoId));
  if (!periodo) return { success: false, error: "La cohorte no existe." };
  const hoy = hoyIso();
  const automatico = !filtro.desde && !filtro.hasta;

  const todas = await db.select().from(propuestas)
    .where(and(eq(propuestas.periodoId, periodoId), inArray(propuestas.estado, ["aprobada", "primer_contacto_completado", "en_ejecucion"])));
  // Algunas aprobaciones no guardan fecha_aprobacion: se toma la del historial de estados (primer paso a «aprobada»).
  const aprobaciones = todas.length
    ? await db.select({ propuestaId: historialEstados.propuestaId, fecha: historialEstados.creadoEn }).from(historialEstados)
      .where(and(inArray(historialEstados.propuestaId, todas.map((p) => p.id)), eq(historialEstados.a, "aprobada")))
    : [];
  const props = todas.flatMap((p) => {
    const f = dia(p.fechaAprobacion) ?? aprobaciones.filter((a) => a.propuestaId === p.id).map((a) => dia(a.fecha)!).sort()[0];
    return f ? [{ ...p, aprobadaEl: f }] : [];
  });
  const enRango = props.filter((p) => (!filtro.desde || p.aprobadaEl >= filtro.desde) && (!filtro.hasta || p.aprobadaEl <= filtro.hasta));
  const ids = enRango.map((p) => p.id);
  const sinIds = [-1];
  const [docs, planes, contactos, inicios, miembros] = await Promise.all([
    db.select().from(documentosPropuesta).where(inArray(documentosPropuesta.propuestaId, ids.length ? ids : sinIds)),
    db.select({ propuestaId: planesTrabajo.propuestaId, estado: planesTrabajo.estado, revisadoEn: planesTrabajo.revisadoEn }).from(planesTrabajo).where(inArray(planesTrabajo.propuestaId, ids.length ? ids : sinIds)),
    db.select({ propuestaId: informesPrimerContacto.propuestaId, estado: informesPrimerContacto.estado, enviadoEn: informesPrimerContacto.enviadoEn }).from(informesPrimerContacto).where(inArray(informesPrimerContacto.propuestaId, ids.length ? ids : sinIds)),
    db.select({ propuestaId: historialEstados.propuestaId, fecha: historialEstados.creadoEn }).from(historialEstados).where(and(inArray(historialEstados.propuestaId, ids.length ? ids : sinIds), eq(historialEstados.a, "en_ejecucion"))),
    db.select({ propuestaId: integrantesProyecto.propuestaId, egresadoId: integrantesProyecto.egresadoId }).from(integrantesProyecto).where(and(inArray(integrantesProyecto.propuestaId, ids.length ? ids : sinIds), eq(integrantesProyecto.estado, "aceptado"))),
  ]);
  const gente = await personas([...new Set([...enRango.flatMap((p) => [p.egresadoId, p.asesorId, p.coordinadorId]), ...miembros.map((m) => m.egresadoId)].filter((x): x is number => !!x))]);
  const persona = (id: number | null) => gente.find((g) => g.id === id);
  const doc = (pid: number, tipo: string) => dia(docs.find((d) => d.propuestaId === pid && d.tipo === tipo)?.subidoEn);

  const filas: FilaPreEjecucion[] = [];
  for (const p of enRango) {
    const lider = persona(p.egresadoId);
    if (!lider || !enAlcance(lider, filtro)) continue;
    const plan = planes.find((x) => x.propuestaId === p.id);
    const contacto = contactos.find((x) => x.propuestaId === p.id);
    const requisitos: Record<ClaveRequisito, EstadoRequisito> = {
      // Pasantía: el plan firmado (fase 1). Proyecto e investigación: el plan de trabajo aprobado por el asesor.
      plan: p.tipo === "pasantia" ? doc(p.id, "plan_trabajo_firmado") : plan?.estado === "aprobado" ? dia(plan.revisadoEn) ?? hoy : null,
      dictamen_propuesta: doc(p.id, "dictamen_propuesta"),
      dictamen_plan: doc(p.id, "dictamen_plan_trabajo"),
      // El informe de primer contacto lo hace el asesor con el supervisor: sin supervisor no aplica (pregunta P2).
      primer_contacto: contacto?.estado === "enviado" ? dia(contacto.enviadoEn) ?? hoy : !p.supervisorId && p.tipo !== "pasantia" ? "no_aplica" : null,
    };
    const inicio = inicios.filter((x) => x.propuestaId === p.id).map((x) => dia(x.fecha)!).sort()[0] ?? null;
    const fechaAprobacion = p.aprobadaEl;
    const calculo = calcularPreEjecucion({ fechaAprobacion, inicioEjecucion: p.estado === "en_ejecucion" ? inicio ?? fechaAprobacion : null, requisitos, cohorte: periodo }, hoy);
    filas.push({
      ...calculo, propuestaId: p.id, modalidad: p.tipo, titulo: p.titulo ?? "(sin título)", egresado: lider.nombre, carnet: lider.carnet,
      integrantes: miembros.filter((m) => m.propuestaId === p.id).map((m) => persona(m.egresadoId)?.nombre ?? "").filter(Boolean),
      carrera: lider.carrera ?? "Sin carrera", asesor: persona(p.asesorId)?.nombre ?? null, coordinador: persona(p.coordinadorId)?.nombre ?? null,
      fechaAprobacion, inicioEjecucion: p.estado === "en_ejecucion" ? inicio ?? fechaAprobacion : null, requisitos,
    });
  }
  const enPreEjecucion = filas.filter((f) => !f.inicioEjecucion).sort((a, b) => a.diasRestantes - b.diasRestantes);
  const iniciadas = filas.filter((f) => f.inicioEjecucion);
  return { success: true, datos: { hoy, rango: { desde: filtro.desde ?? null, hasta: filtro.hasta ?? null, automatico }, enPreEjecucion, iniciadas, cumplimiento: cumplimientoPorDia(filas) } };
}

// ── Cohorte que finaliza (entrega K2): seguimiento, retrasos, asesores y procesos terminados ──

export interface FilaSeguimiento extends CalculoSeguimiento {
  propuestaId: number;
  modalidad: string;
  titulo: string;
  egresado: string;
  integrantes: string[];
  carrera: string;
  asesor: string | null;
  asesorId: number | null;
  /** Empresa o institución (K3). */
  empresaId: number | null;
  empresa: string | null;
  /** La empresa sigue habilitada en el catálogo (false: dada de baja). */
  empresaHabilitada: boolean | null;
  entregas: EntregaSeguimiento[];
  /** Solo le falta el informe final (o el último período). */
  soloFalta: "final" | "mas";
  informeFinal: "aprobado" | "entregado" | "pendiente";
}

export interface FilaAsesor {
  asesorId: number;
  asesor: string;
  trabajos: number;
  terminados: number;
  retrasados: number;
  diasRetrasoMax: number;
  enOtrasCohortes: number;
  disponibilidad: "disponible" | "terminando" | "ocupado";
}

export async function getInformeFinalizando(periodoId: number, filtro: FiltroInforme): Promise<Resultado<{
  hoy: string; corte: string; diario: boolean; proximo: string | null; automatico: boolean;
  filas: FilaSeguimiento[]; asesores: FilaAsesor[];
}>> {
  if (!(await soloAdmin())) return { success: false, error: "No autorizado" };
  const [periodo] = await db.select().from(periodos).where(eq(periodos.id, periodoId));
  if (!periodo) return { success: false, error: "La cohorte no existe." };
  const hoy = hoyIso();
  const automatico = !filtro.hasta;
  const auto = corteAutomatico(periodo, hoy);
  // Con fechas elegidas, el corte es la fecha «hasta»: el estado de los trabajos a ese día.
  const corte = filtro.hasta || auto.corte;

  const props = await db.select().from(propuestas).where(and(eq(propuestas.periodoId, periodoId), eq(propuestas.estado, "en_ejecucion")));
  const ids = props.length ? props.map((p) => p.id) : [-1];
  const versiones = [...new Set(props.map((p) => p.fichaVersionId).filter((x): x is number => !!x))];
  const [mensuales, delPlan, planes, finales, defs, miembros] = await Promise.all([
    db.select().from(informesMensuales).where(inArray(informesMensuales.propuestaId, ids)),
    db.select({ propuestaId: informesPlan.propuestaId, periodo: informesPlan.periodo, estado: informesPlan.estado, enviadoEn: informesPlan.enviadoEn }).from(informesPlan).where(inArray(informesPlan.propuestaId, ids)),
    db.select({ propuestaId: planesTrabajo.propuestaId }).from(planesTrabajo).where(inArray(planesTrabajo.propuestaId, ids)),
    db.select({ propuestaId: informesFinalesFicha.propuestaId, estado: informesFinalesFicha.estado, entregadoEn: informesFinalesFicha.entregadoEn }).from(informesFinalesFicha).where(inArray(informesFinalesFicha.propuestaId, ids)),
    versiones.length ? db.select({ id: fichasVersiones.id, definicion: fichasVersiones.definicion }).from(fichasVersiones).where(inArray(fichasVersiones.id, versiones)) : Promise.resolve([]),
    db.select({ propuestaId: integrantesProyecto.propuestaId, egresadoId: integrantesProyecto.egresadoId }).from(integrantesProyecto).where(and(inArray(integrantesProyecto.propuestaId, ids), eq(integrantesProyecto.estado, "aceptado"))),
  ]);
  const gente = await personas([...new Set([...props.flatMap((p) => [p.egresadoId, p.asesorId]), ...miembros.map((m) => m.egresadoId)].filter((x): x is number => !!x))]);
  const persona = (id: number | null) => gente.find((g) => g.id === id);
  const limites = limitesInformes(periodo);
  const idsEmpresas = [...new Set(props.map((p) => p.empresaId).filter((x): x is number => !!x))];
  const listaEmpresas = idsEmpresas.length
    ? await db.select({ id: empresas.id, nombre: empresas.nombre, habilitada: empresas.habilitada }).from(empresas).where(inArray(empresas.id, idsEmpresas))
    : [];
  const conInformeFinal = (versionId: number | null) => {
    const d = defs.find((x) => x.id === versionId)?.definicion as { etapas?: { tipo: string }[] } | undefined;
    return !!d?.etapas?.some((e) => e.tipo === "informe_final");
  };
  // Períodos de la ejecución según la ficha (columnas del plan son subperíodos; un informe por período).
  const periodosDe = (versionId: number | null) => {
    const d = defs.find((x) => x.id === versionId)?.definicion as { etapas?: { tipo: string; periodos?: number }[] } | undefined;
    const n = Number(d?.etapas?.find((e) => e.tipo === "ejecucion")?.periodos);
    return Number.isInteger(n) && n > 0 ? Math.min(n, 36) : 5;
  };

  const filas: FilaSeguimiento[] = [];
  for (const p of props) {
    const lider = persona(p.egresadoId);
    if (!lider || !enAlcance(lider, filtro)) continue;
    let entregas: EntregaSeguimiento[];
    let informeFinal: FilaSeguimiento["informeFinal"] = "pendiente";
    const plan = planes.find((x) => x.propuestaId === p.id);
    if (!p.fichaVersionId || !plan) {
      // Pasantía (fase 1): cinco informes mensuales; el quinto es el informe final.
      entregas = limites.map((limite, i) => {
        const inf = mensuales.find((m) => m.propuestaId === p.id && m.numero === i + 1);
        const enviado = inf && inf.estado !== "redactando" ? dia(inf.enviadoEn) ?? dia(inf.fechaLimite) : null;
        return { nombre: i === 4 ? "Informe final" : `Informe ${i + 1}`, limite: inf ? dia(inf.fechaLimite)! : limite, enviado, observado: inf?.estado === "observado" };
      });
      const quinto = mensuales.find((m) => m.propuestaId === p.id && m.numero === 5);
      informeFinal = quinto?.estado === "aprobado" ? "aprobado" : quinto && quinto.estado !== "redactando" ? "entregado" : "pendiente";
    } else {
      // Proyecto e investigación: un informe por período del plan y, si la ficha lo pide, el informe final por capítulos.
      const nPeriodos = periodosDe(p.fichaVersionId);
      entregas = Array.from({ length: nPeriodos }, (_, i) => {
        const envios = delPlan.filter((x) => x.propuestaId === p.id && x.periodo === i + 1);
        const primero = envios.map((x) => dia(x.enviadoEn)!).sort()[0] ?? null;
        return { nombre: `Informe del período ${i + 1}`, limite: limites[Math.min(i, 4)], enviado: primero, observado: envios.some((x) => x.estado === "observado") };
      });
      const fin = finales.find((x) => x.propuestaId === p.id);
      if (conInformeFinal(p.fichaVersionId)) {
        entregas.push({ nombre: "Informe final", limite: periodo.maxInformeFinal, enviado: fin && fin.estado !== "redactando" ? dia(fin.entregadoEn) : null, observado: false });
        informeFinal = fin?.estado === "aprobado" ? "aprobado" : fin?.estado === "entregado" ? "entregado" : "pendiente";
      } else {
        const ultimo = delPlan.filter((x) => x.propuestaId === p.id && x.periodo === nPeriodos);
        informeFinal = ultimo.some((x) => x.estado === "aprobado") ? "aprobado" : ultimo.length ? "entregado" : "pendiente";
      }
    }
    const calculo = calcularSeguimiento(entregas, informeFinal === "aprobado", corte);
    const sinEnviar = entregas.filter((e) => !e.enviado || e.enviado > corte);
    filas.push({
      ...calculo, propuestaId: p.id, modalidad: p.tipo, titulo: p.titulo ?? "(sin título)", egresado: lider.nombre,
      integrantes: miembros.filter((m) => m.propuestaId === p.id).map((m) => persona(m.egresadoId)?.nombre ?? "").filter(Boolean),
      carrera: lider.carrera ?? "Sin carrera", asesor: persona(p.asesorId)?.nombre ?? null, asesorId: p.asesorId,
      empresaId: p.empresaId, empresa: listaEmpresas.find((e) => e.id === p.empresaId)?.nombre ?? null,
      empresaHabilitada: listaEmpresas.find((e) => e.id === p.empresaId)?.habilitada ?? null,
      entregas, soloFalta: sinEnviar.length === 1 && sinEnviar[0] === entregas.at(-1) ? "final" : "mas", informeFinal,
    });
  }
  filas.sort((a, b) => b.diasRetraso - a.diasRetraso || a.egresado.localeCompare(b.egresado, "es"));

  // Asesores: con sus trabajos en esta cohorte y los que ya llevan en otras cohortes activas.
  const otras = await db.select({ asesorId: propuestas.asesorId, periodoId: propuestas.periodoId, estado: propuestas.estado }).from(propuestas)
    .innerJoin(periodos, eq(propuestas.periodoId, periodos.id)).where(eq(periodos.activo, true));
  const orden = ["disponible", "terminando", "ocupado"];
  const asesores: FilaAsesor[] = [...new Set(filas.map((f) => f.asesorId).filter((x): x is number => !!x))].map((id) => {
    const suyos = filas.filter((f) => f.asesorId === id);
    return {
      asesorId: id, asesor: persona(id)?.nombre ?? `Asesor ${id}`, trabajos: suyos.length,
      terminados: suyos.filter((f) => f.estado === "terminado").length, retrasados: suyos.filter((f) => f.estado === "retrasado").length,
      diasRetrasoMax: Math.max(0, ...suyos.map((f) => f.diasRetraso)),
      enOtrasCohortes: otras.filter((o) => o.asesorId === id && o.periodoId !== periodoId && !["rechazada", "anulada", "redactando"].includes(o.estado)).length,
      disponibilidad: disponibilidadAsesor(suyos),
    };
  }).sort((a, b) => orden.indexOf(a.disponibilidad) - orden.indexOf(b.disponibilidad) || a.asesor.localeCompare(b.asesor, "es"));

  return { success: true, datos: { hoy, corte, diario: !filtro.hasta && auto.diario, proximo: filtro.hasta ? null : auto.proximo, automatico, filas, asesores } };
}

// ── Resumen del cierre administrativo (entrega K3) ──

export interface ResumenCierre {
  corte: string;
  trabajos: number;
  egresados: number;
  finalizaron: number;
  porCarrera: { carrera: string; trabajos: number; egresados: number; finalizaron: number; empresas: number }[];
  porAsesor: { asesor: string; trabajos: number; egresados: number; finalizaron: number; empresas: string[] }[];
  empresas: { empresa: string; sigue: boolean; trabajos: number; egresados: number; asesores: string[]; carreras: string[] }[];
}

/**
 * Resumen de la cohorte al cierre administrativo: egresados que finalizaron, empresas que participaron (las que siguen y
 * las dadas de baja), egresados por asesor y asesor por empresa. Por defecto, al día de hoy; con fechas, a la fecha «hasta».
 */
export async function getResumenCierre(periodoId: number, filtro: FiltroInforme): Promise<Resultado<ResumenCierre>> {
  const hoy = hoyIso();
  const r = await getInformeFinalizando(periodoId, { ...filtro, hasta: filtro.hasta || hoy });
  if (!r.success) return r;
  const filas = r.datos.filas;
  const personasDe = (f: FilaSeguimiento) => 1 + f.integrantes.length;
  const fin = (f: FilaSeguimiento) => f.estado === "terminado";
  const suma = (g: FilaSeguimiento[], v: (f: FilaSeguimiento) => number) => g.reduce((s, f) => s + v(f), 0);
  const grupos = <K extends string>(clave: (f: FilaSeguimiento) => K) => [...new Set(filas.map(clave))].map((k) => [k, filas.filter((f) => clave(f) === k)] as const);
  const unicos = (xs: (string | null)[]) => [...new Set(xs.filter((x): x is string => !!x))].sort((a, b) => a.localeCompare(b, "es"));

  return {
    success: true,
    datos: {
      corte: r.datos.corte,
      trabajos: filas.length,
      egresados: suma(filas, personasDe),
      finalizaron: suma(filas.filter(fin), personasDe),
      porCarrera: grupos((f) => f.carrera).map(([carrera, g]) => ({
        carrera, trabajos: g.length, egresados: suma(g, personasDe), finalizaron: suma(g.filter(fin), personasDe), empresas: unicos(g.map((f) => f.empresa)).length,
      })).sort((a, b) => a.carrera.localeCompare(b.carrera, "es")),
      porAsesor: grupos((f) => f.asesor ?? "Sin asesor").map(([asesor, g]) => ({
        asesor, trabajos: g.length, egresados: suma(g, personasDe), finalizaron: suma(g.filter(fin), personasDe), empresas: unicos(g.map((f) => f.empresa)),
      })).sort((a, b) => b.egresados - a.egresados || a.asesor.localeCompare(b.asesor, "es")),
      empresas: grupos((f) => f.empresa ?? "").filter(([e]) => e).map(([empresa, g]) => ({
        empresa, sigue: g[0].empresaHabilitada !== false, trabajos: g.length, egresados: suma(g, personasDe),
        asesores: unicos(g.map((f) => f.asesor)), carreras: unicos(g.map((f) => f.carrera)),
      })).sort((a, b) => Number(a.sigue) - Number(b.sigue) || a.empresa.localeCompare(b.empresa, "es")),
    },
  };
}
