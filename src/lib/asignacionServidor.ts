import "server-only";
// Regla de asignación de una propuesta según la configuración de su cohorte (specs/CONFIGURACION_COHORTE.md, C2):
// qué coordinadores se pueden elegir, si la facultad trabaja sin coordinador y qué asesores participan.

import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { carreras, facultades, periodos, propuestas, solicitudesAsesor, usuarios } from "@/lib/schema";
import { configDeFacultad } from "@/lib/configCohorteServidor";
import { NOMBRE_COORDINACION, coordinadoresPermitidos, type ConfigFacultad } from "@/lib/configCohorte";
import { pesoPrioridad, type PrioridadAsesor } from "@/lib/prioridadAsesor";
import { cupoDe } from "@/lib/configCohorte";

const ESTADOS_ACTIVOS = ["aprobada", "primer_contacto_completado", "en_ejecucion"];

export interface ReglaAsignacion {
  propuestaId: number;
  periodoId: number;
  cohorte: string;
  facultad: { id: number; nombre: string } | null;
  carrera: { id: number; nombre: string } | null;
  /** La cohorte tiene configuración para la facultad del egresado. */
  configurada: boolean;
  config: ConfigFacultad | null;
  /** Texto para mostrar: «Coordinador por carrera: Ingeniería Civil». */
  regla: string;
  /** null = sin configuración: se permite cualquiera (comportamiento anterior). */
  coordinadores: number[] | null;
  /** El administrador de facultad puede ser el coordinador. */
  adminFacultadId: number | null;
  sinCoordinador: boolean;
  /** null = sin configuración: asesores de la facultad (comportamiento anterior). */
  asesores: number[] | null;
}

export async function reglaDePropuesta(propuestaId: number): Promise<ReglaAsignacion | null> {
  const [p] = await db
    .select({
      id: propuestas.id,
      periodoId: propuestas.periodoId,
      cohorte: periodos.nombre,
      carreraId: usuarios.carreraId,
      facultadId: usuarios.facultadId,
    })
    .from(propuestas)
    .innerJoin(periodos, eq(periodos.id, propuestas.periodoId))
    .innerJoin(usuarios, eq(usuarios.id, propuestas.egresadoId))
    .where(eq(propuestas.id, propuestaId));
  if (!p) return null;

  const [fac] = p.facultadId ? await db.select({ id: facultades.id, nombre: facultades.nombre }).from(facultades).where(eq(facultades.id, p.facultadId)) : [];
  const [car] = p.carreraId ? await db.select({ id: carreras.id, nombre: carreras.nombre }).from(carreras).where(eq(carreras.id, p.carreraId)) : [];
  const config = p.facultadId ? await configDeFacultad(p.periodoId, p.facultadId) : null;

  const base = {
    propuestaId: p.id,
    periodoId: p.periodoId,
    cohorte: p.cohorte,
    facultad: fac ?? null,
    carrera: car ?? null,
  };
  if (!config) {
    return {
      ...base,
      configurada: false,
      config: null,
      regla: "La cohorte no tiene configuración para esta facultad: se muestran todos los coordinadores.",
      coordinadores: null,
      adminFacultadId: null,
      sinCoordinador: false,
      asesores: null,
    };
  }

  const permitidos = coordinadoresPermitidos(config, p.carreraId);
  const asesores = config.asesores.filter((a) => a.activo && (a.carreras.length === 0 || (p.carreraId != null && a.carreras.includes(p.carreraId)))).map((a) => a.usuarioId);
  let regla = NOMBRE_COORDINACION[config.coordinacion];
  if (config.coordinacion === "por_carrera") regla += `: ${car?.nombre ?? "carrera del egresado"}`;
  if (permitidos.sinCoordinador) {
    regla = config.coordinacion === "sin_coordinador"
      ? config.administracion === "facultad" ? "La facultad trabaja sin coordinador en esta cohorte: la administración de la facultad asigna el asesor." : "La facultad trabaja sin coordinador en esta cohorte: el superadministrador asigna el asesor."
      : `La carrera ${car?.nombre ?? ""} no tiene coordinador en esta cohorte: el superadministrador asigna el asesor.`;
  }
  return {
    ...base,
    configurada: true,
    config,
    regla,
    coordinadores: permitidos.coordinadores,
    adminFacultadId: permitidos.adminFacultad ? config.adminFacultadId : null,
    sinCoordinador: permitidos.sinCoordinador,
    asesores,
  };
}

export interface OpcionAsesor {
  id: number;
  nombre: string;
  correo: string;
  carreras: string[];
  /** Procesos en curso como asesor. */
  activos: number;
  /** Solicitudes de asesoría pendientes de responder. */
  pendientes: number;
  deLaCarrera: boolean;
  /** A6: ya trabaja o trabajó con la empresa de la propuesta. */
  prioridad: PrioridadAsesor | null;
  /** D5: máximo de procesos en curso más solicitudes pendientes, y si ya lo alcanzó. */
  cupo: number;
  lleno: boolean;
}

/**
 * A6: asesores que aceptaron propuestas de la misma empresa (cualquier estado salvo rechazada o anulada), separando la
 * cohorte de esta propuesta de las anteriores. Sin empresa, vacío.
 */
