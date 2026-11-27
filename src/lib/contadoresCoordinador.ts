import "server-only";
// D3/D8 (specs/COORDINADOR_ASIGNACION.md): números del menú del coordinador: propuestas por revisar y asignar, y
// solicitudes por atender (bajas, cambios de asesor y solicitudes de empresa de sus propuestas).

import { and, count, eq, inArray, isNull, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { propuestas, solicitudesBaja, solicitudesEmpresa } from "@/lib/schema";
import type { SessionPayload } from "@/lib/session";
import { cambiosPorAtender, puedeAtenderPropuesta } from "@/lib/cambioAsesorServidor";

export interface ContadoresCoordinador {
  porAsignar: number;
  solicitudes: number;
}

export async function contadoresCoordinador(session: SessionPayload): Promise<ContadoresCoordinador> {
  try {
    const admin = session.rol === "admin";
    const [[a], [b], cambios] = await Promise.all([
      db
        .select({ n: count() })
        .from(propuestas)
        .where(and(eq(propuestas.coordinadorId, session.userId), eq(propuestas.estado, "coordinador_asignado"), isNull(propuestas.asesorId))),
      db
        .select({ n: count() })
        .from(solicitudesBaja)
        .where(and(admin ? undefined : eq(solicitudesBaja.coordinadorId, session.userId), eq(solicitudesBaja.estado, "pendiente"))),
      cambiosPorAtender(session),
    ]);
    // Solicitudes de empresa de sus propuestas (sin las de la carta), solo para el coordinador
    let empresa = 0;
    if (session.rol === "coordinador") {
      const pend = await db
        .select({ propuestaId: solicitudesEmpresa.propuestaId })
        .from(solicitudesEmpresa)
        .where(and(eq(solicitudesEmpresa.estado, "pendiente"), inArray(solicitudesEmpresa.tipo, ["nueva", "actualizacion", "modificacion"]), ne(solicitudesEmpresa.tipo, "carta")));
      for (const p of pend) if (await puedeAtenderPropuesta(session, p.propuestaId)) empresa++;
    }
    return { porAsignar: Number(a?.n ?? 0), solicitudes: Number(b?.n ?? 0) + cambios + empresa };
  } catch {
    return { porAsignar: 0, solicitudes: 0 };
  }
}
