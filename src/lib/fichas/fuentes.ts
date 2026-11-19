// Registro de fuentes y párrafos citados (ajustes al protocolo, 19-nov-2026). Módulo puro: servidor y cliente.
// Cada fuente tiene sus campos APA 7 (lib/citaApa.ts, los mismos de pasantía). Un párrafo citado guarda su texto, las
// fuentes que lo sustentan y la cita en el texto ya armada ("Pérez y Gómez, 2020"), que el servidor recalcula al guardar
// y cuando cambia una fuente. Las referencias del trabajo son las fuentes del registro, en orden alfabético.
import { leerDatosCita, textoCitaApa, validarCitaApa, type DatosCitaApa } from "@/lib/citaApa";

export interface Fuente {
  id: number;
  datos: DatosCitaApa;
}

export interface ParrafoCitado {
  texto: string;
  /** Ids de las fuentes del registro que sustentan el párrafo. */
  fuentes: number[];
  /** Cita en el texto armada con esas fuentes, sin paréntesis ("Pérez, 2020; Gómez y Ruiz, 2019"). */
  cita?: string;
}

const limpiar = (t: string | undefined) => (t ?? "").trim().replace(/\s+/g, " ");

/** Cita en el texto de una fuente, APA 7: 1 autor "Pérez", 2 "Pérez y Gómez", 3 o más "Pérez et al.", con el año. */
export function citaEnTexto(d: DatosCitaApa): string {
  const personas = d.autores.map((a) => limpiar(a.apellidos)).filter(Boolean);
  const autor = personas.length === 0
    ? limpiar(d.autorInstitucional).replace(/\.$/, "") || "Anónimo"
    : personas.length === 1 ? personas[0] : personas.length === 2 ? `${personas[0]} y ${personas[1]}` : `${personas[0]} et al.`;
  const anio = limpiar(d.anio) || "s.f.";
  return `${autor}, ${anio}`;
}

/** Cita de varias fuentes: en orden alfabético, separadas por punto y coma. */
export function citaDeFuentes(ids: number[], fuentes: Map<number, DatosCitaApa>): string {
  return [...new Set(ids)]
    .map((id) => fuentes.get(id))
    .filter((d): d is DatosCitaApa => !!d)
    .map(citaEnTexto)
    .sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }))
    .join("; ");
}

/**
 * Párrafos de un subapartado citado. Acepta el JSON guardado o, por compatibilidad, texto libre (cada párrafo separado
 * por una línea en blanco, sin fuentes).
 */
export function leerParrafos(valor: string | undefined): ParrafoCitado[] {
  const v = (valor ?? "").trim();
  if (!v) return [];
  if (v.startsWith("[")) {
    try {
      const lista = JSON.parse(v);
      if (Array.isArray(lista)) {
        return lista
          .filter((p) => p && typeof p === "object")
          .map((p) => ({
            texto: String(p.texto ?? ""),
            fuentes: Array.isArray(p.fuentes) ? p.fuentes.filter((x: unknown): x is number => Number.isInteger(x)) : [],
            ...(typeof p.cita === "string" && p.cita ? { cita: p.cita } : {}),
          }));
      }
    } catch {
      // texto libre
    }
  }
  return v.split(/\n\s*\n/).map((t) => ({ texto: t.trim(), fuentes: [] })).filter((p) => p.texto);
}

export const guardarParrafos = (ps: ParrafoCitado[]) => JSON.stringify(ps);

/** Texto del párrafo con su cita al final, antes del punto: "Texto del párrafo (Pérez, 2020)." */
export function parrafoConCita(p: ParrafoCitado, cita = p.cita): string {
  const t = p.texto.trim();
  if (!cita) return t;
  const sinPunto = t.replace(/[.\s]+$/, "");
  return `${sinPunto} (${cita}).`;
}

/** Párrafos con su cita recalculada con el registro actual (se usa al guardar y cuando cambia una fuente). */
export const conCitas = (ps: ParrafoCitado[], fuentes: Map<number, DatosCitaApa>): ParrafoCitado[] =>
  ps.map((p) => {
    const ids = p.fuentes.filter((id) => fuentes.has(id));
    const cita = citaDeFuentes(ids, fuentes);
    return { texto: p.texto, fuentes: ids, ...(cita ? { cita } : {}) };
  });

/** Referencia APA 7 de una fuente (texto plano, sin cursivas). */
export const referenciaDe = (d: DatosCitaApa) => textoCitaApa(d);

/** Referencias del registro en orden alfabético, como van en el apartado de referencias. */
export const referenciasOrdenadas = (fuentes: Fuente[]) =>
  fuentes.map((f) => ({ ...f, referencia: referenciaDe(f.datos) })).sort((a, b) => a.referencia.localeCompare(b.referencia, "es", { sensitivity: "base" }));

/** Ids de las fuentes citadas en los párrafos citados de los apartados del documento. */
export function fuentesCitadas(espacios: { elemento: string; id: string }[], respuestas: Record<string, string | null | undefined>): number[] {
  const ids = new Set<number>();
  for (const e of espacios) {
    if (e.elemento !== "apartado") continue;
    try {
      const c = JSON.parse(respuestas[e.id] || "{}");
      for (const v of Object.values(c?.partes ?? {})) {
        if (typeof v === "string" && v.trim().startsWith("[")) for (const p of leerParrafos(v)) p.fuentes.forEach((id) => ids.add(id));
      }
    } catch {
      // sin contenido
    }
  }
  return [...ids];
}

/** Datos de una fuente que llegan del formulario: válidos o con sus problemas. */
export function leerFuente(valor: unknown): { ok: true; datos: DatosCitaApa } | { ok: false; problemas: string[] } {
  const d = leerDatosCita(valor);
  if (!d) return { ok: false, problemas: ["Los datos de la fuente no son válidos."] };
  const problemas = validarCitaApa(d);
  return problemas.length ? { ok: false, problemas } : { ok: true, datos: d };
}
