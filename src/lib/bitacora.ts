import "server-only";
import { db } from "@/lib/db";
import { bitacoraEventos } from "@/lib/schema";
import { and, desc, eq, gte } from "drizzle-orm";
import type { TipoEvento } from "@/lib/bitacoraEventos";

interface EventoBitacora {
  propuestaId: number;
  actorId?: number | null;
  actorRol: string;
  tipo: TipoEvento;
  descripcion: string;
  detalle?: string | null;
  referencia?: string | null;
  /**
   * Agrupa acciones repetidas (por ejemplo, guardar varias veces un borrador): si el mismo actor registró este tipo de
   * evento sobre la misma referencia dentro de este lapso, se actualiza ese evento en lugar de crear otro.
   */
  agruparMinutos?: number;
}

/** Registra un evento en la bitácora. Nunca interrumpe la acción principal: un fallo solo se reporta en el log. */
export async function registrarEvento(e: EventoBitacora) {
  try {
    const valores = {
      propuestaId: e.propuestaId,
      actorId: e.actorId ?? null,
      actorRol: e.actorRol,
      tipo: e.tipo,
      descripcion: e.descripcion,
      detalle: e.detalle?.trim() || null,
      referencia: e.referencia ?? null,
    };

    if (e.agruparMinutos && e.referencia && e.actorId) {
      const desde = new Date(Date.now() - e.agruparMinutos * 60 * 1000);
      const [reciente] = await db
        .select({ id: bitacoraEventos.id })
        .from(bitacoraEventos)
        .where(
          and(
            eq(bitacoraEventos.propuestaId, e.propuestaId),
            eq(bitacoraEventos.tipo, e.tipo),
            eq(bitacoraEventos.referencia, e.referencia),
            eq(bitacoraEventos.actorId, e.actorId),
            gte(bitacoraEventos.creadoEn, desde)
          )
        )
        .orderBy(desc(bitacoraEventos.creadoEn))
        .limit(1);
      if (reciente) {
        await db
          .update(bitacoraEventos)
          .set({ descripcion: valores.descripcion, detalle: valores.detalle, creadoEn: new Date() })
          .where(eq(bitacoraEventos.id, reciente.id));
        return;
      }
    }

    await db.insert(bitacoraEventos).values(valores);
  } catch (err) {
    console.error("No se pudo registrar el evento en la bitácora:", err);
  }
}
