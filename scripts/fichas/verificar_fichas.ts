// Comprobaciones del modelo de fichas, sin base de datos. Hace las veces de pruebas: el proyecto no tiene un
// framework de pruebas. Termina con código 1 si algo falla.
//   1. Las fichas base son válidas.
//   2. Los valores copiados de la fase 1 siguen escritos igual en el código (si alguien los cambia allá,
//      esta comprobación avisa para actualizar src/lib/fichas/fichasBase.ts).
//   3. La validación detecta los errores típicos.
// Uso: npx tsx scripts/fichas/verificar_fichas.ts
import { readFileSync } from "fs";
import path from "path";
import { definicionBase, VALORES_FASE1_COPIADOS as V } from "../../src/lib/fichas/fichasBase";
import { tieneFormaDeDefinicion, validarDefinicion } from "../../src/lib/fichas/validar";
import { compararDefiniciones } from "../../src/lib/fichas/diferencias";
import { diasSubperiodos, documentoSolicitado, esEtapaEjecucion, esEtapaPlan, esEtapaInformeFinal, esEtapaPropuesta, esEtapaProtocolo, opcionesRegistro, PRECARGA_MARCO_REGISTROS, type DefinicionFicha, type Modalidad } from "../../src/lib/fichas/tipos";
import { ejecucionNueva, informeFinalNuevo, planNuevo, protocoloNuevo } from "../../src/lib/fichas/plantillas";
import { CATALOGO, GRUPOS_CATALOGO, parametrosPorDefecto } from "../../src/lib/fichas/catalogo";
import { leerItems, problemasRecurso, recursoCompleto } from "../../src/lib/fichas/elementosRecurso";
import { fechaLimiteDictamen, precargaEspacio, problemasProtocolo, sumarDias, textoPrecarga } from "../../src/lib/fichas/protocolo";
import {
  avanceApartado, citasEnTexto, guardarComoTexto, leerApartado, opcionesDeEspacio, parteVacia, revisarApartado, revisarReferencias, tipoApartado,
  TIPOS_APARTADO, type ContenidoApartado,
} from "../../src/lib/fichas/apartadosAcademicos";
import type { Espacio } from "../../src/lib/fichas/tipos";
import { CAPITULO_NUEVO, capituloEditable, capitulosPendientes, contenidoVacio, editandoOtro, precargaCapitulo, problemasInformeFinal, textoMarcoRegistros } from "../../src/lib/fichas/informeFinalFicha";
import { apartadosInformeFinal } from "../../src/lib/fichas/documentoInformeFinal";
import { armarInformePeriodo, numerarEvidencias } from "../../src/lib/fichas/informePeriodo";
import { ganttPlan, responsables, actividadesDelPeriodo, arrastradasAlPeriodo, avancePorNodo, validarRegistroProyecto, faltaParaAvance, aplanar, cambioNoPermitido, cargaPorIntegrante, numerar, planEjemplo, planIndividual, totalesNodo, validarPlanEquipo, type NodoPlan } from "../../src/lib/fichas/planTrabajo";

let fallas = 0;
function comprobar(descripcion: string, ok: boolean, detalle = "") {
  console.log(`${ok ? "✓" : "✗"} ${descripcion}${!ok && detalle ? ` — ${detalle}` : ""}`);
  if (!ok) fallas++;
}

const raiz = path.resolve(__dirname, "../..");
const fuente = (archivo: string) => readFileSync(path.join(raiz, archivo), "utf8");
const contiene = (archivo: string, patron: RegExp) => patron.test(fuente(archivo));

/** n palabras de relleno (para llegar a los mínimos de un texto). */
const relleno = (n: number) => Array.from({ length: n }, (_, i) => `palabra${i}`).join(" ") + ".";
/** Un apartado académico con todos sus subapartados en el mínimo. */
function apartadoCompleto(e: Pick<Espacio, "parametros">): string {
  const tipo = tipoApartado(e)!;
  const partes: Record<string, string> = {};
  for (const p of tipo.partes) {
    if (p.formato === "texto") partes[p.id] = relleno(Math.max(p.min ?? 0, 5));
    else if (p.formato === "pregunta") partes[p.id] = `¿${relleno(Math.max(p.min ?? 0, 8)).slice(0, -1)}?`;
    else if (p.formato === "seleccion") partes[p.id] = p.opciones![0].valor;
    else if (p.formato === "tabla") partes[p.id] = JSON.stringify([(p.columnas ?? []).map((c) => `${c} 1`)]);
    else partes[p.id] = "Uno\nDos\nTres";
  }
  return guardarComoTexto({ partes, autoevaluacion: [] });
}

// 1. Fichas base
for (const modalidad of ["pasantia", "proyecto", "investigacion"] as Modalidad[]) {
  const problemas = validarDefinicion(definicionBase(modalidad));
  comprobar(`La ficha base de ${modalidad} es válida`, problemas.length === 0, problemas.map((p) => p.mensaje).join(" | "));
}
const pasantia = definicionBase("pasantia");
const ejecucion = pasantia.etapas.find(esEtapaEjecucion)!;
comprobar("La pasantía tiene 5 períodos de 30 días", ejecucion.periodos === 5 && ejecucion.duracionPeriodo === 30);
comprobar(
  "Los subperíodos de la pasantía son de 7, 7, 7 y 9 días",
  diasSubperiodos(ejecucion.duracionPeriodo, ejecucion.subperiodos).join(",") === "7,7,7,9"
);
comprobar(
  "Los pasos de la propuesta de pasantía coinciden con el asistente actual",
  pasantia.etapas.filter(esEtapaPropuesta)[0].espacios.map((e) => e.titulo).join(" | ") ===
    "Portada | Datos empresariales | Datos de supervisor | Carta de Aceptación | Descripción de actividades | Justificación del proceso | Documentos del estudiante"
);
comprobar("El proyecto tiene 8 pasos", definicionBase("proyecto").etapas.filter(esEtapaPropuesta)[0].espacios.length === 8);
comprobar("La investigación tiene 7 pasos", definicionBase("investigacion").etapas.filter(esEtapaPropuesta)[0].espacios.length === 7);

// 2. Valores copiados de la fase 1
comprobar(
  `La carta de pasantía sigue pidiendo ${V.diasAnticipacionCarta} días de anticipación`,
  contiene("src/components/CartaForm.tsx", new RegExp(`addDays\\(val, ${V.diasAnticipacionCarta}\\)`))
);
comprobar(
  `La carta de proyecto sigue pidiendo ${V.diasAnticipacionCarta} días de anticipación`,
  contiene("src/components/proyecto/CartaProyectoForm.tsx", new RegExp(`addDays\\(val, ${V.diasAnticipacionCarta}\\)`))
);
comprobar(
  `El primer contacto sigue venciendo a los ${V.diasPrimerContacto} días`,
  contiene("src/app/actions/informes.ts", new RegExp(`fechaLimite\\.setDate\\(fechaLimite\\.getDate\\(\\) \\+ ${V.diasPrimerContacto}\\)`))
);
comprobar(
  `El plazo de revisión sigue siendo de ${V.diasRevision} días`,
  contiene("src/app/actions/registrosActividad.ts", new RegExp(`DIAS_PLAZO_REVISION = ${V.diasRevision};`))
);
comprobar(
  `Se sigue permitiendo ${V.eliminacionesPorPeriodo} eliminación por período`,
  contiene("src/app/actions/cambiosActividad.ts", new RegExp(`MAX_ELIMINACIONES_POR_MES = ${V.eliminacionesPorPeriodo};`))
);
comprobar(
  `La visita sigue siendo requisito del informe ${V.informeRequisitoVisita}`,
  contiene("src/app/actions/informesMensuales.ts", new RegExp(`NUMERO_INFORME_VISITA = ${V.informeRequisitoVisita};`))
);
comprobar(
  `El equipo sigue siendo de máximo ${V.maxIntegrantesEquipo} integrantes`,
  contiene("src/app/actions/proyecto.ts", new RegExp(`MAX_INTEGRANTES_EQUIPO = ${V.maxIntegrantesEquipo};`))
);
comprobar(
  "Los objetivos específicos siguen siendo de 4 a 6",
  contiene("src/app/actions/proyecto.ts", /OBJETIVOS_FASE1 = \{ min: 4, max: 6 \}/)
);

// 3. La validación detecta errores típicos
function conCambio(cambiar: (d: DefinicionFicha) => void): string[] {
  const d = definicionBase("pasantia");
  cambiar(d);
  return validarDefinicion(d).map((p) => p.mensaje);
}
const propuesta = (d: DefinicionFicha) => d.etapas.filter(esEtapaPropuesta)[0];
const ejec = (d: DefinicionFicha) => d.etapas.filter(esEtapaEjecucion)[0];
const detecta = (descripcion: string, mensajes: string[], parte: string) =>
  comprobar(`Detecta: ${descripcion}`, mensajes.some((m) => m.includes(parte)), mensajes.join(" | ") || "sin problemas");

