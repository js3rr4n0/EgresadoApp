// Prueba completa del flujo de una propuesta con ficha (proyecto, entrega P6; investigación, entrega I6). Solo lectura:
// revisa que la propuesta sea coherente de punta a punta con su ficha, etapa por etapa:
//   ficha → equipo → propuesta (pasos y firmas) → [protocolo, en investigación] → plan de trabajo → ejecución (registros)
//   → informes del período → [informe final por capítulos, en investigación].
// No cambia nada. Termina con código 1 si alguna comprobación falla.
// Uso: npx tsx --env-file=.env.local scripts/fichas/verificar_flujo.ts <propuestaId>
import { and, eq } from "drizzle-orm";
import { db } from "../../src/lib/db";
import {
  fichas, fichasVersiones, historialEstados, informesFinalesFicha, informesPlan, integrantesProyecto, periodos, planesTrabajo, propuestas,
  ratificacionesInformeFinal, ratificacionesPlan, ratificacionesPropuesta, registrosPlan, respuestasEspacios, usuarios, versionesCapitulo,
} from "../../src/lib/schema";
import { esEtapaEjecucion, esEtapaInformeFinal, esEtapaPlan, esEtapaPropuesta, esEtapaProtocolo, opcionesRegistro, type DefinicionFicha } from "../../src/lib/fichas/tipos";
import { problemasProtocolo } from "../../src/lib/fichas/protocolo";
import { capitulosPendientes, leerCapitulos } from "../../src/lib/fichas/informeFinalFicha";
import crypto from "crypto";
import { actividadesDelPeriodo, aplanar, numerar, responsables, validarPlanEquipo, type NodoPlan } from "../../src/lib/fichas/planTrabajo";
import { armarInformePeriodo } from "../../src/lib/fichas/informePeriodo";
import { exigirBaseDesarrollo } from "./guardia";

let fallas = 0;
let avisos = 0;
const ok = (d: string, cond: boolean, detalle = "") => {
  console.log(`${cond ? "✓" : "✗"} ${d}${!cond && detalle ? ` — ${detalle}` : ""}`);
  if (!cond) fallas++;
};
const aviso = (d: string) => { console.log(`⚠ ${d}`); avisos++; };
const etapa = (t: string) => console.log(`\n— ${t}`);

const DESPUES_DEL_ENVIO = ["enviada", "coordinador_asignado", "aprobada", "primer_contacto_completado", "en_ejecucion"];

