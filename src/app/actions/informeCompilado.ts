"use server";

import { db } from "@/lib/db";
import {
  informesMensuales,
  propuestas,
  usuarios,
  carreras,
  facultades,
  empresas,
  supervisores,
  actividades,
  registrosActividad,
  informesVisita,
  imagenesActividad,
  solicitudesCambioActividad,
} from "@/lib/schema";
import { getSession } from "@/lib/session";
import { eq, and, asc, inArray, lte } from "drizzle-orm";
import { codigoActividad, ESTADOS_REGISTRADOS, getPeriodosPropuesta } from "@/lib/habilitacionActividades";
import { rangoSemanaISO, esInformeFinal, hoyISOElSalvador } from "@/lib/periodosPasantia";
import { datosPortada } from "@/lib/portadaInforme";
import {
  AUTORIDADES_ACADEMICAS,
  ETIQUETA_CAMBIO,
  ETIQUETA_TIPO_SOLICITUD,
  leerCartaFinalizacion,
} from "@/lib/informeFinal";
import { parrafosDe } from "@/lib/reglasRegistroActividad";
import { leerComentarios, tieneComentarios, validarComentariosCompletos } from "@/lib/comentariosAsesor";
import { visitaRealizada, type FotoVisita, type Respuestas } from "@/lib/formularioVisita";
import { notaImagen } from "@/lib/fuenteImagen";
import type { SegmentoCita } from "@/lib/citaApa";