export async function prioridadPorEmpresa(propuestaId: number): Promise<Map<number, PrioridadAsesor>> {
  const mapa = new Map<number, PrioridadAsesor>();
  const [p] = await db.select({ empresaId: propuestas.empresaId, periodoId: propuestas.periodoId }).from(propuestas).where(eq(propuestas.id, propuestaId));
  if (!p?.empresaId) return mapa;
  const filas = await db
    .select({ id: propuestas.id, asesorId: propuestas.asesorId, estado: propuestas.estado, periodoId: propuestas.periodoId, cohorte: periodos.nombre })
    .from(propuestas)
    .innerJoin(periodos, eq(periodos.id, propuestas.periodoId))
    .where(eq(propuestas.empresaId, p.empresaId))
    .orderBy(desc(periodos.id));
  for (const f of filas) {
    if (f.id === propuestaId || f.asesorId == null || ["rechazada", "anulada"].includes(f.estado)) continue;
    const actual = mapa.get(f.asesorId) ?? { actual: 0, cohortesAnteriores: [] };
    if (f.periodoId === p.periodoId) actual.actual += 1;
    else if (!actual.cohortesAnteriores.includes(f.cohorte)) actual.cohortesAnteriores.push(f.cohorte);
    mapa.set(f.asesorId, actual);
  }
  return mapa;
}

/**
 * Asesores que se pueden solicitar para la propuesta, con su carga, ordenados: primero los prioritarios por la empresa
 * (A6), luego los de la carrera y con menos carga.
 */
export async function opcionesAsesor(regla: ReglaAsignacion): Promise<OpcionAsesor[]> {
  let ids = regla.asesores;
  if (ids === null) {
    // Sin configuración: asesores activos de la facultad (antes también caía a «todos»; ya no)
    const filas = await db
      .select({ id: usuarios.id })
      .from(usuarios)
      .where(and(eq(usuarios.rol, "asesor"), eq(usuarios.activo, true), regla.facultad ? eq(usuarios.facultadId, regla.facultad.id) : undefined));
    ids = filas.map((f) => f.id);
  }
  if (ids.length === 0) return [];
  const [gente, cargas, pend, listaCarreras, prioridad] = await Promise.all([
    db
      .select({ id: usuarios.id, nombre: usuarios.nombreCompleto, correo: usuarios.correo, carreraId: usuarios.carreraId, asignadas: usuarios.carrerasAsignadas, activo: usuarios.activo })
      .from(usuarios)
      .where(inArray(usuarios.id, ids)),
    db.select({ asesorId: propuestas.asesorId }).from(propuestas).where(and(inArray(propuestas.asesorId, ids), inArray(propuestas.estado, ESTADOS_ACTIVOS))),
    db.select({ asesorId: solicitudesAsesor.asesorId }).from(solicitudesAsesor).where(and(inArray(solicitudesAsesor.asesorId, ids), eq(solicitudesAsesor.estado, "pendiente"))),
    db.select({ id: carreras.id, nombre: carreras.nombre }).from(carreras),
    prioridadPorEmpresa(regla.propuestaId),
  ]);
  const idsCarrera = (g: (typeof gente)[number]) =>
    [...new Set([g.carreraId, ...(Array.isArray(g.asignadas) ? (g.asignadas as number[]) : [])].filter((x): x is number => typeof x === "number"))];
  // En la configuración, las carreras del asesor en la cohorte pesan más que las de su perfil
  const carrerasCohorte = (id: number) => regla.config?.asesores.find((a) => a.usuarioId === id)?.carreras ?? [];

  return gente
    .filter((g) => g.activo)
    .map((g) => {
      const propias = carrerasCohorte(g.id).length ? carrerasCohorte(g.id) : idsCarrera(g);
      const activos = cargas.filter((c) => c.asesorId === g.id).length;
      const pendientes = pend.filter((c) => c.asesorId === g.id).length;
      const cupo = cupoDe(regla.config?.asesores.find((a) => a.usuarioId === g.id));
      return {
        cupo,
        lleno: activos + pendientes >= cupo,
        id: g.id,
        nombre: g.nombre,
        correo: g.correo,
        carreras: propias.map((c) => listaCarreras.find((x) => x.id === c)?.nombre ?? "Carrera"),
        activos: cargas.filter((c) => c.asesorId === g.id).length,
        pendientes: pend.filter((c) => c.asesorId === g.id).length,
        deLaCarrera: regla.carrera != null && propias.includes(regla.carrera.id),
        prioridad: prioridad.get(g.id) ?? null,
      };
    })
    // D5: los de cupo lleno al final; A6: primero quien ya trabaja o trabajó con la empresa
    .sort((a, b) => Number(a.lleno) - Number(b.lleno) || pesoPrioridad(b.prioridad) - pesoPrioridad(a.prioridad) || Number(b.deLaCarrera) - Number(a.deLaCarrera) || a.activos + a.pendientes - (b.activos + b.pendientes) || a.nombre.localeCompare(b.nombre, "es"));
}

/** Última solicitud de asesoría de la propuesta (para mostrar si está pendiente, aceptada o rechazada). */
export async function ultimaSolicitudAsesor(propuestaId: number) {
  const [s] = await db
    .select({
      id: solicitudesAsesor.id,
      estado: solicitudesAsesor.estado,
      asesorId: solicitudesAsesor.asesorId,
      asesor: usuarios.nombreCompleto,
      justificacion: solicitudesAsesor.justificacionRechazo,
      creadaEn: solicitudesAsesor.creadaEn,
      respondidoEn: solicitudesAsesor.respondidoEn,
    })
    .from(solicitudesAsesor)
    .innerJoin(usuarios, eq(usuarios.id, solicitudesAsesor.asesorId))
    .where(eq(solicitudesAsesor.propuestaId, propuestaId))
    .orderBy(desc(solicitudesAsesor.id))
    .limit(1);
  return s
    ? { ...s, creadaEn: s.creadaEn ? s.creadaEn.toISOString() : null, respondidoEn: s.respondidoEn ? s.respondidoEn.toISOString() : null }
    : null;
}
