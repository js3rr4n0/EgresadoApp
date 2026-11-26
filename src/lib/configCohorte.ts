// Configuración de la cohorte por facultad (specs/CONFIGURACION_COHORTE.md, entrega C1). Módulo puro: tipos,
// validación, descripción de los cambios para la bitácora y qué coordinadores puede tener una carrera (para C2).

export type Administracion = "central" | "facultad";
export type Coordinacion = "sin_coordinador" | "general" | "por_carrera";

export const NOMBRE_ADMINISTRACION: Record<Administracion, string> = {
  central: "Administración central",
  facultad: "Administrador de facultad",
};

export const NOMBRE_COORDINACION: Record<Coordinacion, string> = {
  sin_coordinador: "Sin coordinador",
  general: "Coordinación general",
  por_carrera: "Coordinador por carrera",
};

export const AYUDA_COORDINACION: Record<Coordinacion, string> = {
  sin_coordinador: "Las propuestas pasan directo a asignación de asesor; la hace el superadministrador.",
  general: "Uno o varios coordinadores atienden todas las carreras de la facultad.",
  por_carrera: "Cada coordinador atiende las carreras que se le asignen; una carrera tiene un solo coordinador.",
};

export interface Participante {
  usuarioId: number;
  /** Carreras que atiende; vacío = todas las de la facultad. */
  carreras: number[];
  activo: boolean;
}

export interface ConfigFacultad {
  administracion: Administracion;
  adminFacultadId: number | null;
  coordinacion: Coordinacion;
  /** El administrador de facultad también coordina. */
  adminCoordina: boolean;
  coordinadores: Participante[];
  asesores: Participante[];
}

export const configVacia = (): ConfigFacultad => ({
  administracion: "central",
  adminFacultadId: null,
  coordinacion: "general",
  adminCoordina: false,
  coordinadores: [],
  asesores: [],
});

/** Largo mínimo de la justificación de un cambio después del inicio de la cohorte. */
export const MINIMO_JUSTIFICACION = 15;

export interface Nombres {
  usuario: (id: number) => string;
  carrera: (id: number) => string;
}

/** Errores (impiden guardar) y avisos (se puede guardar) de la configuración de una facultad. */
export function validarConfig(c: ConfigFacultad, carrerasFacultad: number[], n: Nombres): { errores: string[]; avisos: string[] } {
  const errores: string[] = [];
  const avisos: string[] = [];
  const activos = c.coordinadores.filter((p) => p.activo);

  if (c.administracion === "facultad" && !c.adminFacultadId) errores.push("Elige quién es el administrador de la facultad.");
  if (c.adminCoordina && c.administracion !== "facultad") errores.push("Solo un administrador de facultad puede ser también coordinador.");
  if (c.adminCoordina && c.coordinacion === "sin_coordinador") errores.push("Si el administrador coordina, la facultad no puede quedar sin coordinador.");

  const repetidos = (lista: Participante[]) => lista.filter((p, i) => lista.findIndex((q) => q.usuarioId === p.usuarioId) !== i);
  if (repetidos(c.coordinadores).length) errores.push("Hay un coordinador repetido.");
  if (repetidos(c.asesores).length) errores.push("Hay un asesor repetido.");

  if (c.coordinacion === "general" && activos.length === 0 && !c.adminCoordina) {
    errores.push("Agrega al menos un coordinador, marca que el administrador coordina o elige «Sin coordinador».");
  }
  if (c.coordinacion === "por_carrera") {
    for (const p of activos) {
      if (p.carreras.length === 0) errores.push(`Asigna al menos una carrera a ${n.usuario(p.usuarioId)}.`);
    }
    for (const carrera of carrerasFacultad) {
      const quienes = activos.filter((p) => p.carreras.includes(carrera));
      if (quienes.length > 1) {
        errores.push(`${n.carrera(carrera)} tiene más de un coordinador (${quienes.map((q) => n.usuario(q.usuarioId)).join(", ")}).`);
      }
    }
    const sinCoordinador = carrerasFacultad.filter((carrera) => !activos.some((p) => p.carreras.includes(carrera)));
    if (sinCoordinador.length) {
      avisos.push(
        c.adminCoordina
          ? `El administrador de facultad coordinará: ${sinCoordinador.map(n.carrera).join(", ")}.`
          : `Carreras sin coordinador (las asignará el superadministrador): ${sinCoordinador.map(n.carrera).join(", ")}.`,
      );
    }
  }
  if (c.coordinacion === "sin_coordinador" && activos.length) avisos.push("Los coordinadores de la lista no se usarán porque la facultad quedó sin coordinador.");
  if (!c.asesores.some((p) => p.activo)) avisos.push("No hay asesores habilitados para esta cohorte en la facultad.");
  return { errores, avisos };
}

