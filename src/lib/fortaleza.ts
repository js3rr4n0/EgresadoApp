// Indicador de fortaleza de la propuesta (specs/REDACTAR_PROPUESTA_AJUSTES.md, R3). Módulo puro: lo usan el
// servidor y las pantallas del egresado, el asesor y el coordinador.
//
// Problema, justificación y alcance se escriben en 4 partes de 25 % cada una. Una parte cuenta cuando tiene el mínimo
// de palabras que pide la ficha para el elemento («Palabras mínimas», repartido entre las 4 partes; con 0, basta con que
// tenga texto). Con menos de 75 % no se avanza al paso siguiente ni se envía la propuesta (respuesta 1: en todo).

export type ElementoConPartes = "problema" | "justificacion" | "alcance";

/** Elementos que entran en la fortaleza total: los de partes y los objetivos (promedio SMART, R4, en `smart.ts`). */
export type ElementoFortaleza = ElementoConPartes | "objetivos";

export interface Parte {
  clave: string;
  titulo: string;
  ayuda: string;
}

export const UMBRAL_FORTALEZA = 75;

export const PARTES: Record<ElementoConPartes, Parte[]> = {
  problema: [
    { clave: "descripcion", titulo: "Descripción del problema u oportunidad", ayuda: "Explica cuál es la situación actual, dónde ocurre, a quién afecta y por qué es un problema o una oportunidad." },
    { clave: "datos", titulo: "Datos del problema u oportunidad", ayuda: "Respalda la descripción con datos: cifras, porcentajes, registros, encuestas o fuentes que muestren su tamaño." },
    { clave: "proyecciones", titulo: "Proyecciones", ayuda: "Indica qué pasará si no se atiende y qué se espera lograr si se atiende, con estimaciones cuando sea posible." },
    { clave: "conclusiones", titulo: "Conclusiones", ayuda: "Resume por qué el problema u oportunidad merece atenderse con este trabajo." },
  ],
  justificacion: [
    { clave: "operativa", titulo: "Justificación operativa", ayuda: "Cómo mejora los procesos, la operación o el trabajo diario de la institución o empresa." },
    { clave: "cliente", titulo: "Justificación en beneficio del cliente", ayuda: "Qué gana el cliente, usuario o beneficiario directo: tiempo, calidad, acceso, satisfacción." },
    { clave: "economica", titulo: "Justificación económica", ayuda: "Ahorros, ingresos, costos evitados o retorno de la inversión que se esperan." },
    { clave: "social", titulo: "Justificación social", ayuda: "Impacto en la comunidad, el medio ambiente o la sociedad más allá de la institución." },
  ],
  alcance: [
    { clave: "incluye", titulo: "Qué incluye", ayuda: "Lo que el trabajo sí abarcará: módulos, áreas, procesos, población o período." },
    { clave: "no_incluye", titulo: "Qué no incluye", ayuda: "Lo que queda fuera del trabajo, para evitar malentendidos con la institución y el asesor." },
    { clave: "entregables", titulo: "Entregables o productos", ayuda: "Lo que se entregará al final: documentos, sistemas, prototipos, manuales, capacitaciones." },
    { clave: "supuestos", titulo: "Supuestos y restricciones", ayuda: "Condiciones de las que depende el trabajo y límites de tiempo, recursos o acceso a la información." },
  ],
};

export type Partes = Record<string, string>;

export const contarPalabras = (t: string | null | undefined) => {
  const limpio = (t ?? "").trim();
  return limpio ? limpio.split(/\s+/).length : 0;
};

/** Mínimo de palabras de cada parte según «Palabras mínimas» del elemento en la ficha (0 = basta con tener texto). */
export const minimoPorParte = (minPalabrasElemento: number) => Math.max(1, Math.ceil((Number(minPalabrasElemento) || 0) / 4));

export interface Fortaleza {
  porcentaje: number;
  /** Claves de las partes que cuentan. */
  cumplidas: string[];
  minimoPorParte: number;
}

export function fortalezaElemento(elemento: ElementoConPartes, partes: Partes, minPalabrasElemento: number): Fortaleza {
  const minimo = minimoPorParte(minPalabrasElemento);
  const lista = PARTES[elemento];
  const cumplidas = lista.filter((p) => contarPalabras(partes[p.clave]) >= minimo).map((p) => p.clave);
  return { porcentaje: Math.round((cumplidas.length / lista.length) * 100), cumplidas, minimoPorParte: minimo };
}

/**
 * Partes guardadas; si la propuesta se redactó antes de R3 (un solo bloque de texto), ese texto queda en la primera
 * parte para que el egresado lo reparta.
 */
export function leerPartes(elemento: ElementoConPartes, guardadas: unknown, textoAnterior: string | null | undefined): Partes {
  const partes: Partes = {};
  if (guardadas && typeof guardadas === "object") {
    for (const p of PARTES[elemento]) {
      const v = (guardadas as Record<string, unknown>)[p.clave];
      partes[p.clave] = typeof v === "string" ? v : "";
    }
    return partes;
  }
  PARTES[elemento].forEach((p, i) => (partes[p.clave] = i === 0 ? textoAnterior ?? "" : ""));
  return partes;
}

/** Texto completo del elemento, con cada parte como subtítulo (es lo que leen el documento y las demás vistas). */
export function componerTexto(elemento: ElementoConPartes, partes: Partes): string {
  return PARTES[elemento]
    .filter((p) => (partes[p.clave] ?? "").trim())
    .map((p) => `${p.titulo}\n${partes[p.clave].trim()}`)
    .join("\n\n");
}

export interface FortalezaPropuesta {
  porcentaje: number | null;
  elementos: { elemento: ElementoFortaleza; titulo: string; porcentaje: number }[];
}

/** Fortaleza total: promedio de los elementos con partes y de los objetivos que tiene la ficha. */
export function fortalezaTotal(elementos: { elemento: ElementoFortaleza; titulo: string; porcentaje: number }[]): FortalezaPropuesta {
  if (elementos.length === 0) return { porcentaje: null, elementos };
  return { porcentaje: Math.round(elementos.reduce((s, e) => s + e.porcentaje, 0) / elementos.length), elementos };
}

/** Nivel para mostrar: fuerte (100), suficiente (75 a 99) o débil (menos de 75). */
export const nivelFortaleza = (p: number | null) => (p == null ? "ninguno" : p >= 100 ? "fuerte" : p >= UMBRAL_FORTALEZA ? "suficiente" : "debil");