detecta("supervisor antes de la empresa", conCambio((d) => propuesta(d).espacios.reverse()), "debe ir después de");
// Revisión del catálogo (13-nov-2026): cualquier elemento se puede usar en cualquier modalidad.
comprobar("Un elemento de proyecto (objetivos) se puede usar en una ficha de pasantía", conCambio((d) => {
  propuesta(d).espacios.push({ ...propuesta(d).espacios[0], id: "obj", elemento: "objetivos", titulo: "Objetivos", parametros: { minEspecificos: 4, maxEspecificos: 6 } });
}).length === 0);
detecta("un elemento fuera de su etapa (tabla en la propuesta de pasantía)", conCambio((d) => {
  propuesta(d).espacios.push({ ...propuesta(d).espacios[0], id: "t", elemento: "tabla", titulo: "Tabla", parametros: parametrosPorDefecto("tabla") });
}), "no se puede usar en la propuesta");
detecta("elemento no repetible duplicado", conCambio((d) => propuesta(d).espacios.push({ ...propuesta(d).espacios[0], id: "portada2" })), "solo puede aparecer una vez");
detecta("parámetro fuera de rango", conCambio((d) => { propuesta(d).espacios.find((e) => e.elemento === "cronograma")!.parametros.minActividadesPeriodo = 0; }), "debe estar entre");
detecta("carta y ejecución con duraciones distintas", conCambio((d) => { ejec(d).periodos = 4; }), "no coincide");
detecta("hito fuera de la etapa", conCambio((d) => { ejec(d).hitos.find((h) => h.id === "visita")!.hasta = 400; }), "termina después del fin");
detecta("cronograma sin ejecución", conCambio((d) => { d.etapas = d.etapas.filter(esEtapaPropuesta); }), "necesita una etapa de ejecución");
detecta("responsable por actividad en trabajo individual", conCambio((d) => {
  propuesta(d).espacios.find((e) => e.elemento === "cronograma")!.parametros.responsablePorActividad = true;
}), "solo aplica a trabajos en equipo");

// 4. Comparación entre versiones (resumen que se muestra al habilitar)
comprobar("Dos definiciones iguales no tienen cambios", compararDefiniciones(definicionBase("pasantia"), definicionBase("pasantia")).length === 0);
{
  const nueva = definicionBase("pasantia");
  ejec(nueva).periodos = 4;
  propuesta(nueva).espacios.splice(5, 1);
  const cambios = compararDefiniciones(definicionBase("pasantia"), nueva);
  comprobar("Detecta un espacio quitado", cambios.some((c) => c.includes('Se quitó el espacio "Justificación del proceso"')), cambios.join(" | "));
  comprobar("Detecta un cambio en la ejecución", cambios.some((c) => c.includes("períodos, 5 → 4")), cambios.join(" | "));
}
comprobar("Una definición mal formada se rechaza", !tieneFormaDeDefinicion({ formato: 1, modalidad: "pasantia", etapas: "x" }));
comprobar("Las fichas base tienen la forma esperada", (["pasantia", "proyecto", "investigacion"] as Modalidad[]).every((m) => tieneFormaDeDefinicion(definicionBase(m))));

// 5. Ficha de proyecto completa: plan de trabajo y ejecución en equipo (entrega P1)
function proyectoCompleto(): DefinicionFicha {
  const d = definicionBase("proyecto");
  const [prop] = d.etapas;
  d.etapas = [prop, planNuevo("plan"), ejecucionNueva("ejecucion", "proyecto", 1, true)];
  // La carta de la base dura 150 días: 5 períodos de 30.
  return d;
}
{
  const d = proyectoCompleto();
  const problemas = validarDefinicion(d);
  comprobar("La ficha de proyecto con plan y ejecución es válida", problemas.length === 0, problemas.map((p) => p.mensaje).join(" | "));
  comprobar("La ficha de proyecto completa tiene la forma esperada", tieneFormaDeDefinicion(JSON.parse(JSON.stringify(d))));
  const et = ejec(d);
  const op = opcionesRegistro(et);
  comprobar("La ejecución de proyecto no aplica métrica", et.informe.paginasMinimas === 0 && et.registro.imagenes === 0 && op.marcoTeorico === "no");
  comprobar("La ejecución de proyecto registra por actividad y entrega un solo informe general", op.modo === "actividad" && op.informe === "unico");
  comprobar("Las versiones guardadas antes se leen como pasantía", opcionesRegistro(ejec(definicionBase("pasantia"))).modo === "subperiodo");
}
function proyectoConCambio(cambiar: (d: DefinicionFicha) => void): string[] {
  const d = proyectoCompleto();
  cambiar(d);
  return validarDefinicion(d).map((p) => p.mensaje);
}
detecta("plan sin objetivos en la propuesta", proyectoConCambio((d) => { propuesta(d).espacios = propuesta(d).espacios.filter((e) => e.elemento !== "objetivos"); }), "agrega el espacio \"Objetivos\"");
detecta("plan sin ejecución", proyectoConCambio((d) => { d.etapas = d.etapas.filter((e) => !esEtapaEjecucion(e)); }), "plan de trabajo necesita una etapa de ejecución");
detecta("plan después de la ejecución", proyectoConCambio((d) => { d.etapas = [d.etapas[0], d.etapas[2], d.etapas[1]]; }), "inmediatamente después de la propuesta");
detecta("plan en una pasantía", conCambio((d) => { d.etapas.splice(1, 0, planNuevo("plan")); }), "el plan de trabajo es para proyecto");
detecta("registro por actividad sin plan", proyectoConCambio((d) => { d.etapas = d.etapas.filter((e) => !esEtapaPlan(e)); }), "necesita un plan de trabajo");
detecta("mínimo de objetivos fuera de rango", proyectoConCambio((d) => { d.etapas.find(esEtapaPlan)!.minimos.objetivosPorIntegrante = 0; }), "objetivos específicos por integrante");
{
  const anterior = proyectoCompleto();
  const nueva = proyectoCompleto();
  nueva.etapas.find(esEtapaPlan)!.equipo.responsable = "actividad";
  const cambios = compararDefiniciones(anterior, nueva);
  comprobar("Detecta un cambio en el plan de trabajo", cambios.some((c) => c.includes("Plan de trabajo: responsable")), cambios.join(" | "));
}

// 6. Sumas del plan, plan individual y carga por integrante
{
  const plan = planNuevo("plan");
  const columnas = 8;
  const raiz = planEjemplo(plan, 3, columnas);
  const total = (n: NodoPlan) => totalesNodo(n, columnas).reduce((a, b) => a + b, 0);
  const hojas = aplanar(raiz).filter((n) => n.hijos.length === 0);
  const sumaHojas = hojas.reduce((a, n) => a + n.montos.reduce((x, y) => x + y, 0), 0);
  comprobar("El objetivo general suma los montos de todas las actividades", total(raiz) === sumaHojas && sumaHojas > 0);
  comprobar("Cada nivel suma los de sus hijos", aplanar(raiz).filter((n) => n.hijos.length > 0).every((n) => total(n) === n.hijos.reduce((a, h) => a + total(h), 0)));
  const carga = cargaPorIntegrante(raiz, 3, columnas);
  comprobar("Con responsable por objetivo, cada integrante tiene sus 3 objetivos", carga.every((c) => c.objetivos === 3), JSON.stringify(carga));
  comprobar("Los planes individuales suman el plan general", carga.reduce((a, c) => a + c.monto, 0) === total(raiz));
  const individual = planIndividual(raiz, 2)!;
  comprobar("El plan individual conserva el objetivo general (consecuencia lógica)", individual.nivel === 1 && individual.hijos.every((o) => o.responsable === 2));
  const porActividad = planEjemplo({ ...plan, equipo: { ...plan.equipo, responsable: "actividad" } }, 3, columnas);
  const cargaAct = cargaPorIntegrante(porActividad, 3, columnas);
  comprobar("Con responsable por actividad, todos tienen actividades", cargaAct.every((c) => c.actividades > 0), JSON.stringify(cargaAct));
}

// 7. Plan real del equipo (P3): validación contra la ficha y permisos por integrante
{
  const plan = planNuevo("plan");
  const cols = 8;
  // Ejemplo con ids de usuario 11, 12 y 13 como responsables.
  const conIds = (n: NodoPlan): NodoPlan => ({ ...n, responsable: n.responsable ? n.responsable + 10 : null, hijos: n.hijos.map(conIds) });
  const raiz = numerar(conIds(planEjemplo(plan, 3, cols)));
  const ids = [11, 12, 13];
  const problemas = validarPlanEquipo(raiz, plan, ids, cols);
  comprobar("Un plan completo del equipo no tiene pendientes", problemas.length === 0, problemas.map((p) => p.mensaje).join(" | "));

  const sinResp = structuredClone(raiz);
  sinResp.hijos[0].responsable = null;
  comprobar("Detecta un objetivo sin responsable", validarPlanEquipo(sinResp, plan, ids, cols).some((p) => p.mensaje.includes("falta el integrante responsable")));
  const sinMontos = structuredClone(raiz);
  sinMontos.hijos[0].hijos[0].hijos[0].montos = [];
  comprobar("Detecta una actividad sin columnas", validarPlanEquipo(sinMontos, plan, ids, cols).some((p) => p.mensaje.includes("al menos un")));
  const pocos = structuredClone(raiz);
  pocos.hijos = pocos.hijos.filter((o) => o.responsable !== 13 || o.codigo !== "1.7");
  comprobar("Detecta un integrante con menos objetivos del mínimo", validarPlanEquipo(numerar(pocos), plan, ids, cols).some((p) => p.mensaje.includes("al menos 3 objetivos")));

  // Permisos: el integrante 12 cambia lo suyo (permitido) y lo de otro (no permitido).
  const propio = structuredClone(raiz);
  const suyo = propio.hijos.find((o) => o.responsable === 12)!;
  suyo.hijos[0].hijos[0].titulo = "Actividad cambiada";
  suyo.hijos[0].hijos.push({ id: "nueva", codigo: "", nivel: 4, titulo: "Nueva", responsable: null, montos: [50], hijos: [] });
  comprobar("Un integrante puede cambiar y ampliar lo suyo", cambioNoPermitido(raiz, numerar(propio), 12) === null, String(cambioNoPermitido(raiz, numerar(propio), 12)));
  const ajeno = structuredClone(raiz);
  ajeno.hijos.find((o) => o.responsable === 11)!.titulo = "Cambio ajeno";
  comprobar("Un integrante no puede cambiar lo de otro", cambioNoPermitido(raiz, ajeno, 12) !== null);
  const reasigna = structuredClone(raiz);
  reasigna.hijos.find((o) => o.responsable === 12)!.responsable = 13;
  comprobar("Un integrante no puede reasignar responsables", cambioNoPermitido(raiz, reasigna, 12) !== null);
}

