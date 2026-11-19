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
// Con --usar-version-vigente liga la propuesta del líder a la última versión habilitada de su ficha (I5: la v2 de
// INV-ING-001 solo agrega el informe final; las propuestas reales conservan la versión con la que empezaron).
// Con --completar-informe-final escribe una versión de prueba en los capítulos del informe final que no tienen ninguna
// y los marca como aprobados (como lo haría el asesor); no toca los capítulos que el equipo ya escribió.
// Caso individual (I6): --individual crea a inv.solo@prueba.test (sin equipo) con su investigación ya aprobada en la
// versión vigente de INV-ING-001; con --solo, los demás atajos actúan sobre su propuesta en lugar de la del equipo.
// Redacción académica guiada (13-nov-2026): --version-apartados crea el borrador de una versión de INV-ING-001 con el
// protocolo de apartados académicos (se habilita en el constructor); --apartados usa a inv.apartados@prueba.test como
// egresado individual (--individual --apartados lo crea en la versión vigente; los demás atajos actúan sobre él).
// Notas del 13-nov-2026: --version-ejecucion crea el borrador de una versión de INV-ING-001 cuya ejecución ya no pide
// marco teórico en el registro, entrega un solo informe general y precarga el marco del informe final de la
// fundamentación del protocolo (se habilita en el constructor).
// Productos por objetivo (16-nov-2026): --version-productos crea el borrador de una versión cuyo plan pide productos por
// objetivo y cuyo informe final precarga las conclusiones de los objetivos; --productos-plan agrega productos de prueba a
// los objetivos del plan (aprobado o no) de la propuesta, sin tocar los que ya tienen.
// Resultados por objetivo (16-nov-2026): --version-resultados crea el borrador de una versión cuyo capítulo "Resultados
// obtenidos" del informe final lo genera el sistema.
// Bitácora (16-nov-2026): --version-bitacora crea el borrador de una versión cuya ejecución pide el reporte de
// modificaciones y cuyo informe final lo anexa.
// Adelantar (16-nov-2026): --version-adelantar crea el borrador de una versión que permite adelantar actividades de
// períodos siguientes; --actividad-futura agrega al plan una actividad de prueba planificada en el último período.
// Fuentes y citas (19-nov-2026): --citas usa a inv.citas@prueba.test como egresado individual (--individual --citas lo
// crea con la propuesta aprobada y el protocolo en redacción); --fuentes-prueba registra 20 fuentes de prueba en la
// propuesta y convierte la fundamentación en párrafos citados.
// Plantilla nueva del protocolo (19-nov-2026): --version-protocolo-nuevo crea el borrador de una versión con el protocolo
// en el orden de la reunión (consideraciones éticas, recursos y presupuesto, sin esquema del informe).
// Cronograma de investigación (19-nov-2026): --version-cronograma crea el borrador de una versión cuyo plan es el
// cronograma de investigación (elementos por objetivo, bloque de preparación del informe y presupuesto).
// --cronograma-prueba (E3) completa el plan de la propuesta con esa estructura (cada elemento obligatorio planificado,
// la metodología de cada objetivo con una cita del registro) y lo deja aprobado, para probar la ejecución por elementos.
// Uso: npx tsx --env-file=.env.local scripts/fichas/sembrar_equipo_investigacion.ts [--borrar | --aprobar | --completar-protocolo | --completar-plan | --iniciar | --usar-version-vigente | --completar-informe-final | --individual | --version-apartados | --version-ejecucion | --version-productos | --productos-plan | --version-resultados | --version-bitacora | --version-adelantar | --actividad-futura | --fuentes-prueba | --version-protocolo-nuevo | --version-cronograma | --cronograma-prueba] [--solo | --apartados | --citas] [--solo | --apartados]
import crypto from "crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../src/lib/db";
import { cartasAceptacion, detallesProyecto, fichas, fuentesTrabajo, ratificacionesPropuesta, fichasVersiones, historialEstados, informesFinalesFicha, versionesCapitulo, periodos, planesTrabajo, propuestas, respuestasEspacios, usuarios } from "../../src/lib/schema";
import { esEtapaEjecucion, esEtapaInformeFinal, esEtapaPlan, esEtapaProtocolo, PRECARGA_CONCLUSIONES_OBJETIVOS, type DefinicionFicha, type Espacio, type EtapaPlan } from "../../src/lib/fichas/tipos";
import { guardarComoTexto, tipoApartado } from "../../src/lib/fichas/apartadosAcademicos";
import { informeFinalNuevo, planNuevo, protocoloNuevo } from "../../src/lib/fichas/plantillas";
import { validarDefinicion } from "../../src/lib/fichas/validar";
import { normalizarArbol, numerar, type NodoPlan } from "../../src/lib/fichas/planTrabajo";
import { arbolConCitas } from "../../src/lib/fichas/metodologiaPlan";
import { conCitas, guardarParrafos, leerParrafos } from "../../src/lib/fichas/fuentes";
import { datosCitaVacios, leerDatosCita } from "../../src/lib/citaApa";
import { exigirBaseDesarrollo } from "./guardia";

const COHORTE = "PRUEBA-INV-2026";
const COPIA_DE = "C2-2026";
const PLANTILLA_ID = 40;
const EGRESADOS = [
  { correo: "inv.lider@prueba.test", nombre: "Prueba Investigación Líder", carnet: "INV-0001", carreraId: 1 },
  { correo: "inv.integrante1@prueba.test", nombre: "Prueba Investigación Integrante Uno", carnet: "INV-0002", carreraId: 1 },
  { correo: "inv.integrante2@prueba.test", nombre: "Prueba Investigación Integrante Dos", carnet: "INV-0003", carreraId: 9 },
];

