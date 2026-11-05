// Datos de prueba de la entrega P2 (solo base de desarrollo): una cohorte con la recepción abierta y tres
// egresados de Ingeniería en Sistemas de esa cohorte, sin propuesta, para probar la ficha de proyecto en equipo.
//
//   Cohorte: PRUEBA-PRO-2026 (copia las fechas de C2-2026; recepción abierta hasta el 15-dic-2026)
//   Egresados (contraseña de demostración, la misma del egresado plantilla 40):
//     pro.lider@prueba.test        — crea la propuesta y es el líder
//     pro.integrante1@prueba.test  — integrante
//     pro.integrante2@prueba.test  — integrante
//   Cada uno recibe los 3 documentos del egresado plantilla (servicio social, notas y pago).
//
// Se puede ejecutar más de una vez: no duplica nada. Con --borrar elimina todo lo que crea (y sus propuestas).
// Uso: npx tsx --env-file=.env.local scripts/fichas/sembrar_equipo_proyecto.ts [--borrar]
import { eq, inArray, sql } from "drizzle-orm";
import { db } from "../../src/lib/db";
import { periodos, propuestas, usuarios } from "../../src/lib/schema";
import { exigirBaseDesarrollo } from "./guardia";

const COHORTE = "PRUEBA-PRO-2026";
const COPIA_DE = "C2-2026";
const PLANTILLA_ID = 40;
const EGRESADOS = [
  { correo: "pro.lider@prueba.test", nombre: "Prueba Proyecto Líder", carnet: "PRO-0001" },
  { correo: "pro.integrante1@prueba.test", nombre: "Prueba Proyecto Integrante Uno", carnet: "PRO-0002" },
  { correo: "pro.integrante2@prueba.test", nombre: "Prueba Proyecto Integrante Dos", carnet: "PRO-0003" },
];

async function borrar() {
  const ids = (await db.select({ id: usuarios.id }).from(usuarios).where(inArray(usuarios.correo, EGRESADOS.map((e) => e.correo)))).map((u) => u.id);
  if (ids.length > 0) {
    await db.delete(propuestas).where(inArray(propuestas.egresadoId, ids));
    await db.execute(sql`DELETE FROM integrantes_proyecto WHERE egresado_id IN (${sql.join(ids.map((i) => sql`${i}`), sql`, `)})`);
    await db.execute(sql`DELETE FROM documentos_egresado WHERE egresado_id IN (${sql.join(ids.map((i) => sql`${i}`), sql`, `)})`);
    await db.execute(sql`DELETE FROM notificaciones WHERE usuario_id IN (${sql.join(ids.map((i) => sql`${i}`), sql`, `)})`);
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
        .values({ nombreCompleto: e.nombre, correo: e.correo, passwordHash: plantilla.passwordHash, rol: "egresado", carnet: e.carnet, carreraId: 1, facultadId: 1, cohorte: COHORTE })
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

async function run() {
  exigirBaseDesarrollo("sembrar_equipo_proyecto");
  if (process.argv.includes("--borrar")) await borrar();
  else await sembrar();
}

run()
  .then(() => { process.exitCode = 0; })
  .catch((e) => { console.error(e); process.exitCode = 1; });
