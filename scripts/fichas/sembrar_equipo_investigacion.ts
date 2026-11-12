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
// Con --completar-protocolo llena con texto de prueba las partes del protocolo que el equipo no ha escrito (I3).
// Con --completar-plan completa el plan hasta los mínimos de la ficha, con su documento solicitado (I3).
// Ninguno de los dos atajos toca lo que el equipo ya escribió.
// Con --iniciar da inicio a la ejecución si el protocolo y el plan están aprobados (I4; en lugar de los documentos de
// coordinación). Para poder registrar ya, mueve la fecha de inicio de la carta al 15-oct-2026 (períodos 1 y 2 abiertos).
// Uso: npx tsx --env-file=.env.local scripts/fichas/sembrar_equipo_investigacion.ts [--borrar | --aprobar | --completar-protocolo | --completar-plan | --iniciar]
import crypto from "crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../src/lib/db";
import { cartasAceptacion, fichasVersiones, historialEstados, periodos, planesTrabajo, propuestas, respuestasEspacios, usuarios } from "../../src/lib/schema";
import { esEtapaProtocolo, type DefinicionFicha } from "../../src/lib/fichas/tipos";
import { numerar, type NodoPlan } from "../../src/lib/fichas/planTrabajo";
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

async function propuestaDelLider() {
  const [lider] = await db.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.correo, EGRESADOS[0].correo));
  const [prop] = lider ? await db.select().from(propuestas).where(and(eq(propuestas.egresadoId, lider.id), eq(propuestas.tipo, "investigacion"))) : [];
  if (!prop) throw new Error("El líder de prueba no tiene propuesta de investigación.");
  return { lider: lider.id, prop };
}

/** Atajo de prueba (I3): llena las partes del protocolo que faltan (texto y listas obligatorias). */
async function completarProtocolo() {
  const { lider, prop } = await propuestaDelLider();
  if (!prop.fichaVersionId) throw new Error("La propuesta no tiene ficha.");
  const [v] = await db.select({ def: fichasVersiones.definicion }).from(fichasVersiones).where(eq(fichasVersiones.id, prop.fichaVersionId));
  const etapa = (v.def as DefinicionFicha).etapas.find(esEtapaProtocolo);
  if (!etapa) throw new Error("La ficha no tiene protocolo.");
  const hechas = new Set((await db.select({ id: respuestasEspacios.espacioId }).from(respuestasEspacios).where(eq(respuestasEspacios.propuestaId, prop.id))).map((r) => r.id));
  let n = 0;
  for (const e of etapa.espacios) {
    if (hechas.has(e.id) || !e.obligatorio) continue;
    const contenido = e.elemento === "texto" ? `Texto de prueba para "${e.titulo}".`
      : e.elemento === "lista" ? JSON.stringify(["Elemento de prueba 1", "Elemento de prueba 2", "Elemento de prueba 3"]) : null;
    if (contenido === null) continue;
    await db.insert(respuestasEspacios).values({ propuestaId: prop.id, espacioId: e.id, contenido, actualizadoPor: lider, actualizadoEn: new Date() });
    n++;
  }
  console.log(`Protocolo de la propuesta ${prop.id}: ${n} partes de prueba agregadas.`);
}

