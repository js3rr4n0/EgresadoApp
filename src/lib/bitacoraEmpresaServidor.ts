import "server-only";
// Lectura de reportes y bitácora de las empresas (entrega V2). Solo para páginas del administrador.

import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { historialEmpresas, reportesEmpresa, usuarios } from "@/lib/schema";
import { describirCambio, type EventoBitacora, type OrigenReporte } from "@/lib/bitacoraEmpresa";

export interface ReporteResumen {
  id: number;
  fecha: string;
  origen: OrigenReporte;
  descripcion: string;
}

export interface ReporteCompleto extends ReporteResumen {
  estado: "vigente" | "archivado";
  propuestaId: number | null;
  archivo: { url: string; nombre: string } | null;
  registradoPor: string | null;
  creadoEn: string;
}

export interface EventoConFecha extends EventoBitacora {
  id: number;
  fecha: string;
  autor: string | null;
}

/** Reportes vigentes de todas las empresas, agrupados por empresa (para la tabla del catálogo). */
export async function leerReportesVigentes(): Promise<Record<number, ReporteResumen[]>> {
  const filas = await db
    .select({
      id: reportesEmpresa.id,
      empresaId: reportesEmpresa.empresaId,
      fecha: reportesEmpresa.fecha,
      origen: reportesEmpresa.origen,
      descripcion: reportesEmpresa.descripcion,
    })
    .from(reportesEmpresa)
    .where(eq(reportesEmpresa.estado, "vigente"))
    .orderBy(desc(reportesEmpresa.fecha));
  const porEmpresa: Record<number, ReporteResumen[]> = {};
  for (const { empresaId, ...r } of filas) {
    (porEmpresa[empresaId] ??= []).push({ ...r, origen: r.origen as OrigenReporte });
  }
  return porEmpresa;
}

async function nombres(ids: (number | null)[]) {
  const unicos = [...new Set(ids.filter((x): x is number => x != null))];
  if (unicos.length === 0) return new Map<number, string>();
  const filas = await db.select({ id: usuarios.id, nombre: usuarios.nombreCompleto }).from(usuarios).where(inArray(usuarios.id, unicos));
  return new Map(filas.map((f) => [f.id, f.nombre]));
}

export async function leerReportesEmpresa(empresaId: number): Promise<ReporteCompleto[]> {
  const filas = await db
    .select()
    .from(reportesEmpresa)
    .where(eq(reportesEmpresa.empresaId, empresaId))
    .orderBy(desc(reportesEmpresa.fecha), desc(reportesEmpresa.id));
  const autores = await nombres(filas.map((f) => f.registradoPor));
  return filas.map((f) => ({
    id: f.id,
    fecha: f.fecha,
    origen: f.origen as OrigenReporte,
    descripcion: f.descripcion,
    estado: f.estado as "vigente" | "archivado",
    propuestaId: f.propuestaId,
    archivo: (f.archivo as { url: string; nombre: string } | null) ?? null,
    registradoPor: f.registradoPor ? autores.get(f.registradoPor) ?? null : null,
    creadoEn: f.creadoEn.toISOString(),
  }));
}

export async function leerBitacoraEmpresa(empresaId: number): Promise<EventoConFecha[]> {
  const filas = await db
    .select()
    .from(historialEmpresas)
    .where(eq(historialEmpresas.empresaId, empresaId))
    .orderBy(desc(historialEmpresas.fecha), desc(historialEmpresas.id));
  const autores = await nombres(filas.map((f) => f.adminId));
  return filas.map((f) => ({
    id: f.id,
    fecha: (f.fecha ?? new Date(0)).toISOString(),
    autor: f.adminId ? autores.get(f.adminId) ?? null : null,
    ...describirCambio(f.cambios),
  }));
}