// 8. Ejecución del proyecto (P4): actividades del período, avance por nivel y reglas del registro
{
  const plan = planNuevo("plan");
  const columnas = Array.from({ length: 8 }, (_, i) => ({ periodo: Math.floor(i / 4) + 1 }));
  const raiz = numerar(planEjemplo(plan, 3, 8));
  const p1 = actividadesDelPeriodo(raiz, 1, columnas);
  const p2 = actividadesDelPeriodo(raiz, 2, columnas);
  comprobar("Cada actividad cae en los períodos donde tiene montos", p1.length > 0 && p2.length > 0 && p1.every((a) => a.montos.slice(0, 4).some((m) => m > 0)));
  const hojas = aplanar(raiz).filter((n) => n.hijos.length === 0);
  const av = avancePorNodo(raiz, new Map(hojas.map((h, i) => [h.id, i === 0 ? 100 : 0])));
  comprobar("El avance de una actividad sube a su objetivo y al general", av.get(hojas[0].id) === 100 && (av.get(raiz.id) ?? 0) > 0 && (av.get(raiz.id) ?? 0) < 100);
  const reglas = { acciones: { min: 0, max: 0 }, resultado: { min: 0, max: 0 }, marcoTeorico: "opcional" as const, avance: true };
  const fechas = { fechaInicio: "2026-11-02", fechaFin: "2026-11-06" };
  comprobar("Un registro sin métrica solo pide fechas, avance, acciones y resultado", validarRegistroProyecto({ avance: 50, acciones: "Se hizo.", resultado: "Listo.", marcoTeorico: "", ...fechas }, reglas).length === 0);
  comprobar("Detecta un registro sin fechas", validarRegistroProyecto({ avance: 50, acciones: "x", resultado: "y", marcoTeorico: "" }, reglas).some((p) => p.includes("fechas")));
  comprobar("Detecta fechas invertidas", validarRegistroProyecto({ avance: 50, acciones: "x", resultado: "y", marcoTeorico: "", fechaInicio: "2026-11-06", fechaFin: "2026-11-02" }, reglas).some((p) => p.includes("anterior")));
  const ev = { adjuntas: 1, min: 1, max: 5 };
  comprobar("El avance se habilita con fechas, lo que se hizo, el resultado y las evidencias", faltaParaAvance({ acciones: "x", resultado: "y", ...fechas }, ev).length === 0);
  comprobar("Sin evidencias ni resultado, el avance espera", faltaParaAvance({ acciones: "x", resultado: "", ...fechas }, { ...ev, adjuntas: 0 }).join() === "lo que se obtuvo,las evidencias");
  comprobar("Detecta un registro sin avance", validarRegistroProyecto({ avance: null, acciones: "x", resultado: "y", marcoTeorico: "", ...fechas }, reglas).some((p) => p.includes("avance")));
  comprobar("Detecta marco teórico obligatorio vacío", validarRegistroProyecto({ avance: 10, acciones: "x", resultado: "y", marcoTeorico: "", ...fechas }, { ...reglas, marcoTeorico: "obligatorio" }).length === 1);
}

// 9. Informe del período (P5): individual y general
{
  const plan = planNuevo("plan");
  const columnas = Array.from({ length: 8 }, (_, i) => ({ periodo: Math.floor(i / 4) + 1, sub: (i % 4) + 1, texto: `S${(i % 4) + 1}` }));
  const conIds = (n: NodoPlan): NodoPlan => ({ ...n, responsable: n.responsable ? n.responsable + 10 : null, hijos: n.hijos.map(conIds) });
  const raiz = numerar(conIds(planEjemplo(plan, 3, 8)));
  const delP1 = actividadesDelPeriodo(raiz, 1, columnas);
  // Se registra (enviado) solo la primera actividad del período.
  const registros = [{ nodoId: delP1[0].id, periodo: 1, egresadoId: 11, avance: 100, acciones: "a", resultado: "r", marcoTeorico: "", estado: "enviado" }];
  const general = armarInformePeriodo({ arbol: raiz, columnas, periodo: 1, registros, integrante: null });
  const montoEsperado = delP1[0].montos.slice(0, 4).reduce((a, b) => a + b, 0);
  comprobar("El informe general solo suma lo ejecutado en el período", general.totalPeriodo === montoEsperado && montoEsperado > 0, `${general.totalPeriodo} vs ${montoEsperado}`);
  comprobar("El informe cuenta las actividades sin registro", general.sinRegistro === delP1.length - 1);
  const filaAct = general.filas.find((f) => f.id === delP1[0].id)!;
  comprobar("Una actividad al 100% queda Finalizada", filaAct.estado === "Finalizada" && filaAct.registro !== null);
  const individuales = [11, 12, 13].map((id) => armarInformePeriodo({ arbol: raiz, columnas, periodo: 1, registros, integrante: id }));
  const actsGeneral = general.filas.filter((f) => f.nivel >= 4).length;
  comprobar("Los informes individuales juntos tienen las actividades del general", individuales.reduce((a, i) => a + i.filas.filter((f) => f.nivel >= 4).length, 0) === actsGeneral);
  const borrador = armarInformePeriodo({ arbol: raiz, columnas, periodo: 1, registros: [{ ...registros[0], estado: "borrador" }], integrante: null });
  comprobar("Un borrador no cuenta en el informe", borrador.totalPeriodo === 0 && borrador.sinRegistro === delP1.length);
}

// 10. Arrastre (reunión 6-nov): lo que queda incompleto en un período pasa al siguiente
{
  const columnas = [{ periodo: 1 }, { periodo: 2 }, { periodo: 3 }];
  const hoja = (id: string, montos: number[]): NodoPlan => ({ id, codigo: "", nivel: 4, titulo: id, responsable: null, montos, hijos: [] });
  const raiz = numerar({ id: "og", codigo: "", nivel: 1, titulo: "OG", responsable: null, montos: [], hijos: [
    { id: "oe", codigo: "", nivel: 2, titulo: "OE", responsable: 11, montos: [], hijos: [
      { id: "m", codigo: "", nivel: 3, titulo: "M", responsable: null, montos: [], hijos: [hoja("a", [10, 0, 0]), hoja("b", [10, 0, 0]), hoja("c", [0, 10, 0])] },
    ] },
  ] });
  const regs = [
    { nodoId: "a", periodo: 1, avance: 70, estado: "aprobado" },
    { nodoId: "b", periodo: 1, avance: 100, estado: "aprobado" },
  ];
  const ids = (p: number, r: typeof regs | null) => actividadesDelPeriodo(raiz, p, columnas, r).map((n) => n.id).sort().join(",");
  comprobar("Sin registros, el período solo tiene lo planificado", ids(2, null) === "c");
  comprobar("Una actividad al 70 % pasa al período siguiente; una al 100 % no", ids(2, regs) === "a,c", ids(2, regs));
  comprobar("El arrastre dice de dónde viene y con cuánto", JSON.stringify(arrastradasAlPeriodo(raiz, 2, columnas, regs).get("a")) === JSON.stringify({ desde: 1, avance: 70 }));
  comprobar("Si se completa en el período 2, ya no pasa al 3", ids(3, [...regs, { nodoId: "a", periodo: 2, avance: 100, estado: "enviado" }]) === "c");
  comprobar("Un borrador no corta el arrastre", ids(3, [...regs, { nodoId: "a", periodo: 2, avance: 100, estado: "borrador" }]).includes("a"));
  comprobar("Lo planificado después no se arrastra antes de tiempo", !ids(1, regs).includes("c"));
  const reg2 = (n: string, p: number, av: number, e: string) => ({ nodoId: n, periodo: p, egresadoId: 11, avance: av, acciones: "x", resultado: "y", marcoTeorico: "", estado: e });
  const inf2 = armarInformePeriodo({ arbol: raiz, columnas: columnas.map((c) => ({ ...c, sub: null, texto: `P${c.periodo}` })), periodo: 2, registros: [reg2("a", 1, 70, "aprobado"), reg2("b", 1, 100, "aprobado")], integrante: null, arrastre: true });
  const filaA = inf2.filas.find((f) => f.id === "a");
  comprobar("El informe del período 2 incluye la actividad arrastrada y la pide registrar", filaA?.vieneDe === 1 && inf2.sinRegistro === 2, `${filaA?.vieneDe} / ${inf2.sinRegistro}`);
}

