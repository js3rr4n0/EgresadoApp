import "server-only";
// D6 (specs/COORDINADOR_ASIGNACION.md): egresados de la cohorte en las carreras de quien consulta, cuántos ya enviaron
// su propuesta y cuántos faltan, comparado con los lugares disponibles de los asesores (D5). Cada persona cuenta por
// la propuesta en la que participa (líder o integrante aceptado), como el informe de recepción del administrador.

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { carreras, integrantesProyecto, propuestas, usuarios } from "@/lib/schema";
import { alcanceCoordinacion } from "@/lib/alcanceCoordinacionServidor";
import { cuposAsesores } from "@/lib/cuposAsesoresServidor";

export type EstadoEgresado = "enviada" | "devuelta" | "en_redaccion" | "sin_propuesta";

export const NOMBRE_ESTADO_EGRESADO: Record<EstadoEgresado, string> = {
  enviada: "Ya envió",
  devuelta: "Devuelta para corregir",
  en_redaccion: "En redacción",
  sin_propuesta: "Sin empezar",
};

/** Estados en que la propuesta todavía está con el egresado (no cuenta como recibida). */
const CON_EL_EGRESADO = ["redactando", "borrador", "pend_empresa_nueva", "pend_revision_datos", "empresa_aprobada", "empresa_rechazada", "datos_aprobados", "datos_rechazados"];

export interface EgresadoPorRecibir {
  id: number;
  nombre: string;
  carnet: string | null;
  correo: string;
  carreraId: number;
  carrera: string;
  estado: EstadoEgresado;
  propuesta: { numero: number; tipo: string; titulo: string | null } | null;
  /** Participa en una propuesta de grupo. */
  enGrupo: boolean;
}

export interface CarreraPorRecibir {
  id: number;
  nombre: string;
  registrados: number;
  enviadas: number;
  enRedaccion: number;
  devueltas: number;
  sinEmpezar: number;
  porRecibir: number;
  lugaresDisponibles: number;
}

export interface DatosPorRecibir {
  cohortes: { id: number; nombre: string }[];
  cohorte: { id: number; nombre: string } | null;
  sinConfiguracion: boolean;
  carreras: CarreraPorRecibir[];
  egresados: EgresadoPorRecibir[];
  /** Lugares de todos los asesores, contando una vez a quien atiende varias carreras. */
  lugaresTotales: number;
}

export async function propuestasPorRecibir(usuario: { id: number; rol: string }, periodoPedido?: number): Promise<DatosPorRecibir> {
  const alc = await alcanceCoordinacion(usuario, periodoPedido);
  const base: DatosPorRecibir = { cohortes: alc.cohortes, cohorte: alc.cohorte, sinConfiguracion: alc.sinConfiguracion, carreras: [], egresados: [], lugaresTotales: 0 };
  if (!alc.cohorte || !alc.carreras.size) return base;
  const ids = [...alc.carreras];

  const [gente, listaCarreras, props, cupos] = await Promise.all([
    db
      .select({ id: usuarios.id, nombre: usuarios.nombreCompleto, carnet: usuarios.carnet, correo: usuarios.correo, carreraId: usuarios.carreraId })
      .from(usuarios)
      .where(and(eq(usuarios.rol, "egresado"), eq(usuarios.activo, true), eq(usuarios.cohorte, alc.cohorte.nombre), inArray(usuarios.carreraId, ids))),
    db.select({ id: carreras.id, nombre: carreras.nombre }).from(carreras).where(inArray(carreras.id, ids)),
    db
      .select({ id: propuestas.id, egresadoId: propuestas.egresadoId, numero: propuestas.numero, tipo: propuestas.tipo, titulo: propuestas.titulo, estado: propuestas.estado, enviadaEn: propuestas.enviadaEn })
      .from(propuestas)
      .where(eq(propuestas.periodoId, alc.cohorte.id)),
    cuposAsesores(usuario, alc.cohorte.id),
  ]);
  const vigentes = props.filter((p) => p.estado !== "anulada");
  const miembros = vigentes.length
    ? await db
        .select({ propuestaId: integrantesProyecto.propuestaId, egresadoId: integrantesProyecto.egresadoId })
        .from(integrantesProyecto)
        .where(and(inArray(integrantesProyecto.propuestaId, vigentes.map((p) => p.id)), eq(integrantesProyecto.estado, "aceptado")))
    : [];
  const participa = new Map<number, { p: (typeof vigentes)[number]; grupo: boolean }[]>();
  for (const p of vigentes) {
    const otros = miembros.filter((m) => m.propuestaId === p.id).map((m) => m.egresadoId);
    for (const id of [p.egresadoId, ...otros]) participa.set(id, [...(participa.get(id) ?? []), { p, grupo: otros.length > 0 }]);
  }

  const estadoDe = (p: (typeof vigentes)[number]): EstadoEgresado =>
    p.estado === "rechazada" ? "devuelta" : !p.enviadaEn || CON_EL_EGRESADO.includes(p.estado) ? "en_redaccion" : "enviada";
  const PESO: Record<EstadoEgresado, number> = { enviada: 3, devuelta: 2, en_redaccion: 1, sin_propuesta: 0 };
  const nombreCarrera = (id: number) => listaCarreras.find((c) => c.id === id)?.nombre ?? "Sin carrera";

  const egresados: EgresadoPorRecibir[] = gente
    .filter((g): g is typeof g & { carreraId: number } => g.carreraId != null)
    .map((g) => {
      // La propuesta más avanzada en la que participa
      const suyas = (participa.get(g.id) ?? []).sort((a, b) => PESO[estadoDe(b.p)] - PESO[estadoDe(a.p)] || b.p.id - a.p.id);
      const top = suyas[0];
      return {
        id: g.id,
        nombre: g.nombre,
        carnet: g.carnet,
        correo: g.correo,
        carreraId: g.carreraId,
        carrera: nombreCarrera(g.carreraId),
        estado: top ? estadoDe(top.p) : "sin_propuesta",
        propuesta: top ? { numero: top.p.numero, tipo: top.p.tipo, titulo: top.p.titulo } : null,
        enGrupo: !!top?.grupo,
      };
    })
    .sort((a, b) => a.carrera.localeCompare(b.carrera, "es") || a.nombre.localeCompare(b.nombre, "es"));

  // Lugares por carrera (D5). Una carrera repetida en varias facultades (sede) suma sus asesores.
  const lugares = new Map<number, number>();
  for (const c of cupos.carreras) lugares.set(c.id, (lugares.get(c.id) ?? 0) + c.disponibles);

  const filas: CarreraPorRecibir[] = ids
    .map((id) => {
      const de = egresados.filter((e) => e.carreraId === id);
      const cuenta = (e: EstadoEgresado) => de.filter((x) => x.estado === e).length;
      return {
        id,
        nombre: nombreCarrera(id),
        registrados: de.length,
        enviadas: cuenta("enviada"),
        enRedaccion: cuenta("en_redaccion"),
        devueltas: cuenta("devuelta"),
        sinEmpezar: cuenta("sin_propuesta"),
        porRecibir: de.length - cuenta("enviada"),
        lugaresDisponibles: lugares.get(id) ?? 0,
      };
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  const unicos = new Map(cupos.carreras.flatMap((c) => c.asesores).map((a) => [a.id, a.disponibles]));
  return { ...base, carreras: filas, egresados, lugaresTotales: [...unicos.values()].reduce((n, x) => n + x, 0) };
}
