"use server";

// Protocolo de investigación (entrega I3). Se redacta después de aprobada la propuesta, junto con el plan de trabajo
// (su cronograma de actividades), y se envía con él al asesor, que emite un solo dictamen escrito.
//   - Redacta el líder; las respuestas se guardan en respuestas_espacios (actions/respuestasEspacios.ts).
//   - En equipo, si la ficha lo pide, cada integrante ratifica la versión final (protocolo + plan) antes del envío.
import crypto from "crypto";
import { db } from "@/lib/db";
import { carreras, detallesProyecto, facultades, propuestas, ratificacionesPlan, respuestasEspacios, usuarios } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { fichaDePropuesta, espaciosPropuesta } from "@/lib/fichas/fichaDePropuesta";
import { esEtapaProtocolo, type EtapaProtocolo } from "@/lib/fichas/tipos";
import { fechaLimiteDictamen, precargaEspacio, problemasProtocolo } from "@/lib/fichas/protocolo";
import { validarPlanEquipo, type NodoPlan } from "@/lib/fichas/planTrabajo";
import { getPlanTrabajo, type DatosPlan } from "./planTrabajo";
import { fuentesDePropuesta } from "./fuentesTrabajo";
import { referenciasOrdenadas, type Fuente } from "@/lib/fichas/fuentes";
import { contextoDeRevision, tipoApartado } from "@/lib/fichas/apartadosAcademicos";
import { apartadosInformeFinal, portadaInformeFinal, type AnexoDocumento, type DocumentoInformeFinal } from "@/lib/fichas/documentoInformeFinal";
import { bloquesCronograma, bloquesRecursos } from "@/lib/fichas/documentoProtocolo";
import { AUTORIDADES_ACADEMICAS } from "@/lib/informeFinal";

export interface FirmaProtocolo {
  usuarioId: number;
  nombre: string;
  vigente: boolean;
  momento: string | null;
}

export interface DatosProtocolo {
  etapa: EtapaProtocolo;
  /** Respuestas guardadas del protocolo, por id de espacio. */
  respuestas: Record<string, string>;
  /** Texto con que empieza un espacio que todavía no tiene respuesta y se precarga desde la propuesta. */
  precargas: Record<string, string>;
  problemas: { espacioId: string; mensaje: string }[];
  ratificacion: { requerida: boolean; firmas: FirmaProtocolo[]; completa: boolean };
  /** Fecha límite del dictamen del asesor (ISO), si ya se envió. */
  fechaLimite: string | null;
  /** Registro de fuentes del trabajo (ajustes al protocolo, 19-nov-2026). */
  fuentes: Fuente[];
}

type Resultado<T = object> = ({ success: true } & T) | { success: false; error: string };

function huella(respuestas: Record<string, string>, arbol: NodoPlan, fuentes: Fuente[] = []) {
  const ordenadas = Object.keys(respuestas).sort().map((k) => [k, respuestas[k]]);
  // Las fuentes forman parte del protocolo: si cambian, las firmas anteriores dejan de valer.
  const f = fuentes.length ? { f: fuentes.map((x) => [x.id, x.datos]) } : {};
  return crypto.createHash("sha256").update(JSON.stringify({ r: ordenadas, a: arbol, ...f })).digest("hex");
}

