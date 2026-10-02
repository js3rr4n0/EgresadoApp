"use server";

import { db } from "@/lib/db";
import {
  informesMensuales,
  propuestas,
  usuarios,
  carreras,
  empresas,
  supervisores,
  actividades,
  registrosActividad,
  informesVisita,
} from "@/lib/schema";
import { getSession } from "@/lib/session";
import { eq, and, asc, inArray } from "drizzle-orm";
import { codigoActividad, ESTADOS_REGISTRADOS, getPeriodosPropuesta } from "@/lib/habilitacionActividades";
import { rangoSemanaISO } from "@/lib/periodosPasantia";
import { leerComentarios, tieneComentarios, validarComentariosCompletos } from "@/lib/comentariosAsesor";
import { visitaRealizada, type FotoVisita, type Respuestas } from "@/lib/formularioVisita";

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
      })
      .from(usuarios)
      .leftJoin(carreras, eq(usuarios.carreraId, carreras.id))
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

    const acts = await db
      .select()
      .from(actividades)
      .where(
        and(
          eq(actividades.propuestaId, informe.propuestaId),
          eq(actividades.periodo, informe.numero),
          eq(actividades.eliminada, false)
        )
      )
      .orderBy(asc(actividades.semana), asc(actividades.numero));

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
        semana: a.semana,
        titulo: a.titulo || a.descripcion,
        descripcionPlanificada: a.descripcion,
        registrada: !!registro && ESTADOS_REGISTRADOS.includes(registro.estado),
        registro,
      };
    });

    // Período del mes y fechas de cada semana, con la misma regla del editor del cronograma.
    const periodos = await getPeriodosPropuesta(prop.id);
    const periodo = periodos.find((p) => p.num === informe.numero) || null;
    const totalSemanas = Math.max(periodo?.semanas || 0, ...acts.map((a) => a.semana), 0);

    const semanas = Array.from({ length: totalSemanas }, (_, i) => {
      const numero = i + 1;
      const rango = periodo?.inicio && periodo.fin ? rangoSemanaISO(periodo.inicio, periodo.fin, numero, totalSemanas) : null;
      return {
        numero,
        inicio: rango?.inicio ?? null,
        fin: rango?.fin ?? null,
        actividades: actividadesCompiladas.filter((a) => a.semana === numero),
      };
    });

    // Numeración correlativa de imágenes dentro del informe, en el orden del cronograma.
    let contadorImagen = 0;
    const numeroImagenPorActividad = new Map<number, number>();
    for (const a of actividadesCompiladas) {
      if (a.registrada && a.registro?.imagenUrl) {
        contadorImagen++;
        numeroImagenPorActividad.set(a.id, contadorImagen);
      }
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

    return {
      success: true,
      informe,
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
      periodo: periodo ? { nombre: periodo.nombre, inicio: periodo.inicio, fin: periodo.fin } : null,
      semanas,
      actividades: actividadesCompiladas,
      numeroImagenPorActividad: Object.fromEntries(numeroImagenPorActividad),
      totalActividades: actividadesCompiladas.length,
      completadas: actividadesCompiladas.filter((a) => a.registrada).length,
    };
  } catch (err: any) {
    console.error("Error en getInformeCompilado:", err);
    return { success: false, error: err.message || "Error al generar el informe compilado" };
  }
}
