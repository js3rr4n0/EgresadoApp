// Protocolo de investigación (entrega I3): reglas compartidas por el servidor y la pantalla. Módulo puro.
//   - Qué le falta al protocolo antes de enviarlo con el plan de trabajo.
//   - El texto con que se precarga un espacio a partir de la propuesta aprobada.
//   - La fecha límite del dictamen del asesor, en días hábiles o calendario.
import { esRecurso, leerItems, problemasRecurso } from "./elementosRecurso";
import type { Espacio, EtapaProtocolo } from "./tipos";

const palabras = (t: string) => (t.trim() ? t.trim().split(/\s+/).length : 0);

/** Problemas de las respuestas del protocolo frente a las reglas de sus espacios (vacío = se puede enviar). */
export function problemasProtocolo(etapa: { espacios: Espacio[] }, respuestas: Record<string, string | null | undefined>): { espacioId: string; mensaje: string }[] {
  const problemas: { espacioId: string; mensaje: string }[] = [];
  for (const e of etapa.espacios) {
    const valor = respuestas[e.id] ?? "";
    const p = (mensaje: string) => problemas.push({ espacioId: e.id, mensaje });
    if (e.elemento === "texto") {
      const t = valor.trim();
      const n = palabras(t);
      const min = Number(e.parametros.minPalabras) || 0;
      const max = Number(e.parametros.maxPalabras) || 0;
      if (e.obligatorio && !t) p(`Falta "${e.titulo}".`);
      else if (t && min > 0 && n < min) p(`"${e.titulo}" necesita al menos ${min} palabras.`);
      if (max > 0 && n > max) p(`"${e.titulo}" admite hasta ${max} palabras.`);
    } else if (esRecurso(e.elemento)) {
      const r = { ...e, elemento: e.elemento };
      const items = leerItems(r.elemento, valor);
      if (!e.obligatorio && items.length === 0) continue;
      for (const m of problemasRecurso(r, items)) p(m);
    }
  }
  return problemas;
}

/** Datos de la propuesta aprobada de los que puede partir un espacio del protocolo. */
export interface DatosPropuestaPrecarga {
  descripcionProblema?: string | null;
  justificacion?: string | null;
  alcance?: string | null;
  objetivoGeneral?: string | null;
  objetivosEspecificos?: unknown;
  /** Respuestas de los espacios nuevos de la propuesta (respuestas_espacios), por id. */
  respuestas: Record<string, string | null | undefined>;
}

/** Texto inicial de un espacio del protocolo a partir del espacio de la propuesta indicado en `precargarDe`. */
export function textoPrecarga(origen: Espacio | undefined, datos: DatosPropuestaPrecarga): string {
  if (!origen) return "";
  if (origen.elemento === "objetivos") {
    const especificos = (Array.isArray(datos.objetivosEspecificos) ? datos.objetivosEspecificos : []) as { titulo?: string; descripcion?: string }[];
    const lineas = especificos
      .filter((o) => o?.titulo?.trim())
      .map((o, i) => `${i + 1}. ${o.titulo!.trim()}${o.descripcion?.trim() ? `: ${o.descripcion.trim()}` : ""}`);
    return [
      datos.objetivoGeneral?.trim() ? `Objetivo general: ${datos.objetivoGeneral.trim()}` : "",
      lineas.length ? `Objetivos específicos:\n${lineas.join("\n")}` : "",
    ].filter(Boolean).join("\n\n");
  }
  if (origen.elemento !== "texto") return "";
  switch (origen.origenFase1) {
    case "detalles_proyecto.descripcion_problema":
      return datos.descripcionProblema?.trim() ?? "";
    case "detalles_proyecto.justificacion":
      return datos.justificacion?.trim() ?? "";
    case "detalles_proyecto.alcance":
      return datos.alcance?.trim() ?? "";
    default:
      return datos.respuestas[origen.id]?.trim() ?? "";
  }
}

/** Suma días a una fecha; en días hábiles no cuenta sábados ni domingos. */
export function sumarDias(fecha: Date, dias: number, habiles: boolean): Date {
  const d = new Date(fecha);
  if (!habiles) {
    d.setDate(d.getDate() + dias);
    return d;
  }
  let restantes = dias;
  while (restantes > 0) {
    d.setDate(d.getDate() + 1);
    const dia = d.getDay();
    if (dia !== 0 && dia !== 6) restantes--;
  }
  return d;
}

/** Fecha límite del dictamen del asesor, contada desde el envío del protocolo y el plan. */
export function fechaLimiteDictamen(enviadoEn: Date, etapa: Pick<EtapaProtocolo, "revision"> | { revision: Pick<EtapaProtocolo["revision"], "diasRevision" | "diasHabiles"> }): Date {
  return sumarDias(enviadoEn, etapa.revision.diasRevision, etapa.revision.diasHabiles);
}