/** Egresado del caso individual (I6). Con --apartados, el del protocolo con apartados académicos (13-nov-2026). */
const APARTADOS = { correo: "inv.apartados@prueba.test", nombre: "Prueba Investigación Apartados", carnet: "INV-0005", carreraId: 1 };
const usarApartados = process.argv.includes("--apartados");
/** Ajustes al protocolo (19-nov-2026): egresado con el protocolo en redacción, para probar fuentes y citas. */
const CITAS = { correo: "inv.citas@prueba.test", nombre: "Prueba Investigación Citas", carnet: "INV-0006", carreraId: 1 };
const usarCitas = process.argv.includes("--citas");
const SOLO = usarApartados ? APARTADOS : usarCitas ? CITAS : { correo: "inv.solo@prueba.test", nombre: "Prueba Investigación Individual", carnet: "INV-0004", carreraId: 1 };
const usarSolo = process.argv.includes("--solo") || usarApartados || usarCitas;

const lista = (ids: number[]) => sql.join(ids.map((i) => sql`${i}`), sql`, `);

async function borrar() {
  const ids = (await db.select({ id: usuarios.id }).from(usuarios).where(inArray(usuarios.correo, [...EGRESADOS, SOLO, APARTADOS].map((e) => e.correo)))).map((u) => u.id);
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
  const [lider] = await db.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.correo, usarSolo ? SOLO.correo : EGRESADOS[0].correo));
  const [prop] = lider ? await db.select().from(propuestas).where(and(eq(propuestas.egresadoId, lider.id), eq(propuestas.tipo, "investigacion"))) : [];
  if (!prop) throw new Error("El líder de prueba no tiene propuesta de investigación.");
  return { lider: lider.id, prop };
}

const relleno = (n: number) => Array.from({ length: n }, (_, i) => ["el", "estudio", "permitirá", "orientar", "las", "tutorías"][i % 6]).join(" ");

/** Apartado académico de prueba con cada subapartado en su mínimo (redacción académica guiada, 13-nov-2026). */
function apartadoDePrueba(e: Espacio): string | null {
  const tipo = tipoApartado(e);
  if (!tipo) return null;
  const partes: Record<string, string> = {};
  for (const p of tipo.partes) {
    if (p.opcional) continue;
    if (p.formato === "texto") partes[p.id] = `Texto de prueba. ${relleno(p.min ?? 0)}.`;
    else if (p.formato === "pregunta") partes[p.id] = "¿Qué relación existe entre los hábitos de estudio y el rendimiento en Programación I?";
    else if (p.formato === "seleccion") partes[p.id] = p.opciones?.[0]?.valor ?? "";
    else if (p.formato === "tabla") partes[p.id] = JSON.stringify([(p.columnas ?? []).map((c) => `${c} de prueba`)]);
    else if (p.formato === "referencias") partes[p.id] = "Autor, A. (2024). Obra de prueba. Editorial.\nAutor, B. (2023). Artículo de prueba. Revista, 1(2), 3-4.";
    else partes[p.id] = "Identificar el elemento 1\nDeterminar el elemento 2\nComparar el elemento 3";
  }
  return guardarComoTexto({ partes, autoevaluacion: [] });
}

/**
 * Atajo de prueba (13-nov-2026): borrador de una versión nueva de INV-ING-001 copiada de la última habilitada, con el
 * protocolo de apartados académicos (protocoloNuevo) y las precargas del informe final por subapartado. Se habilita
 * desde el constructor, para revisar ahí la lista de cambios.
 */
async function versionApartados() {
  const [ficha] = await db.select({ id: fichas.id }).from(fichas).where(eq(fichas.codigo, "INV-ING-001-SIST"));
  if (!ficha) throw new Error("No existe la ficha INV-ING-001-SIST.");
  const versiones = await db.select().from(fichasVersiones).where(eq(fichasVersiones.fichaId, ficha.id)).orderBy(sql`${fichasVersiones.numero} DESC`);
  const borrador = versiones.find((v) => v.estado === "borrador");
  if (borrador) return console.log(`Ya existe el borrador v${borrador.numero} (id ${borrador.id}); habilítalo o descártalo desde el constructor.`);
  const base = versiones.find((v) => v.estado === "habilitada");
  if (!base) throw new Error("La ficha no tiene versiones habilitadas.");
  const def = structuredClone(base.definicion) as DefinicionFicha;
  const prot = def.etapas.find(esEtapaProtocolo);
  const inf = def.etapas.find(esEtapaInformeFinal);
  if (!prot) throw new Error("La versión habilitada no tiene protocolo.");
  prot.espacios = protocoloNuevo(prot.id).espacios;
  if (inf) inf.espacios = informeFinalNuevo(inf.id).espacios;
  const problemas = validarDefinicion(def);
  if (problemas.length) throw new Error(`La definición nueva no es válida: ${problemas.map((p) => p.mensaje).join(" | ")}`);
  const [v] = await db.insert(fichasVersiones).values({
    fichaId: ficha.id, numero: versiones[0].numero + 1, estado: "borrador", definicion: def, basadaEnId: base.id,
    notas: "Protocolo con apartados académicos (redacción guiada).",
  }).returning({ id: fichasVersiones.id, numero: fichasVersiones.numero });
  console.log(`Borrador v${v.numero} (id ${v.id}) de INV-ING-001 creado desde la v${base.numero}.`);
}

