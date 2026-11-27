import "server-only";
// Verificación de firmas de la carta (A4). La comparación la hace la persona a simple vista; aquí solo se guarda quién la
// marcó y sobre qué carta y personas (huella), para que deje de valer si el egresado cambia algo.

import crypto from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { cartasAceptacion, propuestas, usuarios, verificacionesFirmas } from "@/lib/schema";

export async function huellaFirmas(propuestaId: number): Promise<string | null> {
  const [c] = await db.select().from(cartasAceptacion).where(eq(cartasAceptacion.propuestaId, propuestaId));
  if (!c?.archivoUrl) return null;
  const [p] = await db.select({ supervisorId: propuestas.supervisorId }).from(propuestas).where(eq(propuestas.id, propuestaId));
  const objeto = [
    crypto.createHash("sha256").update(c.archivoUrl).digest("hex"),
    [...(c.firmanteIds ?? [])].sort((a, b) => a - b),
    c.sinSupervisor ? "sin" : c.supervisorId ?? p?.supervisorId ?? null,
  ];
  return crypto.createHash("sha256").update(JSON.stringify(objeto)).digest("hex");
}

export interface EstadoVerificacionFirmas {
  /** null: no hay carta que verificar. */
  verificada: boolean | null;
  /** Se verificó una carta o unas personas que ya cambiaron. */
  cambioDespues: boolean;
  quien: string | null;
  fecha: string | null;
}

export async function estadoVerificacionFirmas(propuestaId: number): Promise<EstadoVerificacionFirmas> {
  const actual = await huellaFirmas(propuestaId);
  if (!actual) return { verificada: null, cambioDespues: false, quien: null, fecha: null };
  const [v] = await db
    .select({ huella: verificacionesFirmas.huella, fecha: verificacionesFirmas.verificadaEn, quien: usuarios.nombreCompleto })
    .from(verificacionesFirmas)
    .leftJoin(usuarios, eq(usuarios.id, verificacionesFirmas.verificadaPor))
    .where(eq(verificacionesFirmas.propuestaId, propuestaId));
  if (!v) return { verificada: false, cambioDespues: false, quien: null, fecha: null };
  const vigente = v.huella === actual;
  return { verificada: vigente, cambioDespues: !vigente, quien: v.quien, fecha: v.fecha.toISOString() };
}
