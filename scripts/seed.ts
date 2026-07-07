/**
 * db:seed — Inserta datos de prueba según specs/PLAN.md
 *
 * Seed mínimo:
 * - 1 facultad, 2 carreras
 * - 4 usuarios (1 por rol) con credenciales de TESTING.md
 * - 3 empresas con supervisores (2 habilitadas, 1 deshabilitada)
 * - 1 periodo activo
 */
import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { hash } from "bcryptjs";
import * as schema from "../src/lib/schema";

async function seed() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql, { schema });

  console.log("🌱 Seeding database...");

  // ── Facultad ──
  const [facultad] = await db
    .insert(schema.facultades)
    .values({ nombre: "Facultad de Ingeniería" })
    .returning();
  console.log(`  ✓ Facultad: ${facultad.nombre} (id=${facultad.id})`);

  // ── Carreras ──
  const [carrera1] = await db
    .insert(schema.carreras)
    .values({ facultadId: facultad.id, nombre: "Ingeniería en Sistemas" })
    .returning();
  const [carrera2] = await db
    .insert(schema.carreras)
    .values({ facultadId: facultad.id, nombre: "Ingeniería Industrial" })
    .returning();
  console.log(`  ✓ Carreras: ${carrera1.nombre}, ${carrera2.nombre}`);

  // ── Usuarios (4 roles) ──
  const passwordHash = await hash("Test123!", 10);

  const [admin] = await db
    .insert(schema.usuarios)
    .values({
      nombreCompleto: "Administrador del Sistema",
      correo: "admin@uni.test",
      passwordHash,
      rol: "admin",
      facultadId: facultad.id,
    })
    .returning();

  const [decanato] = await db
    .insert(schema.usuarios)
    .values({
      nombreCompleto: "Decano de Ingeniería",
      correo: "decanato@uni.test",
      passwordHash,
      rol: "decanato",
      facultadId: facultad.id,
      carrerasAsignadas: [carrera1.id, carrera2.id],
    })
    .returning();

  const [asesor] = await db
    .insert(schema.usuarios)
    .values({
      nombreCompleto: "Dr. Carlos Asesor",
      correo: "asesor@uni.test",
      passwordHash,
      rol: "asesor",
      facultadId: facultad.id,
      carrerasAsignadas: [carrera1.id],
    })
    .returning();

  const [egresado] = await db
    .insert(schema.usuarios)
    .values({
      nombreCompleto: "María López Egresada",
      correo: "egresado@uni.test",
      passwordHash,
      rol: "egresado",
      carnet: "20190001",
      carreraId: carrera1.id,
      facultadId: facultad.id,
    })
    .returning();

  console.log(
    `  ✓ Usuarios: admin(${admin.id}), decanato(${decanato.id}), asesor(${asesor.id}), egresado(${egresado.id})`
  );

  // ── Empresas (2 habilitadas + 1 deshabilitada) ──
  const [empresa1] = await db
    .insert(schema.empresas)
    .values({
      nombre: "TechCorp Honduras",
      area: "Tecnología",
      descripcion: "Empresa de desarrollo de software",
      antecedentes: "Fundada en 2010, con presencia en Centroamérica.",
      habilitada: true,
      verificada: true,
    })
    .returning();

  const [empresa2] = await db
    .insert(schema.empresas)
    .values({
      nombre: "Industrias del Norte S.A.",
      area: "Manufactura",
      descripcion: "Empresa de manufactura industrial",
      antecedentes: "Líder en producción industrial desde 1995.",
      habilitada: true,
      verificada: true,
    })
    .returning();

  const [empresa3] = await db
    .insert(schema.empresas)
    .values({
      nombre: "Servicios Inactivos Ltda.",
      area: "Consultoría",
      descripcion: "Empresa en proceso de verificación",
      habilitada: false,
      verificada: false,
    })
    .returning();

  console.log(
    `  ✓ Empresas: ${empresa1.nombre}(hab), ${empresa2.nombre}(hab), ${empresa3.nombre}(deshab)`
  );

  // ── Supervisores (1 por empresa habilitada) ──
  const [sup1] = await db
    .insert(schema.supervisores)
    .values({
      empresaId: empresa1.id,
      titulo: "Ing.",
      especialidad: "Ingeniería en Sistemas",
      nombres: "Roberto",
      apellidos: "Martínez",
      cargo: "Gerente de Tecnología",
      telefono: "+504 9999-0001",
      correo: "rmartinez@techcorp.hn",
    })
    .returning();

  const [sup2] = await db
    .insert(schema.supervisores)
    .values({
      empresaId: empresa2.id,
      titulo: "Ing.",
      especialidad: "Ingeniería Industrial",
      nombres: "Ana",
      apellidos: "García",
      cargo: "Directora de Operaciones",
      telefono: "+504 9999-0002",
      correo: "agarcia@industrias.hn",
    })
    .returning();

  const [sup3] = await db
    .insert(schema.supervisores)
    .values({
      empresaId: empresa1.id,
      titulo: "Lic.",
      especialidad: "Ingeniería en Sistemas",
      nombres: "Pedro",
      apellidos: "Hernández",
      cargo: "Lead Developer",
      telefono: "+504 9999-0003",
      correo: "phernandez@techcorp.hn",
    })
    .returning();

  console.log(
    `  ✓ Supervisores: ${sup1.nombres} ${sup1.apellidos}, ${sup2.nombres} ${sup2.apellidos}, ${sup3.nombres} ${sup3.apellidos}`
  );

  // ── Periodo activo ──
  // Utilidad simple para calcular las otras fechas en el seeder
  const addDays = (d: string, days: number) => {
    const date = new Date(d);
    date.setDate(date.getDate() + days);
    return date.toISOString().split("T")[0];
  };

  const finRec = "2026-12-31";
  const [periodo] = await db
    .insert(schema.periodos)
    .values({
      nombre: "Ciclo Seed 2026",
      inicioRecepcion: "2026-07-01",
      finRecepcion: finRec,
      maxAprobacionPropuesta: addDays(finRec, 21),
      maxInicioProceso: addDays(finRec, 21),
      maxPrimerInforme: addDays(addDays(finRec, 21), 30),
      maxSegundoInforme: addDays(addDays(finRec, 21), 60),
      maxTercerInforme: addDays(addDays(finRec, 21), 90),
      maxCuartoInforme: addDays(addDays(finRec, 21), 120),
      visitaAsesorInicio: addDays(addDays(finRec, 21), 90),
      visitaAsesorFin: addDays(addDays(finRec, 21), 100),
      maxInformeFinal: addDays(addDays(finRec, 21), 150),
      maxAprobacionFinal: addDays(addDays(finRec, 21), 165),
      activo: true,
    })
    .returning();

  console.log(`  ✓ Periodo activo: ${periodo.nombre} (${periodo.inicioRecepcion} → ${periodo.finRecepcion})`);

  console.log("\n✅ Seed completo.");
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
