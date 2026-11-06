// Prueba completa del flujo de proyecto (entrega P6). Solo lectura: revisa que una propuesta de proyecto sea
// coherente de punta a punta con su ficha, etapa por etapa:
//   ficha → equipo → propuesta (pasos y firmas) → plan de trabajo → ejecución (registros) → informes del período.
// No cambia nada. Termina con código 1 si alguna comprobación falla.
// Uso: npx tsx --env-file=.env.local scripts/fichas/verificar_flujo_proyecto.ts <propuestaId>
import { and, eq } from "drizzle-orm";
import { db } from "../../src/lib/db";
import {
  fichas, fichasVersiones, historialEstados, informesPlan, integrantesProyecto, periodos, planesTrabajo, propuestas,
  ratificacionesPropuesta, registrosPlan, respuestasEspacios, usuarios,
} from "../../src/lib/schema";
import { esEtapaEjecucion, esEtapaPlan, esEtapaPropuesta, opcionesRegistro, type DefinicionFicha } from "../../src/lib/fichas/tipos";
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
  exigirBaseDesarrollo("verificar_flujo_proyecto");
  const id = Number(process.argv[2]);
  if (!Number.isInteger(id)) throw new Error("Indica el id de la propuesta: verificar_flujo_proyecto.ts <propuestaId>");

  // 1. Ficha
  etapa("1. Ficha");
  const [prop] = await db.select().from(propuestas).where(eq(propuestas.id, id));
  if (!prop) throw new Error(`La propuesta ${id} no existe.`);
  ok("Es una propuesta de proyecto", prop.tipo === "proyecto", prop.tipo);
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
  const idsEspacios = new Set(espacios.map((e) => e.id));
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
  etapa("4. Plan de trabajo");
  const [plan] = await db.select().from(planesTrabajo).where(eq(planesTrabajo.propuestaId, id));
  if (!plan) {
    if (["aprobada", "primer_contacto_completado", "en_ejecucion"].includes(prop.estado)) aviso("La propuesta está aprobada, pero el equipo no ha abierto su plan.");
    else console.log("  Sin plan todavía (la propuesta no está aprobada).");
  } else if (etPlan && ejec) {
    const arbol = plan.arbol as NodoPlan;
    const ids = equipo.map((i) => i.id);
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
    const respMap = responsables(arbol);
    const porSub = etPlan.granularidad === "subperiodo" ? ejec.subperiodos : 1;
    const cols = Array.from({ length: plan.columnas }, (_, i) => ({ periodo: Math.floor(i / porSub) + 1, sub: etPlan.granularidad === "subperiodo" ? (i % porSub) + 1 : null, texto: "" }));
    console.log(`  ${regs.length} registro(s) · registro ${opcionesRegistro(ejec).modo}, informe ${opcionesRegistro(ejec).informe}`);
    ok("Cada registro lo hizo el responsable de la actividad", regs.every((r) => respMap.get(r.nodoId) === r.egresadoId));
    ok("Cada registro es de una actividad planificada en su período", regs.every((r) => actividadesDelPeriodo(arbol, r.periodo, cols).some((a) => a.id === r.nodoId)));
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
        const inf = armarInformePeriodo({ arbol, columnas: cols, periodo: p, registros: registrosInf, integrante: i.egresadoId });
        ok(`Período ${p}: el informe individual de ${i.egresadoId} tiene todas sus actividades registradas`, inf.sinRegistro === 0, `${inf.sinRegistro} sin registro`);
      }
      const general = infs.find((x) => x.periodo === p && x.egresadoId === null);
      if (general) {
        const conActividades = ids.filter((u) => armarInformePeriodo({ arbol, columnas: cols, periodo: p, registros: registrosInf, integrante: u }).filas.length > 0);
        if (opcionesRegistro(ejec).informe === "individual_y_general") {
          ok(`Período ${p}: el informe general tiene los individuales de todos los que tenían actividades`, conActividades.every((u) => infs.some((x) => x.periodo === p && x.egresadoId === u)));
        }
        const g = armarInformePeriodo({ arbol, columnas: cols, periodo: p, registros: registrosInf, integrante: null });
        const suma = conActividades.reduce((a, u) => a + armarInformePeriodo({ arbol, columnas: cols, periodo: p, registros: registrosInf, integrante: u }).totalPeriodo, 0);
        ok(`Período ${p}: el presupuesto del general ($${g.totalPeriodo}) es la suma de los individuales`, g.totalPeriodo === suma, `$${suma}`);
        if (general.estado === "aprobado") ok(`Período ${p}: con el general aprobado, los individuales también`, infs.filter((x) => x.periodo === p && x.egresadoId !== null).every((x) => x.estado === "aprobado"));
        console.log(`  Período ${p}: general ${general.estado} · avance del proyecto ${g.avanceProyecto}%`);
      }
    }
  }

  console.log(`\n${fallas === 0 ? "Flujo coherente." : `${fallas} comprobación(es) fallaron.`}${avisos ? ` ${avisos} aviso(s).` : ""}`);
  process.exitCode = fallas === 0 ? 0 : 1;
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
