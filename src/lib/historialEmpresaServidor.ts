import "server-only";
// Historial de egresados en una empresa (entrega V4). Solo para páginas del administrador.

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { solicitudesBaja, valoraciones } from "@/lib/schema";
import { leerProcesosEmpresas } from "@/lib/procesosEmpresas";
import { cierreDeProcesos } from "@/lib/valoracionesServidor";
import { ordenarHistorial, resultadoDe, type FilaHistorial } from "@/lib/historialEmpresa";

/** Una fila por egresado y proceso realizado en la empresa, incluidas las bajas. */
export async function leerHistorialEmpresa(empresaId: number): Promise<FilaHistorial[]> {
  const procesos = await leerProcesosEmpresas(empresaId, true);
  if (procesos.length === 0) return [];
  const ids = procesos.map((p) => p.propuestaId);

  const [cierre, notas, bajas] = await Promise.all([
    cierreDeProcesos(procesos.filter((p) => p.estado !== "anulada").map((p) => p.propuestaId)),
    db
      .select({
        propuestaId: valoraciones.propuestaId,
        evaluadorId: valoraciones.evaluadorId,
        evaluadorRol: valoraciones.evaluadorRol,
        objetivo: valoraciones.objetivo,
        evaluadoId: valoraciones.evaluadoId,
        promedio: valoraciones.promedio,
      })
      .from(valoraciones)
      .where(inArray(valoraciones.propuestaId, ids)),
    db
      .select({ propuestaId: solicitudesBaja.propuestaId, motivo: solicitudesBaja.motivo })
      .from(solicitudesBaja)
      .where(and(inArray(solicitudesBaja.propuestaId, ids), eq(solicitudesBaja.estado, "aprobada"))),
  ]);

  const filas: FilaHistorial[] = [];
  for (const p of procesos) {
    const anulada = p.estado === "anulada";
    const baja = bajas.find((b) => b.propuestaId === p.propuestaId);
    if (anulada && !baja) continue; // anulada por otra razón: no llegó a trabajar en la empresa
    const cerradoEn = cierre.get(p.propuestaId) ?? null;
    for (const e of p.egresados) {
      const delAsesor = notas.find((n) => n.propuestaId === p.propuestaId && n.evaluadorRol === "asesor" && n.objetivo === "egresado" && n.evaluadoId === e.id);
      const aEmpresa = notas.find((n) => n.propuestaId === p.propuestaId && n.evaluadorId === e.id && n.objetivo === "empresa");
      const notaAsesor = delAsesor ? Number(delAsesor.promedio) : null;
      filas.push({
        propuestaId: p.propuestaId,
        egresadoId: e.id,
        egresado: e.nombre,
        carrera: e.carrera,
        modalidad: p.tipo,
        titulo: p.titulo ?? "(sin título)",
        cohorte: p.cohorte.nombre,
        cohorteInicio: p.cohorte.inicioRecepcion,
        asesor: p.asesor?.nombre ?? null,
        cerradoEn,
        resultado: resultadoDe({ anulada, cerrado: !!cerradoEn, notaAsesor }),
        notaAsesorAlEgresado: notaAsesor,
        notaEgresadoAEmpresa: aEmpresa ? Number(aEmpresa.promedio) : null,
        motivoBaja: baja?.motivo ?? null,
      });
    }
  }
  return ordenarHistorial(filas);
}