async function main() {
  exigirBaseDesarrollo("verificar_flujo");
  const id = Number(process.argv[2]);
  if (!Number.isInteger(id)) throw new Error("Indica el id de la propuesta: verificar_flujo.ts <propuestaId>");

  // 1. Ficha
  etapa("1. Ficha");
  const [prop] = await db.select().from(propuestas).where(eq(propuestas.id, id));
  if (!prop) throw new Error(`La propuesta ${id} no existe.`);
  ok(`Es una propuesta de una modalidad con ficha (${prop.tipo})`, prop.tipo === "proyecto" || prop.tipo === "investigacion", prop.tipo);
  ok("Está ligada a una versión de ficha", prop.fichaVersionId !== null);
  if (!prop.fichaVersionId) return;
  const [ver] = await db.select({ v: fichasVersiones, codigo: fichas.codigo, esBase: fichas.esBase }).from(fichasVersiones)
    .innerJoin(fichas, eq(fichasVersiones.fichaId, fichas.id)).where(eq(fichasVersiones.id, prop.fichaVersionId));
  const def = ver.v.definicion as DefinicionFicha;
  console.log(`  Ficha ${ver.codigo} · versión ${ver.v.numero} (${ver.v.estado})`);
  ok("La versión no es una ficha base", !ver.esBase);
  ok("La versión fue habilitada (puede estar deshabilitada después)", ver.v.estado === "habilitada" || ver.v.estado === "retirada", ver.v.estado);
  const espacios = def.etapas.find(esEtapaPropuesta)?.espacios ?? [];
  const etPlan = def.etapas.find(esEtapaPlan);
  const ejec = def.etapas.find(esEtapaEjecucion);
  ok("La ficha tiene plan de trabajo y ejecución", !!etPlan && !!ejec);

  // 2. Equipo
  etapa("2. Equipo");
  const [cohorte] = await db.select({ nombre: periodos.nombre }).from(periodos).where(eq(periodos.id, prop.periodoId));
  const integrantes = await db.select({ id: usuarios.id, cohorte: usuarios.cohorte, carrera: usuarios.carreraId })
    .from(integrantesProyecto).innerJoin(usuarios, eq(integrantesProyecto.egresadoId, usuarios.id))
    .where(and(eq(integrantesProyecto.propuestaId, id), eq(integrantesProyecto.estado, "aceptado")));
  const [lider] = await db.select({ id: usuarios.id, cohorte: usuarios.cohorte, carrera: usuarios.carreraId }).from(usuarios).where(eq(usuarios.id, prop.egresadoId));
  const equipo = [lider, ...integrantes];
  console.log(`  Cohorte ${cohorte?.nombre} · ${equipo.length} integrante(s)`);
  ok(`El equipo respeta el máximo de la ficha (${def.participantes.max})`, equipo.length >= def.participantes.min && equipo.length <= def.participantes.max);
  ok("Los integrantes son de la cohorte de la propuesta", integrantes.every((i) => i.cohorte === cohorte?.nombre), integrantes.map((i) => i.cohorte).join(", "));
  if (lider.cohorte !== cohorte?.nombre) aviso(`El líder es de la cohorte ${lider.cohorte}, distinta de la propuesta (${cohorte?.nombre}): datos antiguos.`);
  if (def.participantes.mismaCarrera) ok("Todos son de la misma carrera (lo pide la ficha)", equipo.every((i) => i.carrera === lider.carrera));

  // 3. Propuesta
  etapa("3. Propuesta");
  const resp = await db.select().from(respuestasEspacios).where(eq(respuestasEspacios.propuestaId, id));
  const protocolo = def.etapas.find(esEtapaProtocolo);
  // Las respuestas del protocolo se guardan en la misma tabla que las de la propuesta.
  const idsEspacios = new Set([...espacios, ...(protocolo?.espacios ?? [])].map((e) => e.id));
  ok("Las respuestas de espacios nuevos corresponden a espacios de la ficha", resp.every((r) => idsEspacios.has(r.espacioId)));
  for (const e of espacios.filter((x) => x.elemento === "texto" && !x.origenFase1 && x.obligatorio)) {
    ok(`El espacio "${e.titulo}" tiene respuesta`, resp.some((r) => r.espacioId === e.id && (r.contenido ?? "").trim().length > 0));
  }
  if (DESPUES_DEL_ENVIO.includes(prop.estado)) {
    const firmas = await db.select().from(ratificacionesPropuesta).where(eq(ratificacionesPropuesta.propuestaId, id));
    const firmantes = new Set(firmas.map((f) => f.usuarioId));
    ok("Todos los integrantes ratificaron antes del envío", equipo.every((i) => firmantes.has(i.id)), `${firmantes.size} de ${equipo.length}`);
    const ultimaHuella = new Set(equipo.map((i) => firmas.filter((f) => f.usuarioId === i.id).sort((a, b) => +b.momento - +a.momento)[0]?.huellaFirmada));
    ok("Las firmas son de la misma versión (misma huella)", ultimaHuella.size === 1);
    const hist = await db.select().from(historialEstados).where(and(eq(historialEstados.propuestaId, id), eq(historialEstados.a, "enviada")));
    if (hist.length === 0) aviso("El envío no está en el historial (la propuesta se envió antes de la corrección del 5-nov).");
  } else {
    aviso(`La propuesta está en "${prop.estado}": todavía no se envió.`);
  }

  // 4. Plan de trabajo
  const [plan] = await db.select().from(planesTrabajo).where(eq(planesTrabajo.propuestaId, id));

  // 3b. Protocolo (investigación, I3): se envía con el plan; en equipo, ratificado por todos sobre la misma versión.
  if (protocolo) {
    etapa("3b. Protocolo");
    const respProt = Object.fromEntries(resp.filter((r) => protocolo.espacios.some((e) => e.id === r.espacioId)).map((r) => [r.espacioId, r.contenido ?? ""]));
    console.log(`  ${Object.keys(respProt).length} de ${protocolo.espacios.length} partes con respuesta`);
    if (plan && (plan.estado === "enviado" || plan.estado === "aprobado")) {
      const pend = problemasProtocolo(protocolo, respProt);
      ok("El protocolo enviado está completo", pend.length === 0, pend.map((p) => p.mensaje).join(" | "));
      if (protocolo.revision.ratificacion && equipo.length > 1) {
        // Misma huella que actions/protocolo.ts: respuestas del protocolo ordenadas y el árbol del plan enviado.
        const huella = crypto.createHash("sha256").update(JSON.stringify({ r: Object.keys(respProt).sort().map((k) => [k, respProt[k]]), a: plan.arbol })).digest("hex");
        const firmas = await db.select().from(ratificacionesPlan).where(eq(ratificacionesPlan.propuestaId, id));
        ok("Todo el equipo ratificó el protocolo y el plan enviados", equipo.every((i) => firmas.some((f) => f.usuarioId === i.id && f.huellaFirmada === huella)));
      }
      if (plan.estado === "aprobado") ok("El dictamen del asesor quedó por escrito", (plan.comentarioAsesor ?? "").trim().length >= 20);
    } else {
      console.log("  Todavía no se envía al asesor.");
    }
  }

  etapa("4. Plan de trabajo");
  if (!plan) {
    if (["aprobada", "primer_contacto_completado", "en_ejecucion"].includes(prop.estado)) aviso("La propuesta está aprobada, pero el equipo no ha abierto su plan.");
    else console.log("  Sin plan todavía (la propuesta no está aprobada).");
  } else if (etPlan && ejec) {
    const ids = equipo.map((i) => i.id);
    // Igual que getPlanTrabajo: en un proyecto individual todo el plan es del único integrante.
    const guardado = plan.arbol as NodoPlan;
    const arbol = ids.length === 1 && guardado.responsable == null ? { ...guardado, responsable: ids[0] } : guardado;
    const columnas = (etPlan.granularidad === "subperiodo" ? ejec.periodos * ejec.subperiodos : ejec.periodos);
    console.log(`  Estado ${plan.estado} · versión ${plan.version} · ${arbol.hijos.length} objetivos específicos`);
    ok("Las columnas del plan coinciden con la ejecución de la ficha", plan.columnas === columnas, `${plan.columnas} vs ${columnas}`);
    ok("La numeración del plan es la esperada", JSON.stringify(numerar(arbol)) === JSON.stringify(arbol));
    const ids2 = aplanar(arbol).map((n) => n.id);
    ok("Los ids de los nodos son únicos", new Set(ids2).size === ids2.length);
    const problemas = validarPlanEquipo(arbol, etPlan, ids, plan.columnas);
    if (plan.estado === "enviado" || plan.estado === "aprobado") ok("El plan enviado/aprobado cumple las reglas de la ficha", problemas.length === 0, problemas.map((p) => p.mensaje).slice(0, 3).join(" | "));
    if (prop.estado === "en_ejecucion") ok("La ejecución inició con el plan aprobado", plan.estado === "aprobado", plan.estado);

    // 5. Ejecución
    etapa("5. Ejecución");
    const regs = await db.select().from(registrosPlan).where(eq(registrosPlan.propuestaId, id));
    const arrastre = opcionesRegistro(ejec).avance;
    const respMap = responsables(arbol);
    const porSub = etPlan.granularidad === "subperiodo" ? ejec.subperiodos : 1;
    const cols = Array.from({ length: plan.columnas }, (_, i) => ({ periodo: Math.floor(i / porSub) + 1, sub: etPlan.granularidad === "subperiodo" ? (i % porSub) + 1 : null, texto: "" }));
    console.log(`  ${regs.length} registro(s) · registro ${opcionesRegistro(ejec).modo}, informe ${opcionesRegistro(ejec).informe}`);
    ok("Cada registro lo hizo el responsable de la actividad", regs.every((r) => respMap.get(r.nodoId) === r.egresadoId));
    ok("Cada registro es de una actividad planificada en su período", regs.every((r) => actividadesDelPeriodo(arbol, r.periodo, cols, arrastre ? regs : null).some((a) => a.id === r.nodoId)));
    ok("Ningún registro está en un período fuera de la ejecución", regs.every((r) => r.periodo >= 1 && r.periodo <= ejec.periodos));
    if (regs.length > 0 && prop.estado !== "en_ejecucion") aviso("Hay registros, pero la propuesta no está en ejecución.");

    // 6. Informes
    etapa("6. Informes del período");
    const infs = await db.select().from(informesPlan).where(eq(informesPlan.propuestaId, id));
    const registrosInf = regs.map((r) => ({ nodoId: r.nodoId, periodo: r.periodo, egresadoId: r.egresadoId, avance: r.avance, acciones: r.acciones ?? "", resultado: r.resultado ?? "", marcoTeorico: r.marcoTeorico ?? "", estado: r.estado }));
    const periodosConInforme = [...new Set(infs.map((i) => i.periodo))].sort();
    if (periodosConInforme.length === 0) console.log("  Sin informes todavía.");
    for (const p of periodosConInforme) {
      for (const i of infs.filter((x) => x.periodo === p && x.egresadoId !== null)) {
        const inf = armarInformePeriodo({ arbol, columnas: cols, periodo: p, registros: registrosInf, integrante: i.egresadoId, arrastre });
        ok(`Período ${p}: el informe individual de ${i.egresadoId} tiene todas sus actividades registradas`, inf.sinRegistro === 0, `${inf.sinRegistro} sin registro`);
      }
      const general = infs.find((x) => x.periodo === p && x.egresadoId === null);
      if (general) {
        const conActividades = ids.filter((u) => armarInformePeriodo({ arbol, columnas: cols, periodo: p, registros: registrosInf, integrante: u, arrastre }).filas.length > 0);
        if (opcionesRegistro(ejec).informe === "individual_y_general") {
          ok(`Período ${p}: el informe general tiene los individuales de todos los que tenían actividades`, conActividades.every((u) => infs.some((x) => x.periodo === p && x.egresadoId === u)));
        }
        const g = armarInformePeriodo({ arbol, columnas: cols, periodo: p, registros: registrosInf, integrante: null, arrastre });
        const suma = conActividades.reduce((a, u) => a + armarInformePeriodo({ arbol, columnas: cols, periodo: p, registros: registrosInf, integrante: u, arrastre }).totalPeriodo, 0);
        ok(`Período ${p}: el presupuesto del general ($${g.totalPeriodo}) es la suma de los individuales`, g.totalPeriodo === suma, `$${suma}`);
        if (general.estado === "aprobado") ok(`Período ${p}: con el general aprobado, los individuales también`, infs.filter((x) => x.periodo === p && x.egresadoId !== null).every((x) => x.estado === "aprobado"));
        console.log(`  Período ${p}: general ${general.estado} · avance del proyecto ${g.avanceProyecto}%`);
      }
    }
  }

  // 7. Informe final por capítulos (investigación, I5): nada se sobrescribe y lo entregado es lo ratificado.
  const etInforme = def.etapas.find(esEtapaInformeFinal);
  if (etInforme) {
    etapa("7. Informe final");
    const idsEquipo = equipo.map((i) => i.id);
    const [inf] = await db.select().from(informesFinalesFicha).where(eq(informesFinalesFicha.propuestaId, id));
    const versiones = await db.select().from(versionesCapitulo).where(eq(versionesCapitulo.propuestaId, id));
    if (!inf) console.log("  El equipo todavía no ha abierto el informe final.");
    else {
      const estados = leerCapitulos(inf.capitulos);
      console.log(`  Estado ${inf.estado} · ${versiones.length} versión(es) en ${new Set(versiones.map((v) => v.espacioId)).size} capítulo(s)`);
      const idsCap = new Set(etInforme.espacios.map((e) => e.id));
      ok("Las versiones son de capítulos de la ficha", versiones.every((v) => idsCap.has(v.espacioId)));
      // Cada capítulo numera sus versiones 1, 2, 3… sin huecos: ninguna se borró.
      const porCap = new Map<string, number[]>();
      for (const v of versiones) porCap.set(v.espacioId, [...(porCap.get(v.espacioId) ?? []), v.numero]);
      ok("Ninguna versión falta (numeración continua por capítulo)", [...porCap.values()].every((ns) => [...ns].sort((a, b) => a - b).every((n, i) => n === i + 1)));
      const sinAutor = versiones.filter((v) => v.autorId === null || !idsEquipo.includes(v.autorId));
      ok("Cada versión tiene un autor del equipo", sinAutor.length === 0, sinAutor.map((v) => `${v.espacioId} v${v.numero}`).join(", "));
      const ultimas = new Map<string, (typeof versiones)[number]>();
      for (const v of versiones) if ((ultimas.get(v.espacioId)?.numero ?? 0) < v.numero) ultimas.set(v.espacioId, v);
      for (const [cap, est] of Object.entries(estados)) {
        if (est.estado === "enviado" || est.estado === "aprobado") {
          ok(`"${cap}" ${est.estado}: la versión revisada es la vigente`, est.version === (ultimas.get(cap)?.numero ?? null), `revisada v${est.version}, vigente v${ultimas.get(cap)?.numero}`);
        }
      }
      if (inf.estado === "entregado" || inf.estado === "aprobado") {
        const contenidos = Object.fromEntries(etInforme.espacios.map((e) => [e.id, ultimas.get(e.id)?.contenido ?? ""]));
        ok("Todos los capítulos estaban aprobados al entregar", capitulosPendientes(etInforme, estados, contenidos).length === 0);
        // Misma huella que actions/informeFinalFicha.ts: [espacio, versión, contenido] en el orden de la ficha.
        const huella = crypto.createHash("sha256").update(JSON.stringify(etInforme.espacios.map((e) => [e.id, ultimas.get(e.id)?.numero ?? null, ultimas.get(e.id)?.contenido ?? ""]))).digest("hex");
        ok("El contenido vigente es exactamente el entregado (misma huella)", inf.huellaFinal === huella);
        if (etInforme.revision.ratificacion && idsEquipo.length > 1) {
          const firmas = await db.select().from(ratificacionesInformeFinal).where(eq(ratificacionesInformeFinal.propuestaId, id));
          ok("Todo el equipo ratificó la versión entregada", idsEquipo.every((u) => firmas.some((f) => f.usuarioId === u && f.huellaFirmada === inf.huellaFinal)));
        }
      }
      if (inf.estado === "aprobado") ok("El dictamen final del asesor quedó por escrito", (inf.comentarioFinal ?? "").trim().length >= 20);
    }
  }

  console.log(`\n${fallas === 0 ? "Flujo coherente." : `${fallas} comprobación(es) fallaron.`}${avisos ? ` ${avisos} aviso(s).` : ""}`);
  process.exitCode = fallas === 0 ? 0 : 1;
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