// 10b. Avance desde subactividades terminadas; los objetivos promedian igual (respuesta del asesor, nov-2026)
{
  const sub = (id: string): NodoPlan => ({ id, codigo: "", nivel: 5, titulo: id, responsable: null, montos: [10], hijos: [] });
  const act = (id: string, subs: NodoPlan[]): NodoPlan => ({ id, codigo: "", nivel: 4, titulo: id, responsable: null, montos: [], hijos: subs });
  const raiz = numerar({ id: "og", codigo: "", nivel: 1, titulo: "OG", responsable: null, montos: [], hijos: [
    { id: "oe1", codigo: "", nivel: 2, titulo: "OE1", responsable: null, montos: [], hijos: [{ id: "m1", codigo: "", nivel: 3, titulo: "M1", responsable: null, montos: [], hijos: [act("a1", [sub("s1"), sub("s2"), sub("s3"), sub("s4")])] }] },
    { id: "oe2", codigo: "", nivel: 2, titulo: "OE2", responsable: null, montos: [], hijos: [{ id: "m2", codigo: "", nivel: 3, titulo: "M2", responsable: null, montos: [], hijos: [act("a2", [sub("s5")])] }] },
  ] });
  const av = avancePorNodo(raiz, new Map([["s1", 100], ["s2", 100], ["s3", 100], ["s4", 0], ["s5", 0]]));
  comprobar("Una actividad con 3 de 4 subactividades terminadas va al 75 %", av.get("a1") === 75);
  comprobar("El objetivo general promedia sus objetivos sin ponderar", av.get("og") === Math.round((75 + 0) / 2), String(av.get("og")));
  const reglas = { acciones: { min: 0, max: 0 }, resultado: { min: 0, max: 0 }, marcoTeorico: "no" as const, avance: true };
  comprobar("Una subactividad no admite porcentajes intermedios", validarRegistroProyecto({ avance: 50, acciones: "x", resultado: "y", marcoTeorico: "", fechaInicio: "2026-11-02", fechaFin: "2026-11-02" }, reglas, true).length === 1);
  comprobar("Una subactividad se registra terminada o no", validarRegistroProyecto({ avance: 100, acciones: "x", resultado: "y", marcoTeorico: "", fechaInicio: "2026-11-02", fechaFin: "2026-11-02" }, reglas, true).length === 0);
}

// 10c. Gantt planificado y real
{
  const columnas = [{ periodo: 1 }, { periodo: 2 }, { periodo: 3 }];
  const hoja = (id: string, montos: number[]): NodoPlan => ({ id, codigo: "", nivel: 4, titulo: id, responsable: null, montos, hijos: [] });
  const raiz = numerar({ id: "og", codigo: "", nivel: 1, titulo: "OG", responsable: null, montos: [], hijos: [
    { id: "oe", codigo: "", nivel: 2, titulo: "OE", responsable: null, montos: [], hijos: [
      { id: "m", codigo: "", nivel: 3, titulo: "M", responsable: null, montos: [], hijos: [hoja("a", [10, 0, 0]), hoja("c", [0, 10, 0])] },
    ] },
  ] });
  const g = ganttPlan(raiz, columnas, [{ nodoId: "a", periodo: 1, avance: 70, estado: "aprobado" }], 3, 2);
  const fila = (id: string) => g.find((f) => f.id === id)!;
  comprobar("El Gantt marca lo planificado por período", fila("a").celdas.map((c) => c.planificado).join() === "true,false,false" && fila("m").celdas.map((c) => c.planificado).join() === "true,true,false");
  comprobar("El Gantt muestra el avance acumulado y el arrastre", fila("a").celdas[0].avance === 70 && fila("a").celdas[1].arrastre && fila("a").celdas[1].avance === 70);
  comprobar("El Gantt no muestra avance en períodos no abiertos", fila("a").celdas[2].avance === null && fila("og").celdas[0].avance === 35);
}

// 11. Evidencias en el informe: misma indexación que pasantía (imagen por código y letra; anexos correlativos)
{
  const acts = [{ id: "a", codigo: "1.1.1.1" }, { id: "b", codigo: "1.1.1.2" }];
  const ev = new Map([
    ["a", [{ tipo: "imagen" }, { tipo: "documento" }, { tipo: "imagen" }]],
    ["b", [{ tipo: "enlace" }, { tipo: "imagen" }]],
  ]);
  const n = numerarEvidencias(acts, ev);
  const et = (id: string) => (n.get(id) ?? []).map((e) => e.etiqueta).join(", ");
  comprobar("Las imágenes llevan el código de la actividad y una letra", et("a") === "Imagen 1.1.1.1.A, Anexo 1, Imagen 1.1.1.1.B" && et("b") === "Anexo 2, Imagen 1.1.1.2.A", `${et("a")} | ${et("b")}`);
  comprobar("Las imágenes tienen un número correlativo para el índice", (n.get("b") ?? [])[1]?.numero === 3);
  // Proyecto individual: getPlanTrabajo pone al único integrante como responsable de la raíz.
  const sinResp = (n: NodoPlan): NodoPlan => ({ ...n, responsable: null, hijos: n.hijos.map(sinResp) });
  const solo = numerar({ ...sinResp(planEjemplo(planNuevo("plan"), 1, 8)), responsable: 21 });
  const r = responsables(solo);
  comprobar("En un proyecto individual todas las actividades son del único integrante", aplanar(solo).every((n) => r.get(n.id) === 21));
  comprobar("El plan individual de ese integrante es el plan completo", aplanar(planIndividual(solo, 21) ?? solo).length === aplanar(solo).length);
  const ficha = ejecucionNueva("ejecucion", "proyecto", 1, true);
  comprobar("La ejecución de proyecto pide evidencias por actividad", opcionesRegistro(ficha).evidencias.min === 1 && opcionesRegistro(ficha).evidencias.max === 5);
}

// 12. Catálogo ampliado (parte 1): imagen, archivo, enlace y lista
{
  const def = definicionBase("proyecto");
  const prop = def.etapas.find(esEtapaPropuesta)!;
  const nuevo = (elemento: "imagen" | "archivo" | "enlace" | "lista", id: string) =>
    ({ id, elemento, titulo: id, descripcion: "", ayuda: "", obligatorio: true, parametros: parametrosPorDefecto(elemento) });
  prop.espacios.push(nuevo("imagen", "qr"), nuevo("archivo", "manual"), nuevo("enlace", "repo"), nuevo("lista", "entregables"));
  comprobar("Una ficha de proyecto acepta imagen, archivo, enlace y lista", validarDefinicion(def).length === 0, validarDefinicion(def).map((p) => p.mensaje).join(" | "));
  comprobar("La definición con recursos conserva su forma", tieneFormaDeDefinicion(JSON.parse(JSON.stringify(def))));
  const mal = structuredClone(def);
  mal.etapas.find(esEtapaPropuesta)!.espacios.find((e) => e.id === "entregables")!.parametros.minimo = 20;
  comprobar("Detecta un mínimo mayor que el máximo en un recurso", validarDefinicion(mal).some((p) => p.mensaje.includes("mínima es mayor")));
  const pas = definicionBase("pasantia");
  pas.etapas.find(esEtapaPropuesta)!.espacios.push(nuevo("enlace", "x"));
  comprobar("Los recursos también se pueden usar en pasantía", validarDefinicion(pas).length === 0, validarDefinicion(pas).map((p) => p.mensaje).join(" | "));

  const lista = { ...nuevo("lista", "l"), elemento: "lista" as const };
  comprobar("Una lista obligatoria con menos de su mínimo no está completa", !recursoCompleto(lista, JSON.stringify(["a", "b"])) && recursoCompleto(lista, JSON.stringify(["a", "b", "c"])));
  const enl = { ...nuevo("enlace", "e"), elemento: "enlace" as const };
  comprobar("Un enlace necesita dirección válida y descripción", problemasRecurso(enl, [{ url: "no-es-url", descripcion: "" }]).length === 2);
  comprobar("Un recurso opcional vacío está completo", recursoCompleto({ ...lista, obligatorio: false }, ""));
  comprobar("Lee con cuidado un contenido que no es JSON", leerItems("imagen", "texto suelto").length === 0);
}

