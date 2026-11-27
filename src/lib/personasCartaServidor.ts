import "server-only";
// Firmantes y supervisor de la carta (R5): lo que necesitan el formulario, el paso y el envío.

import { and, desc, eq, isNull, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { cartasAceptacion, firmantes, propuestas, solicitudesEmpresa, supervisores } from "@/lib/schema";
import { estadoPersonasCarta, nombrePersona, type DatosSolicitudCarta, type EstadoPersonasCarta, type EstadoSolicitudCarta } from "@/lib/personasCarta";

export interface OpcionPersona {
  id: number;
  nombre: string;
  cargo: string | null;
  correo: string | null;
  telefono: string | null;
}

export interface DatosPersonasCarta {
  empresaId: number | null;
  firmantes: OpcionPersona[];
  supervisores: OpcionPersona[];
  seleccion: { firmanteIds: number[]; supervisorId: number | null; sinSupervisor: boolean; motivoSinSupervisor: string };
  ultima: EstadoSolicitudCarta | null;
  estado: EstadoPersonasCarta;
}

export async function ultimaSolicitudCarta(propuestaId: number): Promise<EstadoSolicitudCarta | null> {
  const [s] = await db
    .select()
    .from(solicitudesEmpresa)
    .where(and(eq(solicitudesEmpresa.propuestaId, propuestaId), eq(solicitudesEmpresa.tipo, "carta")))
    .orderBy(desc(solicitudesEmpresa.creadaEn), desc(solicitudesEmpresa.id))
    .limit(1);
  if (!s) return null;
  return {
    id: s.id,
    estado: s.estado as EstadoSolicitudCarta["estado"],
    datos: s.datos as DatosSolicitudCarta,
    motivoRechazo: s.justificacionRechazo,
    fecha: (s.revisadoEn ?? s.creadaEn)?.toISOString() ?? null,
  };
}

const opcion = (p: { id: number; titulo: string | null; nombres: string; apellidos: string; cargo: string | null; correo: string | null; telefono: string | null }): OpcionPersona => ({
  id: p.id,
  nombre: nombrePersona(p),
  cargo: p.cargo,
  correo: p.correo,
  telefono: p.telefono,
});

/** Opciones de la empresa (de la sucursal de la propuesta o de la empresa en general) y lo elegido en la carta. */
export async function datosPersonasCarta(propuestaId: number): Promise<DatosPersonasCarta> {
  const [prop] = await db.select({ empresaId: propuestas.empresaId, sucursalId: propuestas.sucursalId, supervisorId: propuestas.supervisorId }).from(propuestas).where(eq(propuestas.id, propuestaId));
  const [carta] = await db.select().from(cartasAceptacion).where(eq(cartasAceptacion.propuestaId, propuestaId));
  const ultima = await ultimaSolicitudCarta(propuestaId);
  let listaFirmantes: OpcionPersona[] = [];
  let listaSupervisores: OpcionPersona[] = [];
  if (prop?.empresaId) {
    const deSucursal = (col: typeof firmantes.sucursalId | typeof supervisores.sucursalId) =>
      prop.sucursalId ? or(isNull(col), eq(col, prop.sucursalId)) : undefined;
    listaFirmantes = (await db.select().from(firmantes).where(and(eq(firmantes.empresaId, prop.empresaId), deSucursal(firmantes.sucursalId))).orderBy(firmantes.nombres)).map(opcion);
    listaSupervisores = (await db.select().from(supervisores).where(and(eq(supervisores.empresaId, prop.empresaId), deSucursal(supervisores.sucursalId))).orderBy(supervisores.nombres)).map(opcion);
  }
  const idsFirmantes = new Set(listaFirmantes.map((f) => f.id));
  const idsSupervisores = new Set(listaSupervisores.map((s) => s.id));
  // Si la ficha tiene el paso «Datos del supervisor», ese supervisor llega ya elegido
  const supervisorId = carta?.supervisorId ?? (carta?.sinSupervisor ? null : prop?.supervisorId ?? null);
  const seleccion = {
    firmanteIds: (carta?.firmanteIds ?? []).filter((id) => idsFirmantes.has(id)),
    supervisorId: supervisorId != null && idsSupervisores.has(supervisorId) ? supervisorId : null,
    sinSupervisor: !!carta?.sinSupervisor,
    motivoSinSupervisor: carta?.motivoSinSupervisor ?? "",
  };
  return {
    empresaId: prop?.empresaId ?? null,
    firmantes: listaFirmantes,
    supervisores: listaSupervisores,
    seleccion,
    ultima,
    estado: estadoPersonasCarta(carta ?? null, ultima),
  };
}

/** Estado para el paso y el envío, sin cargar las listas. */
export async function estadoPersonasCartaDe(propuestaId: number): Promise<EstadoPersonasCarta> {
  const [carta] = await db.select().from(cartasAceptacion).where(eq(cartasAceptacion.propuestaId, propuestaId));
  return estadoPersonasCarta(carta ?? null, await ultimaSolicitudCarta(propuestaId));
}
