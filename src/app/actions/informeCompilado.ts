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
} from "@/lib/schema";
import { getSession } from "@/lib/session";
import { eq, and, asc, inArray } from "drizzle-orm";
import { codigoActividad, ESTADOS_REGISTRADOS, getPeriodosPropuesta } from "@/lib/habilitacionActividades";
import { sumarDiasISO } from "@/lib/periodosPasantia";

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
      let inicio: string | null = null;
      let fin: string | null = null;
      if (periodo?.inicio && periodo.fin) {
        const inicioSemana = sumarDiasISO(periodo.inicio, 7 * i);
        if (inicioSemana <= periodo.fin) {
          const finSemana = sumarDiasISO(inicioSemana, 6);
          inicio = inicioSemana;
          fin = finSemana < periodo.fin ? finSemana : periodo.fin;
        }
      }
      return {
        numero,
        inicio,
        fin,
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

    return {
      success: true,
      informe,
      propuesta: prop,
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
