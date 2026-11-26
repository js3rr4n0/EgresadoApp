import "server-only";
// Lectura de los procesos realizados con cada empresa (entrega V1). Solo lo usan páginas del administrador, que ya
// validan la sesión; no es una acción de servidor.

import { and, eq, inArray, isNotNull, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { carreras, integrantesProyecto, periodos, propuestas, usuarios } from "@/lib/schema";
import { ESTADOS_PROCESO, type Modalidad, type ProcesoEmpresa } from "@/lib/estadisticasEmpresas";

const fechaIso = (d: Date | string | null) => (d == null ? null : typeof d === "string" ? d : d.toISOString());

/**
 * Procesos (propuestas aprobadas en adelante) con empresa; si se da `empresaId`, solo los de esa empresa.
 * Con `incluirAnuladas` también trae las anuladas que llegaron a aprobarse (bajas), para el historial (entrega V4).
 */
export async function leerProcesosEmpresas(empresaId?: number, incluirAnuladas = false): Promise<ProcesoEmpresa[]> {
  const filtro = and(
    isNotNull(propuestas.empresaId),
    incluirAnuladas
      ? or(inArray(propuestas.estado, [...ESTADOS_PROCESO]), and(eq(propuestas.estado, "anulada"), isNotNull(propuestas.fechaAprobacion)))
      : inArray(propuestas.estado, [...ESTADOS_PROCESO]),
    empresaId ? eq(propuestas.empresaId, empresaId) : undefined,
  );

  const filas = await db
    .select({
      propuestaId: propuestas.id,
      empresaId: propuestas.empresaId,
      tipo: propuestas.tipo,
      estado: propuestas.estado,
      titulo: propuestas.titulo,
      fechaAprobacion: propuestas.fechaAprobacion,
      egresadoId: propuestas.egresadoId,
      asesorId: propuestas.asesorId,
      periodo: {
        id: periodos.id,
        nombre: periodos.nombre,
        inicioRecepcion: periodos.inicioRecepcion,
        finRecepcion: periodos.finRecepcion,
        maxInicioProceso: periodos.maxInicioProceso,
        maxInformeFinal: periodos.maxInformeFinal,
        maxAprobacionFinal: periodos.maxAprobacionFinal,
      },
    })
    .from(propuestas)
    .innerJoin(periodos, eq(periodos.id, propuestas.periodoId))
    .where(filtro);

  if (filas.length === 0) return [];

  const ids = filas.map((f) => f.propuestaId);
  const integrantes = await db
    .select({ propuestaId: integrantesProyecto.propuestaId, egresadoId: integrantesProyecto.egresadoId })
    .from(integrantesProyecto)
    .where(and(inArray(integrantesProyecto.propuestaId, ids), inArray(integrantesProyecto.estado, ["aceptado", "concluido"])));

  const idsUsuarios = new Set<number>();
  filas.forEach((f) => {
    idsUsuarios.add(f.egresadoId);
    if (f.asesorId) idsUsuarios.add(f.asesorId);
  });
  integrantes.forEach((i) => idsUsuarios.add(i.egresadoId));

  const personas = await db
    .select({ id: usuarios.id, nombre: usuarios.nombreCompleto, carrera: carreras.nombre })
    .from(usuarios)
    .leftJoin(carreras, eq(carreras.id, usuarios.carreraId))
    .where(inArray(usuarios.id, [...idsUsuarios]));
  const porId = new Map(personas.map((p) => [p.id, p]));

  return filas.map((f) => {
    const ids = [f.egresadoId, ...integrantes.filter((i) => i.propuestaId === f.propuestaId).map((i) => i.egresadoId)];
    const asesor = f.asesorId ? porId.get(f.asesorId) : undefined;
    return {
      propuestaId: f.propuestaId,
      empresaId: f.empresaId!,
      tipo: f.tipo as Modalidad,
      estado: f.estado,
      titulo: f.titulo,
      fechaAprobacion: fechaIso(f.fechaAprobacion),
      cohorte: f.periodo,
      asesor: asesor ? { id: asesor.id, nombre: asesor.nombre } : null,
      egresados: [...new Set(ids)].map((id) => {
        const p = porId.get(id);
        return { id, nombre: p?.nombre ?? "Egresado", carrera: p?.carrera ?? null };
      }),
    };
  });
}
