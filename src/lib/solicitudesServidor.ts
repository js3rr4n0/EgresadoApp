import "server-only";
// Solicitudes que revisa la administración y contadores de pendientes del menú lateral (ajustes del 26-nov-2026).
//   - De empresa (nueva, actualización o modificación de empresa o supervisor, y firmantes o supervisor de la carta,
//     R5): en Gestión de Empresas.
//   - De corrección de datos del egresado (datos_alumno): en Solicitudes.

import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { empresas, organigramasEmpresa, propuestas, solicitudesEmpresa, sucursales, supervisores, usuarios } from "@/lib/schema";
import type { Alcance } from "@/lib/permisos";

export const TIPOS_EMPRESA = ["nueva", "actualizacion", "modificacion", "carta"];
export const TIPOS_CORRECCION = ["datos_alumno"];

export async function leerSolicitudes(clase: "empresa" | "correccion") {
  const tipos = clase === "empresa" ? TIPOS_EMPRESA : TIPOS_CORRECCION;
  const filas = await db
    .select({
      id: solicitudesEmpresa.id,
      tipo: solicitudesEmpresa.tipo,
      estado: solicitudesEmpresa.estado,
      datos: solicitudesEmpresa.datos,
      creadaEn: solicitudesEmpresa.creadaEn,
      empresaTarget: empresas.nombre,
      egresado: usuarios.nombreCompleto,
    })
    .from(solicitudesEmpresa)
    .leftJoin(empresas, eq(solicitudesEmpresa.empresaId, empresas.id))
    .leftJoin(propuestas, eq(solicitudesEmpresa.propuestaId, propuestas.id))
    .leftJoin(usuarios, eq(propuestas.egresadoId, usuarios.id))
    .where(inArray(solicitudesEmpresa.tipo, tipos))
    .orderBy(desc(solicitudesEmpresa.creadaEn));
  // Las pendientes primero
  const solicitudes = [...filas.filter((f) => f.estado === "pendiente"), ...filas.filter((f) => f.estado !== "pendiente")];

  if (clase === "correccion") return { solicitudes, allEmpresas: [], allSucursales: [], allSupervisores: [] };

  const [rawEmpresas, orgs, allSucursales, allSupervisores] = await Promise.all([
    db.select().from(empresas),
    db.select().from(organigramasEmpresa).orderBy(desc(organigramasEmpresa.id)),
    db.select().from(sucursales),
    db.select().from(supervisores),
  ]);
  const allEmpresas = rawEmpresas.map((emp) => {
    const ultimo = orgs.find((o) => o.empresaId === emp.id);
    return { ...emp, organigramaUrl: ultimo ? ultimo.url : emp.organigramaUrl };
  });
  return { solicitudes, allEmpresas, allSucursales, allSupervisores };
}

/**
 * Número de pendientes por sección del menú lateral (ruta → cantidad). Solo cuenta lo que el usuario puede atender:
 * las solicitudes son del superadministrador; las propuestas por asignar, de su alcance.
 */
export async function contadoresMenu(a: Alcance): Promise<Record<string, number>> {
  const c: Record<string, number> = {};
  if (a.superadmin) {
    const [emp] = await db.select({ n: count() }).from(solicitudesEmpresa).where(and(eq(solicitudesEmpresa.estado, "pendiente"), inArray(solicitudesEmpresa.tipo, TIPOS_EMPRESA)));
    const [cor] = await db.select({ n: count() }).from(solicitudesEmpresa).where(and(eq(solicitudesEmpresa.estado, "pendiente"), inArray(solicitudesEmpresa.tipo, TIPOS_CORRECCION)));
    c["/admin/empresas"] = Number(emp?.n ?? 0);
    c["/admin/solicitudes"] = Number(cor?.n ?? 0);
  }
  // Propuestas enviadas que esperan asignación (coordinador o asesor directo). Las que ya tienen una solicitud de
  // asesoría pendiente esperan al asesor, no a la administración.
  const [prop] = await db
    .select({ n: count() })
    .from(propuestas)
    .innerJoin(usuarios, eq(usuarios.id, propuestas.egresadoId))
    .where(
      and(
        eq(propuestas.estado, "enviada"),
        a.superadmin ? undefined : eq(usuarios.facultadId, a.facultadId!),
        sql`not exists (select 1 from solicitudes_asesor s where s.propuesta_id = ${propuestas.id} and s.estado in ('pendiente', 'aceptada'))`,
      ),
    );
  c["/admin/propuestas"] = Number(prop?.n ?? 0);
  return c;
}