export async function getInformeCompilado(informeId: number) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return { success: false, error: "No autenticado" };
    }

    const [informe] = await db.select().from(informesMensuales).where(eq(informesMensuales.id, informeId)).limit(1);
    if (!informe) return { success: false, error: "Informe no encontrado" };

    const [prop] = await db.select().from(propuestas).where(eq(propuestas.id, informe.propuestaId)).limit(1);
    if (!prop) return { success: false, error: "Propuesta no encontrada" };

    const isOwner = session.rol === "egresado" && prop.egresadoId === session.userId;
    const isAsesor = session.rol === "asesor" && prop.asesorId === session.userId;
    const isAdmin = session.rol === "admin" || session.rol === "coordinador";
    if (!isOwner && !isAsesor && !isAdmin) {
      return { success: false, error: "No tiene permisos sobre este informe." };
    }

    const [egresadoRow] = await db
      .select({
        id: usuarios.id,
        nombreCompleto: usuarios.nombreCompleto,
        carnet: usuarios.carnet,
        carrera: carreras.nombre,
        facultad: facultades.nombre,
      })
      .from(usuarios)
      .leftJoin(carreras, eq(usuarios.carreraId, carreras.id))
      .leftJoin(facultades, eq(carreras.facultadId, facultades.id))
      .where(eq(usuarios.id, prop.egresadoId))
      .limit(1);

    const asesor = prop.asesorId
      ? (await db.select().from(usuarios).where(eq(usuarios.id, prop.asesorId)).limit(1))[0] || null
      : null;
    const empresa = prop.empresaId
      ? (await db.select().from(empresas).where(eq(empresas.id, prop.empresaId)).limit(1))[0] || null
      : null;
    const supervisor = prop.supervisorId
      ? (await db.select().from(supervisores).where(eq(supervisores.id, prop.supervisorId)).limit(1))[0] || null
      : null;

    // El informe final (último período) consolida las actividades de los cinco períodos; los demás, solo las de su período.
    const final = esInformeFinal(informe.numero);
    const acts = await db
      .select()
      .from(actividades)
      .where(
        and(
          eq(actividades.propuestaId, informe.propuestaId),
          ...(final ? [lte(actividades.periodo, informe.numero)] : [eq(actividades.periodo, informe.numero)]),
          eq(actividades.eliminada, false)
        )
      )
      .orderBy(asc(actividades.periodo), asc(actividades.semana), asc(actividades.numero));

    const actIds = acts.map((a) => a.id);
    const registros = actIds.length
      ? await db.select().from(registrosActividad).where(inArray(registrosActividad.actividadId, actIds))
      : [];
    const registrosPorActividad = new Map(registros.map((r) => [r.actividadId, r]));

    const actividadesCompiladas = acts.map((a) => {
      const registro = registrosPorActividad.get(a.id) || null;
      return {
        id: a.id,
        codigo: codigoActividad(a),
        periodo: a.periodo,
        semana: a.semana,
        titulo: a.titulo || a.descripcion,
        descripcionPlanificada: a.descripcion,
        registrada: !!registro && ESTADOS_REGISTRADOS.includes(registro.estado),
        registro,
      };
    });

    // Períodos y fechas de cada semana, con la misma regla del editor del cronograma. Cada sección del documento es un
    // período: uno en los informes de período y los cinco en el informe final.
    const periodos = await getPeriodosPropuesta(prop.id);
    const numerosSeccion = final ? Array.from({ length: informe.numero }, (_, i) => i + 1) : [informe.numero];
    const secciones = numerosSeccion.map((num) => {
      const p = periodos.find((x) => x.num === num) || null;
      const actsSeccion = actividadesCompiladas.filter((a) => a.periodo === num);
      const totalSemanas = Math.max(p?.semanas || 0, ...actsSeccion.map((a) => a.semana), 0);
      return {
        numero: num,
        inicio: p?.inicio ?? null,
        fin: p?.fin ?? null,
        actividades: actsSeccion,
        semanas: Array.from({ length: totalSemanas }, (_, i) => {
          const numero = i + 1;
          const rango = p?.inicio && p.fin ? rangoSemanaISO(p.inicio, p.fin, numero, totalSemanas) : null;
          return {
            numero,
            inicio: rango?.inicio ?? null,
            fin: rango?.fin ?? null,
            actividades: actsSeccion.filter((a) => a.semana === numero),
          };
        }),
      };
    });
    const periodoActual = periodos.find((p) => p.num === informe.numero) || null;
    // En el informe final, el período reportado va del inicio de la pasantía al fin del último período.
    const periodo = periodoActual
      ? {
          nombre: periodoActual.nombre,
          inicio: final ? (periodos[0]?.inicio ?? periodoActual.inicio) : periodoActual.inicio,
          fin: periodoActual.fin,
        }
      : null;

    // Imágenes de soporte de cada actividad (la principal y las adicionales; los anexos quedan para el informe final),
    // con numeración correlativa dentro del informe en el orden del cronograma y la nota de su origen.
    const adicionales = registros.length
      ? await db
          .select()
          .from(imagenesActividad)
          .where(and(inArray(imagenesActividad.registroId, registros.map((r) => r.id)), eq(imagenesActividad.tipo, "soporte")))
          .orderBy(asc(imagenesActividad.id))
      : [];
    let contadorImagen = 0;
    const imagenesPorActividad: Record<number, { url: string; leyenda: string; numero: number; nota: SegmentoCita[] }[]> = {};
    for (const a of actividadesCompiladas) {
      if (!a.registrada || !a.registro?.imagenUrl) continue;
      const r = a.registro;
      const lista = [
        { url: r.imagenUrl!, leyenda: r.leyendaImagen || "Evidencia de la actividad", origen: r.imagenOrigen, fuente: r.imagenFuente },
        ...adicionales.filter((i) => i.registroId === r.id),
      ];
      imagenesPorActividad[a.id] = lista.map((i) => ({
        url: i.url,
        leyenda: i.leyenda,
        numero: ++contadorImagen,
        nota: notaImagen(i.origen, i.fuente),
      }));
    }

    // Comentarios del asesor para el decanato y, en el informe del tercer período, la evidencia de la visita a la empresa.
    const comentarios = leerComentarios(informe.comentariosDecanato);
    let visita: { fecha: string | null; modalidad: string | null; fotos: FotoVisita[] } | null = null;
    if (informe.numero === 3) {
      const [v] = await db.select().from(informesVisita).where(eq(informesVisita.propuestaId, prop.id)).limit(1);
      const respuestas = (v?.respuestas || {}) as Respuestas;
      if (v?.estado === "completado" && visitaRealizada(respuestas)) {
        visita = {
          fecha: typeof respuestas.fecha_visita === "string" ? respuestas.fecha_visita : null,
          modalidad: typeof respuestas.modalidad === "string" ? respuestas.modalidad : null,
          fotos: (v.fotos || []) as FotoVisita[],
        };
      }
    }

    // Portada: el informe final abarca la pasantía completa; los demás, su período.
    const portada = datosPortada({
      numeroInforme: informe.numero,
      facultad: egresadoRow?.facultad,
      carrera: egresadoRow?.carrera,
      empresa: empresa?.nombre,
      estudiante: egresadoRow?.nombreCompleto,
      carnet: egresadoRow?.carnet,
      desde: final ? secciones[0]?.inicio : periodo?.inicio,
      hasta: final ? secciones[secciones.length - 1]?.fin : periodo?.fin,
      fecha: informe.fechaPresentacion ?? hoyISOElSalvador(),
    });

    // Informe final: apartados propios de la estructura oficial (autoridades, agradecimientos, empresa y anexos).
    const documentoFinal = final ? await armarDocumentoFinal(prop.id, informe, empresa, portada, registros, contadorImagen) : null;

    return {
      success: true,
      informe,
      portada,
      documentoFinal,
      propuesta: prop,
      comentarios: {
        ...comentarios,
        registrados: tieneComentarios(comentarios),
        completos: validarComentariosCompletos(comentarios).length === 0,
      },
      visita,
      egresado: egresadoRow,
      asesor,
      empresa,
      supervisor,
      esFinal: final,
      periodo,
      secciones,
      actividades: actividadesCompiladas,
      imagenesPorActividad,
      totalActividades: actividadesCompiladas.length,
      completadas: actividadesCompiladas.filter((a) => a.registrada).length,
    };
  } catch (err: any) {
    console.error("Error en getInformeCompilado:", err);
    return { success: false, error: err.message || "Error al generar el informe compilado" };
  }
}