/** Atajo de prueba (I3): 3 objetivos por integrante, cada uno con una macroactividad y una actividad con su documento. */
async function completarPlan() {
  const { lider, prop } = await propuestaDelLider();
  const [plan] = await db.select().from(planesTrabajo).where(eq(planesTrabajo.propuestaId, prop.id));
  if (!plan) throw new Error("El equipo todavía no abrió su plan de trabajo.");
  if (plan.estado !== "redactando" && plan.estado !== "observado") throw new Error(`El plan está "${plan.estado}".`);
  const otros = (await db.select({ id: usuarios.id }).from(usuarios).where(inArray(usuarios.correo, EGRESADOS.slice(1).map((e) => e.correo)))).map((u) => u.id);
  const raiz = plan.arbol as NodoPlan;
  const marca = (k: number) => Array.from({ length: plan.columnas }, (_, c) => (c === k % Math.min(plan.columnas, 8) ? 1 : 0));
  let k = 0;
  for (const id of [lider, ...otros]) {
    const suyos = raiz.hijos.filter((o) => o.responsable === id);
    // Primero los objetivos de la propuesta que todavía no tienen responsable.
    for (const o of raiz.hijos) if (suyos.length < 3 && o.responsable == null) { o.responsable = id; suyos.push(o); }
    while (suyos.length < 3) {
      const o: NodoPlan = { id: crypto.randomUUID(), codigo: "", nivel: 2, titulo: `Objetivo de prueba ${++k}`, responsable: id, montos: [], hijos: [] };
      raiz.hijos.push(o);
      suyos.push(o);
    }
    for (const o of suyos) {
      if (!o.titulo.trim()) o.titulo = `Objetivo de prueba ${++k}`;
      if (o.hijos.length === 0) o.hijos.push({ id: crypto.randomUUID(), codigo: "", nivel: 3, titulo: "Macroactividad de prueba", responsable: null, montos: [], hijos: [] });
      for (const m of o.hijos) {
        if (m.hijos.length === 0) m.hijos.push({ id: crypto.randomUUID(), codigo: "", nivel: 4, titulo: "Actividad de prueba", responsable: null, montos: marca(++k), hijos: [], documento: "Informe de la actividad (PDF)" });
        for (const a of m.hijos) if (!a.documento?.trim()) a.documento = "Informe de la actividad (PDF)";
      }
    }
  }
  await db.update(planesTrabajo).set({ arbol: numerar(raiz), version: plan.version + 1, actualizadoEn: new Date() }).where(eq(planesTrabajo.id, plan.id));
  console.log(`Plan de la propuesta ${prop.id} completado: ${raiz.hijos.length} objetivos específicos.`);
}

/** Atajo de prueba (I4): inicia la ejecución de la propuesta del líder con el plan aprobado. */
async function iniciar() {
  const { prop } = await propuestaDelLider();
  const [plan] = await db.select().from(planesTrabajo).where(eq(planesTrabajo.propuestaId, prop.id));
  if (plan?.estado !== "aprobado") throw new Error("La propuesta del líder necesita el protocolo y el plan aprobados.");
  const inicio = new Date(2026, 9, 15);
  const fin = new Date(inicio);
  fin.setDate(fin.getDate() + 150);
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  await db.update(cartasAceptacion).set({ fechaInicio: iso(inicio), fechaFin: iso(fin) }).where(eq(cartasAceptacion.propuestaId, prop.id));
  if (prop.estado === "en_ejecucion") return console.log(`La propuesta ${prop.id} ya está en ejecución (carta desde ${iso(inicio)}).`);
  await db.update(propuestas).set({ estado: "en_ejecucion" }).where(eq(propuestas.id, prop.id));
  await db.insert(historialEstados).values({ propuestaId: prop.id, de: prop.estado, a: "en_ejecucion", usuarioId: prop.coordinadorId });
  console.log(`Propuesta ${prop.id} en ejecución; la carta inicia el ${iso(inicio)}.`);
}

async function run() {
  exigirBaseDesarrollo("sembrar_equipo_investigacion");
  if (process.argv.includes("--borrar")) await borrar();
  else if (process.argv.includes("--aprobar")) await aprobar();
  else if (process.argv.includes("--completar-protocolo")) await completarProtocolo();
  else if (process.argv.includes("--completar-plan")) await completarPlan();
  else if (process.argv.includes("--iniciar")) await iniciar();
  else await sembrar();
}

run()
  .then(() => { process.exitCode = 0; })
  .catch((e) => { console.error(e); process.exitCode = 1; });