// 13. Ficha de investigación (entrega I1): protocolo, plan con documento solicitado, tabla y precarga
function investigacionCompleta(): DefinicionFicha {
  const d = definicionBase("investigacion");
  const [prop] = d.etapas;
  d.etapas = [prop, protocoloNuevo("protocolo"), planNuevo("plan", "investigacion"), ejecucionNueva("ejecucion", "investigacion", 1, true)];
  return d;
}
function investigacionConCambio(cambiar: (d: DefinicionFicha) => void): string[] {
  const d = investigacionCompleta();
  cambiar(d);
  return validarDefinicion(d).map((p) => p.mensaje);
}
const protocoloDe = (d: DefinicionFicha) => d.etapas.find(esEtapaProtocolo)!;
{
  const d = investigacionCompleta();
  const problemas = validarDefinicion(d);
  comprobar("La ficha de investigación con protocolo, plan y ejecución es válida", problemas.length === 0, problemas.map((p) => p.mensaje).join(" | "));
  comprobar("La ficha de investigación completa tiene la forma esperada", tieneFormaDeDefinicion(JSON.parse(JSON.stringify(d))));
  const prot = protocoloDe(d);
  comprobar("El protocolo trae las partes de UNICAES (13 espacios: apartados académicos, matriz, esquema y anexos)",
    prot.espacios.length === 13 && ["apartado", "tabla", "lista", "archivo"].every((el) => prot.espacios.some((e) => e.elemento === el)));
  comprobar("Las partes del protocolo son apartados de los tipos de la guía de UNICAES",
    prot.espacios.filter((e) => e.elemento === "apartado").map((e) => e.parametros.tipo).join() === "generalidades,problematica,justificacion,objetivos,hipotesis,variables,fundamentacion,metodologia,referencias");
  comprobar("El protocolo precarga la problemática, la justificación y los objetivos",
    prot.espacios.filter((e) => e.precargarDe).map((e) => e.precargarDe).join() === "problema,justificacion,objetivos");
  comprobar("El dictamen del protocolo es a 5 días hábiles", prot.revision.diasRevision === 5 && prot.revision.diasHabiles);
  const plan = d.etapas.find(esEtapaPlan)!;
  comprobar("El plan de investigación pide el documento solicitado; el de proyecto no", documentoSolicitado(plan) === "obligatorio" && documentoSolicitado(planNuevo("p")) === "no");
  comprobar("El plan de investigación no lleva presupuesto; el de proyecto sí", !plan.presupuesto.activo && planNuevo("p").presupuesto.activo);
  const op = opcionesRegistro(ejec(d));
  comprobar("La ejecución de investigación no pide marco teórico en el registro (notas 13-nov-2026)", op.marcoTeorico === "no" && op.modo === "actividad" && op.informe === "unico");
  comprobar("La ejecución de investigación termina con la presentación de los resultados",
    ejec(d).hitos.some((h) => h.id === "presentacion-resultados" && h.hasta === ejec(d).periodos * ejec(d).duracionPeriodo));
  comprobar("La ejecución de proyecto no cambia (sin hitos y sin marco teórico)",
    ejecucionNueva("e", "proyecto", 1, true).hitos.length === 0 && opcionesRegistro(ejecucionNueva("e", "proyecto", 1, true)).marcoTeorico === "no");
}
detecta("protocolo después del plan", investigacionConCambio((d) => { d.etapas = [d.etapas[0], d.etapas[2], d.etapas[1], d.etapas[3]]; }), "protocolo debe ir inmediatamente después");
detecta("protocolo sin plan de trabajo", investigacionConCambio((d) => { d.etapas = d.etapas.filter((e) => !esEtapaPlan(e)); }), "agrega el plan de trabajo");
detecta("protocolo en proyecto", proyectoConCambio((d) => { d.etapas.splice(1, 0, protocoloNuevo("protocolo")); }), "solo para investigación");
detecta("dos protocolos", investigacionConCambio((d) => { d.etapas.splice(1, 0, protocoloNuevo("protocolo2")); }), "solo puede tener un protocolo");
detecta("un elemento de la propuesta en el protocolo", investigacionConCambio((d) => {
  protocoloDe(d).espacios.push({ ...propuesta(d).espacios.find((e) => e.elemento === "objetivos")!, id: "obj2" });
}), "no se puede usar en el protocolo");
detecta("una tabla en la propuesta", investigacionConCambio((d) => {
  propuesta(d).espacios.push({ ...protocoloDe(d).espacios.find((e) => e.elemento === "tabla")!, id: "tabla_prop" });
}), "no se puede usar en la propuesta");
detecta("precarga desde un espacio que no existe", investigacionConCambio((d) => { protocoloDe(d).espacios[2].precargarDe = "no_existe"; }), "ya no está en la propuesta");
detecta("precarga en la propuesta", investigacionConCambio((d) => { propuesta(d).espacios.find((e) => e.elemento === "texto")!.precargarDe = "problema"; }), "solo los espacios del protocolo");
detecta("columnas vacías o repetidas en una tabla", investigacionConCambio((d) => {
  protocoloDe(d).espacios.find((e) => e.elemento === "tabla")!.parametros.columnas = ["Hipótesis", "hipótesis"];
}), "textos repetidos");
detecta("plazo del dictamen fuera de rango", investigacionConCambio((d) => { protocoloDe(d).revision.diasRevision = 0; }), "días para el dictamen");
comprobar("La validación de proyecto sin protocolo no cambia", validarDefinicion(proyectoCompleto()).length === 0);
{
  const tabla = { ...protocoloNuevo("p").espacios.find((e) => e.elemento === "tabla")!, elemento: "tabla" as const, obligatorio: true };
  comprobar("La tabla lee filas de texto y descarta lo demás", leerItems("tabla", JSON.stringify([["a", "b", "c"], "x", [1, 2]])).length === 1);
  comprobar("Una fila con columnas de menos es un problema", problemasRecurso(tabla, [["a", "b"]]).some((p) => p.includes("no tiene las 3 columnas")));
  comprobar("Una tabla obligatoria con una fila completa está completa", recursoCompleto(tabla, JSON.stringify([["H1", "Edad", "Años cumplidos"]])));
  comprobar("Una fila vacía no cuenta como completa", !recursoCompleto(tabla, JSON.stringify([["", "", ""]])));
  const ant = investigacionCompleta();
  const nueva = investigacionCompleta();
  protocoloDe(nueva).revision.diasHabiles = false;
  protocoloDe(nueva).espacios.pop();
  nueva.etapas.find(esEtapaPlan)!.documentoSolicitado = "opcional";
  const cambios = compararDefiniciones(ant, nueva);
  comprobar("Los cambios del protocolo y del documento solicitado aparecen al habilitar",
    ["Protocolo: Se quitó el espacio \"Anexos\"", "días calendario", "documento solicitado por actividad, obligatorio → opcional"].every((t) => cambios.some((c) => c.includes(t))), cambios.join(" | "));
  comprobar("Agregar el protocolo aparece como cambio", compararDefiniciones(definicionBase("investigacion"), ant).some((c) => c.startsWith("Se agregó el protocolo")));
}

// 14. Protocolo en uso y documento solicitado (entrega I3)
{
  const prot = protocoloNuevo("protocolo");
  const vacio = problemasProtocolo(prot, {});
  comprobar("Un protocolo vacío tiene pendientes solo en sus partes obligatorias",
    vacio.length > 0 && !vacio.some((p) => ["hipotesis", "matriz_hipotesis", "anexos_protocolo"].includes(p.espacioId)), vacio.map((p) => p.espacioId).join(","));
  const completo: Record<string, string> = {};
  for (const e of prot.espacios) {
    if (e.elemento === "texto") completo[e.id] = relleno(Number(e.parametros.minPalabras) || 5);
    if (e.elemento === "lista") completo[e.id] = JSON.stringify(["Uno", "Dos", "Tres"]);
    if (e.elemento === "apartado" && e.obligatorio) completo[e.id] = apartadoCompleto(e);
  }
  comprobar("Un protocolo con sus partes obligatorias está completo", problemasProtocolo(prot, completo).length === 0, problemasProtocolo(prot, completo).map((p) => p.mensaje).join(" | "));
  comprobar("Una tabla opcional mal llenada sí cuenta como pendiente",
    problemasProtocolo(prot, { ...completo, matriz_hipotesis: JSON.stringify([["H1"]]) }).some((p) => p.espacioId === "matriz_hipotesis"));

  const base = definicionBase("investigacion");
  const esp = (id: string) => base.etapas.find(esEtapaPropuesta)!.espacios.find((e) => e.id === id);
  const datosProp = {
    descripcionProblema: " El problema. ", justificacion: "La justificación.", objetivoGeneral: "Analizar X.",
    objetivosEspecificos: [{ titulo: "Identificar A", descripcion: "Con una encuesta" }, { titulo: "Medir B", descripcion: "" }],
    respuestas: { nueva: "Texto de un espacio nuevo" },
  };
  comprobar("La precarga toma el problema y la justificación de la propuesta",
    textoPrecarga(esp("problema"), datosProp) === "El problema." && textoPrecarga(esp("justificacion"), datosProp) === "La justificación.");
  comprobar("La precarga de los objetivos lista el general y los específicos con su descripción",
    textoPrecarga(esp("objetivos"), datosProp) === "Objetivo general: Analizar X.\n\nObjetivos específicos:\n1. Identificar A: Con una encuesta\n2. Medir B");
  comprobar("La precarga de un texto nuevo de la propuesta usa su respuesta",
    textoPrecarga({ ...esp("problema")!, id: "nueva", origenFase1: undefined }, datosProp) === "Texto de un espacio nuevo");

  // Viernes 13-nov-2026 + 5 días hábiles = viernes 20; + 5 días calendario = miércoles 18.
  const viernes = new Date(2026, 10, 13);
  comprobar("El dictamen a 5 días hábiles salta el fin de semana", sumarDias(viernes, 5, true).getDate() === 20 && sumarDias(viernes, 5, false).getDate() === 18);
  comprobar("La fecha límite usa los días de la ficha", fechaLimiteDictamen(viernes, prot).getDate() === 20);

  const inv = investigacionCompleta();
  detecta("un espacio del protocolo con el id de uno de la propuesta", validarDefinicion((() => {
    protocoloDe(inv).espacios[0].id = "problema";
    return inv;
  })()).map((p) => p.mensaje), "ya se usa en la propuesta");

  const planInv = planNuevo("plan", "investigacion");
  const raizDoc = numerar({ id: "og", codigo: "", nivel: 1, titulo: "OG", responsable: 1, montos: [], hijos: [
    { id: "o1", codigo: "", nivel: 2, titulo: "OE", responsable: null, montos: [], hijos: [
      { id: "m1", codigo: "", nivel: 3, titulo: "Macro", responsable: null, montos: [], hijos: [
        { id: "a1", codigo: "", nivel: 4, titulo: "Actividad", responsable: null, montos: [1], hijos: [] },
      ] },
    ] },
  ] });
  const sinDoc = validarPlanEquipo(raizDoc, { ...planInv, minimos: { ...planInv.minimos, objetivosPorIntegrante: 1 } }, [1], 1);
  comprobar("Con documento obligatorio, cada actividad debe indicarlo", sinDoc.some((p) => p.mensaje.includes("documento que entregarás")), sinDoc.map((p) => p.mensaje).join(" | "));
  const conDoc = structuredClone(raizDoc);
  conDoc.hijos[0].hijos[0].hijos[0].documento = "Cuestionario aplicado (PDF)";
  comprobar("Con el documento indicado, el plan no tiene ese pendiente",
    !validarPlanEquipo(conDoc, { ...planInv, minimos: { ...planInv.minimos, objetivosPorIntegrante: 1 } }, [1], 1).some((p) => p.mensaje.includes("documento")));
  comprobar("En proyecto no se pide documento", !validarPlanEquipo(raizDoc, { ...planNuevo("p"), minimos: { ...planNuevo("p").minimos, objetivosPorIntegrante: 1 } }, [1], 1).some((p) => p.mensaje.includes("documento")));
  const ajeno = structuredClone(raizDoc);
  ajeno.hijos[0].responsable = 2;
  const cambiado = structuredClone(ajeno);
  cambiado.hijos[0].hijos[0].hijos[0].documento = "Otro";
  comprobar("Un integrante no cambia el documento de una actividad ajena", cambioNoPermitido(ajeno, cambiado, 3) !== null && cambioNoPermitido(ajeno, cambiado, 2) === null);
}

