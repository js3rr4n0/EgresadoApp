"use server";

import { db } from "@/lib/db";
import { solicitudesEmpresa, empresas, supervisores, historialEmpresas, propuestas } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function aprobarSolicitudEmpresa(solicitudId: number) {
  const session = await getSession();
  if (!session || session.rol !== "admin") return { success: false, error: "No autorizado" };

  try {
    const solicitud = await db.query.solicitudesEmpresa.findFirst({
      where: eq(solicitudesEmpresa.id, solicitudId)
    });
    
    if (!solicitud) return { success: false, error: "Solicitud no encontrada" };
    if (solicitud.estado !== "pendiente") return { success: false, error: "La solicitud ya fue procesada" };

    const data = solicitud.datos as any;

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
      
      const targetSucursalId = data.empresa.targetSucursalId;
      
      const updateData: any = {
        area: data.empresa.area,
        organigramaUrl: data.empresa.organigramaUrl || null,
        verificada: true,
        habilitada: true
      };
      
      if (!targetSucursalId) {
        updateData.descripcion = data.empresa.descripcion;
        updateData.antecedentes = data.empresa.antecedentes;
        updateData.direccion = data.empresa.direccion;
        updateData.mapaUrl = data.empresa.mapaUrl || null;
      }
      
      await db.update(empresas).set(updateData).where(eq(empresas.id, targetEmpresaId));

      if (targetSucursalId) {
        const { sucursales } = await import("@/lib/schema");
        await db.update(sucursales).set({
          direccion: data.empresa.direccion,
          mapaUrl: data.empresa.mapaUrl || null,
          descripcion: data.empresa.descripcion,
          antecedentes: data.empresa.antecedentes,
        }).where(eq(sucursales.id, targetSucursalId));
      }

      const newSupervisores = await db.insert(supervisores).values({
        empresaId: targetEmpresaId,
        sucursalId: targetSucursalId || null,
        nombres: data.supervisor.nombres,
        apellidos: data.supervisor.apellidos,
        cargo: data.supervisor.cargo,
        especialidad: data.supervisor.especialidad,
        telefono: data.supervisor.telefono,
        correo: data.supervisor.correo,
      }).returning({ id: supervisores.id });
      targetSupervisorId = newSupervisores[0].id;

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
      const targetSucursalId = data.empresa.targetSucursalId;
      await db.update(propuestas).set({
        empresaId: targetEmpresaId,
        sucursalId: targetSucursalId || null,
        supervisorId: targetSupervisorId,
        bloqueada: false,
        estado: "redactando"
      }).where(eq(propuestas.id, solicitud.propuestaId));
    }

    revalidatePath("/admin/empresas/solicitudes");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function rechazarSolicitudEmpresa(solicitudId: number, justificacion: string) {
  const session = await getSession();
  if (!session || session.rol !== "admin") return { success: false, error: "No autorizado" };

  try {
    const solicitud = await db.query.solicitudesEmpresa.findFirst({
      where: eq(solicitudesEmpresa.id, solicitudId)
    });
    
    if (!solicitud) return { success: false, error: "Solicitud no encontrada" };
    if (solicitud.estado !== "pendiente") return { success: false, error: "La solicitud ya fue procesada" };

    // Update solicitud to rejected
    await db.update(solicitudesEmpresa)
      .set({ 
        estado: "rechazada", 
        justificacionRechazo: justificacion,
        revisadoPor: session.userId, 
        revisadoEn: new Date() 
      })
      .where(eq(solicitudesEmpresa.id, solicitudId));

    // Unlock propuesta so user can fix and try again
    if (solicitud.propuestaId) {
      // Return state to redactando, but we might want to alert them.
      // Since it's returned to redactando, the UI will just let them edit the form again.
      await db.update(propuestas).set({
        bloqueada: false,
        estado: "redactando"
      }).where(eq(propuestas.id, solicitud.propuestaId));
    }

    revalidatePath("/admin/empresas/solicitudes");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