/** Notas del 13-nov-2026: borrador con la ejecución sin marco teórico en el registro y con un solo informe general. */
async function versionEjecucion() {
  const [ficha] = await db.select({ id: fichas.id }).from(fichas).where(eq(fichas.codigo, "INV-ING-001-SIST"));
  if (!ficha) throw new Error("No existe la ficha INV-ING-001-SIST.");
  const versiones = await db.select().from(fichasVersiones).where(eq(fichasVersiones.fichaId, ficha.id)).orderBy(sql`${fichasVersiones.numero} DESC`);
  const borrador = versiones.find((v) => v.estado === "borrador");
  if (borrador) return console.log(`Ya existe el borrador v${borrador.numero} (id ${borrador.id}); habilítalo o descártalo desde el constructor.`);
  const base = versiones.find((v) => v.estado === "habilitada");
  if (!base) throw new Error("La ficha no tiene versiones habilitadas.");
  const def = structuredClone(base.definicion) as DefinicionFicha;
  for (const et of def.etapas.filter(esEtapaEjecucion)) {
    et.registro.marcoTeorico = "no";
    et.informe.modo = "unico";
  }
  const marco = def.etapas.find(esEtapaInformeFinal)?.espacios.find((e) => e.id === "if_marco");
  const fund = def.etapas.find(esEtapaProtocolo)?.espacios.find((e) => e.id === "fundamentacion");
  if (marco && fund?.elemento === "apartado" && marco.elemento === "apartado") {
    marco.precargarDe = "fundamentacion";
    marco.descripcion = "Parte de la fundamentación teórica del protocolo";
  }
  const problemas = validarDefinicion(def);
  if (problemas.length) throw new Error(`La definición nueva no es válida: ${problemas.map((p) => p.mensaje).join(" | ")}`);
  const [v] = await db.insert(fichasVersiones).values({
    fichaId: ficha.id, numero: versiones[0].numero + 1, estado: "borrador", definicion: def, basadaEnId: base.id,
    notas: "Ejecución por productos: registro sin marco teórico, con fechas, y un solo informe general.",
  }).returning({ id: fichasVersiones.id, numero: fichasVersiones.numero });
  console.log(`Borrador v${v.numero} (id ${v.id}) de INV-ING-001 creado desde la v${base.numero}.`);
}

/** Productos por objetivo (16-nov-2026): borrador con el plan que los pide y las conclusiones precargadas en el informe. */
async function versionProductos() {
  const [ficha] = await db.select({ id: fichas.id }).from(fichas).where(eq(fichas.codigo, "INV-ING-001-SIST"));
  if (!ficha) throw new Error("No existe la ficha INV-ING-001-SIST.");
  const versiones = await db.select().from(fichasVersiones).where(eq(fichasVersiones.fichaId, ficha.id)).orderBy(sql`${fichasVersiones.numero} DESC`);
  const borrador = versiones.find((v) => v.estado === "borrador");
  if (borrador) return console.log(`Ya existe el borrador v${borrador.numero} (id ${borrador.id}); habilítalo o descártalo desde el constructor.`);
  const base = versiones.find((v) => v.estado === "habilitada");
  if (!base) throw new Error("La ficha no tiene versiones habilitadas.");
  const def = structuredClone(base.definicion) as DefinicionFicha;
  const plan = def.etapas.find(esEtapaPlan);
  if (!plan) throw new Error("La versión habilitada no tiene plan de trabajo.");
  plan.productosObjetivo = "obligatorio";
  const conc = def.etapas.find(esEtapaInformeFinal)?.espacios.find((e) => e.id === "if_conclusiones");
  if (conc) {
    conc.precargarDe = PRECARGA_CONCLUSIONES_OBJETIVOS;
    conc.descripcion = "Parte de las conclusiones aprobadas de cada objetivo específico";
  }
  const problemas = validarDefinicion(def);
  if (problemas.length) throw new Error(`La definición nueva no es válida: ${problemas.map((p) => p.mensaje).join(" | ")}`);
  const [v] = await db.insert(fichasVersiones).values({
    fichaId: ficha.id, numero: versiones[0].numero + 1, estado: "borrador", definicion: def, basadaEnId: base.id,
    notas: "Productos por objetivo específico, con su conclusión, que pasa al informe final.",
  }).returning({ id: fichasVersiones.id, numero: fichasVersiones.numero });
  console.log(`Borrador v${v.numero} (id ${v.id}) de INV-ING-001 creado desde la v${base.numero}.`);
}

/** Resultados por objetivo (16-nov-2026): borrador cuyo capítulo de resultados del informe final se genera solo. */
async function versionResultados() {
  const [ficha] = await db.select({ id: fichas.id }).from(fichas).where(eq(fichas.codigo, "INV-ING-001-SIST"));
  if (!ficha) throw new Error("No existe la ficha INV-ING-001-SIST.");
  const versiones = await db.select().from(fichasVersiones).where(eq(fichasVersiones.fichaId, ficha.id)).orderBy(sql`${fichasVersiones.numero} DESC`);
  const borrador = versiones.find((v) => v.estado === "borrador");
  if (borrador) return console.log(`Ya existe el borrador v${borrador.numero} (id ${borrador.id}); habilítalo o descártalo desde el constructor.`);
  const base = versiones.find((v) => v.estado === "habilitada");
  if (!base) throw new Error("La ficha no tiene versiones habilitadas.");
  const def = structuredClone(base.definicion) as DefinicionFicha;
  const inf = def.etapas.find(esEtapaInformeFinal);
  if (!inf) throw new Error("La versión habilitada no tiene informe final.");
  const nuevo = informeFinalNuevo(inf.id).espacios.find((e) => e.id === "if_resultados")!;
  const i = inf.espacios.findIndex((e) => e.id === "if_resultados");
  if (i >= 0) inf.espacios[i] = nuevo;
  else inf.espacios.push(nuevo);
  const problemas = validarDefinicion(def);
  if (problemas.length) throw new Error(`La definición nueva no es válida: ${problemas.map((p) => p.mensaje).join(" | ")}`);
  const [v] = await db.insert(fichasVersiones).values({
    fichaId: ficha.id, numero: versiones[0].numero + 1, estado: "borrador", definicion: def, basadaEnId: base.id,
    notas: "Resultados del informe final generados por objetivo, con productos y evidencias como anexos.",
  }).returning({ id: fichasVersiones.id, numero: fichasVersiones.numero });
  console.log(`Borrador v${v.numero} (id ${v.id}) de INV-ING-001 creado desde la v${base.numero}.`);
}

