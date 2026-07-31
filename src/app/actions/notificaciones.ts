"use server";

import { db } from "@/lib/db";
import { notificaciones, solicitudesEmpresa } from "@/lib/schema";
import { eq, desc, and } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function getNotificacionesUsuario() {
  const session = await getSession();
  if (!session) return { notificaciones: [], unreadCount: 0, pendingSolicitudesCount: 0 };

  try {
    if (session.rol === "admin" || session.rol === "decanato") {
      // Pending solicitudes count for Admin / Decanato
      const pendingRows = await db
        .select({ id: solicitudesEmpresa.id })
        .from(solicitudesEmpresa)
        .where(eq(solicitudesEmpresa.estado, "pendiente"));

      const userNotifs = await db
        .select()
        .from(notificaciones)
        .where(eq(notificaciones.usuarioId, session.userId))
        .orderBy(desc(notificaciones.creadoEn))
        .limit(10);

      const unreadCount = userNotifs.filter((n) => !n.leida).length;

      return {
        notificaciones: userNotifs,
        unreadCount: unreadCount,
        pendingSolicitudesCount: pendingRows.length,
      };
    } else {
      // Egresado user
      const userNotifs = await db
        .select()
        .from(notificaciones)
        .where(eq(notificaciones.usuarioId, session.userId))
        .orderBy(desc(notificaciones.creadoEn))
        .limit(15);

      const unreadCount = userNotifs.filter((n) => !n.leida).length;

      return {
        notificaciones: userNotifs,
        unreadCount: unreadCount,
        pendingSolicitudesCount: 0,
      };
    }
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return { notificaciones: [], unreadCount: 0, pendingSolicitudesCount: 0 };
  }
}

export async function marcarNotificacionLeida(notificacionId: number) {
  const session = await getSession();
  if (!session) return { success: false };

  try {
    await db
      .update(notificaciones)
      .set({ leida: true })
      .where(and(eq(notificaciones.id, notificacionId), eq(notificaciones.usuarioId, session.userId)));

    revalidatePath("/egresado");
    revalidatePath("/admin");
    return { success: true };
  } catch (error) {
    console.error("Error marking notification read:", error);
    return { success: false };
  }
}
