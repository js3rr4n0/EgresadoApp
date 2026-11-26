import "server-only";
// Permisos del panel de administración (specs/CONFIGURACION_COHORTE.md, C3): superadministrador (rol 'admin') y
// administrador de facultad (rol 'decanato'), que solo ve y gestiona lo de su facultad.

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { facultades, propuestas, usuarios } from "@/lib/schema";
import { getSession, type SessionPayload } from "@/lib/session";
import { configDeFacultad } from "@/lib/configCohorteServidor";

export interface Alcance {
  session: SessionPayload;
  superadmin: boolean;
  /** Facultad del administrador de facultad (null para el superadministrador). */
  facultadId: number | null;
  facultadNombre: string | null;
}

/** Sesión del panel de administración con su alcance; null si no es superadministrador ni administrador de facultad. */
export async function alcanceAdmin(): Promise<Alcance | null> {
  const session = await getSession();
  if (!session) return null;
  if (session.rol === "admin") return { session, superadmin: true, facultadId: null, facultadNombre: null };
  if (session.rol !== "decanato") return null;
  const [u] = await db
    .select({ facultadId: usuarios.facultadId, facultad: facultades.nombre, activo: usuarios.activo })
    .from(usuarios)
    .leftJoin(facultades, eq(facultades.id, usuarios.facultadId))
    .where(eq(usuarios.id, session.userId));
  // Un administrador de facultad sin facultad no puede ver nada
  if (!u?.facultadId || !u.activo) return null;
  return { session, superadmin: false, facultadId: u.facultadId, facultadNombre: u.facultad };
}

/** Facultad de la propuesta (la del egresado) y su cohorte. */
export async function facultadDePropuesta(propuestaId: number): Promise<{ facultadId: number | null; periodoId: number } | null> {
  const [p] = await db
    .select({ facultadId: usuarios.facultadId, periodoId: propuestas.periodoId })
    .from(propuestas)
    .innerJoin(usuarios, eq(usuarios.id, propuestas.egresadoId))
    .where(eq(propuestas.id, propuestaId));
  return p ?? null;
}

/** ¿Puede ver la propuesta? El superadministrador todas; el de facultad, las de su facultad. */
export async function puedeVerPropuesta(a: Alcance, propuestaId: number): Promise<boolean> {
  if (a.superadmin) return true;
  const p = await facultadDePropuesta(propuestaId);
  return !!p && p.facultadId === a.facultadId;
}

/**
 * ¿Puede asignar la propuesta (coordinador o asesor directo)? El superadministrador siempre. El de facultad, si la
 * propuesta es de su facultad y la cohorte lo tiene como administrador de esa facultad (o la cohorte aún no está
 * configurada para ella). Con administración central, solo el superadministrador asigna.
 */
export async function puedeAsignarPropuesta(a: Alcance, propuestaId: number): Promise<boolean> {
  if (a.superadmin) return true;
  const p = await facultadDePropuesta(propuestaId);
  if (!p || !p.facultadId || p.facultadId !== a.facultadId) return false;
  const config = await configDeFacultad(p.periodoId, p.facultadId);
  if (!config) return true;
  return config.administracion === "facultad" && config.adminFacultadId === a.session.userId;
}

/** ¿El usuario pertenece a la facultad del alcance? (para gestionar usuarios y asesores) */
export async function usuarioEnAlcance(a: Alcance, usuarioId: number): Promise<boolean> {
  if (a.superadmin) return true;
  const [u] = await db.select({ facultadId: usuarios.facultadId }).from(usuarios).where(eq(usuarios.id, usuarioId));
  return !!u && u.facultadId === a.facultadId;
}