/** Bitácora (16-nov-2026): borrador cuya ejecución pide el reporte de modificaciones y cuyo informe final lo anexa. */
async function versionBitacora() {
  const [ficha] = await db.select({ id: fichas.id }).from(fichas).where(eq(fichas.codigo, "INV-ING-001-SIST"));
  if (!ficha) throw new Error("No existe la ficha INV-ING-001-SIST.");
  const versiones = await db.select().from(fichasVersiones).where(eq(fichasVersiones.fichaId, ficha.id)).orderBy(sql`${fichasVersiones.numero} DESC`);
  const borrador = versiones.find((v) => v.estado === "borrador");
  if (borrador) return console.log(`Ya existe el borrador v${borrador.numero} (id ${borrador.id}); habilítalo o descártalo desde el constructor.`);
  const base = versiones.find((v) => v.estado === "habilitada");
  if (!base) throw new Error("La ficha no tiene versiones habilitadas.");
  const def = structuredClone(base.definicion) as DefinicionFicha;
  for (const et of def.etapas.filter(esEtapaEjecucion)) et.registro.modificaciones = true;
  const inf = def.etapas.find(esEtapaInformeFinal);
  if (inf && !inf.espacios.some((e) => e.id === "if_modificaciones")) {
    const nuevo = informeFinalNuevo(inf.id).espacios.find((e) => e.id === "if_modificaciones")!;
    const anexos = inf.espacios.findIndex((e) => e.id === "if_anexos");
    inf.espacios.splice(anexos >= 0 ? anexos : inf.espacios.length, 0, nuevo);
  }
  const problemas = validarDefinicion(def);
  if (problemas.length) throw new Error(`La definición nueva no es válida: ${problemas.map((p) => p.mensaje).join(" | ")}`);
  const [v] = await db.insert(fichasVersiones).values({
    fichaId: ficha.id, numero: versiones[0].numero + 1, estado: "borrador", definicion: def, basadaEnId: base.id,
    notas: "Bitácora o reporte de modificaciones en la ejecución, anexado a los informes.",
  }).returning({ id: fichasVersiones.id, numero: fichasVersiones.numero });
  console.log(`Borrador v${v.numero} (id ${v.id}) de INV-ING-001 creado desde la v${base.numero}.`);
}

/** Adelantar (16-nov-2026): borrador cuya ejecución permite adelantar actividades de períodos siguientes. */
async function versionAdelantar() {
  const [ficha] = await db.select({ id: fichas.id }).from(fichas).where(eq(fichas.codigo, "INV-ING-001-SIST"));
  if (!ficha) throw new Error("No existe la ficha INV-ING-001-SIST.");
  const versiones = await db.select().from(fichasVersiones).where(eq(fichasVersiones.fichaId, ficha.id)).orderBy(sql`${fichasVersiones.numero} DESC`);
  const borrador = versiones.find((v) => v.estado === "borrador");
  if (borrador) return console.log(`Ya existe el borrador v${borrador.numero} (id ${borrador.id}); habilítalo o descártalo desde el constructor.`);
  const base = versiones.find((v) => v.estado === "habilitada");
  if (!base) throw new Error("La ficha no tiene versiones habilitadas.");
  const def = structuredClone(base.definicion) as DefinicionFicha;
  for (const et of def.etapas.filter(esEtapaEjecucion)) et.registro.adelantar = true;
  const problemas = validarDefinicion(def);
  if (problemas.length) throw new Error(`La definición nueva no es válida: ${problemas.map((p) => p.mensaje).join(" | ")}`);
  const [v] = await db.insert(fichasVersiones).values({
    fichaId: ficha.id, numero: versiones[0].numero + 1, estado: "borrador", definicion: def, basadaEnId: base.id,
    notas: "Se pueden adelantar actividades de períodos siguientes al período abierto.",
  }).returning({ id: fichasVersiones.id, numero: fichasVersiones.numero });
  console.log(`Borrador v${v.numero} (id ${v.id}) de INV-ING-001 creado desde la v${base.numero}.`);
}

/** Adelantar (16-nov-2026): una actividad de prueba en la última macroactividad, planificada en la última columna. */
async function actividadFutura() {
  const { prop } = await propuestaDelLider();
  const [plan] = await db.select().from(planesTrabajo).where(eq(planesTrabajo.propuestaId, prop.id));
  if (!plan) throw new Error("La propuesta no tiene plan de trabajo.");
  const raiz = plan.arbol as NodoPlan;
  const macro = raiz.hijos.at(-1)?.hijos.at(-1);
  if (!macro) throw new Error("El plan no tiene macroactividades.");
  if (macro.hijos.some((a) => a.titulo === "Actividad futura de prueba")) return console.log("La actividad futura ya existe.");
  const montos = Array.from({ length: plan.columnas }, (_, c) => (c === plan.columnas - 1 ? 1 : 0));
  macro.hijos.push({ id: crypto.randomUUID(), codigo: "", nivel: 4, titulo: "Actividad futura de prueba", responsable: null, montos, hijos: [], documento: "Informe de la actividad (PDF)" });
  await db.update(planesTrabajo).set({ arbol: numerar(raiz), actualizadoEn: new Date() }).where(eq(planesTrabajo.id, plan.id));
  console.log(`Actividad futura agregada en ${macro.codigo} del plan de la propuesta ${prop.id} (última columna).`);
}

