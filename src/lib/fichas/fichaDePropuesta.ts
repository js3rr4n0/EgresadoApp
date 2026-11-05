// Conexión entre una propuesta y su ficha (entrega P2). Solo servidor: consulta la base.
//   - Al crear una propuesta se le asigna la versión habilitada de la ficha que mejor corresponde al egresado.
//   - Al redactarla, el asistente y las reglas (equipo, objetivos) leen esa versión.
//   - Las propuestas sin ficha (las anteriores) usan la ficha base, que describe la fase 1 tal como es.
// Por ahora solo se asigna en proyecto: es la modalidad cuyo asistente ya lee la ficha.
import { db } from "@/lib/db";
import { carreras, fichas, fichasVersiones, propuestas, usuarios } from "@/lib/schema";
import { and, desc, eq } from "drizzle-orm";
import { definicionBase } from "./fichasBase";
import { esEtapaPropuesta, type DefinicionFicha, type Espacio, type Modalidad } from "./tipos";

/** Modalidades cuyo asistente ya lee la ficha. */
export const MODALIDADES_CON_FICHA: Modalidad[] = ["proyecto"];

export interface FichaDePropuesta {
  definicion: DefinicionFicha;
  /** null = la propuesta no está ligada a una ficha y se usa la ficha base. */
  version: { id: number; numero: number; codigo: string | null } | null;
}

/**
 * Versión habilitada que corresponde a un egresado para una modalidad. Gana la más específica:
 * ficha de su carrera → ficha de su facultad (todas las carreras) → ficha general. Dentro de una ficha se usa la
 * versión habilitada de número más alto (cuál versión usa cada cohorte se decidirá en la entrega 3).
 */
export async function versionParaNuevaPropuesta(modalidad: Modalidad, egresadoId: number): Promise<number | null> {
  if (!MODALIDADES_CON_FICHA.includes(modalidad)) return null;
  const [u] = await db
    .select({ carreraId: usuarios.carreraId, facultadId: usuarios.facultadId, facultadCarrera: carreras.facultadId })
    .from(usuarios)
    .leftJoin(carreras, eq(usuarios.carreraId, carreras.id))
    .where(eq(usuarios.id, egresadoId))
    .limit(1);
  const facultadId = u?.facultadId ?? u?.facultadCarrera ?? null;

  const candidatas = await db
    .select({ id: fichasVersiones.id, numero: fichasVersiones.numero, carreraId: fichas.carreraId, facultadId: fichas.facultadId })
    .from(fichasVersiones)
    .innerJoin(fichas, eq(fichasVersiones.fichaId, fichas.id))
    .where(and(eq(fichas.modalidad, modalidad), eq(fichas.esBase, false), eq(fichasVersiones.estado, "habilitada")))
    .orderBy(desc(fichasVersiones.numero));

  const nivel = (c: (typeof candidatas)[number]) =>
    c.carreraId !== null ? (c.carreraId === u?.carreraId ? 3 : -1)
      : c.facultadId !== null ? (c.facultadId === facultadId ? 2 : -1)
      : 1;
  const mejor = candidatas.filter((c) => nivel(c) > 0).sort((a, b) => nivel(b) - nivel(a) || b.numero - a.numero)[0];
  return mejor?.id ?? null;
}

/** Definición con la que se redacta una propuesta (su versión, o la ficha base si no tiene). */
export async function fichaDePropuesta(propuestaId: number): Promise<FichaDePropuesta | null> {
  const [fila] = await db
    .select({ tipo: propuestas.tipo, versionId: propuestas.fichaVersionId })
    .from(propuestas)
    .where(eq(propuestas.id, propuestaId))
    .limit(1);
  if (!fila) return null;
  if (fila.versionId) {
    const [v] = await db
      .select({ id: fichasVersiones.id, numero: fichasVersiones.numero, definicion: fichasVersiones.definicion, codigo: fichas.codigo })
      .from(fichasVersiones)
      .innerJoin(fichas, eq(fichasVersiones.fichaId, fichas.id))
      .where(eq(fichasVersiones.id, fila.versionId))
      .limit(1);
    if (v) return { definicion: v.definicion as DefinicionFicha, version: { id: v.id, numero: v.numero, codigo: v.codigo } };
  }
  return { definicion: definicionBase(fila.tipo as Modalidad), version: null };
}

/** Espacios de la propuesta, en el orden de la ficha. */
export function espaciosPropuesta(def: DefinicionFicha): Espacio[] {
  return def.etapas.find(esEtapaPropuesta)?.espacios ?? [];
}

/** Máximo de integrantes (líder incluido) según la ficha de la propuesta. */
export async function maxIntegrantesDePropuesta(propuestaId: number, porDefecto: number): Promise<number> {
  const f = await fichaDePropuesta(propuestaId);
  return f?.version ? f.definicion.participantes.max : porDefecto;
}

/** Límites de objetivos específicos según la ficha de la propuesta (o los de la fase 1). */
export async function limitesObjetivos(propuestaId: number, porDefecto: { min: number; max: number }) {
  const f = await fichaDePropuesta(propuestaId);
  if (!f?.version) return porDefecto;
  const esp = espaciosPropuesta(f.definicion).find((e) => e.elemento === "objetivos");
  if (!esp) return porDefecto;
  return { min: Number(esp.parametros.minEspecificos), max: Number(esp.parametros.maxEspecificos) };
}
