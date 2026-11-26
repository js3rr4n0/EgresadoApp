"use server";

import { db } from "@/lib/db";
import { empresas, supervisores, firmantes, organigramasEmpresa, sucursales, propuestas, solicitudesEmpresa, historialEmpresas } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { camposCambiados, type CambioEmpresa } from "@/lib/bitacoraEmpresa";

export type SupervisorData = {
  id?: number;
  sucursalId?: number | null;
  titulo?: string;
  especialidad?: string;
  nombres: string;
  apellidos: string;
  cargo?: string;
  telefono?: string;
  correo?: string;
};

export type SucursalData = {
  id?: number;
  nombre: string;
  direccion?: string;
  telefono?: string;
  mapaUrl?: string;
  descripcion?: string;
  antecedentes?: string;
};

export type FirmanteData = {
  id?: number;
  sucursalId?: number | null;
  titulo?: string;
  nombres: string;
  apellidos: string;
  cargo?: string;
  telefono?: string;
  correo?: string;
  firmaUrl?: string;
};

export type OrganigramaData = {
  id?: number;
  url: string;
  subidoEn?: Date | string | null;
};

export type EmpresaData = {
  nombre: string;
  area?: string;
  descripcion?: string;
  antecedentes?: string;
  direccion?: string;
  organigramaUrl?: string;
  mapaUrl?: string;
  supervisores: SupervisorData[];
  firmantes: FirmanteData[];
  organigramas: OrganigramaData[];
  sucursales: SucursalData[];
};

export async function getEmpresas() {
  try {
    const data = await db.select().from(empresas).orderBy(desc(empresas.id));
    const sups = await db.select().from(supervisores);
    const firms = await db.select().from(firmantes);
    const orgs = await db.select().from(organigramasEmpresa).orderBy(desc(organigramasEmpresa.id));
    const sucs = await db.select().from(sucursales).orderBy(desc(sucursales.id));
    
    const nestedData = await Promise.all(data.map(async (emp) => {
      const cleanNombre = emp.nombre ? emp.nombre.replace(/(\s*\((Matriz|Sucursal[^)]*)\))+$/gi, "").trim() : emp.nombre;
      if (cleanNombre !== emp.nombre) {
        await db.update(empresas).set({ nombre: cleanNombre }).where(eq(empresas.id, emp.id));
      }
      return {
        ...emp,
        nombre: cleanNombre,
        supervisores: sups.filter(s => s.empresaId === emp.id),
        firmantes: firms.filter(f => f.empresaId === emp.id),
        organigramas: orgs.filter(o => o.empresaId === emp.id),
        sucursales: sucs.filter(s => s.empresaId === emp.id)
      };
    }));

    return { success: true, data: nestedData };
  } catch (error) {
    return { success: false, error: "Error al cargar las empresas" };
  }
}

