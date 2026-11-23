// Conexión entre una propuesta y su ficha (entrega P2). Solo servidor: consulta la base.
//   - Al crear una propuesta se le asigna la versión habilitada de la ficha que mejor corresponde al egresado.
//   - Al redactarla, el asistente y las reglas (equipo, objetivos) leen esa versión.
//   - Las propuestas sin ficha (las anteriores) usan la ficha base, que describe la fase 1 tal como es.
// Se asigna en proyecto (P2) e investigación (I2): son las modalidades cuyo asistente lee la ficha.
import { db } from "@/lib/db";
import { carreras, fichas, fichasVersiones, fichasVersionesCohortes, integrantesProyecto, periodos, propuestas, usuarios } from "@/lib/schema";
import { and, desc, eq, inArray } from "drizzle-orm";
import { elegirVersion } from "./cohortesFicha";
import { definicionBase } from "./fichasBase";
import { esEtapaPropuesta, type DefinicionFicha, type Espacio, type Modalidad } from "./tipos";
import { objetivosPorIntegranteDe, rangoObjetivos, type RangoObjetivos } from "./objetivos";

/** Modalidades cuyo asistente ya lee la ficha. */
// Pasantía (entrega W1, 23-nov-2026): las propuestas nuevas toman la versión habilitada de su ficha; las que ya existían
// (sin versión) siguen con el asistente de la fase 1.
export const MODALIDADES_CON_FICHA: Modalidad[] = ["pasantia", "proyecto", "investigacion"];

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
    .select({ carreraId: usuarios.carreraId, facultadId: usuarios.facultadId, facultadCarrera: carreras.facultadId, cohorte: usuarios.cohorte })
    .from(usuarios)
    .leftJoin(carreras, eq(usuarios.carreraId, carreras.id))
    .where(eq(usuarios.id, egresadoId))
    .limit(1);
  const facultadId = u?.facultadId ?? u?.facultadCarrera ?? null;
  // La cohorte del egresado es el nombre de un ciclo (H9).
  const [ciclo] = u?.cohorte ? await db.select({ id: periodos.id }).from(periodos).where(eq(periodos.nombre, u.cohorte)).limit(1) : [];

  const candidatas = await db
    .select({ id: fichasVersiones.id, habilitadaEn: fichasVersiones.habilitadaEn, carreraId: fichas.carreraId, facultadId: fichas.facultadId })
    .from(fichasVersiones)
    .innerJoin(fichas, eq(fichasVersiones.fichaId, fichas.id))
    .where(and(eq(fichas.modalidad, modalidad), eq(fichas.esBase, false), eq(fichasVersiones.estado, "habilitada")))
    .orderBy(desc(fichasVersiones.numero));
  const ligas = candidatas.length
    ? await db.select().from(fichasVersionesCohortes).where(inArray(fichasVersionesCohortes.versionId, candidatas.map((c) => c.id)))
    : [];

  // H1/H11: primero la versión de su cohorte, luego las que no tienen cohortes; a igual alcance, la más reciente.
  const nivel = (c: (typeof candidatas)[number]) =>
    c.carreraId !== null ? (c.carreraId === u?.carreraId ? 3 : -1)
      : c.facultadId !== null ? (c.facultadId === facultadId ? 2 : -1)
      : 1;
  return elegirVersion(
    candidatas.map((c) => ({ id: c.id, nivel: nivel(c), habilitadaEn: c.habilitadaEn, cohortes: ligas.filter((l) => l.versionId === c.id).map((l) => l.periodoId) })),
    ciclo?.id ?? null
  );
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

/** Integrantes del trabajo: el líder más los que aceptaron la invitación. */
export async function integrantesDePropuesta(propuestaId: number): Promise<number> {
  const aceptados = await db
    .select({ id: integrantesProyecto.id })
    .from(integrantesProyecto)
    .where(and(eq(integrantesProyecto.propuestaId, propuestaId), eq(integrantesProyecto.estado, "aceptado")));
  return 1 + aceptados.length;
}

/**
 * Límites de objetivos específicos (H19/H27): el rango por integrante de la ficha (de 3 a 4 por defecto) por la cantidad
 * de integrantes. Las propuestas sin ficha usan la misma regla.
 */
export async function limitesObjetivos(propuestaId: number): Promise<RangoObjetivos & { porIntegrante: RangoObjetivos; integrantes: number }> {
  const f = await fichaDePropuesta(propuestaId);
  const porIntegrante = objetivosPorIntegranteDe(f?.version ? f.definicion : null);
  const integrantes = await integrantesDePropuesta(propuestaId);
  return { ...rangoObjetivos(porIntegrante, integrantes), porIntegrante, integrantes };
}
