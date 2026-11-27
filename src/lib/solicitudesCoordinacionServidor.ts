import "server-only";
// D8 (specs/COORDINADOR_ASIGNACION.md): bajas y cambios de asesor en una sola lista, para el coordinador (las de sus
// propuestas) y la administración (todas). Lo que atiende uno deja de estar pendiente para el otro.

import type { SessionPayload } from "@/lib/session";
import { getSolicitudesBajaCoordinador } from "@/app/actions/coordinador";
import { cambiosParaAtender } from "@/lib/cambioAsesorServidor";
import { CAMBIO_POR_ATENDER, NOMBRE_ESTADO_CAMBIO, type EstadoCambio } from "@/lib/cambioAsesor";

export interface FilaSolicitudCoordinacion {
  clave: string;
  tipo: "baja" | "cambio";
  id: number;
  fecha: string;
  propuestaId: number;
  titulo: string;
  modalidad: string;
  pide: string;
  egresado: string | null;
  asesor: string;
  motivo: string;
  estadoTexto: string;
  /** Espera una acción de quien atiende. */
  porAtender: boolean;
  respuesta: string | null;
  resueltoPor: string | null;
  estadoCambio?: EstadoCambio;
  rolSolicitante?: "egresado" | "asesor";
}

const NOMBRE_ESTADO_BAJA: Record<string, string> = { pendiente: "Pendiente", aprobada: "Aprobada (propuesta anulada)", rechazada: "Rechazada" };

export async function solicitudesCoordinacion(session: SessionPayload): Promise<FilaSolicitudCoordinacion[]> {
  const [bajasRes, cambios] = await Promise.all([getSolicitudesBajaCoordinador(), cambiosParaAtender(session)]);
  type Baja = { id: number; propuestaId: number; titulo: string; tipo: string; asesorNombre: string; estudianteNombre: string; motivo: string; estado: string; respuestaCoordinador: string | null; creadaEn: Date | string; resueltoPor?: string | null };
  const bajas: Baja[] = bajasRes?.success && Array.isArray(bajasRes.data) ? (bajasRes.data as Baja[]) : [];

  const filas: FilaSolicitudCoordinacion[] = [
    ...bajas.map((b) => ({
      clave: `baja-${b.id}`,
      tipo: "baja" as const,
      id: b.id,
      fecha: new Date(b.creadaEn).toISOString(),
      propuestaId: b.propuestaId,
      titulo: b.titulo,
      modalidad: b.tipo,
      pide: `${b.asesorNombre} (asesor)`,
      egresado: b.estudianteNombre,
      asesor: b.asesorNombre,
      motivo: b.motivo,
      estadoTexto: NOMBRE_ESTADO_BAJA[b.estado] ?? b.estado,
      porAtender: b.estado === "pendiente",
      respuesta: b.respuestaCoordinador,
      resueltoPor: b.resueltoPor ?? null,
    })),
    ...cambios.map((c) => ({
      clave: `cambio-${c.id}`,
      tipo: "cambio" as const,
      id: c.id,
      fecha: c.creadaEn,
      propuestaId: c.propuestaId,
      titulo: c.titulo,
      modalidad: c.tipo,
      pide: `${c.solicitante} (${c.rolSolicitante === "asesor" ? "asesor" : "egresado"})`,
      egresado: c.rolSolicitante === "egresado" ? c.solicitante : null,
      asesor: c.asesorActual,
      motivo: c.motivo,
      estadoTexto: NOMBRE_ESTADO_CAMBIO[c.estado] + (c.nuevoAsesor && c.estado !== "rechazada" ? `: ${c.nuevoAsesor}` : ""),
      porAtender: CAMBIO_POR_ATENDER.includes(c.estado),
      respuesta: c.respuesta,
      resueltoPor: c.resueltoPor,
      estadoCambio: c.estado,
      rolSolicitante: c.rolSolicitante,
    })),
  ];
  return filas.sort((a, b) => Number(b.porAtender) - Number(a.porAtender) || b.fecha.localeCompare(a.fecha));
}
