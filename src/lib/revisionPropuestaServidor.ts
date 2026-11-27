import "server-only";
// Revisión obligatoria del documento antes de enviar y documentos de soporte por integrante (R6).
//
// La confirmación del líder guarda una huella de todo lo que sale en el documento: la de la ratificación
// (`huellaPropuesta`: título, apartados, objetivos, actores, integrantes y espacios de la ficha) más la empresa, el
// supervisor y la carta. Si algo de eso cambia, la confirmación deja de valer y hay que revisar de nuevo.

import crypto from "crypto";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { cartasAceptacion, documentosEgresado, integrantesProyecto, propuestas, revisionesPropuesta, usuarios } from "@/lib/schema";
import { huellaPropuesta } from "@/lib/huellaPropuesta";

export const DOCUMENTOS_SOPORTE = [
  { tipo: "pago_tg", nombre: "Comprobante de inscripción del trabajo de graduación", corto: "Inscripción" },
  { tipo: "servicio_social", nombre: "Constancia de servicio social", corto: "Servicio social" },
  { tipo: "certificacion_notas", nombre: "Certificación global de notas", corto: "Notas" },
] as const;

export async function huellaRevision(propuestaId: number): Promise<string> {
  const base = await huellaPropuesta(propuestaId);
  const [p] = await db
    .select({ empresaId: propuestas.empresaId, sucursalId: propuestas.sucursalId, supervisorId: propuestas.supervisorId })
    .from(propuestas)
    .where(eq(propuestas.id, propuestaId));
  const [c] = await db.select().from(cartasAceptacion).where(eq(cartasAceptacion.propuestaId, propuestaId));
  const archivo = c?.archivoUrl ? crypto.createHash("sha256").update(c.archivoUrl).digest("hex") : "";
  const objeto = {
    base,
    empresa: [p?.empresaId ?? null, p?.sucursalId ?? null, p?.supervisorId ?? null],
    carta: c
      ? [archivo, c.fechaEmision, c.fechaInicio, c.fechaFin, c.firmanteIds ?? [], c.supervisorId, c.sinSupervisor, c.motivoSinSupervisor ?? ""]
      : null,
  };
  return crypto.createHash("sha256").update(JSON.stringify(objeto)).digest("hex");
}

export interface EstadoRevision {
  /** Confirmada para la versión actual. */
  confirmada: boolean;
  /** Se confirmó una versión anterior: hubo cambios después. */
  cambioDespues: boolean;
  confirmadaEn: string | null;
}

export async function estadoRevision(propuestaId: number): Promise<EstadoRevision> {
  const [r] = await db.select().from(revisionesPropuesta).where(eq(revisionesPropuesta.propuestaId, propuestaId));
  if (!r) return { confirmada: false, cambioDespues: false, confirmadaEn: null };
  const vigente = r.huella === (await huellaRevision(propuestaId));
  return { confirmada: vigente, cambioDespues: !vigente, confirmadaEn: r.confirmadaEn.toISOString() };
}

export interface DocumentosIntegrante {
  usuarioId: number;
  nombre: string;
  carnet: string | null;
  esLider: boolean;
  /** Tipo de documento → subido. */
  documentos: Record<string, boolean>;
  faltan: string[];
}

/** Los tres documentos de soporte de cada integrante activo (líder y los que aceptaron). */
export async function documentosPorIntegrante(propuestaId: number): Promise<DocumentosIntegrante[]> {
  const [p] = await db.select({ egresadoId: propuestas.egresadoId }).from(propuestas).where(eq(propuestas.id, propuestaId));
  if (!p) return [];
  const miembros = await db
    .select({ id: integrantesProyecto.egresadoId })
    .from(integrantesProyecto)
    .where(and(eq(integrantesProyecto.propuestaId, propuestaId), eq(integrantesProyecto.estado, "aceptado")));
  const ids = [p.egresadoId, ...miembros.map((m) => m.id).filter((id) => id !== p.egresadoId)];
  const personas = await db.select({ id: usuarios.id, nombre: usuarios.nombreCompleto, carnet: usuarios.carnet }).from(usuarios).where(inArray(usuarios.id, ids));
  const docs = await db.select({ egresadoId: documentosEgresado.egresadoId, tipo: documentosEgresado.tipo }).from(documentosEgresado).where(inArray(documentosEgresado.egresadoId, ids));
  return ids
    .map((id) => personas.find((x) => x.id === id))
    .filter((x): x is NonNullable<typeof x> => !!x)
    .map((u) => {
      const documentos = Object.fromEntries(DOCUMENTOS_SOPORTE.map((d) => [d.tipo, docs.some((x) => x.egresadoId === u.id && x.tipo === d.tipo)]));
      return {
        usuarioId: u.id,
        nombre: u.nombre,
        carnet: u.carnet,
        esLider: u.id === p.egresadoId,
        documentos,
        faltan: DOCUMENTOS_SOPORTE.filter((d) => !documentos[d.tipo]).map((d) => d.nombre),
      };
    });
}
