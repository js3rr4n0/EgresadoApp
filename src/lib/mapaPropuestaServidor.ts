import "server-only";
// Mapa del estado de una propuesta enviada (specs/SEGUIMIENTO_PROPUESTA_EGRESADO.md, T2): pasos con su fecha, como el
// seguimiento de un pedido. Se arma con lo que ya queda registrado: historial de estados, solicitudes de asesoría,
// rechazos por requisitos y plan de trabajo.
//
// Respuestas del usuario: el asesor se nombra solo cuando aceptó (los pendientes o los que rechazaron no se muestran);
// el mapa llega hasta «En ejecución»; los integrantes ven el mismo mapa (las acciones son del líder).

import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { historialEstados, planesTrabajo, propuestas, rechazosPropuesta, solicitudesAsesor, usuarios } from "@/lib/schema";
import { reglaDePropuesta } from "@/lib/asignacionServidor";

export type EstadoPaso = "hecho" | "actual" | "accion" | "pendiente";

export interface EventoPaso {
  fecha: string;
  texto: string;
  /** Algo que salió mal o que el egresado debe atender (rechazo, ajustes). */
  alerta?: boolean;
}

export interface PasoMapa {
  clave: string;
  titulo: string;
  estado: EstadoPaso;
  fecha: string | null;
  /** Qué pasó (si está hecho) o qué está pasando (si es el actual). */
  detalle: string | null;
  eventos: EventoPaso[];
  /** todos: la hace cualquier integrante (plan de trabajo); si no, solo el líder. */
  accion?: { texto: string; href: string; todos?: boolean };
}

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

