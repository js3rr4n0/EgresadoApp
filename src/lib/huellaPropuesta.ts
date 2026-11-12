// Huella de la versión de una propuesta (la que firman los integrantes al ratificar). Módulo de servidor sin "use server"
// para que la usen tanto las acciones (actions/proyecto.ts) como los scripts de prueba (I6). Solo lee.
import crypto from "crypto";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { actividades, detallesProyecto, integrantesProyecto, propuestas, respuestasEspacios, usuarios } from "@/lib/schema";

export async function huellaPropuesta(propuestaId: number): Promise<string> {
  const propRows = await db.select().from(propuestas).where(eq(propuestas.id, propuestaId)).limit(1);
  if (propRows.length === 0) return "";
  const prop = propRows[0];

  const detalles = await db.select().from(detallesProyecto).where(eq(detallesProyecto.propuestaId, propuestaId)).limit(1);
  const det = detalles[0] || {};

  const members = await db
    .select({ id: usuarios.id, carnet: usuarios.carnet, nombre: usuarios.nombreCompleto })
    .from(integrantesProyecto)
    .innerJoin(usuarios, eq(integrantesProyecto.egresadoId, usuarios.id))
    .where(and(eq(integrantesProyecto.propuestaId, propuestaId), eq(integrantesProyecto.estado, "aceptado")))
    .orderBy(asc(usuarios.carnet));

  const leaderUser = await db.select({ id: usuarios.id, carnet: usuarios.carnet, nombre: usuarios.nombreCompleto }).from(usuarios).where(eq(usuarios.id, prop.egresadoId)).limit(1);
  const allActiveUsers = [...leaderUser, ...members].sort((a, b) => (a.carnet || "").localeCompare(b.carnet || ""));

  const acts = await db.select().from(actividades).where(eq(actividades.propuestaId, propuestaId)).orderBy(asc(actividades.periodo), asc(actividades.numero));
  const resps = await db.select().from(respuestasEspacios).where(eq(respuestasEspacios.propuestaId, propuestaId)).orderBy(asc(respuestasEspacios.espacioId));

  const versionObject = {
    titulo: prop.titulo || "",
    tipo: prop.tipo,
    actores: {
      patrocinador: det.actorPatrocinador || "",
      beneficiario: det.actorBeneficiario || "",
      ejecutor: det.actorEjecutor || "",
      financista: det.actorFinancista || "",
    },
    descripcion: det.descripcionProblema || "",
    justificacion: det.justificacion || "",
    alcance: det.alcance || "",
    objetivoGeneral: det.objetivoGeneral || "",
    objetivosEspecificos: det.objetivosEspecificos || [],
    integrantes: allActiveUsers.map(u => ({ id: u.id, carnet: u.carnet })),
    actividades: acts.map(a => ({ p: a.periodo, s: a.semana, n: a.numero, t: a.titulo, d: a.descripcion })),
    // Espacios nuevos de la ficha (P2). Solo se agregan si hay respuestas, para no invalidar las ratificaciones
    // de las propuestas anteriores.
    ...(resps.length > 0 ? { espacios: resps.map((r) => ({ e: r.espacioId, c: r.contenido ?? "" })) } : {}),
  };

  const jsonCanonical = JSON.stringify(versionObject);
  return crypto.createHash("sha256").update(jsonCanonical).digest("hex");
}
