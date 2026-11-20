"use server";

import { db } from "@/lib/db";
import { usuarios, carreras, facultades, periodos } from "@/lib/schema";
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
      // Expected: nombre, codigo, facultad_codigo, activa
      checkInternalDuplicates("codigo", "Código");
      checkInternalDuplicates("nombre", "Nombre");

      const existingC = await db.select({ codigo: carreras.codigo, nombre: carreras.nombre }).from(carreras);
      const existingCodigos = new Set(existingC.map(c => c.codigo));
      const existingNombres = new Set(existingC.map(c => c.nombre));
      
      const allFacultades = await db.select({ id: facultades.id, codigo: facultades.codigo }).from(facultades);
      const facMap = new Map();
      allFacultades.forEach(f => {
        if (f.codigo) facMap.set(f.codigo.toLowerCase(), f.id);
      });

      rawData.forEach((row, i) => {
        const fila = i + 1;
        if (!row.nombre) errores.push(`Fila ${fila}: 'nombre' es requerido.`);
        if (!row.codigo) errores.push(`Fila ${fila}: 'codigo' es requerido.`);
        if (!row.facultad_codigo) errores.push(`Fila ${fila}: 'facultad_codigo' es requerido.`);
        
        const fId = row.facultad_codigo ? facMap.get(row.facultad_codigo.toLowerCase()) : undefined;
        if (!fId) {
          errores.push(`Fila ${fila}: No existe ninguna Facultad con el código "${row.facultad_codigo}".`);
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
      // Expected: nombre_completo, correo, rol, carnet, carrera_codigo, facultad_codigo, activo, carreras_asignadas
      checkInternalDuplicates("correo", "Correo");
      checkInternalDuplicates("carnet", "Carnet");

      const existingU = await db.select({ correo: usuarios.correo, carnet: usuarios.carnet }).from(usuarios);
      const existingCorreos = new Set(existingU.map(u => u.correo));
      const existingCarnets = new Set(existingU.map(u => u.carnet).filter(Boolean));

      const allFacultades = await db.select({ id: facultades.id, codigo: facultades.codigo }).from(facultades);
      const facMap = new Map();
      allFacultades.forEach(f => {
        if (f.codigo) facMap.set(f.codigo.toLowerCase(), f.id);
      });

      const allCarreras = await db.select({ id: carreras.id, codigo: carreras.codigo }).from(carreras);
      const carMap = new Map();
      allCarreras.forEach(c => {
        if (c.codigo) carMap.set(c.codigo.toLowerCase(), c.id);
      });

      const validRoles = new Set(['admin', 'decanato', 'coordinador', 'asesor', 'egresado']);
      // La cohorte de un usuario es el nombre de un ciclo (Fechas y Periodos), igual que en el formulario de usuario.
      const ciclos = new Set((await db.select({ nombre: periodos.nombre }).from(periodos)).map((p) => p.nombre));
      const leerJson = (texto: string, campo: string, fila: number) => {
        try {
          return JSON.parse(texto);
        } catch {
          errores.push(`Fila ${fila}: '${campo}' no es una lista válida (por ejemplo: [1, 2] o [{"cohorte": "C1-2026", "activa": true}]).`);
          return null;
        }
      };

      // Generate a default hash for all inserted users to keep it fast
      const defaultPasswordHash = dryRun ? "" : await bcrypt.hash("Egresado123!", 10);

      rawData.forEach((row, i) => {
        const fila = i + 1;
        if (!row.nombre_completo) errores.push(`Fila ${fila}: 'nombre_completo' es requerido.`);
        if (!row.correo) errores.push(`Fila ${fila}: 'correo' es requerido.`);
        if (!row.rol) errores.push(`Fila ${fila}: 'rol' es requerido.`);
        
        if (row.rol && !validRoles.has(row.rol.toLowerCase())) {
          errores.push(`Fila ${fila}: 'rol' "${row.rol}" es inválido. Opciones: admin, decanato, coordinador, asesor, egresado.`);
        }

        if (existingCorreos.has(row.correo)) {
          errores.push(`Fila ${fila}: Duplicado DB: El correo "${row.correo}" ya existe en la base de datos.`);
        }
        if (row.carnet && existingCarnets.has(row.carnet)) {
          errores.push(`Fila ${fila}: Duplicado DB: El carnet "${row.carnet}" ya existe en la base de datos.`);
        }

        let fId = row.facultad_codigo ? facMap.get(row.facultad_codigo.toLowerCase()) : null;
        let cId = row.carrera_codigo ? carMap.get(row.carrera_codigo.toLowerCase()) : null;

        if (row.facultad_codigo && !fId) errores.push(`Fila ${fila}: No existe Facultad con código "${row.facultad_codigo}".`);
        if (row.carrera_codigo && !cId) errores.push(`Fila ${fila}: No existe Carrera con código "${row.carrera_codigo}".`);

        if (row.cohorte && !ciclos.has(row.cohorte)) {
          errores.push(`Fila ${fila}: No existe el ciclo "${row.cohorte}". La cohorte debe ser el nombre de un ciclo de Fechas y Periodos (por ejemplo: ${[...ciclos].slice(0, 3).join(", ")}).`);
        }
        if (row.rol?.toLowerCase() === "egresado" && !row.cohorte) errores.push(`Fila ${fila}: un egresado necesita su 'cohorte'.`);

        validData.push({
          nombreCompleto: row.nombre_completo,
          correo: row.correo,
          passwordHash: defaultPasswordHash, 
          rol: row.rol ? row.rol.toLowerCase() : null,
          carnet: row.carnet || null,
          cohorte: row.cohorte || null,
          carreraId: cId,
          facultadId: fId,
          activo: row.activo !== "false" && row.activo !== "0" && row.activo !== false,
          carrerasAsignadas: row.carreras_asignadas ? leerJson(row.carreras_asignadas, "carreras_asignadas", fila) : null,
          cohortesAsignadas: row.cohortes_asignadas ? leerJson(row.cohortes_asignadas, "cohortes_asignadas", fila) : null,
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
