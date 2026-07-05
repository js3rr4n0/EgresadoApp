"use server";

import { db } from "@/lib/db";
import { usuarios, carreras, facultades, empresas, supervisores } from "@/lib/schema";
import { eq } from "drizzle-orm";
import Papa from "papaparse";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function processCsvImport(formData: FormData) {
  try {
    const file = formData.get("file-upload") as File;
    const entidad = formData.get("entidad") as string;

    if (!file || !entidad) {
      return { success: false, error: "Faltan datos obligatorios." };
    }

    const text = await file.text();
    
    // Configuración de PapaParse para CSVs
    const parseResult = Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
    });

    if (parseResult.errors.length > 0) {
      return { success: false, error: "El formato del archivo CSV es inválido." };
    }

    const data = parseResult.data as any[];
    const errores: { linea: number; motivo: string }[] = [];
    let procesadosExitosos = 0;

    // Procesamiento según la entidad
    switch (entidad) {
      case "facultades":
        // Formato esperado: facultad_nombre, carrera_nombre
        for (let i = 0; i < data.length; i++) {
          const row = data[i];
          const linea = i + 2; // +1 por base 0, +1 por el header

          if (!row.facultad_nombre || !row.carrera_nombre) {
            errores.push({ linea, motivo: "Faltan columnas requeridas (facultad_nombre, carrera_nombre)." });
            continue;
          }

          try {
            // Buscar o crear facultad
            let facResult = await db.select().from(facultades).where(eq(facultades.nombre, row.facultad_nombre)).limit(1);
            let facultadId;
            
            if (facResult.length > 0) {
              facultadId = facResult[0].id;
            } else {
              const insertFac = await db.insert(facultades).values({ nombre: row.facultad_nombre }).returning({ id: facultades.id });
              facultadId = insertFac[0].id;
            }

            // Crear carrera si no existe
            const carResult = await db.select().from(carreras).where(eq(carreras.nombre, row.carrera_nombre)).limit(1);
            if (carResult.length === 0) {
              await db.insert(carreras).values({
                nombre: row.carrera_nombre,
                facultadId: facultadId
              });
              procesadosExitosos++;
            } else {
              errores.push({ linea, motivo: "La carrera ya existe en el sistema." });
            }
          } catch (e: any) {
            errores.push({ linea, motivo: `Error de base de datos: ${e.message}` });
          }
        }
        break;

      case "usuarios":
        // Formato esperado: nombreCompleto, correo, rol, password, carnet, carrera_nombre
        for (let i = 0; i < data.length; i++) {
          const row = data[i];
          const linea = i + 2;

          if (!row.nombreCompleto || !row.correo || !row.rol || !row.password) {
            errores.push({ linea, motivo: "Faltan datos requeridos (nombreCompleto, correo, rol, password)." });
            continue;
          }

          const rolLower = row.rol.toLowerCase().trim();
          if (!['admin', 'decanato', 'asesor', 'egresado'].includes(rolLower)) {
            errores.push({ linea, motivo: "Rol inválido. Debe ser: admin, decanato, asesor o egresado." });
            continue;
          }

          if (rolLower === "egresado" && (!row.carnet || !row.carrera_nombre)) {
            errores.push({ linea, motivo: "Los egresados requieren carnet y carrera_nombre." });
            continue;
          }

          try {
            // Verificar si el correo ya existe
            const userExist = await db.select().from(usuarios).where(eq(usuarios.correo, row.correo)).limit(1);
            if (userExist.length > 0) {
              errores.push({ linea, motivo: "El correo electrónico ya está registrado." });
              continue;
            }

            let carreraId = null;
            let facultadId = null;

            if (rolLower === "egresado") {
              const carResult = await db.select().from(carreras).where(eq(carreras.nombre, row.carrera_nombre)).limit(1);
              if (carResult.length === 0) {
                errores.push({ linea, motivo: `No se encontró la carrera: ${row.carrera_nombre}` });
                continue;
              }
              carreraId = carResult[0].id;
              facultadId = carResult[0].facultadId;
            }

            const passwordHash = await bcrypt.hash(row.password, 10);

            await db.insert(usuarios).values({
              nombreCompleto: row.nombreCompleto,
              correo: row.correo,
              passwordHash,
              rol: rolLower,
              carnet: rolLower === "egresado" ? row.carnet : null,
              carreraId,
              facultadId,
              activo: true
            });
            procesadosExitosos++;

          } catch (e: any) {
            errores.push({ linea, motivo: `Error de inserción: ${e.message}` });
          }
        }
        break;

      default:
        return { success: false, error: "Entidad no implementada todavía para importación." };
    }

    revalidatePath("/admin/usuarios");
    revalidatePath("/admin/empresas");
    
    return {
      success: true,
      resultados: {
        exitosos: procesadosExitosos,
        errores: errores
      }
    };

  } catch (error: any) {
    console.error("CSV Import error:", error);
    return { success: false, error: "Error procesando el archivo CSV. Verifique el formato." };
  }
}
