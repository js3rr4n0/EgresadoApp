"use server";

// Entrega C1 (specs/CONFIGURACION_COHORTE.md): guardar la configuración de una facultad en una cohorte y copiar la
// de la cohorte anterior. Desde la fecha de inicio de la cohorte, todo cambio pide justificación (respuesta 6).

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { carreras, cohorteConfigBitacora, cohorteFacultades, cohorteParticipantes, periodos, usuarios } from "@/lib/schema";
import { leerConfigPorFacultad, leerConfiguracionCohorte } from "@/lib/configCohorteServidor";
import { isoDia } from "@/lib/seguimientoCohortes";
import {
  MINIMO_JUSTIFICACION,
  cohorteIniciada,
  describirCambios,
  validarConfig,
  type ConfigFacultad,
  type Nombres,
} from "@/lib/configCohorte";

type Resultado = { success: true; sinCambios?: boolean } | { success: false; error: string; pideJustificacion?: boolean };

async function exigirSuperadmin() {
  const s = await getSession();
  return s && s.rol === "admin" ? s : null;
}

async function nombres(): Promise<Nombres> {
  const [gente, listaCarreras] = await Promise.all([
    db.select({ id: usuarios.id, nombre: usuarios.nombreCompleto }).from(usuarios).where(inArray(usuarios.rol, ["decanato", "coordinador", "asesor"])),
    db.select({ id: carreras.id, nombre: carreras.nombre }).from(carreras),
  ]);
  return {
    usuario: (id) => gente.find((g) => g.id === id)?.nombre ?? `Usuario ${id}`,
    carrera: (id) => listaCarreras.find((c) => c.id === id)?.nombre ?? `Carrera ${id}`,
  };
}

/** Normaliza lo que llega del cliente: tipos, carreras solo de la facultad y sin listas en modos que no las usan. */
function normalizar(c: ConfigFacultad, carrerasFacultad: number[]): ConfigFacultad {
  const participante = (p: ConfigFacultad["coordinadores"][number]) => ({
    usuarioId: Number(p.usuarioId),
    carreras: [...new Set((p.carreras ?? []).map(Number))].filter((id) => carrerasFacultad.includes(id)).sort((a, b) => a - b),
    activo: !!p.activo,
  });
  return {
    administracion: c.administracion === "facultad" ? "facultad" : "central",
    adminFacultadId: c.administracion === "facultad" && c.adminFacultadId ? Number(c.adminFacultadId) : null,
    coordinacion: c.coordinacion === "sin_coordinador" || c.coordinacion === "por_carrera" ? c.coordinacion : "general",
    adminCoordina: c.administracion === "facultad" && !!c.adminCoordina,
    // En coordinación general los coordinadores atienden todas las carreras
    coordinadores: (c.coordinadores ?? []).map(participante).map((p) => (c.coordinacion === "general" ? { ...p, carreras: [] } : p)),
    asesores: (c.asesores ?? []).map(participante),
  };
}

async function escribir(periodoId: number, facultadId: number, c: ConfigFacultad) {
  await db.batch([
    db
      .insert(cohorteFacultades)
      .values({ periodoId, facultadId, administracion: c.administracion, adminFacultadId: c.adminFacultadId, coordinacion: c.coordinacion, adminCoordina: c.adminCoordina })
      .onConflictDoUpdate({
        target: [cohorteFacultades.periodoId, cohorteFacultades.facultadId],
        set: { administracion: c.administracion, adminFacultadId: c.adminFacultadId, coordinacion: c.coordinacion, adminCoordina: c.adminCoordina, actualizadoEn: new Date() },
      }),
    db.delete(cohorteParticipantes).where(and(eq(cohorteParticipantes.periodoId, periodoId), eq(cohorteParticipantes.facultadId, facultadId))),
    ...[...c.coordinadores.map((p) => ({ ...p, funcion: "coordinador" })), ...c.asesores.map((p) => ({ ...p, funcion: "asesor" }))].map((p) =>
      db.insert(cohorteParticipantes).values({ periodoId, facultadId, usuarioId: p.usuarioId, funcion: p.funcion, carreras: p.carreras, activo: p.activo }),
    ),
  ]);
}

