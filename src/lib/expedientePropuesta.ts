import "server-only";
// Expediente de una propuesta para la pantalla «Revisar propuesta» de la administración (specs/REVISAR_PROPUESTA_ADMIN.md,
// A1): equipo con carrera y facultad, documentos de soporte de cada integrante, empresa, carta con sus firmantes y
// supervisor, y contenido básico. Solo lee.

import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  actividades,
  carreras,
  cartasAceptacion,
  detallesProyecto,
  documentosEgresado,
  empresas,
  facultades,
  firmantes,
  integrantesProyecto,
  propuestas,
  sucursales,
  supervisores,
} from "@/lib/schema";
import { usuarios } from "@/lib/schema";
import { DOCUMENTOS_SOPORTE } from "@/lib/revisionPropuestaServidor";
import { nombrePersona } from "@/lib/personasCarta";

export interface IntegranteExpediente {
  id: number;
  nombre: string;
  carnet: string | null;
  correo: string;
  carrera: string | null;
  esLider: boolean;
  documentos: { tipo: string; nombre: string; url: string | null; subidoEn: string | null }[];
}

export interface PersonaEmpresa {
  id: number;
  nombre: string;
  cargo: string | null;
  correo: string | null;
  telefono: string | null;
  firmaUrl: string | null;
}

export interface Expediente {
  propuesta: typeof propuestas.$inferSelect;
  facultad: string | null;
  integrantes: IntegranteExpediente[];
  empresa: { nombre: string; direccion: string | null; sucursal: string | null } | null;
  carta: {
    archivoUrl: string | null;
    fechaEmision: string | null;
    fechaInicio: string | null;
    fechaFin: string | null;
    firmantes: PersonaEmpresa[];
    supervisor: PersonaEmpresa | null;
    /** Datos escritos en la carta cuando el supervisor no está en la empresa (propuestas anteriores a R5). */
    supervisorEscrito: string | null;
    sinSupervisor: boolean;
    motivoSinSupervisor: string | null;
  } | null;
  contenido: {
    objetivoGeneral: string | null;
    objetivosEspecificos: { titulo?: string; descripcion?: string }[];
  };
  actividades: { id: number; periodo: number; semana: number; titulo: string | null; descripcion: string | null }[];
}

const persona = (p: { id: number; titulo: string | null; nombres: string; apellidos: string; cargo: string | null; correo: string | null; telefono: string | null; firmaUrl: string | null }): PersonaEmpresa => ({
  id: p.id,
  nombre: nombrePersona(p),
  cargo: p.cargo,
  correo: p.correo,
  telefono: p.telefono,
  firmaUrl: p.firmaUrl,
});