/** Fuentes y citas (19-nov-2026): 20 fuentes de prueba y la fundamentación en párrafos citados con ellas. */
async function fuentesPrueba() {
  const { lider, prop } = await propuestaDelLider();
  const actuales = await db.select({ id: fuentesTrabajo.id }).from(fuentesTrabajo).where(eq(fuentesTrabajo.propuestaId, prop.id));
  const APELLIDOS = ["Álvarez", "Benítez", "Castro", "Durán", "Escobar", "Flores", "Guzmán", "Hernández", "Iraheta", "Juárez", "Kattán", "López", "Mejía", "Navarro", "Orellana", "Portillo", "Quintanilla", "Rivas", "Salazar", "Torres"];
  if (actuales.length < 20) {
    await db.insert(fuentesTrabajo).values(APELLIDOS.slice(actuales.length).map((a, k) => ({
      propuestaId: prop.id, creadoPor: lider,
      datos: { ...datosCitaVacios(k % 3 === 1 ? "articulo" : "libro"), autores: [{ apellidos: a, iniciales: "M." }], anio: String(2016 + (k % 9)),
        titulo: `Hábitos de estudio y aprendizaje de la programación, volumen ${k + 1}`, editorial: "Editorial Universitaria",
        revista: "Revista de Educación en Ingeniería", volumen: String(10 + k), numero: "2", paginas: "15-30" },
    })));
  }
  const fuentes = await db.select({ id: fuentesTrabajo.id, datos: fuentesTrabajo.datos }).from(fuentesTrabajo).where(eq(fuentesTrabajo.propuestaId, prop.id)).orderBy(fuentesTrabajo.id);
  const mapa = new Map(fuentes.flatMap((x) => { const d = leerDatosCita(x.datos); return d ? [[x.id, d] as const] : []; }));
  const [fila] = await db.select().from(respuestasEspacios).where(and(eq(respuestasEspacios.propuestaId, prop.id), eq(respuestasEspacios.espacioId, "fundamentacion")));
  if (fila?.contenido) {
    const c = JSON.parse(fila.contenido);
    const parrafos = leerParrafos(c.partes?.desarrollo ?? "");
    if (parrafos.length && parrafos.every((p) => p.fuentes.length === 0)) {
      c.partes.desarrollo = guardarParrafos(conCitas(parrafos.map((p, k) => ({ ...p, fuentes: [fuentes[k % fuentes.length].id, fuentes[(k + 3) % fuentes.length].id] })), mapa));
      await db.update(respuestasEspacios).set({ contenido: JSON.stringify(c), actualizadoEn: new Date() }).where(eq(respuestasEspacios.id, fila.id));
    }
  }
  console.log(`Propuesta ${prop.id}: ${fuentes.length} fuentes en el registro y la fundamentación con párrafos citados.`);
}

/** Plantilla nueva del protocolo (19-nov-2026): borrador con protocoloNuevo, sobre la última versión habilitada. */
async function versionProtocoloNuevo() {
  const [ficha] = await db.select({ id: fichas.id }).from(fichas).where(eq(fichas.codigo, "INV-ING-001-SIST"));
  if (!ficha) throw new Error("No existe la ficha INV-ING-001-SIST.");
  const versiones = await db.select().from(fichasVersiones).where(eq(fichasVersiones.fichaId, ficha.id)).orderBy(sql`${fichasVersiones.numero} DESC`);
  const borrador = versiones.find((v) => v.estado === "borrador");
  if (borrador) return console.log(`Ya existe el borrador v${borrador.numero} (id ${borrador.id}); habilítalo o descártalo desde el constructor.`);
  const base = versiones.find((v) => v.estado === "habilitada");
  if (!base) throw new Error("La ficha no tiene versiones habilitadas.");
  const def = structuredClone(base.definicion) as DefinicionFicha;
  const prot = def.etapas.find(esEtapaProtocolo);
  if (!prot) throw new Error("La versión habilitada no tiene protocolo.");
  prot.espacios = protocoloNuevo(prot.id).espacios;
  const problemas = validarDefinicion(def);
  if (problemas.length) throw new Error(`La definición nueva no es válida: ${problemas.map((p) => p.mensaje).join(" | ")}`);
  const [v] = await db.insert(fichasVersiones).values({
    fichaId: ficha.id, numero: versiones[0].numero + 1, estado: "borrador", definicion: def, basadaEnId: base.id,
    notas: "Protocolo en el orden de la reunión: consideraciones éticas, recursos y presupuesto, sin esquema del informe.",
  }).returning({ id: fichasVersiones.id, numero: fichasVersiones.numero });
  console.log(`Borrador v${v.numero} (id ${v.id}) de INV-ING-001 creado desde la v${base.numero}.`);
}

/**
 * Cronograma de investigación (19-nov-2026): borrador cuyo plan usa la estructura de investigación, sobre la última
 * versión habilitada. Sin productos por objetivo, las conclusiones finales ya no se precargan de las preliminares.
 */