export async function guardarConfiguracionFacultad(
  periodoId: number,
  facultadId: number,
  config: ConfigFacultad,
  justificacion: string | null,
): Promise<Resultado> {
  try {
    const s = await exigirSuperadmin();
    if (!s) return { success: false, error: "Solo el superadministrador puede configurar la cohorte." };

    const datos = await leerConfiguracionCohorte(periodoId);
    if (!datos) return { success: false, error: "La cohorte no existe." };
    const facultad = datos.facultades.find((f) => f.id === facultadId);
    if (!facultad) return { success: false, error: "La facultad no existe o está inactiva." };
    const carrerasFacultad = facultad.carreras.map((c) => c.id);

    const c = normalizar(config, carrerasFacultad);
    // Los usuarios deben tener el rol que corresponde a su función
    const ids = (lista: { id: number }[]) => new Set(lista.map((u) => u.id));
    if (c.adminFacultadId && !ids(datos.admins).has(c.adminFacultadId)) return { success: false, error: "El administrador elegido no tiene rol de administrador de facultad." };
    if (c.coordinadores.some((p) => !ids(datos.coordinadores).has(p.usuarioId))) return { success: false, error: "Un usuario de la lista de coordinadores no tiene rol de coordinador." };
    if (c.asesores.some((p) => !ids(datos.asesores).has(p.usuarioId))) return { success: false, error: "Un usuario de la lista de asesores no tiene rol de asesor." };

    const n = await nombres();
    const { errores } = validarConfig(c, carrerasFacultad, n);
    if (errores.length) return { success: false, error: errores.join(" ") };

    const cambios = describirCambios(facultad.config, c, n);
    if (facultad.config && cambios.length === 0) return { success: true, sinCambios: true };

    const iniciada = cohorteIniciada(datos.periodo.inicioRecepcion, isoDia(new Date()));
    const texto = (justificacion ?? "").trim();
    if (iniciada && texto.length < MINIMO_JUSTIFICACION) {
      return { success: false, pideJustificacion: true, error: `La cohorte ya inició: justifica el cambio (al menos ${MINIMO_JUSTIFICACION} caracteres).` };
    }

    await escribir(periodoId, facultadId, c);
    await db.insert(cohorteConfigBitacora).values({ periodoId, facultadId, adminId: s.userId, cambios, justificacion: texto || null });

    revalidatePath(`/admin/periodos/${periodoId}/configuracion`);
    return { success: true };
  } catch (e) {
    console.error("Error al guardar la configuración de la cohorte:", e);
    return { success: false, error: "No se pudo guardar la configuración." };
  }
}

/** Copia la configuración desde otra cohorte: reemplaza las facultades configuradas en el origen; las demás no cambian. */
export async function copiarConfiguracion(periodoId: number, desdePeriodoId: number, justificacion: string | null): Promise<Resultado> {
  try {
    const s = await exigirSuperadmin();
    if (!s) return { success: false, error: "Solo el superadministrador puede configurar la cohorte." };
    if (periodoId === desdePeriodoId) return { success: false, error: "Elige otra cohorte." };

    const [datos, origen] = await Promise.all([leerConfiguracionCohorte(periodoId), leerConfigPorFacultad(desdePeriodoId)]);
    if (!datos) return { success: false, error: "La cohorte no existe." };
    if (origen.size === 0) return { success: false, error: "La cohorte de origen no tiene configuración." };
    const [desde] = await db.select({ nombre: periodos.nombre }).from(periodos).where(eq(periodos.id, desdePeriodoId));

    const iniciada = cohorteIniciada(datos.periodo.inicioRecepcion, isoDia(new Date()));
    const texto = (justificacion ?? "").trim();
    if (iniciada && texto.length < MINIMO_JUSTIFICACION) {
      return { success: false, pideJustificacion: true, error: `La cohorte ya inició: justifica el cambio (al menos ${MINIMO_JUSTIFICACION} caracteres).` };
    }

    // Solo se copian usuarios que siguen teniendo el rol y carreras que siguen en la facultad
    const ids = (lista: { id: number }[]) => new Set(lista.map((u) => u.id));
    const admins = ids(datos.admins), coords = ids(datos.coordinadores), ases = ids(datos.asesores);
    const n = await nombres();
    let copiadas = 0;
    for (const f of datos.facultades) {
      const o = origen.get(f.id)?.config;
      if (!o) continue;
      const carrerasF = f.carreras.map((c) => c.id);
      const c = normalizar(
        {
          ...o,
          adminFacultadId: o.adminFacultadId && admins.has(o.adminFacultadId) ? o.adminFacultadId : null,
          coordinadores: o.coordinadores.filter((p) => coords.has(p.usuarioId)),
          asesores: o.asesores.filter((p) => ases.has(p.usuarioId)),
        },
        carrerasF,
      );
      await escribir(periodoId, f.id, c);
      await db.insert(cohorteConfigBitacora).values({
        periodoId,
        facultadId: f.id,
        adminId: s.userId,
        cambios: [`Configuración copiada de la cohorte ${desde?.nombre ?? desdePeriodoId}.`, ...describirCambios(f.config, c, n).filter((x) => !x.startsWith("Configuración inicial"))],
        justificacion: texto || null,
      });
      copiadas++;
    }
    if (copiadas === 0) return { success: false, error: "Ninguna facultad activa tiene configuración en la cohorte de origen." };

    revalidatePath(`/admin/periodos/${periodoId}/configuracion`);
    return { success: true };
  } catch (e) {
    console.error("Error al copiar la configuración:", e);
    return { success: false, error: "No se pudo copiar la configuración." };
  }
}
