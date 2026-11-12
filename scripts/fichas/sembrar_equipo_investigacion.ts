// Datos de prueba de la entrega I2 (solo base de desarrollo): una cohorte con la recepción abierta y tres egresados de
// la Facultad de Ingeniería, sin propuesta, para probar la ficha de investigación en equipo. El segundo integrante es de
// otra carrera: en investigación el equipo puede ser de distintas carreras (contexto del 12-nov-2026).
//
//   Cohorte: PRUEBA-INV-2026 (copia las fechas de C2-2026; recepción abierta hasta el 15-dic-2026)
//   Egresados (contraseña de demostración, la misma del egresado plantilla 40):
//     inv.lider@prueba.test        — Ingeniería en Sistemas; crea la propuesta y es el líder (le toca INV-ING-001)
//     inv.integrante1@prueba.test  — Ingeniería en Sistemas
//     inv.integrante2@prueba.test  — Ingeniería en desarrollo de software
//   Cada uno recibe los 3 documentos del egresado plantilla (servicio social, notas y pago).
//
// Se puede ejecutar más de una vez: no duplica nada. Con --borrar elimina todo lo que crea (y sus propuestas).
// Con --aprobar deja la propuesta enviada del líder como aprobada (atajo para probar el protocolo, I3).
// Uso: npx tsx --env-file=.env.local scripts/fichas/sembrar_equipo_investigacion.ts [--borrar | --aprobar]
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../src/lib/db";
import { historialEstados, periodos, propuestas, usuarios } from "../../src/lib/schema";
import { exigirBaseDesarrollo } from "./guardia";

const COHORTE = "PRUEBA-INV-2026";
const COPIA_DE = "C2-2026";
const PLANTILLA_ID = 40;
const EGRESADOS = [
  { correo: "inv.lider@prueba.test", nombre: "Prueba Investigación Líder", carnet: "INV-0001", carreraId: 1 },
  { correo: "inv.integrante1@prueba.test", nombre: "Prueba Investigación Integrante Uno", carnet: "INV-0002", carreraId: 1 },
  { correo: "inv.integrante2@prueba.test", nombre: "Prueba Investigación Integrante Dos", carnet: "INV-0003", carreraId: 9 },
];

const lista = (ids: number[]) => sql.join(ids.map((i) => sql`${i}`), sql`, `);

async function borrar() {
  const ids = (await db.select({ id: usuarios.id }).from(usuarios).where(inArray(usuarios.correo, EGRESADOS.map((e) => e.correo)))).map((u) => u.id);
  if (ids.length > 0) {
    await db.delete(propuestas).where(inArray(propuestas.egresadoId, ids));
    await db.execute(sql`DELETE FROM integrantes_proyecto WHERE egresado_id IN (${lista(ids)})`);
    await db.execute(sql`DELETE FROM documentos_egresado WHERE egresado_id IN (${lista(ids)})`);
    await db.execute(sql`DELETE FROM notificaciones WHERE usuario_id IN (${lista(ids)})`);
    await db.delete(usuarios).where(inArray(usuarios.id, ids));
  }
  await db.delete(periodos).where(eq(periodos.nombre, COHORTE));
  console.log(`Borrados ${ids.length} egresados de prueba y la cohorte ${COHORTE}.`);
}

async function sembrar() {
  let [cohorte] = await db.select().from(periodos).where(eq(periodos.nombre, COHORTE));
  if (!cohorte) {
    const [base] = await db.select().from(periodos).where(eq(periodos.nombre, COPIA_DE));
    if (!base) throw new Error(`No existe la cohorte ${COPIA_DE} para copiar sus fechas.`);
    const { id: _id, ...fechas } = base;
    [cohorte] = await db
      .insert(periodos)
      .values({ ...fechas, nombre: COHORTE, inicioRecepcion: "2026-11-01", finRecepcion: "2026-12-15", activo: true })
      .returning();
    console.log(`Cohorte ${COHORTE} creada (id ${cohorte.id}).`);
  }

  const [plantilla] = await db.select({ passwordHash: usuarios.passwordHash }).from(usuarios).where(eq(usuarios.id, PLANTILLA_ID));
  if (!plantilla) throw new Error(`No existe el egresado plantilla ${PLANTILLA_ID}.`);

  for (const e of EGRESADOS) {
    let [u] = await db.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.correo, e.correo));
    if (!u) {
      [u] = await db
        .insert(usuarios)
        .values({ nombreCompleto: e.nombre, correo: e.correo, passwordHash: plantilla.passwordHash, rol: "egresado", carnet: e.carnet, carreraId: e.carreraId, facultadId: 1, cohorte: COHORTE })
        .returning({ id: usuarios.id });
      await db.execute(sql`
        INSERT INTO documentos_egresado (egresado_id, tipo, archivo_url, subido_en)
        SELECT ${u.id}, tipo, archivo_url, now() FROM documentos_egresado WHERE egresado_id = ${PLANTILLA_ID}`);
      console.log(`Egresado ${e.correo} creado (id ${u.id}).`);
    } else {
      console.log(`Egresado ${e.correo} ya existe (id ${u.id}).`);
    }
  }
}

/** Atajo de prueba (I3): deja la propuesta enviada del líder como aprobada, con el coordinador y el asesor de demostración. */
async function aprobar() {
  const [lider] = await db.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.correo, EGRESADOS[0].correo));
  const [asesor] = await db.select({ id: usuarios.id }).from(usuarios).where(sql`lower(${usuarios.correo}) = 'marco.solis@catolica.edu.sv'`);
  const [coord] = await db.select({ id: usuarios.id }).from(usuarios).where(sql`lower(${usuarios.correo}) = 'jose.luis@uni.test'`);
  if (!lider || !asesor || !coord) throw new Error("Faltan el líder de prueba, el asesor o el coordinador de demostración.");
  const [prop] = await db.select().from(propuestas).where(and(eq(propuestas.egresadoId, lider.id), eq(propuestas.tipo, "investigacion")));
  if (!prop) throw new Error("El líder de prueba no tiene propuesta de investigación.");
  if (prop.estado === "aprobada") return console.log(`La propuesta ${prop.id} ya está aprobada.`);
  if (prop.estado !== "enviada") throw new Error(`La propuesta ${prop.id} está en "${prop.estado}"; se espera "enviada".`);
  await db.update(propuestas).set({ estado: "aprobada", asesorId: asesor.id, coordinadorId: coord.id, fechaAprobacion: new Date() }).where(eq(propuestas.id, prop.id));
  await db.insert(historialEstados).values({ propuestaId: prop.id, de: prop.estado, a: "aprobada", usuarioId: asesor.id });
  console.log(`Propuesta ${prop.id} aprobada (asesor ${asesor.id}, coordinador ${coord.id}).`);
}

async function run() {
  exigirBaseDesarrollo("sembrar_equipo_investigacion");
  if (process.argv.includes("--borrar")) await borrar();
  else if (process.argv.includes("--aprobar")) await aprobar();
  else await sembrar();
}

run()
  .then(() => { process.exitCode = 0; })
  .catch((e) => { console.error(e); process.exitCode = 1; });
