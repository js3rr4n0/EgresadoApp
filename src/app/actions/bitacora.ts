"use server";

import { db } from "@/lib/db";
import { bitacoraEventos, propuestas, usuarios } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { and, count, desc, eq, inArray, isNull, or, type SQL } from "drizzle-orm";
import type { FiltroBitacora } from "@/lib/bitacoraEventos";

const TAMANO_PAGINA = 25;

type Propuesta = typeof propuestas.$inferSelect;

function puedeVerPropuesta(session: { userId: number; rol: string }, prop: Propuesta) {
  if (session.rol === "egresado") return prop.egresadoId === session.userId;
  if (session.rol === "asesor") return prop.asesorId === session.userId;
  if (session.rol === "coordinador") return prop.coordinadorId === session.userId;
  return session.rol === "admin" || session.rol === "decanato";
}

function condicionFiltro(filtro: FiltroBitacora): SQL | undefined {
  if (filtro === "egresado") return eq(bitacoraEventos.actorRol, "egresado");
  if (filtro === "asesor") return eq(bitacoraEventos.actorRol, "asesor");
  if (filtro === "sistema") return or(eq(bitacoraEventos.actorRol, "sistema"), isNull(bitacoraEventos.actorId));
  return undefined;
}

const fmtDia = new Intl.DateTimeFormat("en-CA", { timeZone: "America/El_Salvador", year: "numeric", month: "2-digit", day: "2-digit" });
const fmtHora = new Intl.DateTimeFormat("es-SV", { timeZone: "America/El_Salvador", hour: "2-digit", minute: "2-digit" });

async function consultarEventos(propuestaIds: number[], filtro: FiltroBitacora, pagina: number) {
  if (propuestaIds.length === 0) return { eventos: [], total: 0, totalPaginas: 1, pagina: 1 };
  const condiciones = [inArray(bitacoraEventos.propuestaId, propuestaIds), condicionFiltro(filtro)].filter(Boolean) as SQL[];
  const where = and(...condiciones);

  const [{ total }] = await db.select({ total: count() }).from(bitacoraEventos).where(where);
  const totalPaginas = Math.max(1, Math.ceil(total / TAMANO_PAGINA));
  const paginaActual = Math.min(Math.max(1, pagina), totalPaginas);

  const filas = await db
    .select({
      id: bitacoraEventos.id,
      propuestaId: bitacoraEventos.propuestaId,
      actorRol: bitacoraEventos.actorRol,
      actorNombre: usuarios.nombreCompleto,
      tipo: bitacoraEventos.tipo,
      descripcion: bitacoraEventos.descripcion,
      detalle: bitacoraEventos.detalle,
      creadoEn: bitacoraEventos.creadoEn,
    })
    .from(bitacoraEventos)
    .leftJoin(usuarios, eq(bitacoraEventos.actorId, usuarios.id))
    .where(where)
    .orderBy(desc(bitacoraEventos.creadoEn), desc(bitacoraEventos.id))
    .limit(TAMANO_PAGINA)
    .offset((paginaActual - 1) * TAMANO_PAGINA);

  const eventos = filas.map(({ creadoEn, ...e }) => ({ ...e, dia: fmtDia.format(creadoEn), hora: fmtHora.format(creadoEn) }));
  return { eventos, total, totalPaginas, pagina: paginaActual };
}

/** Bitácora de un proceso: el egresado dueño, su asesor, el coordinador asignado, el administrador o el decanato. */
export async function getBitacoraPropuesta(propuestaId: number, filtro: FiltroBitacora = "todos", pagina = 1) {
  try {
    const session = await getSession();
    if (!session || !session.userId) return { success: false as const, error: "No autenticado" };
    const [prop] = await db.select().from(propuestas).where(eq(propuestas.id, propuestaId)).limit(1);
    if (!prop) return { success: false as const, error: "Propuesta no encontrada" };
    if (!puedeVerPropuesta(session, prop)) return { success: false as const, error: "No tiene permisos sobre esta bitácora." };

    const [egresado] = await db.select().from(usuarios).where(eq(usuarios.id, prop.egresadoId)).limit(1);
    const asesor = prop.asesorId ? (await db.select().from(usuarios).where(eq(usuarios.id, prop.asesorId)).limit(1))[0] : null;

    return {
      success: true as const,
      propuesta: { id: prop.id, numero: prop.numero, asesorId: prop.asesorId },
      egresado: { nombreCompleto: egresado?.nombreCompleto || "—", carnet: egresado?.carnet || "—" },
      asesor: asesor ? { id: asesor.id, nombreCompleto: asesor.nombreCompleto } : null,
      ...(await consultarEventos([prop.id], filtro, pagina)),
    };
  } catch (err: any) {
    console.error("Error en getBitacoraPropuesta:", err);
    return { success: false as const, error: err.message || "Error al obtener la bitácora" };
  }
}

/** Bitácora de todos los egresados en pasantía que atiende un asesor (coordinación, administración o decanato). */
export async function getBitacoraAsesor(asesorId: number, filtro: FiltroBitacora = "todos", pagina = 1) {
  try {
    const session = await getSession();
    if (!session || !session.userId) return { success: false as const, error: "No autenticado" };
    if (!["coordinador", "admin", "decanato"].includes(session.rol)) return { success: false as const, error: "No autorizado" };

    const [asesor] = await db.select().from(usuarios).where(eq(usuarios.id, asesorId)).limit(1);
    if (!asesor) return { success: false as const, error: "Asesor no encontrado" };

    const condiciones = [eq(propuestas.asesorId, asesorId), eq(propuestas.tipo, "pasantia")];
    if (session.rol === "coordinador") condiciones.push(eq(propuestas.coordinadorId, session.userId));
    const props = await db
      .select({ id: propuestas.id, egresadoNombre: usuarios.nombreCompleto, carnet: usuarios.carnet })
      .from(propuestas)
      .innerJoin(usuarios, eq(propuestas.egresadoId, usuarios.id))
      .where(and(...condiciones));

    return {
      success: true as const,
      asesor: { id: asesor.id, nombreCompleto: asesor.nombreCompleto },
      egresados: props.map((p) => ({ propuestaId: p.id, nombreCompleto: p.egresadoNombre, carnet: p.carnet })),
      ...(await consultarEventos(
        props.map((p) => p.id),
        filtro,
        pagina
      )),
    };
  } catch (err: any) {
    console.error("Error en getBitacoraAsesor:", err);
    return { success: false as const, error: err.message || "Error al obtener la bitácora" };
  }
}
