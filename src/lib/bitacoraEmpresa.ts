// Bitácora de la empresa (entrega V2). Módulo puro: tipos de los eventos guardados en historial_empresas.cambios,
// textos para mostrarlos y validaciones compartidas entre el cliente y el servidor.

export const ORIGENES_REPORTE = ["egresado", "asesor", "coordinador", "supervisor", "otro"] as const;
export type OrigenReporte = (typeof ORIGENES_REPORTE)[number];

export const NOMBRE_ORIGEN: Record<OrigenReporte, string> = {
  egresado: "Egresado",
  asesor: "Asesor",
  coordinador: "Coordinación",
  supervisor: "Supervisor de la empresa",
  otro: "Otro",
};

/** Largo mínimo del motivo al habilitar o deshabilitar, y de la descripción de un reporte. */
export const MINIMO_MOTIVO = 15;
export const MINIMO_DESCRIPCION = 20;

export const TIPOS_ARCHIVO_REPORTE = ["application/pdf", "image/png", "image/jpeg"];
export const TAMANO_MAXIMO_REPORTE = 5 * 1024 * 1024;

export const NOMBRE_CAMPO: Record<string, string> = {
  nombre: "nombre",
  area: "área",
  descripcion: "descripción",
  antecedentes: "antecedentes",
  direccion: "dirección",
  mapaUrl: "ubicación",
  organigramas: "organigrama",
  supervisores: "supervisores",
  firmantes: "firmantes",
  sucursales: "sucursales",
};

export type CambioEmpresa =
  | { type: "create" }
  | { type: "update" }
  | { type: "edicion"; campos: string[] }
  | { type: "estado"; habilitada: boolean; motivo: string; reporteId?: number | null }
  | { type: "reporte"; reporteId: number; accion: "registrado" | "archivado"; nota?: string | null };

export type TipoEvento = "solicitud" | "edicion" | "estado" | "reporte" | "otro";

export interface EventoBitacora {
  tipo: TipoEvento;
  titulo: string;
  detalle: string | null;
  /** Deshabilitar se resalta en rojo, habilitar en verde. */
  tono: "neutro" | "alerta" | "positivo";
  reporteId: number | null;
}

/** Convierte un registro de historial_empresas en un evento legible. Tolera los formatos anteriores. */
export function describirCambio(cambios: unknown): EventoBitacora {
  const c = (cambios ?? {}) as Partial<CambioEmpresa> & Record<string, unknown>;
  switch (c.type) {
    case "create":
      return { tipo: "solicitud", titulo: "Registrada a partir de una solicitud de empresa nueva", detalle: null, tono: "neutro", reporteId: null };
    case "update":
      return { tipo: "solicitud", titulo: "Datos actualizados a partir de una solicitud de cambio", detalle: null, tono: "neutro", reporteId: null };
    case "edicion": {
      const campos = Array.isArray(c.campos) ? (c.campos as string[]).map((k) => NOMBRE_CAMPO[k] ?? k) : [];
      return {
        tipo: "edicion",
        titulo: "Datos editados por la administración",
        detalle: campos.length ? `Cambió: ${campos.join(", ")}.` : null,
        tono: "neutro",
        reporteId: null,
      };
    }
    case "estado": {
      const habilitada = c.habilitada === true;
      return {
        tipo: "estado",
        titulo: habilitada ? "Empresa habilitada" : "Empresa deshabilitada",
        detalle: typeof c.motivo === "string" ? c.motivo : null,
        tono: habilitada ? "positivo" : "alerta",
        reporteId: typeof c.reporteId === "number" ? c.reporteId : null,
      };
    }
    case "reporte": {
      const archivado = c.accion === "archivado";
      return {
        tipo: "reporte",
        titulo: archivado ? "Reporte archivado" : "Reporte en contra registrado",
        detalle: typeof c.nota === "string" && c.nota ? c.nota : null,
        tono: archivado ? "neutro" : "alerta",
        reporteId: typeof c.reporteId === "number" ? c.reporteId : null,
      };
    }
    default:
      return { tipo: "otro", titulo: "Cambio registrado", detalle: null, tono: "neutro", reporteId: null };
  }
}

/** Campos principales que cambiaron entre dos versiones de la empresa (para el evento 'edicion'). */
export function camposCambiados(antes: Record<string, unknown>, despues: Record<string, unknown>, campos: string[]): string[] {
  const norm = (v: unknown) => (v == null ? "" : String(v).trim());
  return campos.filter((k) => k in despues && norm(antes[k]) !== norm(despues[k]));
}