export async function expedientePropuesta(propuestaId: number): Promise<Expediente | null> {
  const [prop] = await db.select().from(propuestas).where(eq(propuestas.id, propuestaId));
  if (!prop) return null;

  // Equipo: líder y los que aceptaron
  const miembros = await db
    .select({ id: integrantesProyecto.egresadoId })
    .from(integrantesProyecto)
    .where(and(eq(integrantesProyecto.propuestaId, propuestaId), eq(integrantesProyecto.estado, "aceptado")));
  const ids = [prop.egresadoId, ...miembros.map((m) => m.id).filter((id) => id !== prop.egresadoId)];
  const gente = await db
    .select({ id: usuarios.id, nombre: usuarios.nombreCompleto, carnet: usuarios.carnet, correo: usuarios.correo, carrera: carreras.nombre, facultad: facultades.nombre })
    .from(usuarios)
    .leftJoin(carreras, eq(carreras.id, usuarios.carreraId))
    .leftJoin(facultades, eq(facultades.id, usuarios.facultadId))
    .where(inArray(usuarios.id, ids));
  const docs = await db.select().from(documentosEgresado).where(inArray(documentosEgresado.egresadoId, ids));
  const integrantes: IntegranteExpediente[] = ids
    .map((id) => gente.find((g) => g.id === id))
    .filter((g): g is NonNullable<typeof g> => !!g)
    .map((g) => ({
      id: g.id,
      nombre: g.nombre,
      carnet: g.carnet,
      correo: g.correo,
      carrera: g.carrera,
      esLider: g.id === prop.egresadoId,
      documentos: DOCUMENTOS_SOPORTE.map((d) => {
        const doc = docs.find((x) => x.egresadoId === g.id && x.tipo === d.tipo);
        return { tipo: d.tipo, nombre: d.nombre, url: doc?.archivoUrl ?? null, subidoEn: doc?.subidoEn?.toISOString() ?? null };
      }),
    }));

  // Empresa
  let empresa: Expediente["empresa"] = null;
  if (prop.empresaId) {
    const [e] = await db.select({ nombre: empresas.nombre, direccion: empresas.direccion }).from(empresas).where(eq(empresas.id, prop.empresaId));
    const [s] = prop.sucursalId ? await db.select({ nombre: sucursales.nombre, direccion: sucursales.direccion }).from(sucursales).where(eq(sucursales.id, prop.sucursalId)) : [];
    if (e) empresa = { nombre: e.nombre, direccion: s?.direccion ?? e.direccion, sucursal: s?.nombre ?? null };
  }

  // Carta con firmantes y supervisor (R5)
  const [c] = await db.select().from(cartasAceptacion).where(eq(cartasAceptacion.propuestaId, propuestaId));
  let carta: Expediente["carta"] = null;
  if (c) {
    const ids = Array.isArray(c.firmanteIds) ? c.firmanteIds : [];
    const listaFirmantes = ids.length ? (await db.select().from(firmantes).where(inArray(firmantes.id, ids))).map(persona) : [];
    const supId = c.supervisorId ?? prop.supervisorId;
    const [sup] = supId && !c.sinSupervisor ? await db.select().from(supervisores).where(eq(supervisores.id, supId)) : [];
    const escrito = [c.supTitulo, c.supNombres, c.supApellidos].filter((x) => x && x.trim()).join(" ");
    carta = {
      archivoUrl: c.archivoUrl,
      fechaEmision: c.fechaEmision,
      fechaInicio: c.fechaInicio,
      fechaFin: c.fechaFin,
      firmantes: listaFirmantes,
      supervisor: sup ? persona(sup) : null,
      supervisorEscrito: !sup && escrito ? `${escrito}${c.supCargo ? ` (${c.supCargo})` : ""}` : null,
      sinSupervisor: c.sinSupervisor,
      motivoSinSupervisor: c.motivoSinSupervisor,
    };
  }

  const [det] = await db
    .select({ general: detallesProyecto.objetivoGeneral, especificos: detallesProyecto.objetivosEspecificos })
    .from(detallesProyecto)
    .where(eq(detallesProyecto.propuestaId, propuestaId));
  const acts = await db
    .select({ id: actividades.id, periodo: actividades.periodo, semana: actividades.semana, titulo: actividades.titulo, descripcion: actividades.descripcion })
    .from(actividades)
    .where(eq(actividades.propuestaId, propuestaId))
    .orderBy(asc(actividades.periodo), asc(actividades.semana), asc(actividades.numero));

  return {
    propuesta: prop,
    facultad: gente.find((g) => g.id === prop.egresadoId)?.facultad ?? null,
    integrantes,
    empresa,
    carta,
    contenido: {
      objetivoGeneral: det?.general ?? null,
      objetivosEspecificos: Array.isArray(det?.especificos) ? (det.especificos as { titulo?: string; descripcion?: string }[]) : [],
    },
    actividades: acts,
  };
}

export interface RechazoAnterior {
  id: number;
  fecha: string;
  funcion: string;
  quien: string | null;
  motivos: string[];
  mensaje: string;
}

/** Rechazos por requisitos de la propuesta (A2), del más reciente al más antiguo. */
export async function rechazosDePropuesta(propuestaId: number, nombres: Record<number, string>): Promise<RechazoAnterior[]> {
  const { rechazosPropuesta } = await import("@/lib/schema");
  const { textoMotivo } = await import("@/lib/rechazoPropuesta");
  const { desc } = await import("drizzle-orm");
  const filas = await db
    .select({ r: rechazosPropuesta, quien: usuarios.nombreCompleto })
    .from(rechazosPropuesta)
    .leftJoin(usuarios, eq(usuarios.id, rechazosPropuesta.rechazadoPor))
    .where(eq(rechazosPropuesta.propuestaId, propuestaId))
    .orderBy(desc(rechazosPropuesta.creadoEn));
  return filas.map(({ r, quien }) => ({
    id: r.id,
    fecha: r.creadoEn.toISOString(),
    funcion: r.funcion,
    quien,
    motivos: (r.motivos ?? []).map((m) => textoMotivo(m, nombres)),
    mensaje: r.mensaje,
  }));
}

/** Último rechazo por requisitos, con los nombres del equipo para los motivos por integrante (A3). */
export async function ultimoRechazo(propuestaId: number): Promise<RechazoAnterior | null> {
  const [prop] = await db.select({ egresadoId: propuestas.egresadoId }).from(propuestas).where(eq(propuestas.id, propuestaId));
  if (!prop) return null;
  const miembros = await db
    .select({ id: usuarios.id, nombre: usuarios.nombreCompleto })
    .from(integrantesProyecto)
    .innerJoin(usuarios, eq(usuarios.id, integrantesProyecto.egresadoId))
    .where(and(eq(integrantesProyecto.propuestaId, propuestaId), eq(integrantesProyecto.estado, "aceptado")));
  const [lider] = await db.select({ id: usuarios.id, nombre: usuarios.nombreCompleto }).from(usuarios).where(eq(usuarios.id, prop.egresadoId));
  const nombres = Object.fromEntries([...(lider ? [lider] : []), ...miembros].map((g) => [g.id, g.nombre]));
  const lista = await rechazosDePropuesta(propuestaId, nombres).catch(() => []);
  return lista[0] ?? null;
}