// 15. Informe final por capítulos (entrega I5)
{
  const conInforme = () => {
    const d = investigacionCompleta();
    d.etapas.push(informeFinalNuevo("informe_final"));
    return d;
  };
  const d = conInforme();
  const problemas = validarDefinicion(d);
  comprobar("La ficha de investigación con informe final es válida", problemas.length === 0, problemas.map((p) => p.mensaje).join(" | "));
  comprobar("La ficha con informe final conserva su forma", tieneFormaDeDefinicion(JSON.parse(JSON.stringify(d))));
  const inf = d.etapas.find(esEtapaInformeFinal)!;
  comprobar("El informe final trae 13 capítulos (la metodología en uno solo), con bibliografía y anexos",
    inf.espacios.length === 13 && inf.espacios.some((e) => e.id === "if_bibliografia") && inf.espacios.some((e) => e.elemento === "archivo"));
  comprobar("Los capítulos del informe final son apartados académicos de los tipos del informe",
    inf.espacios.filter((e) => e.elemento === "apartado").map((e) => e.parametros.tipo).join() ===
      "introduccion,generalidades,problematica,justificacion,objetivos,marco_teorico,metodologia_realizada,resultados,comprobacion_hipotesis,discusion,conclusiones,referencias");
  comprobar("El marco teórico se precarga de la fundamentación del protocolo", inf.espacios.find((e) => e.id === "if_marco")?.precargarDe === "fundamentacion");
  comprobar("Revisión por capítulo y ratificación por defecto", inf.revision.porCapitulo && inf.revision.ratificacion);
  const mal = (cambiar: (x: DefinicionFicha) => void) => { const x = conInforme(); cambiar(x); return validarDefinicion(x).map((p) => p.mensaje); };
  detecta("informe final antes de la ejecución", mal((x) => { const i = x.etapas.pop()!; x.etapas.splice(1, 0, i); }), "debe ser la última etapa");
  detecta("informe final en proyecto", proyectoConCambio((x) => { x.etapas.push(informeFinalNuevo("if")); }), "solo para investigación");
  detecta("precarga desde un capítulo que no existe", mal((x) => { x.etapas.find(esEtapaInformeFinal)!.espacios[0].precargarDe = "nada"; }), "ya no está en la propuesta ni en el protocolo");
  detecta("marco de las actividades en el protocolo", investigacionConCambio((x) => { x.etapas.find(esEtapaProtocolo)!.espacios[0].precargarDe = PRECARGA_MARCO_REGISTROS; }), "solo se precarga en el informe final");
  detecta("una lista precargada desde un texto", mal((x) => {
    x.etapas.find(esEtapaInformeFinal)!.espacios.push({ ...x.etapas.find(esEtapaInformeFinal)!.espacios[0], id: "if_lista", elemento: "lista", parametros: parametrosPorDefecto("lista"), precargarDe: "introduccion" });
  }), "una lista solo se precarga desde otra lista");
  detecta("un capítulo con el id de un espacio del protocolo", mal((x) => { x.etapas.find(esEtapaInformeFinal)!.espacios[0].id = "introduccion"; }), "ya se usa en el protocolo");
  comprobar("Agregar el informe final aparece como cambio", compararDefiniciones(investigacionCompleta(), conInforme()).some((c) => c.startsWith("Se agregó el informe final")));

  // Precarga y estados
  const fuentes = [...propuesta(d).espacios, ...protocoloDe(d).espacios];
  const datos = { descripcionProblema: "P", justificacion: "J", objetivoGeneral: "OG", objetivosEspecificos: [], respuestas: { introduccion: "Intro del protocolo", bibliografia: guardarComoTexto({ partes: { lista: "A\nB\nC" }, autoevaluacion: [] }) } };
  // El marco de las actividades sigue disponible para otras fichas (if_marco_reg, solo para la prueba).
  const capMarcoReg = { ...inf.espacios.find((e) => e.id === "if_marco")!, id: "if_marco_reg", precargarDe: PRECARGA_MARCO_REGISTROS };
  const cap = (id: string) => (id === "if_marco_reg" ? capMarcoReg : inf.espacios.find((e) => e.id === id)!);
  const leido = (id: string, precarga: string) => leerApartado(tipoApartado(cap(id))!, precarga).partes;
  comprobar("Un capítulo se precarga con la respuesta del protocolo (en su primer subapartado)",
    leido("if_introduccion", precargaCapitulo(cap("if_introduccion"), fuentes, datos, "")).presentacion === "Intro del protocolo");
  comprobar("La bibliografía se copia de las referencias del protocolo", leido("if_bibliografia", precargaCapitulo(cap("if_bibliografia"), fuentes, datos, "")).lista === "A\nB\nC");
  const marco = textoMarcoRegistros([{ codigo: "1.1.1.1", titulo: "Encuesta", marco: "Texto A" }, { codigo: "1.2.1.1", titulo: "Sin marco", marco: " " }]);
  comprobar("El marco de las actividades lleva su código y omite las vacías", marco === "1.1.1.1 Encuesta\nTexto A" && leido("if_marco_reg", precargaCapitulo(cap("if_marco_reg"), fuentes, datos, marco)).desarrollo === marco);
  comprobar("Sin marco en las actividades, el capítulo no se precarga", precargaCapitulo(cap("if_marco_reg"), fuentes, datos, "") === "");
  const conFund = { ...datos, respuestas: { ...datos.respuestas, fundamentacion: guardarComoTexto({ partes: { desarrollo: "Según Pérez (2020)..." }, autoevaluacion: [] }) } };
  comprobar("El marco teórico parte del desarrollo de la fundamentación del protocolo", leido("if_marco", precargaCapitulo(cap("if_marco"), fuentes, conFund, "")).desarrollo === "Según Pérez (2020)...");
  comprobar("Solo se edita en redacción y con el capítulo en borrador u observado",
    capituloEditable("redactando", { ...CAPITULO_NUEVO }) && capituloEditable("redactando", { ...CAPITULO_NUEVO, estado: "observado" })
    && !capituloEditable("redactando", { ...CAPITULO_NUEVO, estado: "enviado" }) && !capituloEditable("entregado", { ...CAPITULO_NUEVO }));
  const ahora = new Date("2026-11-12T10:00:00Z");
  const cap1 = { ...CAPITULO_NUEVO, editando: { usuarioId: 2, nombre: "Otro", desde: "2026-11-12T09:59:00Z" } };
  comprobar("Avisa si otro integrante editó hace menos de 2 minutos", editandoOtro(cap1, 1, ahora)?.nombre === "Otro" && editandoOtro(cap1, 2, ahora) === null
    && editandoOtro({ ...cap1, editando: { ...cap1.editando, desde: "2026-11-12T09:50:00Z" } }, 1, ahora) === null);
  const contenidos = Object.fromEntries(inf.espacios.map((e) => [e.id, e.elemento === "apartado" ? apartadoCompleto(e) : ""]));
  const estados = Object.fromEntries(inf.espacios.map((e) => [e.id, { ...CAPITULO_NUEVO, estado: "aprobado" as const }]));
  comprobar("Con todo aprobado no quedan pendientes (los opcionales vacíos no cuentan)", capitulosPendientes(inf, { ...estados, if_anexos: CAPITULO_NUEVO }, { ...contenidos, if_anexos: "" }).length === 0);
  comprobar("Un capítulo sin aprobar queda pendiente", capitulosPendientes(inf, { ...estados, if_conclusiones: CAPITULO_NUEVO }, contenidos).map((e) => e.id).join() === "if_conclusiones");
}


