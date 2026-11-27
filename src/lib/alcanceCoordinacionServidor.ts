import "server-only";
// D5/D6 (specs/COORDINADOR_ASIGNACION.md): cohorte y carreras que ve quien consulta las páginas de coordinación.
// Coordinador: sus carreras en la configuración de la cohorte; administrador de facultad: su facultad;
// superadministrador: todas. Sin cohorte pedida, la más reciente donde la persona tiene carreras.

import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { cohorteFacultades, periodos, usuarios } from "@/lib/schema";
import { leerConfiguracionCohorte, type DatosConfiguracion } from "@/lib/configCohorteServidor";

export interface AlcanceCoordinacion {
  cohortes: { id: number; nombre: string }[];
  cohorte: { id: number; nombre: string } | null;
  datos: DatosConfiguracion | null;
  carreras: Set<number>;
  /** Hay cohortes configuradas pero la persona no tiene carreras en la elegida. */
  sinConfiguracion: boolean;
}

export async function alcanceCoordinacion(usuario: { id: number; rol: string }, periodoPedido?: number): Promise<AlcanceCoordinacion> {
  const lista = await db
    .selectDistinct({ id: periodos.id, nombre: periodos.nombre, inicio: periodos.inicioRecepcion })
    .from(periodos)
    .innerJoin(cohorteFacultades, eq(cohorteFacultades.periodoId, periodos.id))
    .orderBy(desc(periodos.inicioRecepcion));
  const cohortes = lista.map((c) => ({ id: c.id, nombre: c.nombre }));
  if (!cohortes.length) return { cohortes, cohorte: null, datos: null, carreras: new Set(), sinConfiguracion: false };

  const [yo] = await db.select({ facultadId: usuarios.facultadId }).from(usuarios).where(eq(usuarios.id, usuario.id));
  const carrerasDe = (datos: DatosConfiguracion) => {
    const carreras = new Set<number>();
    for (const f of datos.facultades) {
      if (!f.config) continue;
      const todas = f.carreras.map((c) => c.id);
      if (usuario.rol === "admin") todas.forEach((c) => carreras.add(c));
      else if (usuario.rol === "decanato") {
        if (f.config.adminFacultadId === usuario.id || f.id === yo?.facultadId) todas.forEach((c) => carreras.add(c));
      } else {
        const p = f.config.coordinadores.find((x) => x.usuarioId === usuario.id && x.activo);
        if (p) (p.carreras.length ? p.carreras : todas).forEach((c) => carreras.add(c));
      }
    }
    return carreras;
  };

  const pedida = cohortes.find((c) => c.id === periodoPedido);
  if (pedida) {
    const datos = await leerConfiguracionCohorte(pedida.id);
    const carreras = datos ? carrerasDe(datos) : new Set<number>();
    return { cohortes, cohorte: pedida, datos, carreras, sinConfiguracion: carreras.size === 0 };
  }
  for (const c of cohortes) {
    const datos = await leerConfiguracionCohorte(c.id);
    const carreras = datos ? carrerasDe(datos) : new Set<number>();
    if (carreras.size) return { cohortes, cohorte: c, datos, carreras, sinConfiguracion: false };
  }
  return { cohortes, cohorte: cohortes[0], datos: null, carreras: new Set(), sinConfiguracion: true };
}
