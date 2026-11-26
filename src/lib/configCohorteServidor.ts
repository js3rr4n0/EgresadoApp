import "server-only";
// Lectura de la configuración de una cohorte (entrega C1). Lo usan la página del superadministrador y las acciones.

import { asc, desc, eq, inArray, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  carreras,
  carrerasSedes,
  cohorteConfigBitacora,
  cohorteFacultades,
  cohorteParticipantes,
  facultades,
  periodos,
  usuarios,
} from "@/lib/schema";
import type { Administracion, ConfigFacultad, Coordinacion } from "@/lib/configCohorte";

export interface UsuarioConfig {
  id: number;
  nombre: string;
  correo: string;
  facultadId: number | null;
  carreraIds: number[];
  activo: boolean;
}

export interface FacultadConfig {
  id: number;
  nombre: string;
  carreras: { id: number; nombre: string }[];
  config: ConfigFacultad | null;
  actualizadoEn: string | null;
}

export interface DatosConfiguracion {
  periodo: { id: number; nombre: string; inicioRecepcion: string };
  facultades: FacultadConfig[];
  admins: UsuarioConfig[];
  coordinadores: UsuarioConfig[];
  asesores: UsuarioConfig[];
  bitacora: { id: number; fecha: string; facultad: string | null; autor: string | null; cambios: string[]; justificacion: string | null }[];
  anterior: { id: number; nombre: string } | null;
}

/** Configuración guardada de cada facultad de la cohorte (null si la facultad no está configurada). */
export async function leerConfigPorFacultad(periodoId: number): Promise<Map<number, { config: ConfigFacultad; actualizadoEn: string }>> {
  const [filas, part] = await Promise.all([
    db.select().from(cohorteFacultades).where(eq(cohorteFacultades.periodoId, periodoId)),
    db.select().from(cohorteParticipantes).where(eq(cohorteParticipantes.periodoId, periodoId)).orderBy(asc(cohorteParticipantes.id)),
  ]);
  const m = new Map<number, { config: ConfigFacultad; actualizadoEn: string }>();
  for (const f of filas) {
    const deF = part.filter((p) => p.facultadId === f.facultadId);
    const lista = (funcion: string) =>
      deF.filter((p) => p.funcion === funcion).map((p) => ({ usuarioId: p.usuarioId, carreras: (p.carreras as number[]) ?? [], activo: p.activo }));
    m.set(f.facultadId, {
      config: {
        administracion: f.administracion as Administracion,
        adminFacultadId: f.adminFacultadId,
        coordinacion: f.coordinacion as Coordinacion,
        adminCoordina: f.adminCoordina,
        coordinadores: lista("coordinador"),
        asesores: lista("asesor"),
      },
      actualizadoEn: f.actualizadoEn.toISOString(),
    });
  }
  return m;
}

const idsCarreras = (u: { carreraId: number | null; asignadas: unknown }) =>
  [...new Set([u.carreraId, ...(Array.isArray(u.asignadas) ? (u.asignadas as number[]) : [])].filter((x): x is number => typeof x === "number"))];

export async function leerConfiguracionCohorte(periodoId: number): Promise<DatosConfiguracion | null> {
  const [periodo] = await db
    .select({ id: periodos.id, nombre: periodos.nombre, inicioRecepcion: periodos.inicioRecepcion })
    .from(periodos)
    .where(eq(periodos.id, periodoId));
  if (!periodo) return null;

  const [listaFacultades, listaCarreras, sedes, gente, porFacultad, eventos] = await Promise.all([
    db.select({ id: facultades.id, nombre: facultades.nombre }).from(facultades).where(eq(facultades.activo, true)).orderBy(asc(facultades.nombre)),
    db.select({ id: carreras.id, nombre: carreras.nombre, facultadId: carreras.facultadId }).from(carreras).where(eq(carreras.activo, true)).orderBy(asc(carreras.nombre)),
    db.select({ carreraId: carrerasSedes.carreraId, facultadId: carrerasSedes.facultadId }).from(carrerasSedes),
    db
      .select({
        id: usuarios.id,
        nombre: usuarios.nombreCompleto,
        correo: usuarios.correo,
        rol: usuarios.rol,
        facultadId: usuarios.facultadId,
        carreraId: usuarios.carreraId,
        asignadas: usuarios.carrerasAsignadas,
        activo: usuarios.activo,
      })
      .from(usuarios)
      .where(inArray(usuarios.rol, ["decanato", "coordinador", "asesor"]))
      .orderBy(asc(usuarios.nombreCompleto)),
    leerConfigPorFacultad(periodoId),
    db.select().from(cohorteConfigBitacora).where(eq(cohorteConfigBitacora.periodoId, periodoId)).orderBy(desc(cohorteConfigBitacora.fecha)),
  ]);

  // Cohorte anterior con configuración, para copiarla
  const previas = await db
    .select({ id: periodos.id, nombre: periodos.nombre })
    .from(periodos)
    .innerJoin(cohorteFacultades, eq(cohorteFacultades.periodoId, periodos.id))
    .where(lt(periodos.inicioRecepcion, periodo.inicioRecepcion))
    .orderBy(desc(periodos.inicioRecepcion))
    .limit(1);

  const usuarioConfig = (g: (typeof gente)[number]): UsuarioConfig => ({
    id: g.id,
    nombre: g.nombre,
    correo: g.correo,
    facultadId: g.facultadId,
    carreraIds: idsCarreras(g),
    activo: g.activo,
  });
  const nombreFacultad = (id: number | null) => listaFacultades.find((f) => f.id === id)?.nombre ?? null;
  const nombreUsuario = (id: number | null) => gente.find((g) => g.id === id)?.nombre ?? null;

  return {
    periodo,
    facultades: listaFacultades.map((f) => ({
      id: f.id,
      nombre: f.nombre,
      carreras: listaCarreras
        .filter((c) => c.facultadId === f.id || sedes.some((s) => s.carreraId === c.id && s.facultadId === f.id))
        .map((c) => ({ id: c.id, nombre: c.nombre })),
      config: porFacultad.get(f.id)?.config ?? null,
      actualizadoEn: porFacultad.get(f.id)?.actualizadoEn ?? null,
    })),
    admins: gente.filter((g) => g.rol === "decanato").map(usuarioConfig),
    coordinadores: gente.filter((g) => g.rol === "coordinador").map(usuarioConfig),
    asesores: gente.filter((g) => g.rol === "asesor").map(usuarioConfig),
    bitacora: eventos.map((e) => ({
      id: e.id,
      fecha: e.fecha.toISOString(),
      facultad: nombreFacultad(e.facultadId),
      autor: nombreUsuario(e.adminId),
      cambios: (e.cambios as string[]) ?? [],
      justificacion: e.justificacion,
    })),
    anterior: previas[0] && previas[0].id !== periodoId ? previas[0] : null,
  };
}

/** Configuración de una facultad en una cohorte (para la asignación de propuestas, C2). */
export async function configDeFacultad(periodoId: number, facultadId: number): Promise<ConfigFacultad | null> {
  const m = await leerConfigPorFacultad(periodoId);
  return m.get(facultadId)?.config ?? null;
}
