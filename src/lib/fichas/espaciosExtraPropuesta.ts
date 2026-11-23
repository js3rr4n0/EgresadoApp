import "server-only";
// Espacios de la ficha que no tienen columna de la fase 1 (catálogo editable, C3 y C4): bloques de texto, elementos
// propios y campos adicionales de cada paso. Los muestran la vista previa del egresado y la vista para imprimir de la
// propuesta, en las tres modalidades con ficha (pasantía con ficha desde la entrega W1).

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { respuestasEspacios } from "@/lib/schema";
import { espaciosPropuesta, fichaDePropuesta } from "./fichaDePropuesta";
import { bloquesRespuesta } from "./respuestasPropias";
import { claveCamposExtra, defCamposExtra } from "./elementosPropios";

export type EspacioExtra = { id: string; titulo: string; texto: string; bloques: ReturnType<typeof bloquesRespuesta> };

export async function espaciosExtraDePropuesta(propuestaId: number, integrantes: { id: number; nombre: string }[]): Promise<EspacioExtra[]> {
  const ficha = await fichaDePropuesta(propuestaId);
  if (!ficha?.version) return [];
  const resp = await db.select().from(respuestasEspacios).where(eq(respuestasEspacios.propuestaId, propuestaId));
  const contenido = (id: string) => resp.find((r) => r.espacioId === id)?.contenido ?? "";
  return espaciosPropuesta(ficha.definicion).flatMap((e) => [
    ...((e.elemento === "texto" && !e.origenFase1) || (e.elemento === "propio" && e.propio)
      ? [{
          id: e.id,
          titulo: e.titulo,
          texto: e.elemento === "texto" ? contenido(e.id) : "",
          bloques: e.propio ? bloquesRespuesta(e.propio.definicion, contenido(e.id), integrantes) : [],
        }]
      : []),
    // Campos adicionales del paso (C4).
    ...(e.camposExtra?.length
      ? [{ id: claveCamposExtra(e.id), titulo: `${e.titulo}: datos adicionales`, texto: "", bloques: bloquesRespuesta(defCamposExtra(e), contenido(claveCamposExtra(e.id))) }]
      : []),
  ]);
}