// 17. Apartados académicos (redacción académica guiada, 13-nov-2026)
{
  const op = { citasMinimas: 0, revisarPersona: true, tiempo: "no" as const };
  const c = (partes: Record<string, string>): ContenidoApartado => ({ partes, autoevaluacion: [] });
  const ids = (r: { id: string }[]) => r.map((x) => x.id);
  const T = TIPOS_APARTADO;

  comprobar("Hay un tipo por cada parte de la guía de UNICAES y del informe final",
    ["generalidades", "problematica", "justificacion", "objetivos", "hipotesis", "variables", "fundamentacion", "metodologia", "referencias", "marco_teorico", "resultados", "discusion", "conclusiones"].every((k) => k in T));
  comprobar("Todo tipo tiene propósito, subapartados, autoevaluación, errores frecuentes y ejemplo",
    Object.values(T).every((t) => t.proposito && t.partes.length && t.autoevaluacion.length && t.errores.length && t.ejemplo));
  comprobar("Los subapartados de un tipo no repiten su id", Object.values(T).every((t) => new Set(t.partes.map((p) => p.id)).size === t.partes.length));
  comprobar("Un texto plano (respuesta anterior o precarga) queda en el primer subapartado",
    leerApartado(T.problematica, "Texto anterior").partes.situacion === "Texto anterior");
  comprobar("Un apartado guardado se lee igual", JSON.stringify(leerApartado(T.hipotesis, guardarComoTexto(c({ hi: "A", ho: "B" })))) === JSON.stringify(c({ hi: "A", ho: "B" })));
  comprobar("Una tabla sin filas con texto cuenta como vacía", parteVacia(T.variables.partes[0], "[]") && parteVacia(T.variables.partes[0], JSON.stringify([["", "", "", ""]])));

  // Extensión y avance
  const vacio = revisarApartado(T.problematica, c({}), op);
  comprobar("Cada subapartado vacío es un pendiente que bloquea", vacio.filter((r) => r.nivel === "falta").length === 4);
  const corto = revisarApartado(T.problematica, c({ situacion: relleno(10) }), op);
  comprobar("Un subapartado bajo el mínimo bloquea", corto.some((r) => r.id === "min-situacion" && r.nivel === "falta"));
  comprobar("Un subapartado sobre el máximo solo avisa", revisarApartado(T.hipotesis, c({ hi: relleno(90), ho: "No existe relación entre las variables del estudio en la población." }), op).some((r) => r.id === "max-hi" && r.nivel === "aviso"));
  comprobar("Las oraciones de más de 45 palabras avisan", ids(revisarApartado(T.justificacion, c({ viabilidad: relleno(50) }), op)).includes("largas-viabilidad"));
  comprobar("El avance cuenta los subapartados completos", JSON.stringify(avanceApartado(T.hipotesis, c({ hi: relleno(12) }))) === JSON.stringify({ completas: 1, total: 2 }));
  comprobar("Un subapartado opcional vacío no es pendiente", !ids(revisarApartado(T.conclusiones, c({ conclusiones: relleno(130) }), op)).includes("vacio-recomendaciones"));

  // Redacción
  comprobar("Detecta la primera persona", revisarApartado(T.justificacion, c({ conveniencia: "Nosotros creemos que nuestro estudio sirve." }), op).some((r) => r.id === "persona" && r.mensaje.includes("nosotros")));
  comprobar("En tercera persona no avisa", revisarApartado(T.justificacion, c({ conveniencia: "El estudio permitirá orientar a los docentes." }), op).some((r) => r.id === "persona-ok"));
  comprobar("El protocolo avisa si está en pasado",
    ids(revisarApartado(T.metodologia, c({ procedimiento: "Se aplicó la encuesta y se analizaron los datos." }), { ...op, tiempo: "futuro" })).includes("tiempo"));
  comprobar("El informe final avisa si está en futuro",
    ids(revisarApartado(T.metodologia_realizada, c({ procedimiento: "Se aplicará la encuesta y se analizarán los datos." }), { ...op, tiempo: "pasado" })).includes("tiempo"));
  comprobar("El tiempo correcto no avisa",
    !ids(revisarApartado(T.metodologia, c({ procedimiento: "Se aplicará la encuesta y se analizarán los datos." }), { ...op, tiempo: "futuro" })).includes("tiempo"));

  // Citas APA y referencias
  const citas = citasEnTexto("Según Chen et al. (2021) y Hernández-Sampieri (2018), además (Pérez, 2020; López y Ruiz, 2019).");
  comprobar("Reconoce citas narrativas, entre paréntesis, con et al., compuestas y múltiples",
    citas.map((x) => `${x.autor} ${x.anio}`).sort().join("|") === "Chen 2021|Hernández-Sampieri 2018|López 2019|Pérez 2020", citas.map((x) => x.autor).join(","));
  comprobar("Avisa si faltan citas", revisarApartado(T.problematica, c({ estado_arte: "Sin citas." }), { ...op, citasMinimas: 2 }).some((r) => r.id === "citas"));
  comprobar("Con las citas suficientes confirma",
    revisarApartado(T.problematica, c({ estado_arte: "Según Pérez (2020) y (López, 2019)." }), { ...op, citasMinimas: 2 }).some((r) => r.id === "citas-ok"));
  comprobar("Avisa de las citas que no están en las referencias",
    revisarApartado(T.problematica, c({ estado_arte: "Según Pérez (2020) y (López, 2019)." }), op, { referencias: ["Pérez, J. (2020). Libro. Editorial."] })
      .find((r) => r.id === "citas-referencias")?.mensaje.includes("López") === true);
  const refs = revisarReferencias(["Pérez, J. (2020). Libro. Editorial.", "Álvarez, M. (2010). Viejo. Editorial.", "texto suelto", "Pérez, J. (2020). Libro. Editorial."], 2026);
  comprobar("Revisa la forma APA, el orden alfabético, los duplicados y la antigüedad de las referencias",
    ["apa-formato", "apa-orden", "apa-duplicadas", "apa-antiguas"].every((k) => ids(refs).includes(k)), ids(refs).join());
  comprobar("Unas referencias bien hechas no avisan",
    ids(revisarReferencias(["Álvarez, M. (2022). Título. Editorial.", "Hernández-Sampieri, R., y Mendoza, C. P. (2018). Metodología de la investigación. McGraw-Hill."], 2026)).join() === "apa-ok");

  // Revisiones propias de cada tipo
  comprobar("La pregunta de investigación va entre ¿?", ids(revisarApartado(T.problematica, c({ pregunta: "Qué relación existe entre A y B" }), op)).includes("pregunta-signos"));
  const obj = revisarApartado(T.objetivos, c({ general: "Analizar la relación entre el uso de la IA y el desempeño académico", especificos: "Conocer los hábitos\nLa encuesta" }), op);
  comprobar("Objetivos: verbos en infinitivo, medibles y de 3 a 5 específicos", ["obj-infinitivo", "obj-medibles", "obj-cantidad"].every((k) => ids(obj).includes(k)), ids(obj).join());
  comprobar("Unos objetivos bien redactados se confirman",
    ids(revisarApartado(T.objetivos, c({ general: "Analizar la relación entre el uso de la IA y el desempeño académico", especificos: "Identificar A\nDeterminar B\nComparar C" }), op)).includes("obj-ok"));
  comprobar("La hipótesis nula debe negar la de investigación", ids(revisarApartado(T.hipotesis, c({ hi: "A", ho: "Existe relación entre A y B en la población" }), op)).includes("ho-negacion"));
  comprobar("Las conclusiones piden una por objetivo específico",
    ids(revisarApartado(T.conclusiones, c({ conclusiones: "Una sola conclusión." }), op, { objetivos: ["A", "B", "C"] })).includes("conclusiones-objetivos"));

  // Configuración desde la ficha
  const esp = (parametros: Record<string, unknown>) => ({ parametros: parametrosPorDefecto("apartado", parametros as never) });
  comprobar("La extensión de la ficha escala los mínimos", tipoApartado(esp({ tipo: "problematica", extension: 200 }))!.partes[0].min === 240);
  comprobar("Las citas de la ficha reemplazan las del tipo (-1 = las del tipo)",
    tipoApartado(esp({ tipo: "problematica", citasMinimas: 5 }))!.citasMinimas === 5 && tipoApartado(esp({ tipo: "problematica" }))!.citasMinimas === 2);
  comprobar("El tiempo verbal sigue la etapa: futuro en el protocolo y pasado en el informe",
    opcionesDeEspacio(esp({ tipo: "metodologia" }), "protocolo").tiempo === "futuro" && opcionesDeEspacio(esp({ tipo: "metodologia" }), "informe_final").tiempo === "pasado"
    && opcionesDeEspacio(esp({ tipo: "metodologia", tiempo: "no" }), "protocolo").tiempo === "no");

  // Protocolo: pendientes y precargas
  const prot = protocoloNuevo("protocolo");
  const ap = (id: string) => prot.espacios.find((e) => e.id === id)!;
  comprobar("Un apartado opcional vacío no deja pendientes", !problemasProtocolo(prot, {}).some((p) => p.espacioId === "hipotesis"));
  comprobar("Un apartado a medias deja pendientes con el subapartado que falta",
    problemasProtocolo(prot, { problematica: guardarComoTexto(c({ situacion: relleno(130) })) }).some((p) => p.espacioId === "problematica" && p.mensaje.includes("Estado del arte")));
  comprobar("Los avisos (citas, persona) no bloquean el envío",
    !problemasProtocolo(prot, { problematica: apartadoCompleto(ap("problematica")) }).some((p) => p.espacioId === "problematica"));
  const base = definicionBase("investigacion");
  const fuentesProp = base.etapas.find(esEtapaPropuesta)!.espacios;
  const datos = {
    descripcionProblema: "El problema.", justificacion: "La justificación.", objetivoGeneral: "Analizar X.",
    objetivosEspecificos: [{ titulo: "Identificar A", descripcion: "Con una encuesta" }, { titulo: "Medir B" }], respuestas: {},
  };
  const objetivos = leerApartado(T.objetivos, precargaEspacio(ap("objetivos_protocolo"), fuentesProp, datos));
  comprobar("Los objetivos se precargan en el general y los específicos", objetivos.partes.general === "Analizar X." && objetivos.partes.especificos === "Identificar A\nMedir B");
  comprobar("La problemática se precarga en la situación problemática",
    leerApartado(T.problematica, precargaEspacio(ap("problematica"), fuentesProp, datos)).partes.situacion === "El problema.");
  const inf = informeFinalNuevo("if");
  const fuentes = [...fuentesProp, ...prot.espacios];
  const respuestas = {
    metodologia: guardarComoTexto(c({ tipo: "Enfoque cuantitativo.", poblacion: "Sesenta estudiantes." })),
    bibliografia: guardarComoTexto(c({ lista: "Autor, A. (2020). Libro. Editorial.\nOtro, B. (2021). Artículo. Revista." })),
  };
  const cap = (id: string) => inf.espacios.find((e) => e.id === id)!;
  const textoDe = { ...cap("if_introduccion"), id: "x_tipo", elemento: "texto" as const, parametros: parametrosPorDefecto("texto"), precargarDe: "metodologia#tipo" };
  comprobar("Un texto toma un subapartado de la metodología", precargaEspacio(textoDe, fuentes, { ...datos, respuestas }) === "Enfoque cuantitativo.");
  const listaDe = { ...textoDe, id: "x_lista", elemento: "lista" as const, parametros: parametrosPorDefecto("lista"), precargarDe: "bibliografia#lista" };
  comprobar("Una lista toma las referencias del protocolo",
    precargaEspacio(listaDe, fuentes, { ...datos, respuestas }) === JSON.stringify(["Autor, A. (2020). Libro. Editorial.", "Otro, B. (2021). Artículo. Revista."]));
  comprobar("La metodología realizada se precarga con los subapartados de la metodología del protocolo",
    leerApartado(T.metodologia_realizada, precargaEspacio(cap("if_metodologia"), fuentes, { ...datos, respuestas })).partes.poblacion === "Sesenta estudiantes.");

  // Informe final: tiempo pasado, conclusiones por objetivo, vacíos y exportación con subtítulos
  const pend = (id: string, valor: string) => problemasInformeFinal({ ...inf, espacios: [cap(id)] }, { [id]: valor });
  comprobar("En el informe final, un capítulo completo no tiene pendientes aunque tenga avisos", pend("if_conclusiones", apartadoCompleto(cap("if_conclusiones"))).length === 0);
  comprobar("Un capítulo con un subapartado bajo el mínimo es pendiente", pend("if_resultados", guardarComoTexto(c({ resultados: "Pocos datos." }))).length === 1);
  comprobar("El informe final revisa el tiempo pasado", opcionesDeEspacio(cap("if_metodologia"), "informe_final").tiempo === "pasado");
  comprobar("Un apartado con todos sus subapartados vacíos cuenta como vacío",
    contenidoVacio(cap("if_hipotesis"), guardarComoTexto(c({ prueba: " " }))) && !contenidoVacio(cap("if_hipotesis"), guardarComoTexto(c({ prueba: "Se rechazó Ho." }))));
  const doc = apartadosInformeFinal(inf, {
    if_metodologia: guardarComoTexto(c({ tipo: "Enfoque cuantitativo.", poblacion: "Sesenta estudiantes." })),
    if_bibliografia: guardarComoTexto(c({ lista: "Zeta, A. (2020). Libro. Editorial.\nAlfa, B. (2021). Artículo. Revista." })),
  }).apartados;
  const met = doc.find((a) => a.titulo === "Metodología de la investigación")!;
  comprobar("La exportación numera los subapartados (7.1, 7.2) y omite los vacíos",
    met.bloques.filter((b) => b.tipo === "subtitulo").map((b) => (b as { texto: string }).texto).join("|") === "7.1 Tipo de investigación|7.2 Población y muestra", JSON.stringify(met.bloques));
  const bib = doc.find((a) => a.titulo === "Bibliografía")!;
  comprobar("Las referencias se exportan sin número, en orden alfabético y con sangría francesa",
    bib.numero === null && bib.bloques.length === 1 && bib.bloques[0].tipo === "lista" && bib.bloques[0].referencias === true && bib.bloques[0].items[0].startsWith("Alfa"));
  comprobar("Un capítulo obligatorio vacío se exporta como pendiente", doc.find((a) => a.titulo === "Resultados obtenidos")?.bloques[0].tipo === "pendiente");

  // Validación de la ficha
  const conInforme2 = (cambiar: (d: DefinicionFicha) => void) => { const x = investigacionCompleta(); x.etapas.push(informeFinalNuevo("informe_final")); cambiar(x); return validarDefinicion(x).map((p) => p.mensaje); };
  detecta("un tipo de apartado que no existe", investigacionConCambio((d) => { protocoloDe(d).espacios.find((e) => e.elemento === "apartado")!.parametros.tipo = "nada"; }), "opción que no existe");
  detecta("un apartado en la propuesta", investigacionConCambio((d) => {
    propuesta(d).espacios.push({ ...protocoloDe(d).espacios.find((e) => e.elemento === "apartado")!, id: "ap_prop", precargarDe: undefined });
  }), "no se puede usar en la propuesta");
  detecta("precarga desde un subapartado que no existe", conInforme2((x) => { x.etapas.find(esEtapaInformeFinal)!.espacios.find((e) => e.id === "if_resultados")!.precargarDe = "metodologia#nada"; }), "subapartado");
  detecta("una lista precargada desde un subapartado de texto", conInforme2((x) => {
    const espacios = x.etapas.find(esEtapaInformeFinal)!.espacios;
    espacios.push({ ...espacios[0], id: "if_lista", elemento: "lista", parametros: parametrosPorDefecto("lista"), precargarDe: "metodologia#tipo" });
  }), "subapartado de lista");
  comprobar("El marco de las actividades se puede precargar en un apartado del informe final", !conInforme2(() => {}).some((m) => m.includes("marco")));
  comprobar("La ficha de investigación con apartados es válida", validarDefinicion(investigacionCompleta()).length === 0);
  {
    const antes = investigacionCompleta();
    protocoloDe(antes).espacios = protocoloDe(antes).espacios.map((e) => (e.elemento === "apartado" ? { ...e, elemento: "texto" as const, parametros: parametrosPorDefecto("texto") } : e));
    const cambios = compararDefiniciones(antes, investigacionCompleta());
    comprobar("Al cambiar un texto por un apartado, el cambio se resume en una línea por espacio",
      cambios.some((c) => c.includes('"Objetivos": pasó de Bloque de texto a Apartado académico')) && !cambios.some((c) => c.includes("tipo de apartado")), cambios.slice(0, 3).join(" | "));
  }
}