/** Lista legible de lo que cambió entre dos configuraciones (para la bitácora). */
export function describirCambios(antes: ConfigFacultad | null, despues: ConfigFacultad, n: Nombres): string[] {
  const a = antes ?? configVacia();
  const cambios: string[] = [];
  if (!antes) cambios.push("Configuración inicial de la facultad.");
  if (a.administracion !== despues.administracion || a.adminFacultadId !== despues.adminFacultadId) {
    cambios.push(
      despues.administracion === "central"
        ? "Administración: central (superadministrador)."
        : `Administración: administrador de facultad ${despues.adminFacultadId ? n.usuario(despues.adminFacultadId) : "(sin elegir)"}.`,
    );
  }
  if (a.coordinacion !== despues.coordinacion) cambios.push(`Coordinación: ${NOMBRE_COORDINACION[despues.coordinacion]}.`);
  if (a.adminCoordina !== despues.adminCoordina) cambios.push(despues.adminCoordina ? "El administrador de facultad también coordina." : "El administrador de facultad deja de coordinar.");

  const comparar = (tipo: string, lista0: Participante[], lista1: Participante[]) => {
    const carreras = (p: Participante) => (p.carreras.length ? p.carreras.map(n.carrera).join(", ") : "todas las carreras");
    for (const p of lista1) {
      const previo = lista0.find((q) => q.usuarioId === p.usuarioId);
      if (!previo) cambios.push(`Se agrega ${tipo} ${n.usuario(p.usuarioId)} (${carreras(p)})${p.activo ? "" : ", deshabilitado"}.`);
      else {
        if (previo.activo !== p.activo) cambios.push(`${p.activo ? "Se habilita" : "Se deshabilita"} ${tipo} ${n.usuario(p.usuarioId)}.`);
        const s0 = [...previo.carreras].sort().join(","), s1 = [...p.carreras].sort().join(",");
        if (s0 !== s1) cambios.push(`Carreras de ${n.usuario(p.usuarioId)}: ${carreras(p)}.`);
      }
    }
    for (const q of lista0) if (!lista1.some((p) => p.usuarioId === q.usuarioId)) cambios.push(`Se quita ${tipo} ${n.usuario(q.usuarioId)}.`);
  };
  comparar("al coordinador", a.coordinadores, despues.coordinadores);
  comparar("al asesor", a.asesores, despues.asesores);
  return cambios;
}

/**
 * Coordinadores que pueden asignarse a una propuesta de esa carrera (entrega C2).
 * `adminFacultad` indica si el administrador de facultad es una opción (coordina y la carrera le corresponde).
 */
export function coordinadoresPermitidos(c: ConfigFacultad, carreraId: number | null): { coordinadores: number[]; adminFacultad: boolean; sinCoordinador: boolean } {
  if (c.coordinacion === "sin_coordinador") return { coordinadores: [], adminFacultad: false, sinCoordinador: true };
  const activos = c.coordinadores.filter((p) => p.activo);
  if (c.coordinacion === "general") {
    return { coordinadores: activos.map((p) => p.usuarioId), adminFacultad: c.adminCoordina && !!c.adminFacultadId, sinCoordinador: false };
  }
  const deCarrera = carreraId == null ? [] : activos.filter((p) => p.carreras.includes(carreraId)).map((p) => p.usuarioId);
  const admin = c.adminCoordina && !!c.adminFacultadId && deCarrera.length === 0;
  return { coordinadores: deCarrera, adminFacultad: admin, sinCoordinador: deCarrera.length === 0 && !admin };
}

/** ¿La cohorte ya empezó? Desde ese día, cambiar la configuración pide justificación. */
export const cohorteIniciada = (inicioRecepcion: string, hoy: string) => hoy >= inicioRecepcion;
