import "server-only";
// Reglas de la ejecución de la pasantía de una propuesta (entrega W2): las de su versión de ficha o las de la fase 1.

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { fichasVersiones, propuestas } from "@/lib/schema";
import { REGLAS_FASE1, reglasDeDefinicion, type ReglasPasantia } from "./reglasPasantia";

export async function reglasPasantiaDePropuesta(propuestaId: number): Promise<ReglasPasantia> {
  const [p] = await db.select({ tipo: propuestas.tipo, versionId: propuestas.fichaVersionId }).from(propuestas).where(eq(propuestas.id, propuestaId)).limit(1);
  if (!p || p.tipo !== "pasantia" || !p.versionId) return REGLAS_FASE1;
  const [v] = await db.select({ definicion: fichasVersiones.definicion }).from(fichasVersiones).where(eq(fichasVersiones.id, p.versionId)).limit(1);
  return reglasDeDefinicion(v?.definicion as { etapas?: unknown[] } | null);
}
