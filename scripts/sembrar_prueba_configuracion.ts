// Entrega C4 (specs/CONFIGURACION_COHORTE.md): siembra en la base de DESARROLLO una cohorte de prueba con el ejemplo
// de las notas del 26-nov-2026, adaptado a las facultades activas, y una propuesta enviada por cada caso.
//
//   Ingeniería y Arquitectura   administrador propio · coordinador por carrera (el administrador cubre las carreras
//                               sin coordinador)
//   Ciencias de la Salud        administrador propio · coordinación general con 1 coordinador
//   Ciencias Empresariales      administración central · coordinación general con 2 coordinadores
//   Multidisciplinaria Ilobasco administración central · coordinación general con 2 coordinadores
//   Ciencias y Humanidades      administración central · sin coordinador (asesor directo)
//
// Usuarios de prueba: correos *.conf@uni.test con la contraseña de prueba del seed (TESTING.md). Se puede ejecutar
// más de una vez: borra y vuelve a crear solo la cohorte PRUEBA-CONF-2027 y los usuarios *.conf@uni.test.
// Uso: npx tsx --env-file=.env.local scripts/sembrar_prueba_configuracion.ts
import bcrypt from "bcryptjs";
import { and, eq, inArray, like } from "drizzle-orm";
import { db } from "../src/lib/db";
import { carreras, cohorteConfigBitacora, cohorteFacultades, cohorteParticipantes, facultades, periodos, propuestas, usuarios } from "../src/lib/schema";
import { validarConfig, type ConfigFacultad } from "../src/lib/configCohorte";
import { exigirBaseDesarrollo } from "./fichas/guardia";

const COHORTE = "PRUEBA-CONF-2027";
const DOMINIO = ".conf@uni.test";