async function versionCronograma() {
  const [ficha] = await db.select({ id: fichas.id }).from(fichas).where(eq(fichas.codigo, "INV-ING-001-SIST"));
  if (!ficha) throw new Error("No existe la ficha INV-ING-001-SIST.");
  const versiones = await db.select().from(fichasVersiones).where(eq(fichasVersiones.fichaId, ficha.id)).orderBy(sql`${fichasVersiones.numero} DESC`);
  const borrador = versiones.find((v) => v.estado === "borrador");
  if (borrador) return console.log(`Ya existe el borrador v${borrador.numero} (id ${borrador.id}); habilítalo o descártalo desde el constructor.`);
  const base = versiones.find((v) => v.estado === "habilitada");
  if (!base) throw new Error("La ficha no tiene versiones habilitadas.");
  const def = structuredClone(base.definicion) as DefinicionFicha;
  const i = def.etapas.findIndex(esEtapaPlan);
  if (i < 0) throw new Error("La versión habilitada no tiene plan de trabajo.");
  const actual = def.etapas[i] as EtapaPlan;
  def.etapas[i] = { ...planNuevo(actual.id, "investigacion"), nombre: actual.nombre, minimos: actual.minimos, granularidad: actual.granularidad, aprobacion: actual.aprobacion };
  for (const e of def.etapas.find(esEtapaInformeFinal)?.espacios ?? []) {
    if (e.precargarDe === PRECARGA_CONCLUSIONES_OBJETIVOS) delete e.precargarDe;
    if (e.elemento === "resultados_objetivos") Object.assign(e, { titulo: "Desarrollo de la investigación por objetivo", descripcion: "Se genera por objetivo con la metodología, el desarrollo, los resultados, las conclusiones preliminares y la discusión registrados en la ejecución" });
  }
  const problemas = validarDefinicion(def);
  if (problemas.length) throw new Error(`La definición nueva no es válida: ${problemas.map((p) => p.mensaje).join(" | ")}`);
  const [v] = await db.insert(fichasVersiones).values({
    fichaId: ficha.id, numero: versiones[0].numero + 1, estado: "borrador", definicion: def, basadaEnId: base.id,
    notas: "Cronograma de investigación: elementos del proceso por objetivo, preparación del informe final y presupuesto.",
  }).returning({ id: fichasVersiones.id, numero: fichasVersiones.numero });
  console.log(`Borrador v${v.numero} (id ${v.id}) de INV-ING-001 creado desde la v${base.numero}.`);
}

/** Atajo de prueba (E3): plan con la estructura de investigación, planificado y aprobado. */
async function cronogramaPrueba() {
  const { prop } = await propuestaDelLider();
  const [v] = await db.select({ def: fichasVersiones.definicion }).from(fichasVersiones).where(eq(fichasVersiones.id, prop.fichaVersionId!));
  const etapa = (v.def as DefinicionFicha).etapas.find(esEtapaPlan);
  if (!etapa || etapa.estructura !== "investigacion") throw new Error("La ficha de la propuesta no usa el cronograma de investigación.");
  const [plan] = await db.select().from(planesTrabajo).where(eq(planesTrabajo.propuestaId, prop.id));
  if (!plan) throw new Error("La propuesta todavía no abrió su plan de trabajo.");
  const [fuente] = await db.select({ id: fuentesTrabajo.id }).from(fuentesTrabajo).where(eq(fuentesTrabajo.propuestaId, prop.id)).limit(1);
  const raiz = normalizarArbol(plan.arbol as NodoPlan, etapa);
  // Cada objetivo ocupa un tramo de columnas; sus elementos van uno tras otro y la discusión queda sin planificar.
  const columnas = plan.columnas;
  const marca = (c: number) => Array.from({ length: columnas }, (_, i) => (i === Math.min(c, columnas - 1) ? 25 : 0));
  raiz.hijos.forEach((o, k) => {
    if (!o.titulo.trim()) o.titulo = `Objetivo de prueba ${k + 1}`;
    o.hijos.forEach((e, j) => {
      if (e.opcional || e.hijos.length) return;
      if (!e.montos.some((m) => m > 0)) e.montos = marca(o.cierre ? columnas - 2 + j : k * 4 + j);
      if (e.componente === "metodologia" && !e.metodologia && fuente) {
        e.metodologia = { parrafos: [{ texto: `Procedimiento del objetivo «${o.titulo}»: se aplicará un cuestionario a la muestra seleccionada`, fuentes: [fuente.id] }], propia: false, fundamentacion: [] };
      }
    });
  });
  const mapa = new Map((await db.select().from(fuentesTrabajo).where(eq(fuentesTrabajo.propuestaId, prop.id))).flatMap((f) => { const d = leerDatosCita(f.datos); return d ? [[f.id, d] as const] : []; }));
  await db.update(planesTrabajo).set({ arbol: arbolConCitas(numerar(raiz), mapa), estado: "aprobado", version: plan.version + 1, comentarioAsesor: "Aprobado (atajo de prueba).", revisadoEn: new Date(), actualizadoEn: new Date() }).where(eq(planesTrabajo.id, plan.id));
  console.log(`Plan de la propuesta ${prop.id}: cronograma de investigación de prueba, aprobado (${raiz.hijos.length} bloques).`);
}

