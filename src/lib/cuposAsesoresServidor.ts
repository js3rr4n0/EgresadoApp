import "server-only";
// D5 (specs/COORDINADOR_ASIGNACION.md): cupos de los asesores de una cohorte, agrupados por las carreras que ve quien
// consulta (coordinador: las suyas en la configuración; administrador de facultad: su facultad; superadministrador: todas).
// La carga es la de todo el asesor (procesos en curso más solicitudes pendientes), sin importar la cohorte.

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { propuestas, solicitudesAsesor } from "@/lib/schema";
import { alcanceCoordinacion } from "@/lib/alcanceCoordinacionServidor";
import { cupoDe, estadoCupo, type EstadoCupo } from "@/lib/configCohorte";

const ESTADOS_ACTIVOS = ["aprobada", "primer_contacto_completado", "en_ejecucion"];

export interface ProcesoCupo {
  propuestaId: number;
  numero: number;
  titulo: string;
  /** «en curso» o «solicitud pendiente». */
  tipo: "en_curso" | "pendiente";
  estado: string;
}

export interface AsesorCupo {
  id: number;
  nombre: string;
  correo: string;
  activos: number;
  pendientes: number;
  cupo: number;
  disponibles: number;
  estado: EstadoCupo;
  /** Atiende todas las carreras de la facultad (no se le asignaron carreras). */
  todasLasCarreras: boolean;
  procesos: ProcesoCupo[];
}

export interface CarreraCupos {
  id: number;
  nombre: string;
  facultad: string;
  asesores: AsesorCupo[];
  disponibles: number;
}

export interface DatosCupos {
  cohortes: { id: number; nombre: string }[];
  cohorte: { id: number; nombre: string } | null;
  carreras: CarreraCupos[];
  /** El usuario no aparece en la configuración de la cohorte (coordinador). */
  sinConfiguracion: boolean;
}

export async function cuposAsesores(usuario: { id: number; rol: string }, periodoPedido?: number): Promise<DatosCupos> {
  const alc = await alcanceCoordinacion(usuario, periodoPedido);
  const { cohortes, datos } = alc;
  const elegida = alc.cohorte;
  const vacio: DatosCupos = { cohortes, cohorte: elegida, carreras: [], sinConfiguracion: alc.sinConfiguracion };
  if (!datos || alc.sinConfiguracion) return vacio;
  const enAlcance = alc.carreras;

  // Asesores que participan (habilitados) en las facultades con carreras en el alcance
  const idsAsesores = new Set<number>();
  for (const f of datos.facultades) for (const a of f.config?.asesores ?? []) if (a.activo) idsAsesores.add(a.usuarioId);
  const ids = [...idsAsesores];
  const [enCurso, pendientes] = ids.length
    ? await Promise.all([
        db
          .select({ asesorId: propuestas.asesorId, id: propuestas.id, numero: propuestas.numero, titulo: propuestas.titulo, estado: propuestas.estado })
          .from(propuestas)
          .where(and(inArray(propuestas.asesorId, ids), inArray(propuestas.estado, ESTADOS_ACTIVOS))),
        db
          .select({ asesorId: solicitudesAsesor.asesorId, id: propuestas.id, numero: propuestas.numero, titulo: propuestas.titulo, estado: propuestas.estado })
          .from(solicitudesAsesor)
          .innerJoin(propuestas, eq(propuestas.id, solicitudesAsesor.propuestaId))
          .where(and(inArray(solicitudesAsesor.asesorId, ids), eq(solicitudesAsesor.estado, "pendiente"))),
      ])
    : [[], []];

  const porId = new Map(datos.asesores.map((u) => [u.id, u]));
  const ficha = (usuarioId: number, cupo: number, todas: boolean): AsesorCupo => {
    const u = porId.get(usuarioId);
    const c = enCurso.filter((x) => x.asesorId === usuarioId);
    const p = pendientes.filter((x) => x.asesorId === usuarioId);
    const carga = c.length + p.length;
    return {
      id: usuarioId,
      nombre: u?.nombre ?? `Asesor ${usuarioId}`,
      correo: u?.correo ?? "",
      activos: c.length,
      pendientes: p.length,
      cupo,
      disponibles: Math.max(0, cupo - carga),
      estado: estadoCupo(carga, cupo),
      todasLasCarreras: todas,
      procesos: [
        ...c.map((x) => ({ propuestaId: x.id, numero: x.numero, titulo: x.titulo || `Propuesta #${x.numero}`, tipo: "en_curso" as const, estado: x.estado })),
        ...p.map((x) => ({ propuestaId: x.id, numero: x.numero, titulo: x.titulo || `Propuesta #${x.numero}`, tipo: "pendiente" as const, estado: x.estado })),
      ],
    };
  };

  const carreras: CarreraCupos[] = [];
  for (const f of datos.facultades) {
    if (!f.config) continue;
    for (const car of f.carreras) {
      if (!enAlcance.has(car.id)) continue;
      const asesores = f.config.asesores
        .filter((a) => a.activo && (a.carreras.length === 0 || a.carreras.includes(car.id)))
        .map((a) => ficha(a.usuarioId, cupoDe(a), a.carreras.length === 0))
        .sort((a, b) => b.disponibles - a.disponibles || a.nombre.localeCompare(b.nombre, "es"));
      carreras.push({ id: car.id, nombre: car.nombre, facultad: f.nombre, asesores, disponibles: asesores.reduce((n, a) => n + a.disponibles, 0) });
    }
  }
  carreras.sort((a, b) => a.facultad.localeCompare(b.facultad, "es") || a.nombre.localeCompare(b.nombre, "es"));
  return { cohortes, cohorte: elegida, carreras, sinConfiguracion: false };
}
