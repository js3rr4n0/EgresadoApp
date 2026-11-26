import "server-only";
// Gestión de asesores (entrega V5): datos de la tabla y del detalle de cada asesor, con su récord de valoraciones.
// Lo usan páginas del administrador y del coordinador, que ya validan la sesión.

import { and, desc, eq, inArray, isNotNull, or } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  bitacoraUsuarios,
  carreras,
  empresas,
  integrantesProyecto,
  periodos,
  propuestas,
  solicitudesBaja,
  usuarios,
  valoraciones,
} from "@/lib/schema";
import { cierreDeProcesos } from "@/lib/valoracionesServidor";
import { promedio, resumir, type ResumenValoracion, type ValoracionGuardada } from "@/lib/valoraciones";
import type { Modalidad } from "@/lib/estadisticasEmpresas";

const ESTADOS_ACTIVOS = ["aprobada", "primer_contacto_completado", "en_ejecucion"];

export interface FilaAsesor {
  id: number;
  facultadId: number | null;
  nombre: string;
  correo: string;
  activo: boolean;
  carreras: string[];
  carreraIds: number[];
  procesosActivos: number;
  procesosCerrados: number;
  bajas: number;
  empresas: number;
  cohortes: string[]; // de la más reciente a la más antigua
  nota: ResumenValoracion;
}

export interface ProcesoAsesor {
  propuestaId: number;
  titulo: string;
  modalidad: Modalidad;
  cohorte: string;
  cohorteInicio: string;
  empresa: { id: number; nombre: string } | null;
  egresados: string[];
  estado: "en_curso" | "cerrado" | "baja";
  cerradoEn: string | null;
  /** Promedio de las valoraciones que le dieron los egresados de este proceso. */
  notaRecibida: number | null;
}

interface Base {
  asesores: { id: number; nombre: string; correo: string; activo: boolean; carreraId: number | null; asignadas: unknown; facultadId: number | null }[];
  nombresCarrera: Map<number, string>;
  procesos: (ProcesoAsesor & { asesorId: number; empresaId: number | null })[];
  valoracionesPorAsesor: Map<number, ValoracionGuardada[]>;
}

const idsCarreras = (a: { carreraId: number | null; asignadas: unknown }) =>
  [...new Set([a.carreraId, ...(Array.isArray(a.asignadas) ? (a.asignadas as number[]) : [])].filter((x): x is number => typeof x === "number"))];