/** Productos de prueba en los objetivos del plan de la propuesta (también si ya está aprobado). */
async function productosPlan() {
  const { prop } = await propuestaDelLider();
  const [plan] = await db.select().from(planesTrabajo).where(eq(planesTrabajo.propuestaId, prop.id));
  if (!plan) throw new Error("La propuesta no tiene plan de trabajo.");
  const raiz = plan.arbol as NodoPlan;
  const ejemplos = [["Instrumento de encuesta validado", "Base de datos de respuestas"], ["Informe de análisis estadístico"], ["Documento de relación entre variables"], ["Propuesta de recomendaciones"]];
  raiz.hijos.forEach((o, i) => { if (!o.productos?.some((p) => p.trim())) o.productos = ejemplos[i % ejemplos.length]; });
  await db.update(planesTrabajo).set({ arbol: raiz, actualizadoEn: new Date() }).where(eq(planesTrabajo.id, plan.id));
  console.log(`Productos de prueba en los ${raiz.hijos.length} objetivos del plan de la propuesta ${prop.id}.`);
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
    const contenido = e.elemento === "texto" ? `Texto de prueba para "${e.titulo}". ${relleno(Number(e.parametros.minPalabras) || 0)}`
      : e.elemento === "lista" ? JSON.stringify(["Elemento de prueba 1", "Elemento de prueba 2", "Elemento de prueba 3"])
      : e.elemento === "apartado" ? apartadoDePrueba(e) : null;
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
  const otros = usarSolo ? [] : (await db.select({ id: usuarios.id }).from(usuarios).where(inArray(usuarios.correo, EGRESADOS.slice(1).map((e) => e.correo)))).map((u) => u.id);
  const raiz = plan.arbol as NodoPlan;
  const marca = (k: number) => Array.from({ length: plan.columnas }, (_, c) => (c === k % Math.min(plan.columnas, 8) ? 1 : 0));
  let k = 0;
  for (const id of [lider, ...otros]) {
    const suyos = usarSolo ? raiz.hijos : raiz.hijos.filter((o) => o.responsable === id);
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

/** Atajo de prueba (I5): liga la propuesta del líder a la última versión habilitada de su misma ficha. */
async function usarVersionVigente() {
  const { prop } = await propuestaDelLider();
  if (!prop.fichaVersionId) throw new Error("La propuesta no tiene ficha.");
  const [actual] = await db.select({ fichaId: fichasVersiones.fichaId }).from(fichasVersiones).where(eq(fichasVersiones.id, prop.fichaVersionId));
  const [ultima] = await db.select({ id: fichasVersiones.id, numero: fichasVersiones.numero }).from(fichasVersiones)
    .where(and(eq(fichasVersiones.fichaId, actual.fichaId), eq(fichasVersiones.estado, "habilitada"))).orderBy(sql`${fichasVersiones.numero} DESC`).limit(1);
  if (!ultima) throw new Error("La ficha no tiene versiones habilitadas.");
  await db.update(propuestas).set({ fichaVersionId: ultima.id }).where(eq(propuestas.id, prop.id));
  console.log(`Propuesta ${prop.id} ligada a la versión ${ultima.numero} (id ${ultima.id}).`);
}

/** Atajo de prueba (I5): capítulos de prueba aprobados en el informe final, sin tocar los que ya tienen versiones. */
async function completarInformeFinal() {
  const { lider, prop } = await propuestaDelLider();
  const [v] = await db.select({ def: fichasVersiones.definicion }).from(fichasVersiones).where(eq(fichasVersiones.id, prop.fichaVersionId!));
  const etapa = (v.def as DefinicionFicha).etapas.find(esEtapaInformeFinal);
  if (!etapa) throw new Error("La ficha de la propuesta no tiene informe final.");
  const conVersiones = new Set((await db.select({ id: versionesCapitulo.espacioId }).from(versionesCapitulo).where(eq(versionesCapitulo.propuestaId, prop.id))).map((x) => x.id));
  let [fila] = await db.select().from(informesFinalesFicha).where(eq(informesFinalesFicha.propuestaId, prop.id));
  if (!fila) [fila] = await db.insert(informesFinalesFicha).values({ propuestaId: prop.id }).returning();
  const estados = { ...(fila.capitulos as Record<string, unknown>) };
  let n = 0;
  for (const e of etapa.espacios) {
    if (conVersiones.has(e.id) || !e.obligatorio) continue;
    const contenido = e.elemento === "apartado" ? apartadoDePrueba(e) ?? "" : e.elemento === "lista" ? JSON.stringify(["Autor, A. (2024). Obra de prueba. Editorial.", "Autor, B. (2023). Artículo de prueba. Revista, 1(2), 3-4.", "Autor, C. (2022). Libro de prueba. Editorial."]) : `Texto de prueba del capítulo "${e.titulo}".`;
    await db.insert(versionesCapitulo).values({ propuestaId: prop.id, espacioId: e.id, numero: 1, contenido, autorId: lider });
    estados[e.id] = { estado: "aprobado", version: 1, comentario: "Aprobado (atajo de prueba).", enviadoEn: new Date().toISOString(), revisadoEn: new Date().toISOString(), editando: null };
    n++;
  }
  await db.update(informesFinalesFicha).set({ capitulos: estados }).where(eq(informesFinalesFicha.propuestaId, prop.id));
  console.log(`Informe final de la propuesta ${prop.id}: ${n} capítulos de prueba aprobados.`);
}

/**
 * Atajo de prueba (I6): investigación individual ya aprobada (la propuesta en equipo se probó en I2), con la carta, los
 * actores y 4 objetivos, ligada a la versión habilitada más reciente de INV-ING-001. El resto se recorre en pantalla.
 */
async function sembrarIndividual() {
  const [cohorte] = await db.select().from(periodos).where(eq(periodos.nombre, COHORTE));
  if (!cohorte) throw new Error("Primero ejecuta el script sin opciones para crear la cohorte de prueba.");
  const [plantilla] = await db.select({ passwordHash: usuarios.passwordHash }).from(usuarios).where(eq(usuarios.id, PLANTILLA_ID));
  let [u] = await db.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.correo, SOLO.correo));
  if (!u) {
    [u] = await db.insert(usuarios)
      .values({ nombreCompleto: SOLO.nombre, correo: SOLO.correo, passwordHash: plantilla.passwordHash, rol: "egresado", carnet: SOLO.carnet, carreraId: SOLO.carreraId, facultadId: 1, cohorte: COHORTE })
      .returning({ id: usuarios.id });
    await db.execute(sql`
      INSERT INTO documentos_egresado (egresado_id, tipo, archivo_url, subido_en)
      SELECT ${u.id}, tipo, archivo_url, now() FROM documentos_egresado WHERE egresado_id = ${PLANTILLA_ID}`);
  }
  const [existente] = await db.select({ id: propuestas.id }).from(propuestas).where(and(eq(propuestas.egresadoId, u.id), eq(propuestas.tipo, "investigacion")));
  if (existente) return console.log(`El egresado individual ya tiene la propuesta ${existente.id}.`);
  const [ficha] = await db.select({ id: fichasVersiones.id, numero: fichasVersiones.numero }).from(fichasVersiones)
    .innerJoin(fichas, eq(fichasVersiones.fichaId, fichas.id))
    .where(and(eq(fichas.codigo, "INV-ING-001-SIST"), eq(fichasVersiones.estado, "habilitada"))).orderBy(sql`${fichasVersiones.numero} DESC`).limit(1);
  const [asesor] = await db.select({ id: usuarios.id }).from(usuarios).where(sql`lower(${usuarios.correo}) = 'marco.solis@catolica.edu.sv'`);
  const [coord] = await db.select({ id: usuarios.id }).from(usuarios).where(sql`lower(${usuarios.correo}) = 'jose.luis@uni.test'`);
  const [prop] = await db.insert(propuestas).values({
    egresadoId: u.id, periodoId: cohorte.id, tipo: "investigacion", numero: 1, estado: "aprobada", fichaVersionId: ficha.id,
    titulo: "Hábitos de estudio y rendimiento en Programación I (investigación individual de prueba)",
    asesorId: asesor.id, coordinadorId: coord.id, fechaAprobacion: new Date(),
  }).returning();
  await db.insert(detallesProyecto).values({
    propuestaId: prop.id,
    actorPatrocinador: "Facultad de Ingeniería.", actorBeneficiario: "El egresado que realiza la investigación.", actorFinancista: "Fondos propios.",
    descripcionProblema: "Se desconoce la relación entre los hábitos de estudio y el rendimiento en Programación I.",
    justificacion: "Conocerla permitirá orientar las tutorías de primer año.",
    objetivoGeneral: "Analizar la relación entre los hábitos de estudio y el rendimiento en Programación I.",
    objetivosEspecificos: [
      { titulo: "Caracterizar los hábitos de estudio", descripcion: "Encuesta a estudiantes de primer año." },
      { titulo: "Medir el rendimiento", descripcion: "Notas parciales de Programación I." },
      { titulo: "Relacionar ambas variables", descripcion: "Análisis de correlación." },
      { titulo: "Proponer recomendaciones", descripcion: "Guía para las tutorías." },
    ],
  });
  await db.insert(cartasAceptacion).values({
    propuestaId: prop.id, archivoUrl: "data:application/pdf;base64,JVBERi0xLjQKJSVFT0Y=", fechaEmision: "2026-09-20", fechaInicio: "2026-10-15", fechaFin: "2027-03-14",
    supTitulo: "Msc.", supNombres: "Ana María", supApellidos: "Prueba Docente",
  });
  // Como en el envío real: el egresado ratifica la versión enviada y el envío queda en el historial.
  const { huellaPropuesta } = await import("../../src/lib/huellaPropuesta");
  await db.insert(ratificacionesPropuesta).values({ propuestaId: prop.id, usuarioId: u.id, huellaFirmada: await huellaPropuesta(prop.id) });
  await db.update(propuestas).set({ enviadaEn: new Date() }).where(eq(propuestas.id, prop.id));
  await db.insert(historialEstados).values({ propuestaId: prop.id, de: "redactando", a: "enviada", usuarioId: u.id });
  await db.insert(historialEstados).values({ propuestaId: prop.id, de: "enviada", a: "aprobada", usuarioId: asesor.id });
  console.log(`Egresado individual ${SOLO.correo} (id ${u.id}) con la investigación ${prop.id} aprobada en la versión ${ficha.numero} de INV-ING-001.`);
}

