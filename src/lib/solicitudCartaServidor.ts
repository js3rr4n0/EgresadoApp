import "server-only";
// Aprobación y rechazo de las solicitudes de tipo «carta» (R5) desde Gestión de Empresas. Las llama
// `actions/solicitudes.ts` después de comprobar el permiso.
//   - Aprobar: los firmantes y el supervisor nuevos quedan registrados en la empresa (y en su sucursal, si la propuesta
//     tiene una) y elegidos en la carta; «sin supervisor» queda validado.
//   - Rechazar: no se registra nada; si pedía «sin supervisor», la carta vuelve a pedir un supervisor.
// En ningún caso cambia el estado de la propuesta.

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { cartasAceptacion, firmantes, notificaciones, propuestas, solicitudesEmpresa, supervisores } from "@/lib/schema";
import { dividirNombre, type DatosSolicitudCarta } from "@/lib/personasCarta";

type Solicitud = typeof solicitudesEmpresa.$inferSelect;

async function avisarEgresado(propuestaId: number, tipo: string, mensaje: string) {
  const [prop] = await db.select({ egresadoId: propuestas.egresadoId }).from(propuestas).where(eq(propuestas.id, propuestaId));
  if (prop) await db.insert(notificaciones).values({ usuarioId: prop.egresadoId, tipo, mensaje });
}

export async function aprobarSolicitudCarta(s: Solicitud, adminId: number) {
  const d = s.datos as DatosSolicitudCarta;
  const empresaId = s.empresaId ?? d.empresaId;
  const nuevosFirmantes = d.firmantesNuevos?.length
    ? await db
        .insert(firmantes)
        .values(d.firmantesNuevos.map((p) => ({ empresaId, sucursalId: d.sucursalId, titulo: p.titulo || null, ...dividirNombre(p.nombreCompleto), cargo: p.cargo || null, correo: p.correo || null, telefono: p.telefono || null })))
        .returning({ id: firmantes.id })
    : [];
  const [nuevoSupervisor] = d.supervisorNuevo
    ? await db
        .insert(supervisores)
        .values({ empresaId, sucursalId: d.sucursalId, titulo: d.supervisorNuevo.titulo || null, ...dividirNombre(d.supervisorNuevo.nombreCompleto), cargo: d.supervisorNuevo.cargo || null, correo: d.supervisorNuevo.correo || null, telefono: d.supervisorNuevo.telefono || null })
        .returning()
    : [];

  const [carta] = await db.select().from(cartasAceptacion).where(eq(cartasAceptacion.propuestaId, s.propuestaId));
  if (carta) {
    const cambios: Partial<typeof cartasAceptacion.$inferInsert> = {
      firmanteIds: [...new Set([...(carta.firmanteIds ?? []), ...nuevosFirmantes.map((f) => f.id)])],
    };
    if (nuevoSupervisor) {
      Object.assign(cambios, {
        supervisorId: nuevoSupervisor.id,
        sinSupervisor: false,
        motivoSinSupervisor: null,
        supTitulo: nuevoSupervisor.titulo,
        supNombres: nuevoSupervisor.nombres,
        supApellidos: nuevoSupervisor.apellidos,
        supCargo: nuevoSupervisor.cargo,
        supTelefono: nuevoSupervisor.telefono,
        supCorreo: nuevoSupervisor.correo,
      });
    }
    await db.update(cartasAceptacion).set(cambios).where(eq(cartasAceptacion.id, carta.id));
  }
  if (nuevoSupervisor) await db.update(propuestas).set({ supervisorId: nuevoSupervisor.id }).where(eq(propuestas.id, s.propuestaId));

  await db.update(solicitudesEmpresa).set({ estado: "aprobada", revisadoPor: adminId, revisadoEn: new Date() }).where(eq(solicitudesEmpresa.id, s.id));
  const partes = [
    nuevosFirmantes.length ? `${nuevosFirmantes.length} firmante(s)` : "",
    nuevoSupervisor ? "el supervisor" : "",
    d.sinSupervisor ? "el trabajo sin supervisor empresarial" : "",
  ].filter(Boolean);
  await avisarEgresado(s.propuestaId, "solicitud_aprobada", `La administración aprobó ${partes.join(", ")} de tu carta de aceptación. Ya quedaron registrados en la empresa.`);
}

export async function rechazarSolicitudCarta(s: Solicitud, motivo: string, adminId: number) {
  const d = s.datos as DatosSolicitudCarta;
  await db
    .update(solicitudesEmpresa)
    .set({ estado: "rechazada", justificacionRechazo: motivo, revisadoPor: adminId, revisadoEn: new Date() })
    .where(eq(solicitudesEmpresa.id, s.id));
  if (d.sinSupervisor) {
    await db.update(cartasAceptacion).set({ sinSupervisor: false }).where(eq(cartasAceptacion.propuestaId, s.propuestaId));
  }
  await avisarEgresado(
    s.propuestaId,
    "solicitud_rechazada",
    `La administración rechazó los firmantes o el supervisor de tu carta de aceptación. Motivo: "${motivo}". Corrígelos en el paso Carta de aceptación.`,
  );
}