// 16. Catálogo ordenado (revisión del 13-nov-2026)
{
  const grupos = new Set<string>(GRUPOS_CATALOGO.map((g) => g.grupo));
  comprobar("Cada elemento del catálogo pertenece a una sección", Object.values(CATALOGO).every((e) => grupos.has(e.grupo)));
  comprobar("Ninguna sección del catálogo queda vacía", GRUPOS_CATALOGO.every((g) => Object.values(CATALOGO).some((e) => e.grupo === g.grupo)));
  const usados = new Set<string>();
  const fichasUsadas = [...(["pasantia", "proyecto", "investigacion"] as Modalidad[]).map((m) => definicionBase(m)), investigacionCompleta(), proyectoCompleto()];
  for (const d of fichasUsadas) for (const e of d.etapas) if ("espacios" in e) e.espacios.forEach((x) => usados.add(x.elemento));
  informeFinalNuevo("if").espacios.forEach((x) => usados.add(x.elemento));
  comprobar("El catálogo tiene todos los elementos que usan las fichas de las tres modalidades", [...usados].every((u) => u in CATALOGO), [...usados].filter((u) => !(u in CATALOGO)).join(", "));
  comprobar("Todo elemento tiene formulario en al menos un asistente", Object.values(CATALOGO).every((e) => e.formularioEn.length > 0));
}

console.log(fallas === 0 ? "\nTodo en orden." : `\n${fallas} comprobación(es) fallaron.`);
process.exit(fallas === 0 ? 0 : 1);
