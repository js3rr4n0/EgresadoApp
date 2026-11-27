"use server";
// Firmantes y supervisor de la carta de aceptación (R5): guarda lo elegido y manda lo nuevo a la administración en
// una sola solicitud de empresa de tipo «carta».

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { cartasAceptacion, firmantes, notificaciones, propuestas, solicitudesEmpresa, supervisores, usuarios } from "@/lib/schema";
import { getSession } from "@/lib/session";
import { revisarEntrada, type DatosSolicitudCarta, type EntradaPersonasCarta, type PersonaNueva } from "@/lib/personasCarta";
import { ultimaSolicitudCarta } from "@/lib/personasCartaServidor";

const limpiar = (p: PersonaNueva): PersonaNueva => ({
  nombreCompleto: String(p?.nombreCompleto ?? "").trim().slice(0, 255),
  titulo: String(p?.titulo ?? "").trim().slice(0, 50),
  cargo: String(p?.cargo ?? "").trim().slice(0, 255),
  correo: String(p?.correo ?? "").trim().slice(0, 255),
  telefono: String(p?.telefono ?? "").trim().slice(0, 50),
});

export async function guardarPersonasCarta(propuestaId: number, entrada: EntradaPersonasCarta): Promise<{ success: boolean; error?: string; solicitud?: boolean }> {
  const session = await getSession();
  if (!session || session.rol !== "egresado") return { success: false, error: "No autorizado" };
  const [prop] = await db.select().from(propuestas).where(eq(propuestas.id, propuestaId));
  if (!prop || prop.egresadoId !== session.userId) return { success: false, error: "Solo el líder del equipo guarda la carta." };
  if (prop.bloqueada) return { success: false, error: "La propuesta está bloqueada mientras se revisa." };
  if (!prop.empresaId) return { success: false, error: "Primero elige la empresa en el paso Datos empresariales." };

  const e: EntradaPersonasCarta = {
    firmanteIds: [...new Set((Array.isArray(entrada?.firmanteIds) ? entrada.firmanteIds : []).map(Number).filter(Number.isInteger))],
    firmantesNuevos: (Array.isArray(entrada?.firmantesNuevos) ? entrada.firmantesNuevos : []).slice(0, 5).map(limpiar),
    supervisorId: entrada?.supervisorId != null && Number.isInteger(Number(entrada.supervisorId)) ? Number(entrada.supervisorId) : null,
    supervisorNuevo: entrada?.supervisorNuevo ? limpiar(entrada.supervisorNuevo) : null,
    sinSupervisor: !!entrada?.sinSupervisor,
    motivoSinSupervisor: String(entrada?.motivoSinSupervisor ?? "").trim().slice(0, 2000),
  };
  const problemas = revisarEntrada(e);
  if (problemas.length) return { success: false, error: problemas.join(" ") };

  // Lo elegido tiene que ser de la empresa de la propuesta
  if (e.firmanteIds.length) {
    const ok = await db.select({ id: firmantes.id }).from(firmantes).where(and(inArray(firmantes.id, e.firmanteIds), eq(firmantes.empresaId, prop.empresaId)));
    if (ok.length !== e.firmanteIds.length) return { success: false, error: "Algún firmante elegido no es de la empresa de la propuesta." };
  }
  let sup: typeof supervisores.$inferSelect | undefined;
  if (e.supervisorId != null) {
    [sup] = await db.select().from(supervisores).where(and(eq(supervisores.id, e.supervisorId), eq(supervisores.empresaId, prop.empresaId)));
    if (!sup) return { success: false, error: "El supervisor elegido no es de la empresa de la propuesta." };
  }

  const ultima = await ultimaSolicitudCarta(propuestaId);
  const [carta] = await db.select().from(cartasAceptacion).where(eq(cartasAceptacion.propuestaId, propuestaId));
  // «Sin supervisor» ya validado con el mismo motivo: no se vuelve a pedir
  const sinSupYaValidado = e.sinSupervisor && !!carta?.sinSupervisor && ultima?.estado === "aprobada" && !!ultima.datos.sinSupervisor
    && (carta?.motivoSinSupervisor ?? "").trim() === e.motivoSinSupervisor;

  const valores = {
    firmanteIds: e.firmanteIds,
    supervisorId: sup?.id ?? null,
    sinSupervisor: e.sinSupervisor,
    motivoSinSupervisor: e.sinSupervisor ? e.motivoSinSupervisor : null,
    // Datos del supervisor que leen el documento y las demás vistas
    supTitulo: sup?.titulo ?? null,
    supNombres: sup ? sup.nombres : null,
    supApellidos: sup ? sup.apellidos : null,
    supCargo: sup?.cargo ?? null,
    supTelefono: sup?.telefono ?? null,
    supCorreo: sup?.correo ?? null,
  };
  if (carta) await db.update(cartasAceptacion).set(valores).where(eq(cartasAceptacion.propuestaId, propuestaId));
  else await db.insert(cartasAceptacion).values({ propuestaId, ...valores });
  if (sup) await db.update(propuestas).set({ supervisorId: sup.id }).where(eq(propuestas.id, propuestaId));

  // Solicitud a la administración: una sola por carta; si ya hay una pendiente, se reemplaza su contenido
  const datos: DatosSolicitudCarta = {
    origen: "carta",
    empresaId: prop.empresaId,
    sucursalId: prop.sucursalId ?? null,
    firmantesNuevos: e.firmantesNuevos,
    supervisorNuevo: e.supervisorNuevo,
    sinSupervisor: e.sinSupervisor && !sinSupYaValidado ? { motivo: e.motivoSinSupervisor } : null,
  };
  const necesita = datos.firmantesNuevos.length > 0 || !!datos.supervisorNuevo || !!datos.sinSupervisor;
  const pendiente = ultima?.estado === "pendiente" ? ultima : null;
  if (pendiente && !necesita) {
    // Ya no hay nada nuevo que validar: se retira la solicitud que nadie había revisado
    await db.delete(solicitudesEmpresa).where(and(eq(solicitudesEmpresa.id, pendiente.id), eq(solicitudesEmpresa.estado, "pendiente")));
  } else if (pendiente) {
    await db.update(solicitudesEmpresa).set({ datos, creadaEn: new Date() }).where(eq(solicitudesEmpresa.id, pendiente.id));
  } else if (necesita) {
    await db.insert(solicitudesEmpresa).values({ propuestaId, empresaId: prop.empresaId, tipo: "carta", datos, estado: "pendiente" });
    const [yo] = await db.select({ nombre: usuarios.nombreCompleto, carnet: usuarios.carnet }).from(usuarios).where(eq(usuarios.id, session.userId));
    const admins = await db.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.rol, "admin"));
    if (admins.length) {
      await db.insert(notificaciones).values(
        admins.map((a) => ({
          usuarioId: a.id,
          tipo: "solicitud_empresa_carta",
          mensaje: `${yo?.nombre ?? "Un egresado"} (${yo?.carnet ?? "sin carnet"}) envió firmantes o supervisor de la carta de aceptación para validar.`,
        })),
      );
    }
  }

  revalidatePath("/egresado/redactar");
  revalidatePath("/admin/empresas");
  revalidatePath("/admin", "layout");
  return { success: true, solicitud: necesita };
}