async function leerBase(soloAsesor?: number): Promise<Base> {
  const asesores = await db
    .select({ id: usuarios.id, nombre: usuarios.nombreCompleto, correo: usuarios.correo, activo: usuarios.activo, carreraId: usuarios.carreraId, asignadas: usuarios.carrerasAsignadas, facultadId: usuarios.facultadId })
    .from(usuarios)
    .where(and(eq(usuarios.rol, "asesor"), soloAsesor ? eq(usuarios.id, soloAsesor) : undefined));
  const listaCarreras = await db.select({ id: carreras.id, nombre: carreras.nombre }).from(carreras);
  const nombresCarrera = new Map(listaCarreras.map((c) => [c.id, c.nombre]));
  const ids = asesores.map((a) => a.id);
  if (ids.length === 0) return { asesores, nombresCarrera, procesos: [], valoracionesPorAsesor: new Map() };

  const props = await db
    .select({
      id: propuestas.id,
      asesorId: propuestas.asesorId,
      titulo: propuestas.titulo,
      tipo: propuestas.tipo,
      estado: propuestas.estado,
      egresadoId: propuestas.egresadoId,
      empresaId: propuestas.empresaId,
      empresa: empresas.nombre,
      cohorte: periodos.nombre,
      cohorteInicio: periodos.inicioRecepcion,
    })
    .from(propuestas)
    .innerJoin(periodos, eq(periodos.id, propuestas.periodoId))
    .leftJoin(empresas, eq(empresas.id, propuestas.empresaId))
    .where(
      and(
        inArray(propuestas.asesorId, ids),
        or(inArray(propuestas.estado, ESTADOS_ACTIVOS), and(eq(propuestas.estado, "anulada"), isNotNull(propuestas.fechaAprobacion))),
      ),
    );
  const idsProps = props.map((p) => p.id);

  const [bajas, miembros, cierre, filasVal] = await Promise.all([
    idsProps.length
      ? db.select({ propuestaId: solicitudesBaja.propuestaId }).from(solicitudesBaja).where(and(inArray(solicitudesBaja.propuestaId, idsProps), eq(solicitudesBaja.estado, "aprobada")))
      : Promise.resolve([]),
    idsProps.length
      ? db
          .select({ propuestaId: integrantesProyecto.propuestaId, egresadoId: integrantesProyecto.egresadoId })
          .from(integrantesProyecto)
          .where(and(inArray(integrantesProyecto.propuestaId, idsProps), inArray(integrantesProyecto.estado, ["aceptado", "concluido"])))
      : Promise.resolve([]),
    cierreDeProcesos(props.filter((p) => p.estado !== "anulada").map((p) => p.id)),
    db
      .select({
        propuestaId: valoraciones.propuestaId,
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
      .where(and(eq(valoraciones.objetivo, "asesor"), inArray(valoraciones.evaluadoId, ids))),
  ]);

  const idsEgresados = [...new Set([...props.map((p) => p.egresadoId), ...miembros.map((m) => m.egresadoId)])];
  const egresados = idsEgresados.length
    ? await db.select({ id: usuarios.id, nombre: usuarios.nombreCompleto }).from(usuarios).where(inArray(usuarios.id, idsEgresados))
    : [];
  const nombre = (id: number) => egresados.find((e) => e.id === id)?.nombre ?? "Egresado";

  const valoracionesPorAsesor = new Map<number, ValoracionGuardada[]>();
  for (const v of filasVal) {
    const g: ValoracionGuardada = {
      propuestaId: v.propuestaId,
      tipo: "egresado_asesor",
      evaluadoId: v.evaluadoId,
      promedio: Number(v.promedio),
      puntajes: v.puntajes as Record<string, number>,
      comentario: v.comentario,
      creadoEn: v.creadoEn.toISOString(),
      cohorte: v.cohorte,
    };
    valoracionesPorAsesor.set(v.evaluadoId, [...(valoracionesPorAsesor.get(v.evaluadoId) ?? []), g]);
  }

  const procesos = props
    .filter((p) => p.estado !== "anulada" || bajas.some((b) => b.propuestaId === p.id))
    .map((p) => {
      const delProceso = (valoracionesPorAsesor.get(p.asesorId!) ?? []).filter((v) => v.propuestaId === p.id);
      const cerradoEn = cierre.get(p.id) ?? null;
      return {
        propuestaId: p.id,
        asesorId: p.asesorId!,
        empresaId: p.empresaId,
        titulo: p.titulo ?? "(sin título)",
        modalidad: p.tipo as Modalidad,
        cohorte: p.cohorte,
        cohorteInicio: p.cohorteInicio,
        empresa: p.empresaId ? { id: p.empresaId, nombre: p.empresa ?? "Empresa" } : null,
        egresados: [...new Set([p.egresadoId, ...miembros.filter((m) => m.propuestaId === p.id).map((m) => m.egresadoId)])].map(nombre),
        estado: (p.estado === "anulada" ? "baja" : cerradoEn ? "cerrado" : "en_curso") as ProcesoAsesor["estado"],
        cerradoEn,
        notaRecibida: promedio(delProceso.map((v) => v.promedio)),
      };
    })
    .sort((a, b) => (a.cohorteInicio !== b.cohorteInicio ? (a.cohorteInicio < b.cohorteInicio ? 1 : -1) : b.propuestaId - a.propuestaId));

  return { asesores, nombresCarrera, procesos, valoracionesPorAsesor };
}

function fila(base: Base, a: Base["asesores"][number]): FilaAsesor {
  const suyos = base.procesos.filter((p) => p.asesorId === a.id);
  const carreraIds = idsCarreras(a);
  return {
    id: a.id,
    facultadId: a.facultadId,
    nombre: a.nombre,
    correo: a.correo,
    activo: a.activo,
    carreras: carreraIds.map((id) => base.nombresCarrera.get(id) ?? "Carrera"),
    carreraIds,
    procesosActivos: suyos.filter((p) => p.estado === "en_curso").length,
    procesosCerrados: suyos.filter((p) => p.estado === "cerrado").length,
    bajas: suyos.filter((p) => p.estado === "baja").length,
    empresas: new Set(suyos.map((p) => p.empresaId).filter(Boolean)).size,
    cohortes: [...new Set(suyos.map((p) => p.cohorte))],
    nota: resumir("egresado_asesor", base.valoracionesPorAsesor.get(a.id) ?? []),
  };
}

/** Asesores para la tabla. Con `carrerasCoordinador`, solo los que atienden alguna de esas carreras. */
export async function leerAsesores(carrerasCoordinador?: number[], facultadId?: number | null): Promise<{ filas: FilaAsesor[]; carreras: string[] }> {
  const base = await leerBase();
  let filas = base.asesores.map((a) => fila(base, a));
  if (facultadId) filas = filas.filter((f) => f.facultadId === facultadId);
  if (carrerasCoordinador && carrerasCoordinador.length) filas = filas.filter((f) => f.carreraIds.some((c) => carrerasCoordinador.includes(c)));
  filas.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  return { filas, carreras: [...new Set(filas.flatMap((f) => f.carreras))].sort() };
}

export interface DetalleAsesor {
  fila: FilaAsesor;
  procesos: ProcesoAsesor[];
  porCohorte: { cohorte: string; promedio: number | null; valoraciones: number }[];
  comentarios: { texto: string; cohorte: string; fecha: string; nota: number }[];
  bitacora: { id: number; fecha: string; activo: boolean; motivo: string; origen: string; autor: string | null }[];
  comoEgresado: { propuestaId: number; titulo: string; cohorte: string; modalidad: string; estado: string }[];
}

export async function leerDetalleAsesor(asesorId: number): Promise<DetalleAsesor | null> {
  const base = await leerBase(asesorId);
  const a = base.asesores[0];
  if (!a) return null;
  const vals = base.valoracionesPorAsesor.get(asesorId) ?? [];

  const cohortes = [...new Set(base.procesos.map((p) => p.cohorte))];
  const porCohorte = cohortes.map((c) => {
    const deC = vals.filter((v) => v.cohorte === c);
    return { cohorte: c, promedio: promedio(deC.map((v) => v.promedio)), valoraciones: deC.length };
  });

  const eventos = await db.select().from(bitacoraUsuarios).where(eq(bitacoraUsuarios.usuarioId, asesorId)).orderBy(desc(bitacoraUsuarios.fecha));
  const idsAutores = [...new Set(eventos.map((e) => e.adminId).filter((x): x is number => !!x))];
  const autores = idsAutores.length ? await db.select({ id: usuarios.id, nombre: usuarios.nombreCompleto }).from(usuarios).where(inArray(usuarios.id, idsAutores)) : [];

  // Historial como egresado: si la misma cuenta hizo su trabajo de graduación antes de ser asesor (pregunta del §4)
  const comoEgresado = await db
    .select({ propuestaId: propuestas.id, titulo: propuestas.titulo, cohorte: periodos.nombre, modalidad: propuestas.tipo, estado: propuestas.estado })
    .from(propuestas)
    .innerJoin(periodos, eq(periodos.id, propuestas.periodoId))
    .where(and(eq(propuestas.egresadoId, asesorId), isNotNull(propuestas.enviadaEn)));

  return {
    fila: fila(base, a),
    procesos: base.procesos,
    porCohorte,
    comentarios: vals
      .filter((v) => v.comentario)
      .sort((x, y) => (x.creadoEn < y.creadoEn ? 1 : -1))
      .map((v) => ({ texto: v.comentario!, cohorte: v.cohorte, fecha: v.creadoEn, nota: v.promedio })),
    bitacora: eventos.map((e) => {
      const d = (e.detalle ?? {}) as { activo?: boolean; motivo?: string; origen?: string };
      return {
        id: e.id,
        fecha: e.fecha.toISOString(),
        activo: d.activo === true,
        motivo: d.motivo ?? "",
        origen: d.origen ?? "asesores",
        autor: e.adminId ? autores.find((x) => x.id === e.adminId)?.nombre ?? null : null,
      };
    }),
    comoEgresado: comoEgresado.map((p) => ({ ...p, titulo: p.titulo ?? "(sin título)" })),
  };
}

/** Carreras que coordina un usuario (su carrera y las asignadas). */
export async function carrerasDeCoordinador(usuarioId: number): Promise<number[]> {
  const [u] = await db.select({ carreraId: usuarios.carreraId, asignadas: usuarios.carrerasAsignadas }).from(usuarios).where(eq(usuarios.id, usuarioId));
  return u ? idsCarreras(u) : [];
}
