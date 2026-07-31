"use server";

import { db } from "@/lib/db";
import { solicitudesEmpresa, empresas, supervisores, historialEmpresas, propuestas, usuarios, notificaciones } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function aprobarSolicitudEmpresa(solicitudId: number) {
  const session = await getSession();
  if (!session || (session.rol !== "admin" && session.rol !== "decanato")) {
    return { success: false, error: "No autorizado" };
  }

  try {
    const solicitud = await db.query.solicitudesEmpresa.findFirst({
      where: eq(solicitudesEmpresa.id, solicitudId)
    });
    
    if (!solicitud) return { success: false, error: "Solicitud no encontrada" };
    if (solicitud.estado !== "pendiente") return { success: false, error: "La solicitud ya fue procesada" };

    const data = solicitud.datos as any;

    if (solicitud.tipo === "datos_alumno") {
      const egresadoId = data?.egresadoId;
      const nuevosNombre = data?.nuevos?.nombreCompleto || data?.nombrePropuesto;
      const nuevosCarnet = data?.nuevos?.carnet || data?.carnetPropuesto;

      if (egresadoId && (nuevosNombre || nuevosCarnet)) {
        const updateObj: any = {};
        if (nuevosNombre) updateObj.nombreCompleto = nuevosNombre;
        if (nuevosCarnet) updateObj.carnet = nuevosCarnet;

        await db.update(usuarios).set(updateObj).where(eq(usuarios.id, egresadoId));

        // Create notification for student
        await db.insert(notificaciones).values({
          usuarioId: egresadoId,
          tipo: "solicitud_aprobada",
          mensaje: `¡Buenas noticias! Tu solicitud de corrección de datos personales (${nuevosNombre || ""}, ${nuevosCarnet || ""}) fue APROBADA por el Decanato/Administración.`,
        });
      }

      await db.update(solicitudesEmpresa)
        .set({ estado: "aprobada", revisadoPor: session.userId, revisadoEn: new Date() })
        .where(eq(solicitudesEmpresa.id, solicitudId));

      if (solicitud.propuestaId) {
        await db.update(propuestas).set({
          bloqueada: false
        }).where(eq(propuestas.id, solicitud.propuestaId));
      }

      revalidatePath("/admin/empresas/solicitudes");
      revalidatePath("/egresado");
      revalidatePath("/egresado/redactar");
      return { success: true };
    }

    let targetEmpresaId = solicitud.empresaId;
    let targetSupervisorId = null;

    if (solicitud.tipo === "nueva") {
      // 1. Create company
      const newEmpresas = await db.insert(empresas).values({
        nombre: data.empresa.nombre,
        area: data.empresa.area,
        descripcion: data.empresa.descripcion,
        antecedentes: data.empresa.antecedentes,
        direccion: data.empresa.direccion,
        mapaUrl: data.empresa.mapaUrl || null,
        organigramaUrl: data.empresa.organigramaUrl || null,
        habilitada: true,
        verificada: true,
      }).returning({ id: empresas.id });
      targetEmpresaId = newEmpresas[0].id;

      // 2. Insert Supervisor
      const newSupervisores = await db.insert(supervisores).values({
        empresaId: targetEmpresaId,
        nombres: data.supervisor.nombres,
        apellidos: data.supervisor.apellidos,
        cargo: data.supervisor.cargo,
        especialidad: data.supervisor.especialidad,
        telefono: data.supervisor.telefono,
        correo: data.supervisor.correo,
      }).returning({ id: supervisores.id });
      targetSupervisorId = newSupervisores[0].id;

      // 3. Create historial
      const cambiosPayload = JSON.parse(JSON.stringify({ type: "create", data }));
      await db.insert(historialEmpresas).values({
        empresaId: targetEmpresaId,
        adminId: session.userId,
        cambios: cambiosPayload
      });
    } else {
      // It's an update
      if (!targetEmpresaId) return { success: false, error: "Falta ID de empresa a actualizar" };
      
      const existingEmpresa = await db.query.empresas.findFirst({ where: eq(empresas.id, targetEmpresaId) });
      
      const targetSucursalId = data.empresa?.targetSucursalId;
      
      // Update company fields if company data is provided in request
      if (data.empresa && (data.empresa.nombre || data.empresa.area || data.empresa.direccion || data.empresa.descripcion || data.empresa.mapaUrl)) {
        const updateData: any = {
          verificada: true,
          habilitada: true,
          actualizadaEn: new Date()
        };
        if (data.empresa.nombre) updateData.nombre = data.empresa.nombre;
        if (data.empresa.area && data.empresa.area.trim() !== "") updateData.area = data.empresa.area;
        if (data.empresa.organigramaUrl && data.empresa.organigramaUrl.trim() !== "") updateData.organigramaUrl = data.empresa.organigramaUrl;
        
        if (!targetSucursalId) {
          if (data.empresa.descripcion && data.empresa.descripcion.trim() !== "") updateData.descripcion = data.empresa.descripcion;
          if (data.empresa.antecedentes && data.empresa.antecedentes.trim() !== "") updateData.antecedentes = data.empresa.antecedentes;
          if (data.empresa.direccion && data.empresa.direccion.trim() !== "") updateData.direccion = data.empresa.direccion;
          if (data.empresa.mapaUrl && data.empresa.mapaUrl.trim() !== "") updateData.mapaUrl = data.empresa.mapaUrl;
        }
        
        await db.update(empresas).set(updateData).where(eq(empresas.id, targetEmpresaId));

        if (targetSucursalId) {
          const { sucursales } = await import("@/lib/schema");
          const sucursalUpdate: any = {};
          if (data.empresa.direccion && data.empresa.direccion.trim() !== "") sucursalUpdate.direccion = data.empresa.direccion;
          if (data.empresa.mapaUrl && data.empresa.mapaUrl.trim() !== "") sucursalUpdate.mapaUrl = data.empresa.mapaUrl;
          if (data.empresa.descripcion && data.empresa.descripcion.trim() !== "") sucursalUpdate.descripcion = data.empresa.descripcion;
          if (data.empresa.antecedentes && data.empresa.antecedentes.trim() !== "") sucursalUpdate.antecedentes = data.empresa.antecedentes;
          
          if (Object.keys(sucursalUpdate).length > 0) {
            await db.update(sucursales).set(sucursalUpdate).where(eq(sucursales.id, targetSucursalId));
          }
        }
      }

      // Supervisor handling (update existing vs create new vs keep untouched)
      const existingSupId = data.supervisor?.targetSupervisorId;

      if (existingSupId) {
        // Update existing supervisor in-place
        const updateSupObj: any = {
          actualizadoEn: new Date(),
        };
        if (data.supervisor.nombres !== undefined) updateSupObj.nombres = data.supervisor.nombres;
        if (data.supervisor.apellidos !== undefined) updateSupObj.apellidos = data.supervisor.apellidos;
        if (data.supervisor.cargo !== undefined) updateSupObj.cargo = data.supervisor.cargo || null;
        if (data.supervisor.especialidad !== undefined) updateSupObj.especialidad = data.supervisor.especialidad || null;
        if (data.supervisor.telefono !== undefined) updateSupObj.telefono = data.supervisor.telefono || null;
        if (data.supervisor.correo !== undefined) updateSupObj.correo = data.supervisor.correo || null;
        if (data.supervisor.titulo !== undefined) updateSupObj.titulo = data.supervisor.titulo || null;
        if (targetSucursalId || data.supervisor.targetSucursalId) {
          updateSupObj.sucursalId = targetSucursalId || data.supervisor.targetSucursalId || null;
        }

        await db.update(supervisores).set(updateSupObj).where(eq(supervisores.id, existingSupId));
        targetSupervisorId = existingSupId;
      } else if (data.supervisor && data.supervisor.nombres && data.supervisor.nombres.trim() !== "") {
        // Insert new supervisor
        const newSupervisores = await db.insert(supervisores).values({
          empresaId: targetEmpresaId,
          sucursalId: targetSucursalId || data.supervisor.targetSucursalId || null,
          nombres: data.supervisor.nombres,
          apellidos: data.supervisor.apellidos || "",
          cargo: data.supervisor.cargo || null,
          especialidad: data.supervisor.especialidad || null,
          telefono: data.supervisor.telefono || null,
          correo: data.supervisor.correo || null,
          titulo: data.supervisor.titulo || null,
        }).returning({ id: supervisores.id });
        targetSupervisorId = newSupervisores[0].id;
      }

      const cambiosPayload = JSON.parse(JSON.stringify({ type: "update", before: existingEmpresa, after: data, targetSucursalId }));
      await db.insert(historialEmpresas).values({
        empresaId: targetEmpresaId,
        adminId: session.userId,
        cambios: cambiosPayload
      });
    }

    // Update solicitud
    await db.update(solicitudesEmpresa)
      .set({ estado: "aprobada", revisadoPor: session.userId, revisadoEn: new Date() })
      .where(eq(solicitudesEmpresa.id, solicitudId));

    // Update propuesta to unlock it
    if (solicitud.propuestaId) {
      if (solicitud.tipo === "datos_alumno") {
        await db.update(propuestas).set({
          bloqueada: false,
          estado: "redactando"
        }).where(eq(propuestas.id, solicitud.propuestaId));
      } else {
        const targetSucursalId = data.empresa?.targetSucursalId;
        const updatePropObj: any = {
          empresaId: targetEmpresaId,
          sucursalId: targetSucursalId || null,
          bloqueada: false,
          estado: "redactando"
        };
        if (targetSupervisorId) {
          updatePropObj.supervisorId = targetSupervisorId;
        }

        await db.update(propuestas).set(updatePropObj).where(eq(propuestas.id, solicitud.propuestaId));
      }

      // Notify egresado
      const prop = await db.query.propuestas.findFirst({ where: eq(propuestas.id, solicitud.propuestaId) });
      if (prop) {
        const mensajeNotif = solicitud.tipo === "datos_alumno"
          ? "Tu solicitud de corrección de datos personales ha sido APROBADA. Tu propuesta está desbloqueada."
          : "Tu solicitud de empresa/supervisor ha sido APROBADA por el Administrador. Tu propuesta está desbloqueada.";

        await db.insert(notificaciones).values({
          usuarioId: prop.egresadoId,
          tipo: "solicitud_aprobada",
          mensaje: mensajeNotif,
        });
      }
    }

    revalidatePath("/admin/empresas/solicitudes");
    revalidatePath("/egresado");
    revalidatePath("/egresado/redactar");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function rechazarSolicitudEmpresa(solicitudId: number, justificacion: string) {
  const session = await getSession();
  if (!session || (session.rol !== "admin" && session.rol !== "decanato")) {
    return { success: false, error: "No autorizado" };
  }

  try {
    const solicitud = await db.query.solicitudesEmpresa.findFirst({
      where: eq(solicitudesEmpresa.id, solicitudId)
    });
    
    if (!solicitud) return { success: false, error: "Solicitud no encontrada" };
    if (solicitud.estado !== "pendiente") return { success: false, error: "La solicitud ya fue procesada" };

    const data = solicitud.datos as any;

    // Update solicitud to rejected
    await db.update(solicitudesEmpresa)
      .set({ 
        estado: "rechazada", 
        justificacionRechazo: justificacion,
        revisadoPor: session.userId, 
        revisadoEn: new Date() 
      })
      .where(eq(solicitudesEmpresa.id, solicitudId));

    // Notify student
    let egresadoId = data?.egresadoId;
    if (!egresadoId && solicitud.propuestaId) {
      const prop = await db.query.propuestas.findFirst({ where: eq(propuestas.id, solicitud.propuestaId) });
      if (prop) egresadoId = prop.egresadoId;
    }

    if (egresadoId) {
      const tipoTexto = solicitud.tipo === "datos_alumno" ? "corrección de datos personales" : "empresa / supervisor";
      await db.insert(notificaciones).values({
        usuarioId: egresadoId,
        tipo: "solicitud_rechazada",
        mensaje: `Tu solicitud de ${tipoTexto} fue RECHAZADA. Motivo: "${justificacion}".`,
      });
    }

    // Unlock propuesta so user can fix and try again
    if (solicitud.propuestaId) {
      await db.update(propuestas).set({
        bloqueada: false,
        estado: "redactando"
      }).where(eq(propuestas.id, solicitud.propuestaId));
    }

    revalidatePath("/admin/empresas/solicitudes");
    revalidatePath("/egresado");
    revalidatePath("/egresado/redactar");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