async function run() {
  exigirBaseDesarrollo("sembrar_equipo_investigacion");
  if (process.argv.includes("--borrar")) await borrar();
  else if (process.argv.includes("--aprobar")) await aprobar();
  else if (process.argv.includes("--completar-protocolo")) await completarProtocolo();
  else if (process.argv.includes("--completar-plan")) await completarPlan();
  else if (process.argv.includes("--iniciar")) await iniciar();
  else if (process.argv.includes("--usar-version-vigente")) await usarVersionVigente();
  else if (process.argv.includes("--completar-informe-final")) await completarInformeFinal();
  else if (process.argv.includes("--individual")) await sembrarIndividual();
  else if (process.argv.includes("--version-apartados")) await versionApartados();
  else if (process.argv.includes("--version-ejecucion")) await versionEjecucion();
  else if (process.argv.includes("--version-productos")) await versionProductos();
  else if (process.argv.includes("--productos-plan")) await productosPlan();
  else if (process.argv.includes("--version-resultados")) await versionResultados();
  else if (process.argv.includes("--version-bitacora")) await versionBitacora();
  else if (process.argv.includes("--version-adelantar")) await versionAdelantar();
  else if (process.argv.includes("--actividad-futura")) await actividadFutura();
  else if (process.argv.includes("--fuentes-prueba")) await fuentesPrueba();
  else if (process.argv.includes("--version-protocolo-nuevo")) await versionProtocoloNuevo();
  else if (process.argv.includes("--version-cronograma")) await versionCronograma();
  else if (process.argv.includes("--cronograma-prueba")) await cronogramaPrueba();
  else await sembrar();
}

run()
  .then(() => { process.exitCode = 0; })
  .catch((e) => { console.error(e); process.exitCode = 1; });
