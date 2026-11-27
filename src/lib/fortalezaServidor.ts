import "server-only";
// Fortaleza de una propuesta a partir de lo guardado (R3 y R4). Lo usan la página de redacción, el envío y las vistas del
// asesor y el coordinador.

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { detallesProyecto } from "@/lib/schema";
import { espaciosPropuesta, fichaDePropuesta, limitesObjetivos } from "@/lib/fichas/fichaDePropuesta";
import { fortalezaObjetivos } from "@/lib/smart";
import { fortalezaElemento, fortalezaTotal, leerPartes, type ElementoConPartes, type ElementoFortaleza, type FortalezaPropuesta } from "@/lib/fortaleza";

/** Elemento con partes que corresponde a un espacio de la ficha (por su columna de la fase 1). */
export const ORIGEN_ELEMENTO: Record<string, ElementoConPartes> = {
  "detalles_proyecto.descripcion_problema": "problema",
  "detalles_proyecto.justificacion": "justificacion",
  "detalles_proyecto.alcance": "alcance",
};

export async function fortalezaDePropuesta(propuestaId: number): Promise<FortalezaPropuesta & { anterior?: boolean }> {
  const ficha = await fichaDePropuesta(propuestaId);
  if (!ficha) return { porcentaje: null, elementos: [] };
  const [det] = await db.select().from(detallesProyecto).where(eq(detallesProyecto.propuestaId, propuestaId));
  const guardado = {
    problema: { partes: det?.problemaPartes, texto: det?.descripcionProblema },
    justificacion: { partes: det?.justificacionPartes, texto: det?.justificacion },
    alcance: { partes: det?.alcancePartes, texto: det?.alcance },
  };
  const espacios = espaciosPropuesta(ficha.definicion);
  const conPartes = espacios
    .filter((e) => e.origenFase1 && ORIGEN_ELEMENTO[e.origenFase1])
    .map((e) => {
      const elemento = ORIGEN_ELEMENTO[e.origenFase1!];
      const partes = leerPartes(elemento, guardado[elemento].partes, guardado[elemento].texto);
      return { elemento, titulo: e.titulo, porcentaje: fortalezaElemento(elemento, partes, Number(e.parametros.minPalabras) || 0).porcentaje };
    });
  // R4: objetivos específicos, promedio SMART (los que faltan para el mínimo cuentan 0 %)
  const espObjetivos = espacios.find((e) => e.elemento === "objetivos");
  const elementos: { elemento: ElementoFortaleza; titulo: string; porcentaje: number }[] = [...conPartes];
  if (espObjetivos) {
    const lim = await limitesObjetivos(propuestaId);
    const especificos = Array.isArray(det?.objetivosEspecificos) ? (det.objetivosEspecificos as { titulo?: string; descripcion?: string }[]) : [];
    elementos.push({ elemento: "objetivos", titulo: espObjetivos.titulo, porcentaje: fortalezaObjetivos(especificos, lim.min) });
  }
  // Redactada antes de R3: ningún elemento tiene partes guardadas (su texto está entero en la primera parte)
  const anterior = conPartes.length > 0 && conPartes.every((e) => !guardado[e.elemento].partes) && conPartes.some((e) => !!guardado[e.elemento].texto);
  return { ...fortalezaTotal(elementos), anterior };
}