async function armar(propuestaId: number, plan: DatosPlan): Promise<{ datos: DatosProtocolo; huella: string } | null> {
  const ficha = await fichaDePropuesta(propuestaId);
  const etapa = ficha?.definicion.etapas.find(esEtapaProtocolo);
  if (!ficha || !etapa) return null;

  const filas = await db.select({ id: respuestasEspacios.espacioId, contenido: respuestasEspacios.contenido }).from(respuestasEspacios).where(eq(respuestasEspacios.propuestaId, propuestaId));
  const todas = Object.fromEntries(filas.map((f) => [f.id, f.contenido ?? ""]));
  const ids = new Set(etapa.espacios.map((e) => e.id));
  // Con los campos adicionales de cada espacio (C4), que van en "<id>#extra".
  const respuestas = Object.fromEntries(Object.entries(todas).filter(([k]) => ids.has(k.replace(/#extra$/, ""))));

  const [det] = await db.select().from(detallesProyecto).where(eq(detallesProyecto.propuestaId, propuestaId));
  const espaciosProp = espaciosPropuesta(ficha.definicion);
  const precargas: Record<string, string> = {};
  for (const e of etapa.espacios) {
    if ((e.elemento !== "texto" && e.elemento !== "apartado") || !e.precargarDe || respuestas[e.id]?.trim()) continue;
    const texto = precargaEspacio(e, espaciosProp, { ...det, respuestas: todas });
    if (texto) precargas[e.id] = texto;
  }

  const fuentes = await fuentesDePropuesta(propuestaId);
  const h = huella(respuestas, plan.plan.arbol, fuentes);
  const contexto = { ...contextoDeRevision(etapa.espacios, { ...precargas, ...respuestas }, referenciasOrdenadas(fuentes).map((x) => x.referencia)), rangoObjetivos: plan.rangoObjetivos, integrantes: plan.equipo.map((i) => ({ id: i.id, nombre: i.nombre })) };
  const firmadas = await db.select().from(ratificacionesPlan).where(eq(ratificacionesPlan.propuestaId, propuestaId));
  const firmas: FirmaProtocolo[] = plan.equipo.map((i) => {
    const f = firmadas.find((x) => x.usuarioId === i.id);
    return { usuarioId: i.id, nombre: i.nombre, vigente: f?.huellaFirmada === h, momento: f?.momento.toISOString() ?? null };
  });
  const requerida = etapa.revision.ratificacion && plan.equipo.length > 1;
  const enviado = plan.plan.enviadoEn && (plan.plan.estado === "enviado" || plan.plan.estado === "aprobado");
  return {
    huella: h,
    datos: {
      etapa,
      respuestas,
      precargas,
      // Lo precargado cuenta como respuesta: el egresado puede enviarlo tal cual si no necesita ajustes.
      problemas: problemasProtocolo(etapa, { ...precargas, ...respuestas }, contexto),
      fuentes,
      ratificacion: { requerida, firmas, completa: !requerida || firmas.every((f) => f.vigente) },
      fechaLimite: enviado ? fechaLimiteDictamen(new Date(plan.plan.enviadoEn!), etapa).toISOString() : null,
    },
  };
}

/** Protocolo de la propuesta para el equipo o el asesor (los mismos permisos que el plan de trabajo). */
export async function getProtocolo(propuestaId: number): Promise<Resultado<{ datos: DatosProtocolo }>> {
  const res = await getPlanTrabajo(propuestaId);
  if (!res.success) return { success: false, error: res.error };
  const armado = await armar(propuestaId, res.datos);
  if (!armado) return { success: false, error: "La ficha de esta propuesta no tiene protocolo." };
  return { success: true, datos: armado.datos };
}

/** Cada integrante firma la versión actual del protocolo y el plan. Solo se puede con ambos completos. */
export async function ratificarProtocolo(propuestaId: number): Promise<Resultado> {
  const session = await getSession();
  if (!session || session.rol !== "egresado") return { success: false, error: "No autorizado" };
  const res = await getPlanTrabajo(propuestaId);
  if (!res.success) return { success: false, error: res.error };
  const plan = res.datos;
  if (plan.rol !== "lider" && plan.rol !== "integrante") return { success: false, error: "Solo el equipo ratifica el protocolo." };
  if (plan.plan.estado !== "redactando" && plan.plan.estado !== "observado") return { success: false, error: "El protocolo ya se envió al asesor." };
  const armado = await armar(propuestaId, plan);
  if (!armado) return { success: false, error: "La ficha de esta propuesta no tiene protocolo." };
  if (Object.keys(armado.datos.precargas).length > 0) return { success: false, error: "Guarda primero los textos precargados desde la propuesta (revísalos y guárdalos)." };
  if (armado.datos.problemas.length > 0) return { success: false, error: `El protocolo está incompleto: ${armado.datos.problemas[0].mensaje}` };
  if (validarPlanEquipo(plan.plan.arbol, plan.etapa, plan.equipo.map((i) => i.id), plan.columnas.length).length > 0) {
    return { success: false, error: "El plan de trabajo todavía tiene pendientes: complétalo antes de ratificar." };
  }
  await db
    .insert(ratificacionesPlan)
    .values({ propuestaId, usuarioId: session.userId, huellaFirmada: armado.huella, momento: new Date() })
    .onConflictDoUpdate({ target: [ratificacionesPlan.propuestaId, ratificacionesPlan.usuarioId], set: { huellaFirmada: armado.huella, momento: new Date() } });
  revalidatePath("/egresado/plan");
  return { success: true };
}

/** Comprobación previa al envío del plan (la llama enviarPlanTrabajo). null si se puede enviar o no hay protocolo. */
export async function motivoProtocoloNoEnviable(propuestaId: number): Promise<string | null> {
  const res = await getPlanTrabajo(propuestaId);
  if (!res.success) return res.error;
  const armado = await armar(propuestaId, res.datos);
  if (!armado) return null;
  const { datos } = armado;
  if (Object.keys(datos.precargas).length > 0) return "Revisa y guarda los textos del protocolo que se precargaron desde la propuesta.";
  if (datos.problemas.length > 0) return `El protocolo está incompleto: ${datos.problemas[0].mensaje}`;
  if (!datos.ratificacion.completa) {
    const faltan = datos.ratificacion.firmas.filter((f) => !f.vigente).map((f) => f.nombre);
    return `Falta que ratifiquen la versión final del protocolo y el plan: ${faltan.join(", ")}.`;
  }
  return null;
}


/**
 * Documento del protocolo (ajustes al protocolo, 19-nov-2026) para la vista de impresión y el Word, con el formato del
 * informe final: portada, autoridades, índice, cada parte con sus subapartados numerados, el cronograma (del plan de
 * trabajo, antes de los recursos), los recursos con el presupuesto, las referencias (con las del registro de fuentes)
 * y los anexos. Los permisos son los del plan de trabajo (equipo y asesor).
 */
export async function getDocumentoProtocolo(propuestaId: number): Promise<Resultado<{ documento: DocumentoInformeFinal }>> {
  const res = await getPlanTrabajo(propuestaId);
  if (!res.success) return { success: false, error: res.error };
  const plan = res.datos;
  const armado = await armar(propuestaId, plan);
  if (!armado) return { success: false, error: "La ficha de esta propuesta no tiene protocolo." };
  const { etapa, respuestas, precargas, fuentes } = armado.datos;
  const contenidos = { ...precargas, ...respuestas };
  const [prop] = await db.select().from(propuestas).where(eq(propuestas.id, propuestaId));
  const [lider] = await db.select({ carrera: carreras.nombre, facultad: facultades.nombre })
    .from(usuarios).leftJoin(carreras, eq(usuarios.carreraId, carreras.id)).leftJoin(facultades, eq(carreras.facultadId, facultades.id))
    .where(eq(usuarios.id, prop.egresadoId));
  const [asesor] = prop.asesorId ? await db.select({ nombre: usuarios.nombreCompleto }).from(usuarios).where(eq(usuarios.id, prop.asesorId)) : [];
  const enviado = plan.plan.enviadoEn && (plan.plan.estado === "enviado" || plan.plan.estado === "aprobado") ? new Date(plan.plan.enviadoEn) : null;
  const { portada, lugarFecha } = portadaInformeFinal({
    titulo: prop.titulo ?? "",
    facultad: lider?.facultad ?? null,
    carrera: lider?.carrera ?? null,
    integrantes: plan.equipo.map((i) => ({ nombre: i.nombre, carnet: i.carnet })),
    asesor: asesor?.nombre ?? null,
    fecha: (enviado ?? new Date()).toISOString(),
  }, "Protocolo de investigación");
  const referencias = referenciasOrdenadas(fuentes).map((x) => x.referencia);
  // El cronograma va antes de los recursos (o de las referencias, si la ficha no pide recursos).
  const antesDe = etapa.espacios.find((e) => e.elemento === "recursos_presupuesto")?.id
    ?? etapa.espacios.find((e) => e.elemento === "apartado" && tipoApartado(e)?.especiales.includes("referencias"))?.id
    ?? "";
  const { apartados, anexosCapitulo } = apartadosInformeFinal(etapa, contenidos,
    (e, numero) => (e.elemento === "recursos_presupuesto" ? bloquesRecursos(e, contenidos[e.id], numero) : []),
    { referencias, integrantes: plan.equipo.map((i) => ({ id: i.id, nombre: i.nombre })), insertar: [{ antesDe, titulo: "Cronograma de actividades", bloques: () => bloquesCronograma(plan.plan.arbol as NodoPlan, plan.columnas) }] });
  const anexos: AnexoDocumento[] = anexosCapitulo.map((a, i) => ({ etiqueta: `Anexo ${i + 1}`, descripcion: a.nombre, tipo: "documento" as const, url: a.url, nombre: a.nombre, actividad: null, nota: null }));
  const estado = plan.plan.estado === "aprobado" ? "aprobado" : plan.plan.estado === "enviado" ? "entregado" : "redactando";
  return {
    success: true,
    documento: { nombre: "Protocolo de investigación", portada, autoridades: AUTORIDADES_ACADEMICAS, lugarFecha, apartados, anexos, huella: estado === "redactando" ? null : armado.huella, estado },
  };
}
