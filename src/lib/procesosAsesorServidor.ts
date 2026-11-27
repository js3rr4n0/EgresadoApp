import "server-only";
// Panel del asesor (specs/DASHBOARD_ASESOR.md, S1): cada proceso del asesor con su etapa, el conteo de los 21 días desde
// la presentación y los requisitos con quién debe actuar. Usa el mismo cálculo que el informe del administrador.

import { and, eq, inArray, notInArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { carreras, empresas, integrantesProyecto, periodos, propuestas, usuarios } from "@/lib/schema";
import { calcularPreEjecucion, isoDia, DIAS_PREEJECUCION } from "@/lib/seguimientoCohortes";
import { datosPreEjecucion } from "@/lib/preEjecucionServidor";
import { compararUrgencia, etapaDe, pendientesAsesor, pestanaDe, requisitosProceso, type EtapaProceso, type RequisitoProceso } from "@/lib/procesosAsesor";

export interface ProcesoAsesor {
  id: number;
  numero: number;
  tipo: string;
  titulo: string;
  estado: string;
  etapa: EtapaProceso;
  pestana: "propuesta" | "ejecucion";
  egresados: string[];
  carnet: string | null;
  carrera: string;
  empresa: string | null;
  cohorte: string;
  /** Inicio del conteo (presentación), AAAA-MM-DD. */
  presentacion: string | null;
  aprobacion: string | null;
  /** Solo antes de la ejecución. */
  dias: { transcurridos: number; restantes: number; retraso: number; total: number } | null;
  requisitos: RequisitoProceso[];
  pendientesAsesor: number;
}

export async function procesosAsesor(asesorId: number): Promise<ProcesoAsesor[]> {
  const hoy = isoDia(new Date());
  const props = await db
    .select({
      id: propuestas.id,
      numero: propuestas.numero,
      tipo: propuestas.tipo,
      titulo: propuestas.titulo,
      estado: propuestas.estado,
      supervisorId: propuestas.supervisorId,
      enviadaEn: propuestas.enviadaEn,
      fechaAprobacion: propuestas.fechaAprobacion,
      egresadoId: propuestas.egresadoId,
      empresaId: propuestas.empresaId,
      periodoId: propuestas.periodoId,
    })
    .from(propuestas)
    .where(and(eq(propuestas.asesorId, asesorId), notInArray(propuestas.estado, ["anulada", "rechazada"])));
  if (!props.length) return [];
  const ids = props.map((p) => p.id);

  const [lideres, miembros, emps, cohortes, datos] = await Promise.all([
    db
      .select({ id: usuarios.id, nombre: usuarios.nombreCompleto, carnet: usuarios.carnet, carrera: carreras.nombre })
      .from(usuarios)
      .leftJoin(carreras, eq(carreras.id, usuarios.carreraId))
      .where(inArray(usuarios.id, [...new Set(props.map((p) => p.egresadoId))])),
    db
      .select({ propuestaId: integrantesProyecto.propuestaId, nombre: usuarios.nombreCompleto })
      .from(integrantesProyecto)
      .innerJoin(usuarios, eq(usuarios.id, integrantesProyecto.egresadoId))
      .where(and(inArray(integrantesProyecto.propuestaId, ids), eq(integrantesProyecto.estado, "aceptado"))),
    db.select({ id: empresas.id, nombre: empresas.nombre }).from(empresas).where(inArray(empresas.id, [...new Set(props.map((p) => p.empresaId).filter((x): x is number => x != null))].concat(-1))),
    db.select().from(periodos).where(inArray(periodos.id, [...new Set(props.map((p) => p.periodoId))])),
    datosPreEjecucion(props, hoy),
  ]);

  const lista: ProcesoAsesor[] = [];
  for (const p of props) {
    const etapa = etapaDe(p.estado);
    const pestana = pestanaDe(etapa);
    if (!pestana) continue;
    const d = datos.get(p.id)!;
    const lider = lideres.find((l) => l.id === p.egresadoId);
    const cohorte = cohortes.find((c) => c.id === p.periodoId);
    const requisitos = requisitosProceso(p.tipo, d.requisitos, d.estadoPlan);
    let dias: ProcesoAsesor["dias"] = null;
    if (pestana === "propuesta" && d.presentacion && cohorte) {
      const c = calcularPreEjecucion({ fechaAprobacion: d.presentacion, inicioEjecucion: null, requisitos: d.requisitos, cohorte }, hoy);
      dias = { transcurridos: c.diasTranscurridos, restantes: c.diasRestantes, retraso: c.diasRetraso, total: DIAS_PREEJECUCION };
    }
    lista.push({
      id: p.id,
      numero: p.numero,
      tipo: p.tipo,
      titulo: p.titulo || `Propuesta #${p.numero}`,
      estado: p.estado,
      etapa,
      pestana,
      egresados: [lider?.nombre ?? "Egresado", ...miembros.filter((m) => m.propuestaId === p.id).map((m) => m.nombre)].filter((x, i, a) => a.indexOf(x) === i),
      carnet: lider?.carnet ?? null,
      carrera: lider?.carrera ?? "Sin carrera",
      empresa: emps.find((e) => e.id === p.empresaId)?.nombre ?? null,
      cohorte: cohorte?.nombre ?? "",
      presentacion: d.presentacion,
      aprobacion: d.aprobacion,
      dias,
      requisitos,
      pendientesAsesor: pendientesAsesor(etapa, requisitos),
    });
  }
  return lista.sort((a, b) => compararUrgencia({ ...a, diasRestantes: a.dias?.restantes ?? null }, { ...b, diasRestantes: b.dias?.restantes ?? null }));
}
