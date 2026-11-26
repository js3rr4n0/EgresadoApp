"use server";

// Entrega V2 (specs/VALORACIONES_EMPRESAS_ASESORES.md): habilitar o deshabilitar una empresa con motivo obligatorio,
// y reportes en contra de una empresa. Todo queda en la bitácora de la empresa (historial_empresas).

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { empresas, historialEmpresas, propuestas, reportesEmpresa } from "@/lib/schema";
import {
  MINIMO_DESCRIPCION,
  MINIMO_MOTIVO,
  ORIGENES_REPORTE,
  TAMANO_MAXIMO_REPORTE,
  TIPOS_ARCHIVO_REPORTE,
  type CambioEmpresa,
  type OrigenReporte,
} from "@/lib/bitacoraEmpresa";

type Resultado = { success: true } | { success: false; error: string };

async function exigirAdmin() {
  const s = await getSession();
  return s && s.rol === "admin" ? s : null;
}

const refrescar = (empresaId: number) => {
  revalidatePath("/admin/empresas");
  revalidatePath(`/admin/empresas/${empresaId}`);
};

export async function cambiarEstadoEmpresa(
  empresaId: number,
  habilitar: boolean,
  motivo: string,
  reporteId: number | null = null,
): Promise<Resultado> {
  try {
    const s = await exigirAdmin();
    if (!s) return { success: false, error: "No autorizado." };

    const texto = (motivo ?? "").trim();
    if (texto.length < MINIMO_MOTIVO) {
      return { success: false, error: `Escribe el motivo de la decisión (al menos ${MINIMO_MOTIVO} caracteres).` };
    }

    const [empresa] = await db.select({ habilitada: empresas.habilitada }).from(empresas).where(eq(empresas.id, empresaId));
    if (!empresa) return { success: false, error: "La empresa no existe." };
    if (empresa.habilitada === habilitar) {
      return { success: false, error: habilitar ? "La empresa ya está habilitada." : "La empresa ya está deshabilitada." };
    }

    if (reporteId) {
      const [r] = await db
        .select({ id: reportesEmpresa.id })
        .from(reportesEmpresa)
        .where(and(eq(reportesEmpresa.id, reporteId), eq(reportesEmpresa.empresaId, empresaId)));
      if (!r) return { success: false, error: "El reporte citado no pertenece a esta empresa." };
    }

    await db.update(empresas).set({ habilitada: habilitar, actualizadaEn: new Date() }).where(eq(empresas.id, empresaId));
    const cambio: CambioEmpresa = { type: "estado", habilitada: habilitar, motivo: texto, reporteId: reporteId || null };
    await db.insert(historialEmpresas).values({ empresaId, adminId: s.userId, cambios: cambio });

    refrescar(empresaId);
    return { success: true };
  } catch (e) {
    console.error("Error al cambiar el estado de la empresa:", e);
    return { success: false, error: "No se pudo actualizar el estado de la empresa." };
  }
}

export async function registrarReporteEmpresa(empresaId: number, formData: FormData): Promise<Resultado> {
  try {
    const s = await exigirAdmin();
    if (!s) return { success: false, error: "No autorizado." };

    const fecha = String(formData.get("fecha") ?? "");
    const origen = String(formData.get("origen") ?? "") as OrigenReporte;
    const descripcion = String(formData.get("descripcion") ?? "").trim();
    const propuestaTexto = String(formData.get("propuestaId") ?? "");
    const propuestaId = propuestaTexto ? Number(propuestaTexto) : null;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { success: false, error: "Indica la fecha del hecho reportado." };
    if (fecha > new Date().toISOString().slice(0, 10)) return { success: false, error: "La fecha no puede ser futura." };
    if (!ORIGENES_REPORTE.includes(origen)) return { success: false, error: "Indica quién hace el reporte." };
    if (descripcion.length < MINIMO_DESCRIPCION) {
      return { success: false, error: `Describe lo sucedido (al menos ${MINIMO_DESCRIPCION} caracteres).` };
    }

    const [empresa] = await db.select({ id: empresas.id }).from(empresas).where(eq(empresas.id, empresaId));
    if (!empresa) return { success: false, error: "La empresa no existe." };

    if (propuestaId) {
      const [p] = await db
        .select({ id: propuestas.id })
        .from(propuestas)
        .where(and(eq(propuestas.id, propuestaId), eq(propuestas.empresaId, empresaId)));
      if (!p) return { success: false, error: "El proceso elegido no pertenece a esta empresa." };
    }

    let archivo: { url: string; nombre: string } | null = null;
    const adjunto = formData.get("archivo");
    if (adjunto && typeof adjunto !== "string" && adjunto.size > 0) {
      if (!TIPOS_ARCHIVO_REPORTE.includes(adjunto.type)) return { success: false, error: "El archivo debe ser PDF, PNG o JPG." };
      if (adjunto.size > TAMANO_MAXIMO_REPORTE) return { success: false, error: "El archivo excede el tamaño máximo de 5 MB." };
      const buffer = Buffer.from(await adjunto.arrayBuffer());
      archivo = { url: `data:${adjunto.type};base64,${buffer.toString("base64")}`, nombre: (adjunto.name || "evidencia").slice(0, 200) };
    }

    const [nuevo] = await db
      .insert(reportesEmpresa)
      .values({ empresaId, fecha, origen, propuestaId, descripcion, archivo, registradoPor: s.userId })
      .returning({ id: reportesEmpresa.id });
    const cambio: CambioEmpresa = { type: "reporte", reporteId: nuevo.id, accion: "registrado" };
    await db.insert(historialEmpresas).values({ empresaId, adminId: s.userId, cambios: cambio });

    refrescar(empresaId);
    return { success: true };
  } catch (e) {
    console.error("Error al registrar el reporte:", e);
    return { success: false, error: "No se pudo registrar el reporte." };
  }
}

export async function archivarReporteEmpresa(reporteId: number, nota: string): Promise<Resultado> {
  try {
    const s = await exigirAdmin();
    if (!s) return { success: false, error: "No autorizado." };

    const texto = (nota ?? "").trim();
    if (texto.length < MINIMO_MOTIVO) {
      return { success: false, error: `Explica por qué se archiva (al menos ${MINIMO_MOTIVO} caracteres).` };
    }

    const [r] = await db.select().from(reportesEmpresa).where(eq(reportesEmpresa.id, reporteId));
    if (!r) return { success: false, error: "El reporte no existe." };
    if (r.estado === "archivado") return { success: false, error: "El reporte ya está archivado." };

    await db.update(reportesEmpresa).set({ estado: "archivado" }).where(eq(reportesEmpresa.id, reporteId));
    const cambio: CambioEmpresa = { type: "reporte", reporteId, accion: "archivado", nota: texto };
    await db.insert(historialEmpresas).values({ empresaId: r.empresaId, adminId: s.userId, cambios: cambio });

    refrescar(r.empresaId);
    return { success: true };
  } catch (e) {
    console.error("Error al archivar el reporte:", e);
    return { success: false, error: "No se pudo archivar el reporte." };
  }
}
