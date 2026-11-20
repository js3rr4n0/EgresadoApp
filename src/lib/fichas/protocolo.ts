// Protocolo de investigación (entrega I3): reglas compartidas por el servidor y la pantalla. Módulo puro.
//   - Qué le falta al protocolo antes de enviarlo con el plan de trabajo.
//   - El texto con que se precarga un espacio a partir de la propuesta aprobada.
//   - La fecha límite del dictamen del asesor, en días hábiles o calendario.
import { esRecurso, leerItems, problemasRecurso } from "./elementosRecurso";
import { leerRecursos, problemasRecursos } from "./recursos";
import { problemasRespuestaPropia } from "./respuestasPropias";
import { claveCamposExtra, defCamposExtra } from "./elementosPropios";
import type { Espacio, EtapaProtocolo } from "./tipos";
import {
  guardarComoTexto, leerApartado, lineas, parteVacia, opcionesDeEspacio, partePrecarga, revisarApartado, textoApartado, textoParte, tipoApartado,
  type ContenidoApartado, type ContextoRevision, type TipoApartado,
} from "./apartadosAcademicos";

const palabras = (t: string) => (t.trim() ? t.trim().split(/\s+/).length : 0);

/** Problemas de las respuestas del protocolo frente a las reglas de sus espacios (vacío = se puede enviar). */
export function problemasProtocolo(
  etapa: { tipo?: string; espacios: Espacio[] },
  respuestas: Record<string, string | null | undefined>,
  /** Registro de fuentes y referencias del documento (cuentan para el mínimo de referencias). */
  contexto: ContextoRevision = {}
): { espacioId: string; mensaje: string }[] {
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
    } else if (e.elemento === "apartado") {
      // Apartado académico: solo bloquean los subapartados vacíos o bajo el mínimo; lo demás son avisos en pantalla.
      const tipo = tipoApartado(e);
      if (!tipo) {
        p(`"${e.titulo}" tiene un tipo de apartado que no existe.`);
        continue;
      }
      const c = leerApartado(tipo, valor);
      if (!e.obligatorio && tipo.partes.every((x) => parteVacia(x, c.partes[x.id])) && !(contexto.fuentesReferencias?.length && tipo.especiales.includes("referencias"))) continue;
      // Un solo pendiente por apartado, con los subapartados que faltan o no llegan al mínimo.
      const faltan = revisarApartado(tipo, c, opcionesDeEspacio(e, etapa.tipo ?? "protocolo"), contexto).filter((r) => r.nivel === "falta");
      // Un subapartado con dos faltas (vacío y sin fuente, por ejemplo) se nombra una sola vez.
      const nombres = [...new Set(faltan.map((r) => tipo.partes.find((x) => x.id === r.parte)?.titulo ?? r.mensaje))];
      if (nombres.length) p(`"${e.titulo}": ${nombres.length === 1 ? "falta completar" : `faltan ${nombres.length} subapartados:`} ${nombres.join(", ")}.`);
    }
    // Campos adicionales del espacio (C4): su respuesta va en "<id>#extra".
    if (e.camposExtra?.length) {
      problemasRespuestaPropia(defCamposExtra(e), respuestas[claveCamposExtra(e.id)], []).slice(0, 3).forEach((m) => p(`"${e.titulo}", datos adicionales: ${m}`));
    }
    if (e.elemento === "propio") {
      // Catálogo editable (C3): los campos del elemento propio; por integrante, la parte de cada uno.
      if (!e.propio) p(`"${e.titulo}": falta la copia del elemento en la ficha.`);
      else problemasRespuestaPropia(e.propio.definicion, valor, contexto.integrantes ?? [], e.obligatorio).slice(0, 3).forEach((m) => p(`"${e.titulo}": ${m}`));
    } else if (e.elemento === "recursos_presupuesto") {
      for (const m of problemasRecursos(e, leerRecursos(valor))) p(m);
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
export function textoPrecarga(origen: Espacio | undefined, datos: DatosPropuestaPrecarga, parte?: string): string {
  if (!origen) return "";
  if (origen.elemento === "apartado") {
    const tipo = tipoApartado(origen);
    if (!tipo) return "";
    const c = leerApartado(tipo, datos.respuestas[origen.id]);
    return parte ? textoParte(tipo, c, parte) : textoApartado(tipo, c);
  }
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

/** Contenido inicial de un apartado académico: de los objetivos de la propuesta, de otro apartado o de un texto. */
function precargaApartado(tipo: TipoApartado, origen: Espacio, datos: DatosPropuestaPrecarga, parte?: string): ContenidoApartado {
  const ids = new Set(tipo.partes.map((p) => p.id));
  if (origen.elemento === "objetivos" && ids.has("general") && ids.has("especificos")) {
    const especificos = (Array.isArray(datos.objetivosEspecificos) ? datos.objetivosEspecificos : []) as { titulo?: string }[];
    return {
      partes: {
        general: datos.objetivoGeneral?.trim() ?? "",
        especificos: especificos.map((o) => o?.titulo?.trim() ?? "").filter(Boolean).join("\n"),
      },
      autoevaluacion: [],
    };
  }
  if (origen.elemento === "apartado" && !parte) {
    // Mismos subapartados (por ejemplo, la metodología del protocolo en la metodología realizada del informe).
    const tipoOrigen = tipoApartado(origen);
    if (tipoOrigen) {
      const c = leerApartado(tipoOrigen, datos.respuestas[origen.id]);
      // Párrafos citados que pasan a un texto (la fundamentación al marco teórico del informe): con sus citas.
      const formatoDe = (t: TipoApartado, k: string) => t.partes.find((p) => p.id === k)?.formato;
      const partes = Object.fromEntries(
        Object.entries(c.partes)
          .filter(([k, v]) => ids.has(k) && v.trim())
          .map(([k, v]) => [k, formatoDe(tipoOrigen, k) === "citado" && formatoDe(tipo, k) !== "citado" ? textoParte(tipoOrigen, c, k) : v])
      );
      if (Object.keys(partes).length) return { partes, autoevaluacion: [] };
    }
  }
  return leerApartado(tipo, textoPrecarga(origen, datos, parte));
}

/**
 * Contenido inicial de un espacio del protocolo o del informe final según su `precargarDe` ("id" o "id#subapartado").
 * Las listas y los apartados se devuelven como JSON, igual que se guardan.
 */
export function precargaEspacio(e: Espacio, fuentes: Espacio[], datos: DatosPropuestaPrecarga): string {
  if (!e.precargarDe) return "";
  const [id, parte] = partePrecarga(e.precargarDe);
  const origen = fuentes.find((x) => x.id === id);
  if (!origen) return "";
  if (e.elemento === "apartado") {
    const tipo = tipoApartado(e);
    if (!tipo) return "";
    const c = precargaApartado(tipo, origen, datos, parte);
    return Object.values(c.partes).some((v) => v.trim()) ? guardarComoTexto(c) : "";
  }
  if (e.elemento === "lista") {
    if (origen.elemento === "lista") return datos.respuestas[origen.id] ?? "";
    if (origen.elemento !== "apartado" || !parte) return "";
    const items = lineas(textoPrecarga(origen, datos, parte));
    return items.length ? JSON.stringify(items) : "";
  }
  return e.elemento === "texto" ? textoPrecarga(origen, datos, parte) : "";
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
