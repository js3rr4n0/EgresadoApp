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
// Con --aprobar deja la propuesta enviada del líder como aprobada (atajo para probar el plan de trabajo, P3).
// Con --completar-plan completa el plan de trabajo hasta los mínimos de la ficha (atajo de prueba, P3).
// Uso: npx tsx --env-file=.env.local scripts/fichas/sembrar_equipo_proyecto.ts [--borrar | --aprobar | --completar-plan]
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../src/lib/db";
import crypto from "crypto";
import { historialEstados, periodos, planesTrabajo, propuestas, usuarios } from "../../src/lib/schema";
import { numerar, type NodoPlan } from "../../src/lib/fichas/planTrabajo";
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

/**
 * Atajo de prueba (P3): deja la propuesta enviada del líder como aprobada, con el coordinador y el asesor de
 * demostración, para probar el plan de trabajo sin recorrer la revisión de la fase 1. Queda en el historial.
 */
async function aprobar() {
  const [lider] = await db.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.correo, EGRESADOS[0].correo));
  const [asesor] = await db.select({ id: usuarios.id }).from(usuarios).where(sql`lower(${usuarios.correo}) = 'marco.solis@catolica.edu.sv'`);
  const [coord] = await db.select({ id: usuarios.id }).from(usuarios).where(sql`lower(${usuarios.correo}) = 'jose.luis@uni.test'`);
  if (!lider || !asesor || !coord) throw new Error("Faltan el líder de prueba, el asesor o el coordinador de demostración.");
  const [prop] = await db.select().from(propuestas).where(and(eq(propuestas.egresadoId, lider.id), eq(propuestas.tipo, "proyecto")));
  if (!prop) throw new Error("El líder de prueba no tiene propuesta de proyecto.");
  if (prop.estado === "aprobada") return console.log(`La propuesta ${prop.id} ya está aprobada.`);
  if (prop.estado !== "enviada") throw new Error(`La propuesta ${prop.id} está en "${prop.estado}"; se espera "enviada".`);
  await db.update(propuestas).set({ estado: "aprobada", asesorId: asesor.id, coordinadorId: coord.id, fechaAprobacion: new Date() }).where(eq(propuestas.id, prop.id));
  await db.insert(historialEstados).values({ propuestaId: prop.id, de: prop.estado, a: "aprobada", usuarioId: asesor.id });
  console.log(`Propuesta ${prop.id} aprobada (asesor ${asesor.id}, coordinador ${coord.id}).`);
}

/**
 * Atajo de prueba (P3): completa el plan de trabajo del equipo hasta los mínimos de la ficha (3 objetivos por
 * integrante, cada uno con una macroactividad y una actividad con montos). No toca lo que el equipo ya escribió.
 */
async function completarPlan() {
  const [lider] = await db.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.correo, EGRESADOS[0].correo));
  const [prop] = await db.select().from(propuestas).where(and(eq(propuestas.egresadoId, lider.id), eq(propuestas.tipo, "proyecto")));
  const [plan] = prop ? await db.select().from(planesTrabajo).where(eq(planesTrabajo.propuestaId, prop.id)) : [];
  if (!plan) throw new Error("El equipo todavía no abrió su plan de trabajo.");
  if (plan.estado !== "redactando" && plan.estado !== "observado") throw new Error(`El plan está "${plan.estado}".`);
  const equipo = [lider.id, ...(await db.select({ id: usuarios.id }).from(usuarios).where(inArray(usuarios.correo, EGRESADOS.slice(1).map((e) => e.correo)))).map((u) => u.id)];
  const raiz = plan.arbol as NodoPlan;
  const montos = (k: number) => Array.from({ length: plan.columnas }, (_, c) => (c % 4 === k % 4 && c < 8 ? 50 + 25 * (k % 3) : 0));
  let k = 0;
  for (const id of equipo) {
    const suyos = raiz.hijos.filter((o) => o.responsable === id);
    while (suyos.length < 3) {
      const o: NodoPlan = { id: crypto.randomUUID(), codigo: "", nivel: 2, titulo: `Objetivo de prueba ${++k}`, responsable: id, montos: [], hijos: [] };
      raiz.hijos.push(o);
      suyos.push(o);
    }
    for (const o of suyos) {
      if (!o.titulo.trim()) o.titulo = `Objetivo de prueba ${++k}`;
      if (o.hijos.length === 0) o.hijos.push({ id: crypto.randomUUID(), codigo: "", nivel: 3, titulo: "Macroactividad de prueba", responsable: null, montos: [], hijos: [] });
      for (const m of o.hijos) {
        if (m.hijos.length === 0) m.hijos.push({ id: crypto.randomUUID(), codigo: "", nivel: 4, titulo: "Actividad de prueba", responsable: null, montos: montos(++k), hijos: [] });
      }
    }
  }
  await db.update(planesTrabajo).set({ arbol: numerar(raiz), version: plan.version + 1, actualizadoEn: new Date() }).where(eq(planesTrabajo.id, plan.id));
  console.log(`Plan de la propuesta ${prop.id} completado: ${raiz.hijos.length} objetivos específicos.`);
}

async function run() {
  exigirBaseDesarrollo("sembrar_equipo_proyecto");
  if (process.argv.includes("--borrar")) await borrar();
  else if (process.argv.includes("--aprobar")) await aprobar();
  else if (process.argv.includes("--completar-plan")) await completarPlan();
  else await sembrar();
}

run()
  .then(() => { process.exitCode = 0; })
  .catch((e) => { console.error(e); process.exitCode = 1; });