export async function mapaPropuesta(propuestaId: number): Promise<PasoMapa[]> {
  const [p] = await db.select().from(propuestas).where(eq(propuestas.id, propuestaId));
  if (!p) return [];

  const historial = await db
    .select({ de: historialEstados.de, a: historialEstados.a, creadoEn: historialEstados.creadoEn, quien: usuarios.nombreCompleto })
    .from(historialEstados)
    .leftJoin(usuarios, eq(usuarios.id, historialEstados.usuarioId))
    .where(eq(historialEstados.propuestaId, propuestaId))
    .orderBy(asc(historialEstados.creadoEn), asc(historialEstados.id));
  const rechazos = await db
    .select({ creadoEn: rechazosPropuesta.creadoEn, funcion: rechazosPropuesta.funcion, mensaje: rechazosPropuesta.mensaje })
    .from(rechazosPropuesta)
    .where(eq(rechazosPropuesta.propuestaId, propuestaId))
    .orderBy(asc(rechazosPropuesta.creadoEn))
    .catch(() => []);
  const solicitudes = await db
    .select({ estado: solicitudesAsesor.estado, creadaEn: solicitudesAsesor.creadaEn, respondidoEn: solicitudesAsesor.respondidoEn, asesorId: solicitudesAsesor.asesorId })
    .from(solicitudesAsesor)
    .where(eq(solicitudesAsesor.propuestaId, propuestaId))
    .orderBy(asc(solicitudesAsesor.creadaEn));
  const [coordinador] = p.coordinadorId ? await db.select({ nombre: usuarios.nombreCompleto }).from(usuarios).where(eq(usuarios.id, p.coordinadorId)) : [];
  const [asesor] = p.asesorId ? await db.select({ nombre: usuarios.nombreCompleto }).from(usuarios).where(eq(usuarios.id, p.asesorId)) : [];
  const [plan] = p.tipo !== "pasantia" ? await db.select().from(planesTrabajo).where(eq(planesTrabajo.propuestaId, propuestaId)) : [];
  const regla = await reglaDePropuesta(propuestaId).catch(() => null);

  // Ciclo actual: desde el último envío (si la rechazaron por requisitos y se reenvió, lo anterior es otro ciclo)
  const envios = historial.filter((h) => h.a === "enviada");
  const ultimoEnvio = envios[envios.length - 1];
  const ciclo = ultimoEnvio ? historial.filter((h) => h.creadoEn >= ultimoEnvio.creadoEn) : historial;
  const ultimo = (a: string) => [...ciclo].reverse().find((h) => h.a === a);
  const solicitudesCiclo = ultimoEnvio ? solicitudes.filter((s) => s.creadaEn && s.creadaEn >= ultimoEnvio.creadoEn) : solicitudes;
  const aceptada = [...solicitudesCiclo].reverse().find((s) => s.estado === "aceptada" && s.asesorId === p.asesorId);

  const estado = p.estado;
  const alcanzo = (estados: string[]) => estados.includes(estado);
  const aprobadaOMas = alcanzo(["aprobada", "primer_contacto_completado", "en_ejecucion"]);
  const sinCoordinador = !!regla?.sinCoordinador && !p.coordinadorId && !ultimo("coordinador_asignado");
  const pasos: (Omit<PasoMapa, "estado"> & { hecho: boolean })[] = [];
  const agregar = (paso: Omit<PasoMapa, "estado"> & { hecho: boolean }) => pasos.push(paso);

  // 1. Envío (con los rechazos por requisitos y los reenvíos)
  const eventosEnvio: EventoPaso[] = [];
  rechazos.forEach((r, i) => {
    eventosEnvio.push({ fecha: r.creadoEn.toISOString(), texto: `Rechazada por requisitos (${r.funcion === "coordinador" ? "coordinador" : "administración"}): ${r.mensaje}`, alerta: true });
    const reenvio = envios[i + 1];
    if (reenvio) eventosEnvio.push({ fecha: reenvio.creadoEn.toISOString(), texto: "Corregida y enviada de nuevo" });
  });
  agregar({
    clave: "envio",
    titulo: "Propuesta enviada",
    fecha: iso(envios[0]?.creadoEn ?? p.enviadaEn),
    detalle: envios[0]?.quien ? `Enviada por ${envios[0].quien}.` : null,
    eventos: eventosEnvio,
    hecho: true,
  });

  // 2. Revisión de requisitos y asignación de coordinador (sin coordinador: la administración revisa y asigna asesor)
  const coordAsignado = ultimo("coordinador_asignado");
  if (sinCoordinador) {
    const solicitado = ultimo("asesor_solicitado_directo") ?? ultimo("solicitud_asesor_enviada");
    agregar({
      clave: "requisitos",
      titulo: "Revisión de requisitos",
      fecha: iso(solicitado?.creadoEn ?? solicitudesCiclo[0]?.creadaEn),
      detalle: "La administración revisó los documentos y la carta.",
      eventos: [],
      hecho: !!solicitado || solicitudesCiclo.length > 0 || !!p.asesorId || aprobadaOMas,
    });
  } else {
    agregar({
      clave: "coordinador",
      titulo: "Revisión de requisitos y asignación de coordinador",
      fecha: iso(coordAsignado?.creadoEn),
      detalle: coordinador ? `Coordinador: ${coordinador.nombre}.` : null,
      eventos: [],
      hecho: !!p.coordinadorId || !!coordAsignado || !!p.asesorId || aprobadaOMas,
    });
  }

  // 3. Asignación de asesor (solo se nombra al que aceptó)
  agregar({
    clave: "asesor",
    titulo: "Asignación de docente asesor",
    fecha: iso(aceptada?.respondidoEn),
    detalle: asesor ? `Docente asesor: ${asesor.nombre}.` : null,
    eventos: [],
    hecho: !!p.asesorId || aprobadaOMas,
  });

  // 4. Revisión del asesor (rondas de ajustes)
  const eventosRevision: EventoPaso[] = ciclo
    .filter((h) => h.a === "ajustes_solicitados" || h.a === "ajustes_completados")
    .map((h) => ({
      fecha: h.creadoEn.toISOString(),
      texto: h.a === "ajustes_solicitados" ? "El asesor pidió ajustes" : "Ajustes enviados al asesor",
      alerta: h.a === "ajustes_solicitados",
    }));
  agregar({
    clave: "revision",
    titulo: "Revisión del docente asesor",
    fecha: null,
    detalle: aprobadaOMas ? (eventosRevision.length ? "Revisada con ajustes." : "Revisada sin ajustes.") : null,
    eventos: eventosRevision,
    hecho: aprobadaOMas,
  });

  // 5. Aprobación
  const aprobada = ultimo("aprobada");
  agregar({
    clave: "aprobada",
    titulo: "Propuesta aprobada",
    fecha: iso(aprobada?.creadoEn),
    detalle: aprobada?.quien ? `Aprobada por ${aprobada.quien}.` : null,
    eventos: [],
    hecho: aprobadaOMas,
  });

  // 6. Pasantía: primer contacto. Proyecto e investigación: plan de trabajo (y protocolo)
  if (p.tipo === "pasantia") {
    const contacto = ultimo("primer_contacto_completado");
    agregar({
      clave: "contacto",
      titulo: "Primer contacto con la empresa",
      fecha: iso(contacto?.creadoEn),
      detalle: contacto ? "El asesor completó el informe de primer contacto." : null,
      eventos: [],
      hecho: alcanzo(["primer_contacto_completado", "en_ejecucion"]),
    });
  } else {
    const eventosPlan: EventoPaso[] = [];
    if (plan?.enviadoEn) eventosPlan.push({ fecha: plan.enviadoEn.toISOString(), texto: "Enviado al asesor" });
    if (plan?.estado === "observado" && plan.revisadoEn) eventosPlan.push({ fecha: plan.revisadoEn.toISOString(), texto: "El asesor pidió cambios", alerta: true });
    agregar({
      clave: "plan",
      titulo: p.tipo === "investigacion" ? "Protocolo y plan de trabajo" : "Plan de trabajo",
      fecha: plan?.estado === "aprobado" ? iso(plan.revisadoEn) : null,
      detalle: plan?.estado === "aprobado" ? "Aprobado por el asesor." : null,
      eventos: eventosPlan,
      hecho: plan?.estado === "aprobado" || estado === "en_ejecucion",
    });
  }

  // 7. Ejecución
  const ejecucion = ultimo("en_ejecucion");
  agregar({
    clave: "ejecucion",
    titulo: "En ejecución",
    fecha: iso(ejecucion?.creadoEn),
    detalle: ejecucion ? "La coordinación dio inicio a la ejecución." : null,
    eventos: [],
    hecho: estado === "en_ejecucion",
  });

  // Un paso posterior hecho implica que los anteriores también (aunque no haya fecha registrada)
  for (let i = pasos.length - 2; i >= 0; i--) if (pasos[i + 1].hecho) pasos[i].hecho = true;

  // El primer paso sin hacer es el actual, con lo que está pasando y, si le toca al egresado, la acción
  const actual = pasos.findIndex((x) => !x.hecho);
  return pasos.map(({ hecho, ...x }, i): PasoMapa => {
    if (hecho) return { ...x, estado: "hecho" };
    if (i !== actual) return { ...x, estado: "pendiente" };
    switch (x.clave) {
      case "requisitos":
        return { ...x, estado: "actual", detalle: "La administración revisa que los documentos y la carta sean los correctos para asignar un docente asesor." };
      case "coordinador":
        return { ...x, estado: "actual", detalle: "La administración revisa que los documentos y la carta sean los correctos para asignar la propuesta a un coordinador." };
      case "asesor":
        return { ...x, estado: "actual", detalle: "Se está asignando un docente asesor. Te avisaremos cuando acepte." };
      case "revision":
        return p.observaciones
          ? {
              ...x,
              estado: "accion",
              detalle: "El docente asesor pidió ajustes. Corrígelos y reenvía la propuesta.",
              accion: { texto: "Corregir observaciones", href: `/egresado/redactar?id=${p.id}` },
            }
          : { ...x, estado: "actual", detalle: "El docente asesor está revisando el contenido de la propuesta." };
      case "contacto":
        return { ...x, estado: "actual", detalle: "El docente asesor hará el primer contacto con el supervisor de la empresa." };
      case "plan":
        return plan?.estado === "enviado"
          ? { ...x, estado: "actual", detalle: "El docente asesor está revisando el plan de trabajo." }
          : {
              ...x,
              estado: "accion",
              detalle: plan?.estado === "observado" ? "El docente asesor pidió cambios al plan de trabajo." : "Elabora el plan de trabajo y envíalo al docente asesor.",
              accion: { texto: "Ir al plan de trabajo", href: "/egresado/plan", todos: true },
            };
      case "ejecucion":
        return { ...x, estado: "actual", detalle: "La coordinación dará inicio a la ejecución." };
      default:
        return { ...x, estado: "actual" };
    }
  });
}