export async function createEmpresa(data: EmpresaData) {
  try {
    const { supervisores: sups, firmantes: firms, organigramas: orgs, sucursales: sucs, ...empresaFields } = data;

    // Validate Supervisores
    if (sups && sups.length > 0) {
      for (const s of sups) {
        if (!s.nombres || !s.nombres.trim() || !s.apellidos || !s.apellidos.trim()) {
          return { success: false, error: "Todos los supervisores deben incluir nombres y apellidos válidos." };
        }
      }
    }

    // 1. Insert Empresa
    const [nuevaEmpresa] = await db.insert(empresas).values({
      ...empresaFields,
      verificada: true,
      habilitada: true,
    }).returning({ id: empresas.id });

    // 2. Insert Supervisores
    if (sups && sups.length > 0) {
      const supsToInsert = sups.map(s => ({
        ...s,
        nombres: s.nombres.trim(),
        apellidos: s.apellidos.trim(),
        empresaId: nuevaEmpresa.id,
      }));
      await db.insert(supervisores).values(supsToInsert);
    }

    // 3. Insert Firmantes
    if (firms && firms.length > 0) {
      const firmsToInsert = firms.map(f => ({
        ...f,
        empresaId: nuevaEmpresa.id,
      }));
      await db.insert(firmantes).values(firmsToInsert);
    }

    // 4. Insert Organigramas
    if (orgs && orgs.length > 0) {
      const orgsToInsert = orgs.map(o => ({
        url: o.url,
        empresaId: nuevaEmpresa.id,
      }));
      await db.insert(organigramasEmpresa).values(orgsToInsert);
    }

    // 5. Insert Sucursales
    if (sucs && sucs.length > 0) {
      const sucsToInsert = sucs.map(s => ({
        ...s,
        empresaId: nuevaEmpresa.id,
      }));
      await db.insert(sucursales).values(sucsToInsert);
    }

    revalidatePath("/admin/empresas");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateEmpresa(id: number, data: EmpresaData) {
  try {
    const { supervisores: sups, firmantes: firms, organigramas: orgs, sucursales: sucs, ...empresaFields } = data;

    // Validate Supervisores
    if (sups && sups.length > 0) {
      for (const s of sups) {
        if (!s.nombres || !s.nombres.trim() || !s.apellidos || !s.apellidos.trim()) {
          return { success: false, error: "Todos los supervisores deben incluir nombres y apellidos válidos." };
        }
      }
    }

    // Bitácora (entrega V2): foto de antes para saber qué campos cambió el administrador
    const [antes] = await db.select().from(empresas).where(eq(empresas.id, id));
    const [supsAntes, firmsAntes, sucsAntes, orgsAntes] = await Promise.all([
      db.select().from(supervisores).where(eq(supervisores.empresaId, id)),
      db.select().from(firmantes).where(eq(firmantes.empresaId, id)),
      db.select().from(sucursales).where(eq(sucursales.empresaId, id)),
      db.select({ id: organigramasEmpresa.id }).from(organigramasEmpresa).where(eq(organigramasEmpresa.empresaId, id)),
    ]);

    // 1. Update Empresa
    await db.update(empresas).set({
      ...empresaFields,
      actualizadaEn: new Date(),
    }).where(eq(empresas.id, id));

    if (antes) {
      const huella = (lista: Record<string, unknown>[], claves: string[]) =>
        JSON.stringify(
          lista
            .map((x) => claves.map((k) => (x[k] == null ? "" : String(x[k]).trim())))
            .sort((a, b) => a.join("|").localeCompare(b.join("|")))
        );
      const clavesPersona = ["titulo", "nombres", "apellidos", "cargo", "telefono", "correo", "sucursalId"];
      const campos = camposCambiados(antes, empresaFields, ["nombre", "area", "descripcion", "antecedentes", "direccion", "mapaUrl"]);
      if (huella(supsAntes, [...clavesPersona, "especialidad"]) !== huella((sups ?? []) as Record<string, unknown>[], [...clavesPersona, "especialidad"])) campos.push("supervisores");
      if (huella(firmsAntes, [...clavesPersona, "firmaUrl"]) !== huella((firms ?? []) as Record<string, unknown>[], [...clavesPersona, "firmaUrl"])) campos.push("firmantes");
      if (sucs && huella(sucsAntes, ["nombre", "direccion", "telefono", "mapaUrl"]) !== huella(sucs as Record<string, unknown>[], ["nombre", "direccion", "telefono", "mapaUrl"])) campos.push("sucursales");
      if ((orgs ?? []).some((o) => !o.id) || (orgs ?? []).length !== orgsAntes.length) campos.push("organigramas");
      if (campos.length > 0) {
        const session = await getSession();
        const cambio: CambioEmpresa = { type: "edicion", campos };
        await db.insert(historialEmpresas).values({ empresaId: id, adminId: session?.userId ?? null, cambios: cambio });
      }
    }

    // 2. Upsert Supervisores
    if (sups && sups.length > 0) {
      const keepIds = sups.filter(s => s.id).map(s => s.id as number);
      
      const existingSups = await db.select({ id: supervisores.id }).from(supervisores).where(eq(supervisores.empresaId, id));
      const existingIds = existingSups.map(s => s.id);
      
      const toDelete = existingIds.filter(eid => !keepIds.includes(eid));
      if (toDelete.length > 0) {
        for (const delId of toDelete) {
          await db.delete(supervisores).where(eq(supervisores.id, delId));
        }
      }

      for (const s of sups) {
        if (s.id) {
          await db.update(supervisores).set({ ...s, nombres: s.nombres.trim(), apellidos: s.apellidos.trim(), actualizadoEn: new Date() }).where(eq(supervisores.id, s.id));
        } else {
          await db.insert(supervisores).values({ ...s, nombres: s.nombres.trim(), apellidos: s.apellidos.trim(), empresaId: id });
        }
      }
    } else {
      await db.delete(supervisores).where(eq(supervisores.empresaId, id));
    }

    // 3. Upsert Firmantes
    if (firms && firms.length > 0) {
      const keepIds = firms.filter(f => f.id).map(f => f.id as number);
      
      const existingFirms = await db.select({ id: firmantes.id }).from(firmantes).where(eq(firmantes.empresaId, id));
      const existingIds = existingFirms.map(f => f.id);
      
      const toDelete = existingIds.filter(eid => !keepIds.includes(eid));
      if (toDelete.length > 0) {
        for (const delId of toDelete) {
          await db.delete(firmantes).where(eq(firmantes.id, delId));
        }
      }

      for (const f of firms) {
        if (f.id) {
          await db.update(firmantes).set({ ...f, actualizadoEn: new Date() }).where(eq(firmantes.id, f.id));
        } else {
          await db.insert(firmantes).values({ ...f, empresaId: id });
        }
      }
    } else {
      await db.delete(firmantes).where(eq(firmantes.empresaId, id));
    }

    // 4. Insert New Organigramas (We keep history, so only insert ones without ID)
    if (orgs && orgs.length > 0) {
      const newOrgs = orgs.filter(o => !o.id).map(o => ({
        url: o.url,
        empresaId: id,
      }));
      if (newOrgs.length > 0) {
        await db.insert(organigramasEmpresa).values(newOrgs);
      }
    }

    // 5. Upsert Sucursales
    if (sucs && sucs.length > 0) {
      const keepIds = sucs.filter(s => s.id).map(s => s.id as number);
      
      const existingSucs = await db.select({ id: sucursales.id }).from(sucursales).where(eq(sucursales.empresaId, id));
      const existingIds = existingSucs.map(s => s.id);
      
      const toDelete = existingIds.filter(eid => !keepIds.includes(eid));
      if (toDelete.length > 0) {
        for (const delId of toDelete) {
          await db.delete(sucursales).where(eq(sucursales.id, delId));
        }
      }

      for (const s of sucs) {
        if (s.id) {
          await db.update(sucursales).set({ ...s }).where(eq(sucursales.id, s.id));
        } else {
          await db.insert(sucursales).values({ ...s, empresaId: id });
        }
      }
    } else {
      await db.delete(sucursales).where(eq(sucursales.empresaId, id));
    }

    revalidatePath("/admin/empresas");
    return { success: true };
  } catch (error: any) {
    if (error.code === '23503') {
      return { success: false, error: "No se puede eliminar un supervisor porque ya está asignado a un Tema de Grado (Propuesta)." };
    }
    return { success: false, error: error.message };
  }
}

// Habilitar o deshabilitar pide motivo y queda en la bitácora: cambiarEstadoEmpresa en actions/estadoEmpresa.ts (V2).

export async function updateSucursalesSolo(empresaId: number, sucs: SucursalData[]) {
  try {
    if (sucs && sucs.length > 0) {
      const keepIds = sucs.filter(s => s.id).map(s => s.id as number);
      
      const existingSucs = await db.select({ id: sucursales.id }).from(sucursales).where(eq(sucursales.empresaId, empresaId));
      const existingIds = existingSucs.map(s => s.id);
      
      const toDelete = existingIds.filter(eid => !keepIds.includes(eid));
      if (toDelete.length > 0) {
        for (const delId of toDelete) {
          await db.delete(sucursales).where(eq(sucursales.id, delId));
        }
      }

      for (const s of sucs) {
        if (s.id) {
          await db.update(sucursales).set({ ...s }).where(eq(sucursales.id, s.id));
        } else {
          await db.insert(sucursales).values({ ...s, empresaId });
        }
      }
    } else {
      await db.delete(sucursales).where(eq(sucursales.empresaId, empresaId));
    }
    revalidatePath("/admin/empresas");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteEmpresa(id: number) {
  try {
    // 1. Verificar si existen propuestas de egresados vinculadas a esta empresa
    const propuestasVinculadas = await db
      .select({ id: propuestas.id })
      .from(propuestas)
      .where(eq(propuestas.empresaId, id));

    if (propuestasVinculadas.length > 0) {
      return {
        success: false,
        error: `No se puede eliminar la empresa porque está vinculada a ${propuestasVinculadas.length} propuesta(s) de Trabajo de Graduación de estudiantes.`
      };
    }

    // 2. Limpiar registros hijos asociados (solicitudes, supervisores, firmantes, organigramas, historial y sucursales)
    await db.delete(solicitudesEmpresa).where(eq(solicitudesEmpresa.empresaId, id));
    await db.delete(supervisores).where(eq(supervisores.empresaId, id));
    await db.delete(firmantes).where(eq(firmantes.empresaId, id));
    await db.delete(organigramasEmpresa).where(eq(organigramasEmpresa.empresaId, id));
    await db.delete(historialEmpresas).where(eq(historialEmpresas.empresaId, id));
    await db.delete(sucursales).where(eq(sucursales.empresaId, id));

    // 3. Eliminar la empresa
    await db.delete(empresas).where(eq(empresas.id, id));

    revalidatePath("/admin/empresas");
    return { success: true };
  } catch (error: any) {
    console.error("Error al eliminar empresa:", error);
    if (error?.code === '23503' || error?.message?.includes('delete from "empresas"')) {
      return {
        success: false,
        error: "No se puede eliminar la empresa porque existen registros o propuestas académicas vinculadas a ella."
      };
    }
    return { success: false, error: error?.message || "Ocurrió un error al eliminar la empresa." };
  }
}
