"use server";

import { db } from "@/lib/db";
import { usuarios, carreras, facultades } from "@/lib/schema";
import { inArray, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function validateAndInsertCsv(entidad: string, rawData: any[], dryRun: boolean = false) {
  try {
    let errores: string[] = [];
    let validData: any[] = [];
    
    // Clean data (trim strings) to avoid whitespace mismatches
    rawData.forEach(row => {
      Object.keys(row).forEach(k => {
        if (typeof row[k] === 'string') {
          row[k] = row[k].trim();
        }
      });
    });

    // Check internal duplicates within the CSV itself
    const checkInternalDuplicates = (key: string, fieldName: string) => {
      const seen = new Set();
      rawData.forEach((row, i) => {
        const val = typeof row[key] === 'string' ? row[key].trim() : row[key];
        if (val) {
          if (seen.has(val)) {
            errores.push(`Fila ${i + 1}: Duplicado interno: La clave "${val}" ya existe en filas anteriores del archivo.`);
          } else {
            seen.add(val);
          }
        }
      });
    };

    if (entidad === "facultades") {
      // Expected: nombre, codigo, activa
      checkInternalDuplicates("codigo", "Código");
      checkInternalDuplicates("nombre", "Nombre");

      // Check DB duplicates
      const existingF = await db.select({ codigo: facultades.codigo, nombre: facultades.nombre }).from(facultades);
      const existingCodigos = new Set(existingF.map(f => f.codigo));
      const existingNombres = new Set(existingF.map(f => f.nombre));

      rawData.forEach((row, i) => {
        const fila = i + 1;
        if (!row.nombre) errores.push(`Fila ${fila}: 'nombre' es requerido.`);
        if (!row.codigo) errores.push(`Fila ${fila}: 'codigo' es requerido.`);
        if (existingCodigos.has(row.codigo)) errores.push(`Fila ${fila}: Duplicado DB: El código "${row.codigo}" ya existe en la base de datos.`);
        if (existingNombres.has(row.nombre)) errores.push(`Fila ${fila}: Duplicado DB: El nombre "${row.nombre}" ya existe en la base de datos.`);
        
        validData.push({
          nombre: row.nombre,
          codigo: row.codigo,
          activo: row.activa === "true" || row.activa === "1" || row.activa === true,
        });
      });

      if (errores.length === 0 && validData.length > 0 && !dryRun) {
        await db.insert(facultades).values(validData);
      }

    } else if (entidad === "carreras") {
      // Expected: nombre, codigo, facultad_id, activa
      checkInternalDuplicates("codigo", "Código");
      checkInternalDuplicates("nombre", "Nombre");

      const existingC = await db.select({ codigo: carreras.codigo, nombre: carreras.nombre }).from(carreras);
      const existingCodigos = new Set(existingC.map(c => c.codigo));
      const existingNombres = new Set(existingC.map(c => c.nombre));
      
      const allFacultades = await db.select({ id: facultades.id }).from(facultades);
      const validFacultadIds = new Set(allFacultades.map(f => f.id));

      rawData.forEach((row, i) => {
        const fila = i + 1;
        if (!row.nombre) errores.push(`Fila ${fila}: 'nombre' es requerido.`);
        if (!row.codigo) errores.push(`Fila ${fila}: 'codigo' es requerido.`);
        if (!row.facultad_id) errores.push(`Fila ${fila}: 'facultad_id' es requerido.`);
        
        const fId = parseInt(row.facultad_id);
        if (isNaN(fId) || !validFacultadIds.has(fId)) {
          errores.push(`Fila ${fila}: 'facultad_id' "${row.facultad_id}" no existe en la BD.`);
        }

        if (existingCodigos.has(row.codigo)) errores.push(`Fila ${fila}: Duplicado DB: El código "${row.codigo}" ya existe en la base de datos.`);
        if (existingNombres.has(row.nombre)) errores.push(`Fila ${fila}: Duplicado DB: El nombre "${row.nombre}" ya existe en la base de datos.`);
        
        validData.push({
          nombre: row.nombre,
          codigo: row.codigo,
          facultadId: fId,
          activo: row.activa === "true" || row.activa === "1" || row.activa === true,
        });
      });

      if (errores.length === 0 && validData.length > 0 && !dryRun) {
        await db.insert(carreras).values(validData);
      }

    } else if (entidad === "usuarios") {
      // Expected: nombre_completo, correo, rol, carnet, carrera_id, facultad_id, activo
      checkInternalDuplicates("correo", "Correo");
      checkInternalDuplicates("carnet", "Carnet");

      const existingU = await db.select({ correo: usuarios.correo, carnet: usuarios.carnet }).from(usuarios);
      const existingCorreos = new Set(existingU.map(u => u.correo));
      const existingCarnets = new Set(existingU.map(u => u.carnet).filter(Boolean));

      const allFacultades = await db.select({ id: facultades.id }).from(facultades);
      const validFacultadIds = new Set(allFacultades.map(f => f.id));
      const allCarreras = await db.select({ id: carreras.id }).from(carreras);
      const validCarreraIds = new Set(allCarreras.map(c => c.id));

      const validRoles = new Set(['admin', 'decanato', 'asesor', 'egresado']);

      // Generate a default hash for all inserted users to keep it fast
      const defaultPasswordHash = dryRun ? "" : await bcrypt.hash("Egresado123!", 10);

      rawData.forEach((row, i) => {
        const fila = i + 1;
        if (!row.nombre_completo) errores.push(`Fila ${fila}: 'nombre_completo' es requerido.`);
        if (!row.correo) errores.push(`Fila ${fila}: 'correo' es requerido.`);
        if (!row.rol) errores.push(`Fila ${fila}: 'rol' es requerido.`);
        
        if (row.rol && !validRoles.has(row.rol)) {
          errores.push(`Fila ${fila}: 'rol' "${row.rol}" es inválido. Opciones: admin, decanato, asesor, egresado.`);
        }

        if (existingCorreos.has(row.correo)) {
          errores.push(`Fila ${fila}: Duplicado DB: El correo "${row.correo}" ya existe en la base de datos.`);
        }
        if (row.carnet && existingCarnets.has(row.carnet)) {
          errores.push(`Fila ${fila}: Duplicado DB: El carnet "${row.carnet}" ya existe en la base de datos.`);
        }

        let fId = row.facultad_id ? parseInt(row.facultad_id) : null;
        let cId = row.carrera_id ? parseInt(row.carrera_id) : null;

        if (fId && !validFacultadIds.has(fId)) errores.push(`Fila ${fila}: 'facultad_id' "${row.facultad_id}" no existe.`);
        if (cId && !validCarreraIds.has(cId)) errores.push(`Fila ${fila}: 'carrera_id' "${row.carrera_id}" no existe.`);

        validData.push({
          nombreCompleto: row.nombre_completo,
          correo: row.correo,
          passwordHash: defaultPasswordHash, 
          rol: row.rol,
          carnet: row.carnet || null,
          carreraId: cId,
          facultadId: fId,
          activo: row.activo !== "false" && row.activo !== "0" && row.activo !== false,
          carrerasAsignadas: row.carreras_asignadas ? JSON.parse(row.carreras_asignadas) : null,
        });
      });

      if (errores.length === 0 && validData.length > 0 && !dryRun) {
        const chunkSize = 1000;
        for (let i = 0; i < validData.length; i += chunkSize) {
          const chunk = validData.slice(i, i + chunkSize);
          await db.insert(usuarios).values(chunk);
        }
      }
    }

    if (errores.length > 0) {
      return { success: false, errors: errores };
    }

    if (!dryRun) {
      revalidatePath("/admin/usuarios");
      revalidatePath("/admin/facultades");
    }
    return { success: true };

  } catch (error: any) {
    console.error("CSV Validation Error:", error);
    return { success: false, errors: ["Ocurrió un error inesperado al procesar la información: " + error.message] };
  }
}