async function run() {
  exigirBaseDesarrollo("sembrar_prueba_configuracion");

  // ── Limpieza de una corrida anterior (solo datos de esta prueba) ──
  const [previo] = await db.select({ id: periodos.id }).from(periodos).where(eq(periodos.nombre, COHORTE));
  if (previo) {
    await db.delete(propuestas).where(eq(propuestas.periodoId, previo.id));
    await db.delete(periodos).where(eq(periodos.id, previo.id)); // la configuración cae en cascada
  }
  await db.delete(usuarios).where(like(usuarios.correo, `%${DOMINIO}`));

  // ── Facultades y carreras ──
  const facs = await db.select().from(facultades).where(eq(facultades.activo, true));
  const fac = (texto: string) => {
    const f = facs.find((x) => x.nombre.includes(texto));
    if (!f) throw new Error(`No se encontró la facultad «${texto}»`);
    return f.id;
  };
  const listaCarreras = await db.select().from(carreras).where(eq(carreras.activo, true));
  const carrera = (nombre: string) => {
    const c = listaCarreras.find((x) => x.nombre === nombre);
    if (!c) throw new Error(`No se encontró la carrera «${nombre}»`);
    return c.id;
  };
  const primeraDe = (facultadId: number) => {
    const c = listaCarreras.find((x) => x.facultadId === facultadId);
    if (!c) throw new Error(`La facultad ${facultadId} no tiene carreras activas`);
    return c.id;
  };
  const ING = fac("Ingeniería"), SAL = fac("Salud"), EMP = fac("Empresariales"), ILO = fac("Ilobasco"), HUM = fac("Humanidades");

  // ── Cohorte (inicia en el futuro: los cambios no piden justificación) ──
  const [periodo] = await db
    .insert(periodos)
    .values({
      nombre: COHORTE,
      inicioRecepcion: "2027-03-01",
      finRecepcion: "2027-04-15",
      maxAprobacionPropuesta: "2027-05-06",
      maxInicioProceso: "2027-05-06",
      maxPrimerInforme: "2027-06-06",
      maxSegundoInforme: "2027-07-06",
      maxTercerInforme: "2027-08-06",
      maxCuartoInforme: "2027-09-06",
      visitaAsesorInicio: "2027-07-06",
      visitaAsesorFin: "2027-08-06",
      maxInformeFinal: "2027-10-06",
      maxAprobacionFinal: "2027-11-06",
      activo: true,
    })
    .returning({ id: periodos.id });

  // ── Usuarios de prueba ──
  const passwordHash = await bcrypt.hash("Test123!", 10);
  const crear = async (clave: string, nombre: string, rol: string, facultadId: number, carreraId: number | null = null) => {
    const [u] = await db
      .insert(usuarios)
      .values({ nombreCompleto: nombre, correo: `${clave}${DOMINIO}`, passwordHash, rol, facultadId, carreraId, activo: true, cohorte: rol === "egresado" ? COHORTE : null })
      .returning({ id: usuarios.id });
    return u.id;
  };
  const [adminIng] = await db.select({ id: usuarios.id }).from(usuarios).where(and(eq(usuarios.correo, "admin.ingenieria@uni.test"), eq(usuarios.rol, "decanato")));
  const adminIngId = adminIng?.id ?? (await crear("adm.ing", "Administración Ingeniería (prueba)", "decanato", ING));
  const adminSal = await crear("adm.salud", "Administración Salud (prueba)", "decanato", SAL);
  const [jose] = await db.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.correo, "Jose.luis@uni.test"));
  const [coordDemo] = await db.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.correo, "coord.demo@demo.test"));
  if (!jose || !coordDemo) throw new Error("Faltan los coordinadores de prueba Jose.luis@uni.test o coord.demo@demo.test");
  const [marco] = await db.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.correo, "Marco.solis@catolica.edu.sv"));
  const [mateo] = await db.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.correo, "mateo.rivas@edu.sv"));

  const coordSal = await crear("coord.salud", "Coordinación Salud (prueba)", "coordinador", SAL);
  const coordEmp1 = await crear("coord.emp1", "Coordinación Empresariales 1 (prueba)", "coordinador", EMP);
  const coordEmp2 = await crear("coord.emp2", "Coordinación Empresariales 2 (prueba)", "coordinador", EMP);
  const coordIlo1 = await crear("coord.ilo1", "Coordinación Ilobasco 1 (prueba)", "coordinador", ILO);
  const coordIlo2 = await crear("coord.ilo2", "Coordinación Ilobasco 2 (prueba)", "coordinador", ILO);
  const asesSal = await crear("ases.salud", "Asesoría Salud (prueba)", "asesor", SAL);
  const asesEmp = await crear("ases.emp", "Asesoría Empresariales (prueba)", "asesor", EMP);
  const asesIlo = await crear("ases.ilo", "Asesoría Ilobasco (prueba)", "asesor", ILO);
  const asesHum1 = await crear("ases.hum1", "Asesoría Humanidades 1 (prueba)", "asesor", HUM);
  const asesHum2 = await crear("ases.hum2", "Asesoría Humanidades 2 (prueba)", "asesor", HUM);

  // ── Configuración por facultad ──
  const SIS = carrera("Ingeniería en Sistemas Informáticos"), SOFT = carrera("Ingeniería en Desarrollo de Software"), CIVIL = carrera("Ingeniería Civil"), QUIM = carrera("Ingeniería Química");
  const p = (usuarioId: number, carrerasIds: number[] = []) => ({ usuarioId, carreras: carrerasIds, activo: true });
  const configs: [number, ConfigFacultad][] = [
    [ING, { administracion: "facultad", adminFacultadId: adminIngId, coordinacion: "por_carrera", adminCoordina: true,
      coordinadores: [p(jose.id, [SOFT]), p(coordDemo.id, [SIS, CIVIL])], asesores: [marco, mateo].filter(Boolean).map((x) => p(x!.id)) }],
    [SAL, { administracion: "facultad", adminFacultadId: adminSal, coordinacion: "general", adminCoordina: false, coordinadores: [p(coordSal)], asesores: [p(asesSal)] }],
    [EMP, { administracion: "central", adminFacultadId: null, coordinacion: "general", adminCoordina: false, coordinadores: [p(coordEmp1), p(coordEmp2)], asesores: [p(asesEmp)] }],
    [ILO, { administracion: "central", adminFacultadId: null, coordinacion: "general", adminCoordina: false, coordinadores: [p(coordIlo1), p(coordIlo2)], asesores: [p(asesIlo)] }],
    [HUM, { administracion: "central", adminFacultadId: null, coordinacion: "sin_coordinador", adminCoordina: false, coordinadores: [], asesores: [p(asesHum1), p(asesHum2)] }],
  ];
  const nombres = { usuario: (id: number) => `usuario ${id}`, carrera: (id: number) => listaCarreras.find((c) => c.id === id)?.nombre ?? `carrera ${id}` };
  for (const [facultadId, c] of configs) {
    const carrerasF = listaCarreras.filter((x) => x.facultadId === facultadId).map((x) => x.id);
    const { errores } = validarConfig(c, carrerasF, nombres);
    if (errores.length) throw new Error(`Configuración inválida para la facultad ${facultadId}: ${errores.join(" ")}`);
    await db.insert(cohorteFacultades).values({ periodoId: periodo.id, facultadId, administracion: c.administracion, adminFacultadId: c.adminFacultadId, coordinacion: c.coordinacion, adminCoordina: c.adminCoordina });
    for (const [funcion, lista] of [["coordinador", c.coordinadores], ["asesor", c.asesores]] as const) {
      for (const x of lista) await db.insert(cohorteParticipantes).values({ periodoId: periodo.id, facultadId, usuarioId: x.usuarioId, funcion, carreras: x.carreras, activo: true });
    }
    await db.insert(cohorteConfigBitacora).values({ periodoId: periodo.id, facultadId, cambios: ["Configuración sembrada por el script de prueba C4."] });
  }

  // ── Un egresado con una propuesta enviada por caso ──
  const casos: [string, string, number, number][] = [
    ["egr.ing.sis", "Egresado Ingeniería Sistemas (prueba)", ING, SIS], // por carrera: solo Coordinación Demo
    ["egr.ing.quim", "Egresado Ingeniería Química (prueba)", ING, QUIM], // por carrera sin coordinador: el administrador coordina
    ["egr.salud", "Egresado Salud (prueba)", SAL, primeraDe(SAL)], // general con 1 coordinador
    ["egr.emp", "Egresado Empresariales (prueba)", EMP, primeraDe(EMP)], // general con 2 coordinadores
    ["egr.ilo", "Egresado Ilobasco (prueba)", ILO, primeraDe(ILO)], // general con 2 coordinadores
    ["egr.hum", "Egresado Humanidades (prueba)", HUM, primeraDe(HUM)], // sin coordinador: asesor directo
  ];
  const creadas: string[] = [];
  for (const [clave, nombre, facultadId, carreraId] of casos) {
    const egresadoId = await crear(clave, nombre, "egresado", facultadId, carreraId);
    const [prop] = await db
      .insert(propuestas)
      .values({ egresadoId, periodoId: periodo.id, tipo: "pasantia", numero: 1, estado: "enviada", titulo: `PRUEBA CONF: ${nombre}`, enviadaEn: new Date() })
      .returning({ id: propuestas.id });
    creadas.push(`${prop.id} · ${nombre}`);
  }

  const total = await db.select({ id: usuarios.id }).from(usuarios).where(inArray(usuarios.correo, casos.map(([c]) => `${c}${DOMINIO}`)));
  console.log(`Cohorte ${COHORTE} (id ${periodo.id}) con ${configs.length} facultades configuradas y ${total.length} egresados.`);
  console.log("Propuestas enviadas:\n  " + creadas.join("\n  "));
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
