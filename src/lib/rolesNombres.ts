// Nombres de los roles en pantalla (specs/CONFIGURACION_COHORTE.md, C3). En la base, el superadministrador sigue siendo
// 'admin' y el administrador de facultad es 'decanato' (respuesta 1 del usuario). Módulo puro, sirve en cliente y servidor.

export const NOMBRE_ROL: Record<string, string> = {
  admin: "Superadministrador",
  decanato: "Administrador de facultad",
  coordinador: "Coordinador",
  asesor: "Asesor",
  egresado: "Egresado",
};

export const nombreRol = (rol: string | null | undefined) => (rol ? NOMBRE_ROL[rol] ?? rol : "—");

/**
 * Rutas del panel /admin que puede abrir el administrador de facultad (el resto es solo del superadministrador).
 * Lo usa el proxy; cada página además filtra por su facultad.
 */
export const RUTAS_ADMIN_FACULTAD = ["/admin/usuarios", "/admin/asesores", "/admin/seguimiento", "/admin/empresas", "/admin/propuestas"];
export const RUTAS_ADMIN_FACULTAD_EXCLUIDAS = ["/admin/empresas/solicitudes"];

export function adminFacultadPuedeAbrir(path: string): boolean {
  if (path === "/admin" || path === "/admin/") return true;
  if (RUTAS_ADMIN_FACULTAD_EXCLUIDAS.some((r) => path === r || path.startsWith(r + "/"))) return false;
  return RUTAS_ADMIN_FACULTAD.some((r) => path === r || path.startsWith(r + "/"));
}