type Registro = typeof registrosActividad.$inferSelect;
type Informe = typeof informesMensuales.$inferSelect;
type Empresa = typeof empresas.$inferSelect;

function fechaISO(t: Date | string | null | undefined) {
  if (!t) return null;
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/El_Salvador", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(t));
}

/**
 * Apartados del informe final que no provienen de las actividades: autoridades, agradecimientos, descripción de la empresa,
 * cronograma real de desarrollo (con las actividades agregadas, modificadas, pospuestas, reubicadas y eliminadas),
 * modificaciones al cronograma original, contenido adicional (imágenes de anexo) y carta de finalización satisfactoria.
 */
async function armarDocumentoFinal(
  propuestaId: number,
  informe: Informe,
  empresa: Empresa | null,
  portada: ReturnType<typeof datosPortada>,
  registros: Registro[],
  imagenesPrevias: number
) {
  const todas = await db
    .select()
    .from(actividades)
    .where(eq(actividades.propuestaId, propuestaId))
    .orderBy(asc(actividades.periodo), asc(actividades.semana), asc(actividades.numero), asc(actividades.id));
  const solicitudes = await db
    .select()
    .from(solicitudesCambioActividad)
    .where(and(eq(solicitudesCambioActividad.propuestaId, propuestaId), eq(solicitudesCambioActividad.estado, "aprobada")))
    .orderBy(asc(solicitudesCambioActividad.revisadoEn), asc(solicitudesCambioActividad.id));
  const registroPorActividad = new Map(registros.map((r) => [r.actividadId, r]));
  const actividadPorId = new Map(todas.map((a) => [a.id, a]));

  // Cronograma real: cada actividad con su estado final y los cambios aprobados que tuvo.
  const filas = todas.map((a) => {
    const registro = registroPorActividad.get(a.id);
    const cambios = new Set<string>();
    if (a.esNueva) cambios.add(ETIQUETA_CAMBIO.agregar);
    if (a.esModificada) cambios.add(ETIQUETA_CAMBIO.modificar);
    for (const s of solicitudes) {
      if ((s.tipo === "posponer" || s.tipo === "reubicar") && (s.actividadId === a.id || s.actividadIntercambioId === a.id)) {
        cambios.add(ETIQUETA_CAMBIO[s.tipo]);
      }
    }
    const base = a.eliminada
      ? ETIQUETA_CAMBIO.eliminar
      : registro && ESTADOS_REGISTRADOS.includes(registro.estado)
        ? "Desarrollada"
        : "No desarrollada";
    return {
      id: a.id,
      periodo: a.periodo,
      semana: a.semana,
      codigo: codigoActividad(a),
      titulo: a.titulo || a.descripcion,
      eliminada: a.eliminada,
      estado: cambios.size ? `${base} (${[...cambios].join(", ").toLowerCase()})` : base,
    };
  });
  const periodosCronograma = [...new Set(filas.map((f) => f.periodo))].map((numero) => {
    const filasPeriodo = filas.filter((f) => f.periodo === numero);
    return { numero, semanas: Math.max(4, ...filasPeriodo.map((f) => f.semana)), filas: filasPeriodo };
  });

  const modificaciones = solicitudes.map((s) => {
    const act = s.actividadId ? actividadPorId.get(s.actividadId) : undefined;
    const destino = s.periodoDestino && s.semanaDestino ? `Período ${s.periodoDestino}, Semana ${s.semanaDestino}` : null;
    const actividad =
      s.tipo === "agregar"
        ? `${s.tituloPropuesto || "Actividad nueva"}${destino ? ` (${destino})` : ""}`
        : act
          ? `${codigoActividad(act)} ${act.titulo || act.descripcion}${destino && s.tipo === "posponer" ? ` (hacia ${destino})` : ""}`
          : "Actividad del cronograma";
    const fechaAprobacion = fechaISO(s.revisadoEn);
    return {
      id: s.id,
      fecha: fechaAprobacion ?? fechaISO(s.creadaEn),
      tipo: ETIQUETA_TIPO_SOLICITUD[s.tipo] || s.tipo,
      actividad,
      justificacion: s.justificacion,
      validacion: [
        s.documentoSupervisorNombre ? `Supervisor empresarial: nota adjunta (${s.documentoSupervisorNombre}).` : "Supervisor empresarial: sin nota adjunta.",
        `Asesor designado: aprobada${fechaAprobacion ? ` el ${fechaAprobacion.split("-").reverse().join("/")}` : ""}${s.respuestaAsesor ? `. ${s.respuestaAsesor}` : ""}.`,
      ].join(" "),
    };
  });

  // Contenido adicional: imágenes de anexo de las actividades, en el orden del cronograma.
  const ordenRegistro = new Map(
    filas.filter((f) => !f.eliminada).flatMap((f, i) => {
      const r = registroPorActividad.get(f.id);
      return r ? [[r.id, { orden: i, codigo: f.codigo }] as const] : [];
    })
  );
  const anexos = ordenRegistro.size
    ? await db
        .select()
        .from(imagenesActividad)
        .where(and(inArray(imagenesActividad.registroId, [...ordenRegistro.keys()]), eq(imagenesActividad.tipo, "anexo")))
    : [];
  anexos.sort((a, b) => ordenRegistro.get(a.registroId)!.orden - ordenRegistro.get(b.registroId)!.orden || a.id - b.id);
  let numero = imagenesPrevias;

  return {
    encabezado: portada.encabezado,
    lugarFecha: portada.grupos[portada.grupos.length - 1]?.[0] ?? "",
    autoridades: AUTORIDADES_ACADEMICAS,
    agradecimientos: informe.agradecimientos ? parrafosDe(informe.agradecimientos) : [],
    empresa: {
      nombre: empresa?.nombre ?? null,
      area: empresa?.area ?? null,
      direccion: empresa?.direccion ?? null,
      parrafos: [...parrafosDe(empresa?.descripcion), ...parrafosDe(empresa?.antecedentes)],
    },
    cronograma: periodosCronograma,
    modificaciones,
    anexos: anexos.map((i) => ({
      url: i.url,
      leyenda: i.leyenda,
      numero: ++numero,
      codigo: ordenRegistro.get(i.registroId)!.codigo,
      nota: notaImagen(i.origen, i.fuente),
    })),
    carta: leerCartaFinalizacion(informe.cartaFinalizacion),
    cartaVerificada: !!informe.cartaFinalizacionVerificadaEn,
  };
}
