import "server-only";
// Requisitos de los 21 días de pre-ejecución de cada propuesta, compartidos por el informe del administrador (K1) y el
// panel del asesor (specs/DASHBOARD_ASESOR.md, S1).
//
// Notas del 27-nov-2026 (respuesta 1): los 21 días cuentan desde la **presentación** de la propuesta («3 semanas después de
// la presentación»), en días corridos por ahora. Pendiente: días hábiles según el anuario académico de cada año.
// Presentación = primer envío después del último rechazo por requisitos (A2); si no hay registro de envío en el
// historial, la fecha de envío guardada; si tampoco, la de aprobación.

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { documentosPropuesta, historialEstados, informesPrimerContacto, planesTrabajo } from "@/lib/schema";
import { isoDia, type ClaveRequisito, type EstadoRequisito } from "@/lib/seguimientoCohortes";

export const dia = (d: Date | string | null | undefined) => (d ? (typeof d === "string" ? d.slice(0, 10) : isoDia(d)) : null);

export interface PropuestaPreEjecucion {
  id: number;
  tipo: string;
  estado: string;
  supervisorId: number | null;
  enviadaEn: Date | null;
  fechaAprobacion: Date | string | null;
}

export interface DatosPreEjecucion {
  /** Inicio del conteo de los 21 días (AAAA-MM-DD), o null si nunca se presentó. */
  presentacion: string | null;
  /** Primer paso a «aprobada» (AAAA-MM-DD), o null. */
  aprobacion: string | null;
  /** Inicio oficial de la ejecución (AAAA-MM-DD), o null. */
  inicioEjecucion: string | null;
  requisitos: Record<ClaveRequisito, EstadoRequisito>;
  /** Estado del plan de trabajo del equipo (proyecto e investigación); null si no hay. */
  estadoPlan: string | null;
}

export async function datosPreEjecucion(props: PropuestaPreEjecucion[], hoy: string): Promise<Map<number, DatosPreEjecucion>> {
  const mapa = new Map<number, DatosPreEjecucion>();
  if (!props.length) return mapa;
  const ids = props.map((p) => p.id);
  const [docs, planes, contactos, historial] = await Promise.all([
    db.select({ propuestaId: documentosPropuesta.propuestaId, tipo: documentosPropuesta.tipo, subidoEn: documentosPropuesta.subidoEn }).from(documentosPropuesta).where(inArray(documentosPropuesta.propuestaId, ids)),
    db.select({ propuestaId: planesTrabajo.propuestaId, estado: planesTrabajo.estado, revisadoEn: planesTrabajo.revisadoEn }).from(planesTrabajo).where(inArray(planesTrabajo.propuestaId, ids)),
    db.select({ propuestaId: informesPrimerContacto.propuestaId, estado: informesPrimerContacto.estado, enviadoEn: informesPrimerContacto.enviadoEn }).from(informesPrimerContacto).where(inArray(informesPrimerContacto.propuestaId, ids)),
    db
      .select({ propuestaId: historialEstados.propuestaId, a: historialEstados.a, fecha: historialEstados.creadoEn })
      .from(historialEstados)
      .where(and(inArray(historialEstados.propuestaId, ids), inArray(historialEstados.a, ["enviada", "rechazada", "aprobada", "en_ejecucion"]))),
  ]);

  for (const p of props) {
    const h = historial.filter((x) => x.propuestaId === p.id).map((x) => ({ a: x.a, fecha: dia(x.fecha)! })).sort((a, b) => a.fecha.localeCompare(b.fecha));
    const ultimoRechazo = h.filter((x) => x.a === "rechazada").at(-1)?.fecha ?? "";
    const envio = h.find((x) => x.a === "enviada" && x.fecha >= ultimoRechazo)?.fecha ?? null;
    const aprobacion = dia(p.fechaAprobacion) ?? h.find((x) => x.a === "aprobada")?.fecha ?? null;
    const presentacion = envio ?? dia(p.enviadaEn) ?? aprobacion;
    const inicioEjecucion = p.estado === "en_ejecucion" ? h.find((x) => x.a === "en_ejecucion")?.fecha ?? aprobacion : null;

    const doc = (tipo: string) => dia(docs.find((d) => d.propuestaId === p.id && d.tipo === tipo)?.subidoEn);
    const plan = planes.find((x) => x.propuestaId === p.id);
    const contacto = contactos.find((x) => x.propuestaId === p.id);
    mapa.set(p.id, {
      presentacion,
      aprobacion,
      inicioEjecucion,
      estadoPlan: plan?.estado ?? null,
      requisitos: {
        // Pasantía: el plan firmado (fase 1). Proyecto e investigación: el plan de trabajo aprobado por el asesor.
        plan: p.tipo === "pasantia" ? doc("plan_trabajo_firmado") : plan?.estado === "aprobado" ? dia(plan.revisadoEn) ?? hoy : null,
        dictamen_propuesta: doc("dictamen_propuesta"),
        dictamen_plan: doc("dictamen_plan_trabajo"),
        // El informe de primer contacto lo hace el asesor con el supervisor: sin supervisor no aplica (pregunta P2 de K).
        primer_contacto: contacto?.estado === "enviado" ? dia(contacto.enviadoEn) ?? hoy : !p.supervisorId && p.tipo !== "pasantia" ? "no_aplica" : null,
      },
    });
  }
  return mapa;
}
