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
import { problemasPartes, tieneFormaDeDefinicion, validarDefinicion } from "../../src/lib/fichas/validar";
import { compararDefiniciones } from "../../src/lib/fichas/diferencias";
import { diasSubperiodos, documentoSolicitado, esEtapaEjecucion, esEtapaPlan, esEtapaInformeFinal, esEtapaPropuesta, esEtapaProtocolo, opcionesRegistro, PRECARGA_CONCLUSIONES_OBJETIVOS, PRECARGA_MARCO_REGISTROS, productosObjetivo, type DefinicionFicha, type Modalidad } from "../../src/lib/fichas/tipos";
import { ejecucionNueva, informeFinalNuevo, planNuevo, plantillaRecomendada, protocoloNuevo } from "../../src/lib/fichas/plantillas";
import { CATALOGO, elementoEnEtapa, GRUPOS_CATALOGO, parametrosPorDefecto } from "../../src/lib/fichas/catalogo";
import { leerItems, problemasRecurso, recursoCompleto } from "../../src/lib/fichas/elementosRecurso";
import { fechaLimiteDictamen, precargaEspacio, problemasProtocolo, sumarDias, textoPrecarga } from "../../src/lib/fichas/protocolo";
import {
  avanceApartado, citasEnTexto, configInicial, configMetodologia, ENFOQUES_METODOLOGIA, guardarComoTexto, leerApartado, opcionesDeEspacio, parteVacia, revisarApartado, revisarReferencias, textoParte, tipoApartado,
  TIPOS_APARTADO, type ContenidoApartado,
} from "../../src/lib/fichas/apartadosAcademicos";
import type { Espacio } from "../../src/lib/fichas/tipos";
import { CAPITULO_NUEVO, capituloEditable, capitulosPendientes, contenidoVacio, editandoOtro, capituloGenerado, precargaCapitulo, problemasInformeFinal, textoConclusionesObjetivos, textoMarcoRegistros } from "../../src/lib/fichas/informeFinalFicha";
import { avanceObjetivo, problemasEntrega, quienesEntregan, revisarConclusionObjetivo } from "../../src/lib/fichas/entregasObjetivo";
import { esPlanPorElementos, resultadosPorObjetivo } from "../../src/lib/fichas/resultadosObjetivos";
import { bloquesCronograma, bloquesRecursos } from "../../src/lib/fichas/documentoProtocolo";
import { limpiarRecursos, presupuesto, problemasRecursos, reglasRecursos, type Recurso } from "../../src/lib/fichas/recursos";
import { citaDeFuentes, citaEnTexto, conCitas, fuentesCitadas, guardarParrafos, leerParrafos, parrafoConCita, type ParrafoCitado } from "../../src/lib/fichas/fuentes";
import { datosCitaVacios, type DatosCitaApa } from "../../src/lib/citaApa";
import { bloquesBitacora, entradasBitacora, limpiarModificacion, textoEntrada } from "../../src/lib/fichas/bitacora";
import { apartadosInformeFinal, portadaInformeFinal } from "../../src/lib/fichas/documentoInformeFinal";
import { armarInformePeriodo, numerarEvidencias } from "../../src/lib/fichas/informePeriodo";
import { reglaObjetivosDe, REGLA_OBJETIVOS, OBJETIVOS_POR_INTEGRANTE, OBJETIVOS_INDIVIDUAL, rangoObjetivos, textoRangoObjetivos } from "../../src/lib/fichas/objetivos";
import { fortalezaObjetivos, revisarSmart } from "../../src/lib/smart";
import { conIntegrantes, conRangoObjetivos } from "../../src/lib/fichas/apartadosAcademicos";
import { describirHistorial } from "../../src/lib/historialEstados";
import { tituloDeCarrera } from "../../src/lib/tituloCarrera";
import { conValores, guardarRespuesta, leerRespuestaPropia, limpiarRespuesta, limpiarValores, problemasRespuestaPropia, problemasValores, respuestaVacia, bloquesRespuesta, archivosRespuesta } from "../../src/lib/fichas/respuestasPropias";
import { claveCamposExtra, defCamposExtra } from "../../src/lib/fichas/elementosPropios";
import { cohortesQueSeMueven, elegirVersion } from "../../src/lib/fichas/cohortesFicha";
import { conObjetivosFinales } from "../../src/lib/fichas/informeFinalFicha";
import { bloquesCronogramaComparado } from "../../src/lib/fichas/documentoProtocolo";
import { leerFiguras, leerTabla, leerTablas, limpiarFigurasTablas } from "../../src/lib/fichas/apartadosAcademicos";
import { figurasDe, idsFigurasDe } from "../../src/lib/fichas/documentoInformeFinal";
import { indicadoresDeVariables } from "../../src/lib/fichas/protocolo";
import { separarReferencias } from "../../src/lib/fichas/referenciasInforme";
import { bloquesDerechos, bloquesInvolucrados, bloquesRecursosInforme } from "../../src/lib/fichas/anexosInforme";
import { informeFinalProyectoNuevo } from "../../src/lib/fichas/plantillas";
import { cambiarTipo, cambiosElementoPropio, campoNuevo, copiaDe, elementoPropioNuevo, mismaDefinicion, problemasElementoPropio, reglasCampo, tieneFormaElementoPropio, TIPOS_CAMPO } from "../../src/lib/fichas/elementosPropios";
import { esHojaPlan, normalizarArbol, objetivosEspecificos, objetivosCoinciden, sincronizarObjetivos, actividadesPorPeriodo, problemasPeriodos } from "../../src/lib/fichas/planTrabajo";
import { elementoDe, estadoElemento, procesoPorObjetivo, TEXTOS_ELEMENTO } from "../../src/lib/fichas/elementosEjecucion";
import { arbolConCitas, fuentesCitadasPlan, leerMetodologia, metodologiaValida, pideMetodologia, textoMetodologia } from "../../src/lib/fichas/metodologiaPlan";
import { cierreDe, componentesDe, esCronogramaInvestigacion, estructuraPlan } from "../../src/lib/fichas/tipos";
import { objetivosDelPlan } from "../../src/lib/fichas/entregasObjetivo";
import { compararUrgencia, etapaDe, pendientesAsesor, pestanaDe, requisitosProceso } from "../../src/lib/procesosAsesor";
import { aCsv, calcularPreEjecucion, calcularSeguimiento, corteAutomatico, cumplimientoPorDia, disponibilidadAsesor, faseCohorte, grupoFase } from "../../src/lib/seguimientoCohortes";
import { MODALIDADES_CON_FICHA } from "../../src/lib/fichas/fichaDePropuesta";
import { REGLAS_FASE1, calendarioFase1, reglasDeDefinicion } from "../../src/lib/reglasPasantia";
import { esInformeFinal, generarPeriodosPasantia, nombreInforme } from "../../src/lib/periodosPasantia";
import { validarContenidoRegistro } from "../../src/lib/reglasRegistroActividad";
import { configFinalFase1, estructuraFinal, leerConfigFinal, leerConfigPeriodo, problemasCapituloExtra, problemasConfigFinal } from "../../src/lib/fichas/documentoFinalPasantia";
import { anexosFinal } from "../../src/lib/informeFinal";
import { seOfreceEn, sedesPorCarrera } from "../../src/lib/carrerasSedes";
import { adelantable, periodosPlanificados, ganttPlan, responsables, actividadesDelPeriodo, arrastradasAlPeriodo, avancePorNodo, validarRegistroProyecto, faltaParaAvance, aplanar, cambioNoPermitido, cargaPorIntegrante, numerar, planEjemplo, planIndividual, productosDe, totalesNodo, validarPlanEquipo, type NodoPlan } from "../../src/lib/fichas/planTrabajo";

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
    else if (p.formato === "citado") partes[p.id] = JSON.stringify([{ texto: relleno(Math.max(p.min ?? 0, 5)), fuentes: [1], cita: "Pérez, 2024" }]);
    else if (p.formato === "referencias") {
      partes[p.id] = Array.from({ length: Math.max(p.minItems ?? 0, 3) }, (_, k) => `Autor${String.fromCharCode(65 + k)}, A. (2024). Obra ${k + 1}. Editorial.`).join("\n");
    } else partes[p.id] = "Uno\nDos\nTres";
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
// Reunión del 20-nov-2026 (H19/H27): de 3 a 4 objetivos específicos por integrante, en propuesta, protocolo y plan.
comprobar(
  "Los objetivos específicos son de 4 a 5 individual y 4 por integrante en grupo (R4)",
  contiene("src/lib/fichas/objetivos.ts", /OBJETIVOS_INDIVIDUAL: RangoObjetivos = \{ min: 4, max: 5 \}/) &&
    contiene("src/lib/fichas/objetivos.ts", /OBJETIVOS_POR_INTEGRANTE: RangoObjetivos = \{ min: 4, max: 4 \}/)
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
  propuesta(d).espacios.push({ ...propuesta(d).espacios[0], id: "obj", elemento: "objetivos", titulo: "Objetivos", parametros: { minIndividual: 4, maxIndividual: 5, minPorIntegrante: 4, maxPorIntegrante: 4 } });
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
  comprobar("El protocolo trae las partes de la reunión (14 espacios: apartados, matriz, recursos y anexos; sin esquema del informe)",
    prot.espacios.length === 14 && ["apartado", "tabla", "recursos_presupuesto", "archivo"].every((el) => prot.espacios.some((e) => e.elemento === el))
      && !prot.espacios.some((e) => e.id === "esquema_informe"));
  comprobar("Las partes del protocolo son apartados de los tipos de la guía de UNICAES",
    prot.espacios.filter((e) => e.elemento === "apartado").map((e) => e.parametros.tipo).join() === "generalidades,problematica,justificacion,objetivos,fundamentacion,hipotesis,variables,metodologia,consideraciones_eticas,referencias");
  comprobar("El protocolo precarga la problemática, la justificación y los objetivos",
    prot.espacios.filter((e) => e.precargarDe).map((e) => e.precargarDe).join() === "problema,justificacion,objetivos");
  comprobar("El dictamen del protocolo es a 5 días hábiles", prot.revision.diasRevision === 5 && prot.revision.diasHabiles);
  const plan = d.etapas.find(esEtapaPlan)!;
  comprobar("El plan de investigación es un cronograma de investigación, sin documentos ni productos (19-nov-2026)",
    plan.estructura === "investigacion" && documentoSolicitado(plan) === "no" && productosObjetivo(plan) === "no" && documentoSolicitado(planNuevo("p")) === "no");
  comprobar("El plan de investigación vuelve a llevar presupuesto, como el de proyecto (19-nov-2026)", plan.presupuesto.activo && planNuevo("p").presupuesto.activo);
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
    ["Protocolo: Se quitó el espacio \"Anexos\"", "días calendario", "documento solicitado por actividad, no → opcional"].every((t) => cambios.some((c) => c.includes(t))), cambios.join(" | "));
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
    if (e.elemento === "recursos_presupuesto") completo[e.id] = JSON.stringify(["tecnicos", "inmateriales", "operacionales"].map((categoria) => ({ categoria, descripcion: "Recurso", cantidad: 1, costoUnitario: 10 })));
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

  // Cronograma de actividades con documento solicitado (versiones de investigación anteriores al 19-nov-2026).
  const planInv = { ...planNuevo("plan"), documentoSolicitado: "obligatorio" as const };
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
  // Notas del 20-nov-2026 (INFORME_FINAL_INVESTIGACION.md): 17 capítulos en el orden de las notas.
  comprobar("El informe final trae 23 capítulos (F3 y F4), con bibliografía, reporte de modificaciones y anexos",
    inf.espacios.length === 23 && inf.espacios.some((e) => e.id === "if_bibliografia") && inf.espacios.some((e) => e.elemento === "archivo"));
  comprobar("Los capítulos del informe final son apartados académicos de los tipos del informe (los resultados se generan)",
    inf.espacios.filter((e) => e.elemento === "apartado").map((e) => e.parametros.tipo).join() ===
      "agradecimientos,introduccion_informe,generalidades,problematica,justificacion,objetivos_informe,marco_teorico,metodologia_informe,analisis_informe,resultados,comprobacion_hipotesis,discusion,conclusiones,referencias,presentacion_publica");
  comprobar("El marco teórico se precarga de la fundamentación del protocolo", inf.espacios.find((e) => e.id === "if_marco")?.precargarDe === "fundamentacion");
  comprobar("Revisión por capítulo y ratificación por defecto", inf.revision.porCapitulo && inf.revision.ratificacion);
  const mal = (cambiar: (x: DefinicionFicha) => void) => { const x = conInforme(); cambiar(x); return validarDefinicion(x).map((p) => p.mensaje); };
  detecta("informe final antes de la ejecución", mal((x) => { const i = x.etapas.pop()!; x.etapas.splice(1, 0, i); }), "debe ser la última etapa");
  // H7 (20-nov-2026): proyecto también tiene informe final; la pasantía no.
  detecta("informe final en pasantía", conCambio((x) => { x.etapas.push(informeFinalNuevo("if")); }), "la pasantía usa su documento final");
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
  // Un capítulo que se precarga de un texto del protocolo (la introducción ya no se precarga; solo para la prueba).
  const capIntroVieja = { ...inf.espacios.find((e) => e.id === "if_marco")!, id: "if_intro_vieja", parametros: parametrosPorDefecto("apartado", { tipo: "introduccion" }), precargarDe: "introduccion" };
  const cap = (id: string) => (id === "if_marco_reg" ? capMarcoReg : id === "if_intro_vieja" ? capIntroVieja : inf.espacios.find((e) => e.id === id)!);
  const leido = (id: string, precarga: string) => leerApartado(tipoApartado(cap(id))!, precarga).partes;
  comprobar("Un capítulo se precarga con la respuesta del protocolo (en su primer subapartado)",
    leido("if_intro_vieja", precargaCapitulo(cap("if_intro_vieja"), fuentes, datos, "")).presentacion === "Intro del protocolo");
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
  comprobar("Objetivos: verbos en infinitivo, medibles y de 3 a 5 específicos", ["obj-infinitivo", "obj-medibles", "items-min-especificos"].every((k) => ids(obj).includes(k)), ids(obj).join());
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
  comprobar("Un capítulo con un subapartado bajo el mínimo es pendiente", pend("if_hallazgos", guardarComoTexto(c({ hallazgos: "Pocos datos." }))).length === 1);
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
  comprobar("Un capítulo obligatorio vacío se exporta como pendiente", doc.find((a) => a.titulo === "Presentación de los hallazgos principales")?.bloques[0].tipo === "pendiente");

  // Validación de la ficha
  const conInforme2 = (cambiar: (d: DefinicionFicha) => void) => { const x = investigacionCompleta(); x.etapas.push(informeFinalNuevo("informe_final")); cambiar(x); return validarDefinicion(x).map((p) => p.mensaje); };
  detecta("un tipo de apartado que no existe", investigacionConCambio((d) => { protocoloDe(d).espacios.find((e) => e.elemento === "apartado")!.parametros.tipo = "nada"; }), "opción que no existe");
  detecta("un apartado en la propuesta", investigacionConCambio((d) => {
    propuesta(d).espacios.push({ ...protocoloDe(d).espacios.find((e) => e.elemento === "apartado")!, id: "ap_prop", precargarDe: undefined });
  }), "no se puede usar en la propuesta");
  detecta("precarga desde un subapartado que no existe", conInforme2((x) => { x.etapas.find(esEtapaInformeFinal)!.espacios.find((e) => e.id === "if_hallazgos")!.precargarDe = "metodologia#nada"; }), "subapartado");
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
      cambios.some((c) => c.includes('"Objetivos general y específicos": pasó de Bloque de texto a Apartado académico')) && !cambios.some((c) => c.includes("tipo de apartado")), cambios.slice(0, 3).join(" | "));
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

// 18. Productos por objetivo específico (notas del 13-nov-2026)
{
  const plan = planNuevo("plan");
  comprobar("La plantilla de proyecto pide productos por objetivo; la de investigación no (19-nov-2026)", plan.productosObjetivo === "obligatorio" && planNuevo("p", "investigacion").productosObjetivo === "no");
  comprobar("Las versiones guardadas antes no piden productos", productosObjetivo({ ...plan, productosObjetivo: undefined }) === "no");
  const raiz = numerar(planEjemplo(plan, 1, 10));
  comprobar("El plan de ejemplo trae un producto por objetivo", raiz.hijos.every((o) => productosDe(o).length === 1));
  const sinProductos: NodoPlan = { ...raiz, hijos: raiz.hijos.map((o, i) => (i === 0 ? { ...o, productos: [" ", ""] } : o)) };
  comprobar("Un objetivo sin productos no deja enviar el plan", validarPlanEquipo(sinProductos, plan, [1], 10).some((p) => p.mensaje.includes("producto esperado")));
  comprobar("Con productos opcionales no se exige ninguno", !validarPlanEquipo(sinProductos, { ...plan, productosObjetivo: "opcional" }, [1], 10).some((p) => p.mensaje.includes("producto esperado")));
  const equipo: NodoPlan = { ...raiz, hijos: raiz.hijos.map((o, i) => ({ ...o, responsable: i < 2 ? 11 : 12 })) };
  const cambiado: NodoPlan = { ...equipo, hijos: equipo.hijos.map((o, i) => (i === 2 ? { ...o, productos: ["Otro producto"] } : o)) };
  comprobar("Un integrante no cambia los productos de un objetivo ajeno", cambioNoPermitido(equipo, cambiado, 11) !== null && cambioNoPermitido(equipo, cambiado, 12) === null);

  // Habilitación y quién entrega
  const o1 = raiz.hijos[0];
  const hojas = aplanar(o1).filter((n) => n.hijos.length === 0 && n.nivel >= 4);
  const reg = (nodoId: string, avance: number, estado = "enviado", periodo = 1) => ({ nodoId, periodo, avance, estado });
  comprobar("Sin registros el objetivo no se habilita", !avanceObjetivo(o1, []).completo && avanceObjetivo(o1, []).actividades === hojas.length);
  comprobar("Con una actividad al 70 % el objetivo no se habilita", !avanceObjetivo(o1, hojas.map((h, i) => reg(h.id, i === 0 ? 70 : 100))).completo);
  comprobar("Un borrador al 100 % no cuenta", !avanceObjetivo(o1, hojas.map((h, i) => reg(h.id, 100, i === 0 ? "borrador" : "enviado"))).completo);
  comprobar("Con todas al 100 % enviadas, el objetivo se habilita", avanceObjetivo(o1, hojas.map((h) => reg(h.id, 100))).completo);
  comprobar("Cuenta el último período: 100 % y luego 80 % no habilita", !avanceObjetivo(o1, [...hojas.map((h) => reg(h.id, 100)), reg(hojas[0].id, 80, "enviado", 2)]).completo);
  comprobar("Entrega el responsable del objetivo", quienesEntregan(equipo, equipo.hijos[0].id).join() === "11");
  const act = (id: string, r: number): NodoPlan => ({ id, codigo: id, nivel: 4, titulo: id, responsable: r, montos: [1], hijos: [] });
  const porActividad: NodoPlan = { id: "og", codigo: "1", nivel: 1, titulo: "OG", responsable: null, montos: [], hijos: [
    { id: "oe", codigo: "1.1", nivel: 2, titulo: "OE", responsable: null, montos: [], hijos: [{ id: "m", codigo: "1.1.1", nivel: 3, titulo: "M", responsable: null, montos: [], hijos: [act("a1", 21), act("a2", 22)] }] }] };
  comprobar("Con responsable por actividad, entrega cualquiera con actividades en el objetivo", quienesEntregan(porActividad, "oe").sort().join() === "21,22");

  // Lo que falta para enviar y la conclusión
  const conclusion = "Se diagnosticó el estado de las operaciones del taller con el estudio de tiempos y el análisis de flujo; se identificaron las esperas como la principal causa de los retrasos en la producción.";
  const falta = problemasEntrega({ completo: true, productos: ["Estudio de tiempos", "Análisis de flujo"], archivos: [{ producto: 0 }], conclusion });
  comprobar("Pide cada producto prometido que falta", falta.length === 1 && falta[0].includes("Análisis de flujo"), falta.join(" | "));
  comprobar("Pide la conclusión", problemasEntrega({ completo: true, productos: [], archivos: [], conclusion: "" }).some((p) => p.includes("Conclusión")));
  comprobar("Bloquea si las actividades no llegan al 100 %", problemasEntrega({ completo: false, productos: [], archivos: [], conclusion }).some((p) => p.includes("100 %")));
  comprobar("Una entrega completa no tiene pendientes", problemasEntrega({ completo: true, productos: ["A"], archivos: [{ producto: 0 }], conclusion }).length === 0);
  const rev = revisarConclusionObjetivo("Nosotros haremos el análisis. Se aplicará la encuesta y se analizarán los datos del taller con cuidado durante el próximo mes de trabajo.");
  comprobar("La conclusión avisa de primera persona y futuro", rev.some((r) => r.id === "persona" && r.nivel === "aviso") && rev.some((r) => r.id === "tiempo"), rev.map((r) => r.id).join());

  // Informe final
  const ids = raiz.hijos.map((o) => ({ id: o.id }));
  const texto = textoConclusionesObjetivos(ids, [
    { nodoId: ids[1].id, estado: "aprobado", conclusion: "Segunda." },
    { nodoId: ids[0].id, estado: "aprobado", conclusion: "Primera." },
    { nodoId: ids[2]?.id ?? "x", estado: "enviado", conclusion: "Sin aprobar." },
  ]);
  comprobar("Las conclusiones aprobadas van en el orden del plan, una por párrafo", texto === "Primera.\n\nSegunda.", JSON.stringify(texto));
  const inf = informeFinalNuevo("if");
  comprobar("Las conclusiones finales ya no se precargan de las preliminares (19-nov-2026)", !inf.espacios.find((e) => e.id === "if_conclusiones")!.precargarDe);
  // La precarga sigue disponible para las fichas que la configuren.
  const capConc = { ...inf.espacios.find((e) => e.id === "if_conclusiones")!, precargarDe: PRECARGA_CONCLUSIONES_OBJETIVOS };
  const pre = leerApartado(tipoApartado(capConc)!, precargaCapitulo(capConc, [], { descripcionProblema: "", justificacion: "", objetivoGeneral: "", objetivosEspecificos: [], respuestas: {} }, "", texto)).partes;
  comprobar("Las conclusiones quedan en su subapartado", pre.conclusiones === texto);
  const d = investigacionCompleta();
  d.etapas.push(informeFinalNuevo("if"));
  comprobar("La ficha de investigación con productos e informe final es válida", validarDefinicion(d).length === 0, validarDefinicion(d).map((p) => p.mensaje).join(" | "));
  const sinProd = structuredClone(d);
  sinProd.etapas.find(esEtapaPlan)!.productosObjetivo = "no";
  sinProd.etapas.find(esEtapaInformeFinal)!.espacios.find((e) => e.id === "if_conclusiones")!.precargarDe = PRECARGA_CONCLUSIONES_OBJETIVOS;
  comprobar("Precargar conclusiones sin productos por objetivo es un error", validarDefinicion(sinProd).some((p) => p.mensaje.includes("conclusiones de los objetivos")));
  const nueva = structuredClone(d);
  nueva.etapas.find(esEtapaPlan)!.productosObjetivo = "opcional";
  comprobar("Cambiar los productos por objetivo aparece como cambio", compararDefiniciones(d, nueva).some((c) => c.includes("productos esperados por objetivo")));
}

// 19. Resultados por objetivo generados en el informe final (notas del 13-nov-2026)
{
  const hoja = (id: string, codigo: string): NodoPlan => ({ id, codigo, nivel: 4, titulo: `Actividad ${codigo}`, responsable: null, montos: [1], hijos: [] });
  const arbol: NodoPlan = { id: "og", codigo: "1", nivel: 1, titulo: "Analizar el rendimiento.", responsable: null, montos: [], hijos: [
    { id: "o1", codigo: "1.1", nivel: 2, titulo: "Caracterizar hábitos", responsable: null, montos: [], productos: ["Instrumento", "Base de datos"], hijos: [
      { id: "m1", codigo: "1.1.1", nivel: 3, titulo: "Encuesta", responsable: null, montos: [], hijos: [hoja("a1", "1.1.1.1"), hoja("a2", "1.1.1.2")] }] },
    { id: "o2", codigo: "1.2", nivel: 2, titulo: "Medir rendimiento", responsable: null, montos: [], productos: ["Informe"], hijos: [
      { id: "m2", codigo: "1.2.1", nivel: 3, titulo: "Notas", responsable: null, montos: [], hijos: [hoja("a3", "1.2.1.1")] }] },
  ] };
  const archivo = (leyenda: string) => ({ tipo: "enlace" as const, leyenda, nombre: null, url: "https://x.test", nota: null });
  const r = resultadosPorObjetivo({
    arbol,
    registros: [
      { nodoId: "a1", periodo: 1, estado: "aprobado", avance: 100, resultado: "Se aplicó la encuesta.", fechaInicio: "2026-10-20", fechaFin: "2026-11-06" },
      { nodoId: "a2", periodo: 1, estado: "enviado", avance: 100, resultado: "Se tabuló." },
      { nodoId: "a3", periodo: 2, estado: "borrador", avance: 50, resultado: "Borrador." },
    ],
    evidencias: [{ ...archivo("Fotos de la encuesta"), nodoId: "a1", periodo: 1 }, { ...archivo("Borrador"), nodoId: "a3", periodo: 2 }],
    entregas: [{ nodoId: "o1", estado: "aprobado" }],
    productos: [{ ...archivo("Instrumento validado"), objetivoId: "o1", producto: 0 }, { ...archivo("Respuestas"), objetivoId: "o1", producto: 1 }],
    numero: 5,
  });
  const subs = r.bloques.filter((b) => b.tipo === "subtitulo").map((b) => (b as { texto: string }).texto);
  comprobar("Los resultados van por objetivo, numerados como subapartados del capítulo", subs.join("|") === "5.1 Objetivo general|5.2 Objetivo específico 1.1: Caracterizar hábitos|5.3 Objetivo específico 1.2: Medir rendimiento", subs.join("|"));
  comprobar("Los anexos siguen el orden objetivo → productos → evidencias de sus actividades",
    r.anexos.map((a) => `${a.etiqueta}:${a.descripcion}:${a.actividad}`).join("|") === "Anexo 1:Instrumento validado:producto del objetivo 1.1|Anexo 2:Respuestas:producto del objetivo 1.1|Anexo 3:Fotos de la encuesta:actividad 1.1.1.1",
    r.anexos.map((a) => a.descripcion).join("|"));
  const texto = JSON.stringify(r.bloques);
  comprobar("Cada actividad lleva sus fechas, su resultado y sus anexos", texto.includes("1.1.1.1 Actividad 1.1.1.1 (del 20/10/2026 al 06/11/2026): Se aplicó la encuesta. Evidencias: Anexo 3."));
  comprobar("Los productos citan sus anexos", texto.includes("Instrumento: Instrumento validado (Anexo 1)."));
  comprobar("Un borrador no aparece en los resultados", !texto.includes("Borrador") && texto.includes("1.2.1.1 Actividad 1.2.1.1: sin registro enviado."));
  comprobar("Un objetivo sin entrega dice que sus productos están pendientes", texto.includes("Productos pendientes de entrega.") && texto.includes("Informe: pendiente de entrega."));
  comprobar("El objetivo general resume el avance y los objetivos aprobados", texto.includes("Objetivos específicos con sus productos aprobados: 1 de 2."));

  const inf = informeFinalNuevo("if");
  const gen = inf.espacios.find((e) => e.id === "if_resultados")!;
  comprobar("El capítulo de resultados de la plantilla se genera solo", gen.elemento === "resultados_objetivos" && capituloGenerado(gen));
  comprobar("Un capítulo generado nunca queda pendiente de aprobación", !capitulosPendientes(inf, {}, {}).some((e) => e.id === "if_resultados"));
  const { apartados } = apartadosInformeFinal(inf, {}, (_e, n) => [{ tipo: "subtitulo", texto: `${n}.1 Objetivo general` }]);
  const ap = apartados.find((a) => a.titulo === "Desarrollo o ejecución de la investigación")!;
  comprobar("El documento numera el capítulo generado como los demás", ap.numero !== null && (ap.bloques[0] as { texto: string }).texto === `${ap.numero}.1 Objetivo general`);
  comprobar("Los resultados por objetivo solo van en el informe final", elementoEnEtapa("resultados_objetivos", "informe_final") && !elementoEnEtapa("resultados_objetivos", "protocolo"));
  const sinPlan = investigacionCompleta();
  sinPlan.etapas.push(informeFinalNuevo("if"));
  sinPlan.etapas = sinPlan.etapas.filter((e) => e.tipo !== "plan");
  comprobar("Sin plan de trabajo, los resultados por objetivo son un error", validarDefinicion(sinPlan).some((p) => p.mensaje.includes("resultados por objetivo")));
}

// 20. Bitácora o reporte de modificaciones (notas del 13-nov-2026)
{
  comprobar("Las plantillas de ejecución piden la bitácora; las versiones guardadas antes no",
    opcionesRegistro(ejecucionNueva("e", "investigacion", 1, true)).modificaciones && opcionesRegistro(ejecucionNueva("e", "proyecto", 1, true)).modificaciones
    && !opcionesRegistro({ ...ejecucionNueva("e", "proyecto", 1, true), registro: { ...ejecucionNueva("e", "proyecto", 1, true).registro, modificaciones: undefined } }).modificaciones);
  comprobar("Sin texto no hay modificación", limpiarModificacion("tiempo", "  ").modificacion === null && limpiarModificacion("tiempo", "  ").modificacionTipo === null);
  comprobar("Con texto y sin tipo, la modificación es «otro»", limpiarModificacion(null, "Se rompió la máquina.").modificacionTipo === "otro");
  comprobar("Un tipo desconocido se guarda como «otro»", limpiarModificacion("inventado", "x").modificacionTipo === "otro");
  const arbol: NodoPlan = { id: "og", codigo: "1", nivel: 1, titulo: "OG", responsable: null, montos: [], hijos: [
    { id: "o1", codigo: "1.1", nivel: 2, titulo: "Diagnosticar", responsable: null, montos: [], hijos: [
      { id: "m1", codigo: "1.1.1", nivel: 3, titulo: "M", responsable: null, montos: [], hijos: [
        { id: "a1", codigo: "1.1.1.1", nivel: 4, titulo: "Pintar puertas", responsable: null, montos: [1], hijos: [] },
        { id: "a2", codigo: "1.1.1.2", nivel: 4, titulo: "Comprar pintura", responsable: null, montos: [1], hijos: [] }] }] }] };
  const entradas = entradasBitacora({
    arbol,
    registros: [
      { nodoId: "a2", periodo: 1, estado: "enviado", modificacionTipo: "recursos", modificacion: "Subió el precio de la pintura." },
      { nodoId: "a1", periodo: 1, estado: "aprobado", modificacionTipo: "alcance", modificacion: "Se pintaron 4 puertas en lugar de 2." },
      { nodoId: "a1", periodo: 2, estado: "borrador", modificacionTipo: "tiempo", modificacion: "Borrador." },
      { nodoId: "a2", periodo: 2, estado: "enviado", modificacionTipo: null, modificacion: null },
    ],
    entregas: [{ nodoId: "o1", periodo: 2, estado: "enviado", modificacionTipo: "tiempo", modificacion: "El objetivo se cerró dos semanas tarde." }],
  });
  comprobar("La bitácora va por período y en el orden del plan, sin borradores ni registros sin cambios",
    entradas.map((e) => `${e.periodo}:${e.codigo}:${e.tipo}`).join("|") === "1:1.1.1.1:alcance|1:1.1.1.2:recursos|2:1.1:tiempo", entradas.map((e) => e.codigo).join());
  comprobar("La entrada del objetivo se nombra como objetivo", textoEntrada(entradas[2]) === "Período 2 · Objetivo 1.1 Diagnosticar (Tiempo): El objetivo se cerró dos semanas tarde.", textoEntrada(entradas[2]));
  comprobar("La bitácora de un período solo trae ese período", entradasBitacora({ arbol, registros: [], entregas: [{ nodoId: "o1", periodo: 2, estado: "enviado", modificacionTipo: "tiempo", modificacion: "x" }], periodo: 1 }).length === 0);
  const bloques = bloquesBitacora(entradas);
  comprobar("El reporte resume por tipo y lista cada entrada", bloques.length === 2 && JSON.stringify(bloques[0]).includes("tiempo: 1; recursos y costos: 1; alcance: 1") && bloques[1].tipo === "lista");
  comprobar("Sin modificaciones, el reporte lo dice", JSON.stringify(bloquesBitacora([])).includes("no se reportaron modificaciones"));

  const inf = informeFinalNuevo("if");
  const rep = inf.espacios.find((e) => e.id === "if_modificaciones")!;
  comprobar("El informe final trae el reporte de modificaciones generado", rep.elemento === "reporte_modificaciones" && capituloGenerado(rep));
  const { apartados } = apartadosInformeFinal(inf, {}, (e) => (e.elemento === "reporte_modificaciones" ? bloquesBitacora(entradas) : []));
  const ap = apartados.find((a) => a.titulo === "Reporte de modificaciones")!;
  comprobar("El reporte de modificaciones va sin número, como anexo", ap.numero === null && ap.bloques.length === 2);
  const d = investigacionCompleta();
  d.etapas.push(informeFinalNuevo("if"));
  comprobar("La ficha de investigación con bitácora y reporte es válida", validarDefinicion(d).length === 0, validarDefinicion(d).map((p) => p.mensaje).join(" | "));
  const sinBitacora = structuredClone(d);
  for (const e of sinBitacora.etapas) if (e.tipo === "ejecucion") e.registro.modificaciones = false;
  comprobar("El reporte sin bitácora en la ejecución es un error", validarDefinicion(sinBitacora).some((p) => p.mensaje.includes("reporte de modificaciones")));
  comprobar("Apagar la bitácora aparece como cambio", compararDefiniciones(d, sinBitacora).some((c) => c.toLowerCase().includes("reporte de modificaciones (bitácora)")));
}

// 21. Actividades menos atadas a su período (notas del 13-nov-2026)
{
  comprobar("Las plantillas de ejecución permiten adelantar; las versiones guardadas antes no",
    opcionesRegistro(ejecucionNueva("e", "investigacion", 1, true)).adelantar
    && !opcionesRegistro({ ...ejecucionNueva("e", "proyecto", 1, true), registro: { ...ejecucionNueva("e", "proyecto", 1, true).registro, adelantar: undefined } }).adelantar);
  // Columnas: un período por columna (1..4). a1 en P1, a2 en P3, a3 en P2 y P4.
  const columnas = [1, 2, 3, 4].map((periodo) => ({ periodo }));
  const act = (id: string, montos: number[]): NodoPlan => ({ id, codigo: id, nivel: 4, titulo: id, responsable: null, montos, hijos: [] });
  const raiz: NodoPlan = { id: "og", codigo: "1", nivel: 1, titulo: "OG", responsable: null, montos: [], hijos: [
    { id: "o", codigo: "1.1", nivel: 2, titulo: "O", responsable: null, montos: [], hijos: [
      { id: "m", codigo: "1.1.1", nivel: 3, titulo: "M", responsable: null, montos: [], hijos: [act("a1", [1, 0, 0, 0]), act("a2", [0, 0, 1, 0]), act("a3", [0, 1, 0, 1])] }] }] };
  const ids = (p: number, regs: { nodoId: string; periodo: number; avance: number | null; estado?: string }[] | null, solo?: string) => actividadesDelPeriodo(raiz, p, columnas, regs).map((n) => n.id).filter((x) => !solo || x === solo).join();
  comprobar("Se puede adelantar una actividad planificada solo en períodos siguientes", adelantable(raiz, "a2", 1, columnas, []) && !adelantable(raiz, "a1", 1, columnas, []));
  comprobar("No se adelanta una que ya está planificada en el período o antes", !adelantable(raiz, "a3", 2, columnas, []) && !adelantable(raiz, "a1", 2, columnas, []));
  comprobar("No se adelanta una actividad terminada", !adelantable(raiz, "a2", 2, columnas, [{ nodoId: "a2", periodo: 1, avance: 100, estado: "enviado" }]));
  comprobar("Una adelantada con registro aparece en el período en que se registra", ids(1, [{ nodoId: "a2", periodo: 1, avance: 40, estado: "borrador" }]) === "a1,a2");
  comprobar("Terminada por adelantado, ya no aparece en su período planificado", ids(3, [{ nodoId: "a2", periodo: 1, avance: 100, estado: "enviado" }], "a2") === "");
  comprobar("Adelantada sin terminar, sigue en su período planificado", ids(3, [{ nodoId: "a2", periodo: 1, avance: 60, estado: "enviado" }], "a2") === "a2");
  comprobar("Planificada en dos períodos y terminada en el primero, no vuelve en el segundo", ids(4, [{ nodoId: "a3", periodo: 2, avance: 100, estado: "aprobado" }], "a3") === "");
  comprobar("Un borrador al 100 % no cuenta como terminada", ids(3, [{ nodoId: "a2", periodo: 1, avance: 100, estado: "borrador" }], "a2") === "a2");
  comprobar("Los períodos planificados se leen en orden", periodosPlanificados(act("x", [0, 1, 0, 1]), columnas).join() === "2,4");
  const d = investigacionCompleta();
  const sin = structuredClone(d);
  for (const e of sin.etapas) if (e.tipo === "ejecucion") e.registro.adelantar = false;
  comprobar("Apagar el adelanto aparece como cambio", compararDefiniciones(d, sin).some((c) => c.toLowerCase().includes("adelantar actividades")));
}

// 22. Subapartados configurables en la ficha (ajustes al protocolo, 19-nov-2026)
{
  const prot = protocoloNuevo("p");
  const prob = prot.espacios.find((e) => e.id === "problematica")!;
  comprobar("Sin configuración, el apartado usa los subapartados del tipo", tipoApartado(prob)!.partes.map((p) => p.id).join() === "situacion,estado_arte,pregunta,importancia");
  const sinEstado = { ...prob, partes: [{ id: "situacion", activa: true }, { id: "estado_arte", activa: false }, { id: "pregunta", activa: true }, { id: "importancia", activa: true }] };
  comprobar("Un subapartado desactivado ya no se pide", tipoApartado(sinEstado)!.partes.map((p) => p.id).join() === "situacion,pregunta,importancia");
  comprobar("Desactivado, tampoco cuenta como pendiente",
    !problemasProtocolo({ tipo: "protocolo", espacios: [sinEstado] }, { problematica: guardarComoTexto({ partes: { situacion: "x ".repeat(130), pregunta: "¿Qué relación existe entre el uso de la IA y el desempeño de los estudiantes del curso?", importancia: "x ".repeat(70) }, autoevaluacion: [] }) }).length);
  const just = prot.espacios.find((e) => e.id === "justificacion_protocolo")!;
  const conTecnica = { ...just, partes: [...configInicial("justificacion"), { id: "x_viabilidad_tecnica", activa: true, titulo: "Viabilidad técnica", ayuda: "Equipos y conocimientos disponibles.", propia: { formato: "texto" as const }, min: 20, max: 100 }] };
  const tj = tipoApartado(conTecnica)!;
  const vt = tj.partes.find((p) => p.id === "x_viabilidad_tecnica");
  comprobar("Un subapartado propio se pide con sus reglas", !!vt && vt.titulo === "Viabilidad técnica" && vt.min === 20 && vt.max === 100 && vt.propia === true);
  comprobar("Un subapartado propio bajo el mínimo es pendiente",
    revisarApartado(tj, { partes: { conveniencia: "x ".repeat(70), valor: "x ".repeat(70), viabilidad: "x ".repeat(50), x_viabilidad_tecnica: "Poco." }, autoevaluacion: [] }, { citasMinimas: 0, revisarPersona: false, tiempo: "no" })
      .some((r) => r.id === "min-x_viabilidad_tecnica" && r.nivel === "falta"));
  const renombrada = tipoApartado({ ...prob, partes: [{ id: "situacion", activa: true, titulo: "Descripción del problema", min: 50, max: 900, opcional: true }] })!;
  const sit = renombrada.partes[0];
  comprobar("Se renombra un subapartado y se cambian sus reglas", sit.titulo === "Descripción del problema" && sit.min === 50 && sit.max === 900 && sit.opcional === true);
  comprobar("Los subapartados que la ficha no menciona siguen activos al final", renombrada.partes.map((p) => p.id).join() === "situacion,estado_arte,pregunta,importancia");
  comprobar("El orden de la configuración se respeta",
    tipoApartado({ ...prob, partes: [{ id: "pregunta", activa: true }, { id: "situacion", activa: true }] })!.partes.map((p) => p.id).slice(0, 2).join() === "pregunta,situacion");

  // Elementos o filas
  const vars = prot.espacios.find((e) => e.id === "variables")!;
  const fila = (k: number) => [`V${k}`, "Def", "Op", "Ind"];
  const cuadro = (n: number) => guardarComoTexto({ partes: { cuadro: JSON.stringify(Array.from({ length: n }, (_, k) => fila(k))) }, autoevaluacion: [] });
  const rv = (e: Espacio, n: number) => revisarApartado(tipoApartado(e)!, leerApartado(tipoApartado(e)!, cuadro(n)), { citasMinimas: 0, revisarPersona: false, tiempo: "no" });
  comprobar("El cuadro de variables admite hasta 10 filas por defecto", !rv(vars, 10).some((r) => r.id === "items-max-cuadro") && rv(vars, 11).some((r) => r.id === "items-max-cuadro" && r.nivel === "falta"));
  const vars5 = { ...vars, partes: [{ id: "cuadro", activa: true, maxItems: 5 }] };
  comprobar("La ficha cambia el máximo de filas", rv(vars5, 6).some((r) => r.id === "items-max-cuadro"));
  comprobar("Los objetivos específicos piden de 3 a 5 elementos", (TIPOS_APARTADO.objetivos.partes.find((p) => p.id === "especificos")?.minItems ?? 0) === 3);

  // Validación de la ficha
  const valida = (e: Espacio) => problemasPartes(e);
  comprobar("Una configuración correcta no tiene problemas", valida(conTecnica).length === 0 && valida(sinEstado).length === 0, valida(conTecnica).join(" | "));
  comprobar("Detecta un apartado sin subapartados activos", valida({ ...prob, partes: configInicial("problematica").map((c) => ({ ...c, activa: false })) }).some((m) => m.includes("al menos un subapartado activo")));
  comprobar("Detecta un subapartado que no existe en el tipo", valida({ ...prob, partes: [{ id: "inventado", activa: true }] }).some((m) => m.includes("no existe")));
  comprobar("Detecta un subapartado propio sin título o con id no válido", valida({ ...prob, partes: [{ id: "malo", activa: true, propia: { formato: "texto" } }] }).length >= 2);
  comprobar("Detecta un mínimo mayor que el máximo", valida({ ...prob, partes: [{ id: "situacion", activa: true, min: 500, max: 100 }] }).some((m) => m.includes("mínimo de palabras")));
  comprobar("Detecta una tabla propia sin columnas", valida({ ...prob, partes: [{ id: "x_t", activa: true, titulo: "T", propia: { formato: "tabla", columnas: [] } }] }).some((m) => m.includes("columnas")));
  const d = investigacionCompleta();
  const conCambios = structuredClone(d);
  const pp = conCambios.etapas.find(esEtapaProtocolo)!.espacios.find((e) => e.id === "problematica")!;
  pp.partes = sinEstado.partes;
  comprobar("La ficha con subapartados configurados es válida", validarDefinicion(conCambios).length === 0, validarDefinicion(conCambios).map((p) => p.mensaje).join(" | "));
  comprobar("La ficha con subapartados conserva su forma", tieneFormaDeDefinicion(JSON.parse(JSON.stringify(conCambios))));
  const cambios = compararDefiniciones(d, conCambios);
  comprobar("Desactivar un subapartado aparece como cambio", cambios.some((c) => c.includes("se desactivó «Estado del arte»")), cambios.join(" | "));
  const conPropio = structuredClone(d);
  conPropio.etapas.find(esEtapaProtocolo)!.espacios.find((e) => e.id === "justificacion_protocolo")!.partes = conTecnica.partes;
  comprobar("Agregar un subapartado propio aparece como cambio", compararDefiniciones(d, conPropio).some((c) => c.includes("se agregó el subapartado «Viabilidad técnica»")));

  // Metodología por enfoque
  const met = prot.espacios.find((e) => e.id === "metodologia")!;
  const cual = tipoApartado({ ...met, partes: configMetodologia("cualitativa") })!;
  comprobar("La metodología cualitativa trae participantes y categorías de análisis",
    cual.partes.some((p) => p.titulo === "Participantes y criterios de selección") && cual.partes.some((p) => p.id === "x_categorias" && p.formato === "tabla"));
  comprobar("La metodología mixta agrega la integración de los datos", tipoApartado({ ...met, partes: configMetodologia("mixta") })!.partes.some((p) => p.id === "x_integracion"));
  comprobar("Las tres metodologías son configuraciones válidas", ENFOQUES_METODOLOGIA.every((m) => problemasPartes({ ...met, partes: configMetodologia(m.valor) }).length === 0));
}

// 23. Fuentes, párrafos citados y referencias (ajustes al protocolo, 19-nov-2026)
{
  const fuente = (apellidos: string[], anio: string, titulo = "Obra"): DatosCitaApa => ({
    ...datosCitaVacios("libro"), autores: apellidos.map((a) => ({ apellidos: a, iniciales: "A." })), anio, titulo, editorial: "Editorial",
  });
  comprobar("Cita de un autor", citaEnTexto(fuente(["Pérez"], "2020")) === "Pérez, 2020");
  comprobar("Cita de dos autores", citaEnTexto(fuente(["Pérez", "Gómez"], "2019")) === "Pérez y Gómez, 2019");
  comprobar("Cita de tres o más autores", citaEnTexto(fuente(["Hernández-Sampieri", "Fernández", "Baptista"], "2014")) === "Hernández-Sampieri et al., 2014");
  comprobar("Cita de autor institucional y sin año", citaEnTexto({ ...datosCitaVacios("web"), autorInstitucional: "Organización Mundial de la Salud", anio: "" }) === "Organización Mundial de la Salud, s.f.");
  const mapa = new Map<number, DatosCitaApa>([[1, fuente(["Ruiz"], "2021")], [2, fuente(["Alas", "Bonilla"], "2018")]]);
  comprobar("Varias fuentes se citan en orden alfabético", citaDeFuentes([1, 2], mapa) === "Alas y Bonilla, 2018; Ruiz, 2021");
  comprobar("La cita va al final del párrafo, antes del punto", parrafoConCita({ texto: "El estudio es clave.", fuentes: [1] }, "Ruiz, 2021") === "El estudio es clave (Ruiz, 2021).");
  comprobar("Un texto anterior se lee como párrafos sin fuente", leerParrafos("Uno.\n\nDos.").map((p) => p.texto + p.fuentes.length).join("|") === "Uno.0|Dos.0");
  comprobar("Al recalcular, una fuente quitada sale del párrafo y de la cita",
    JSON.stringify(conCitas([{ texto: "T", fuentes: [1, 9] }], mapa)) === JSON.stringify([{ texto: "T", fuentes: [1], cita: "Ruiz, 2021" }]));
  comprobar("Las fuentes citadas se reúnen de todos los apartados",
    fuentesCitadas([{ id: "f", elemento: "apartado" }], { f: guardarComoTexto({ partes: { desarrollo: guardarParrafos([{ texto: "A", fuentes: [2] }, { texto: "B", fuentes: [1, 2] }]) }, autoevaluacion: [] }) }).sort().join() === "1,2");

  // Revisión de la fundamentación
  const prot = protocoloNuevo("p");
  const fund = prot.espacios.find((e) => e.id === "fundamentacion")!;
  const tf = tipoApartado(fund)!;
  comprobar("La fundamentación se escribe en párrafos citados", tf.partes.find((p) => p.id === "desarrollo")?.formato === "citado");
  const largo = "Los autores coinciden en que el hábito de estudio influye en el rendimiento académico de los estudiantes universitarios. ".repeat(10);
  const conPar = (ps: ParrafoCitado[]) => ({ partes: { esquema: "1. Tema", desarrollo: guardarParrafos(ps) }, autoevaluacion: [] });
  const op = { citasMinimas: 3, revisarPersona: true, tiempo: "no" as const };
  const sinFuente = revisarApartado(tf, conPar([{ texto: largo, fuentes: [1], cita: "Ruiz, 2021" }, { texto: largo, fuentes: [] }]), op);
  comprobar("Un párrafo sin fuente bloquea el envío", sinFuente.some((r) => r.id === "sin-fuente-desarrollo" && r.nivel === "falta"));
  const libre = tipoApartado({ ...fund, partes: [{ id: "esquema", activa: true }, { id: "desarrollo", activa: true, citaPorParrafo: false }] })!;
  comprobar("La ficha puede no exigir una fuente por párrafo", !revisarApartado(libre, conPar([{ texto: largo, fuentes: [] }]), op).some((r) => r.id === "sin-fuente-desarrollo"));
  const citados = revisarApartado(tf, conPar([1, 2, 3].map(() => ({ texto: largo, fuentes: [1], cita: "Ruiz, 2021" }))), op);
  comprobar("Las citas automáticas cuentan para el mínimo de citas", citados.some((r) => r.id === "citas-ok"), citados.map((r) => r.id).join());
  comprobar("Los párrafos citados se exportan con su cita", textoParte(tf, conPar([{ texto: "A.", fuentes: [1], cita: "Ruiz, 2021" }, { texto: "B", fuentes: [] }]), "desarrollo") === "A (Ruiz, 2021).\n\nB");

  // Referencias con el registro
  const bib = prot.espacios.find((e) => e.id === "bibliografia")!;
  const tb = tipoApartado(bib)!;
  comprobar("Las referencias piden 20 como mínimo", tb.partes[0].minItems === 20);
  const refs = (n: number) => Array.from({ length: n }, (_, k) => `Autor${k}, A. (2024). Obra ${k}. Editorial.`);
  const vacia = { partes: {}, autoevaluacion: [] };
  comprobar("Con 14 fuentes en el registro faltan referencias", revisarApartado(tb, vacia, op, { fuentesReferencias: refs(14) }).some((r) => r.id === "items-min-lista" && r.mensaje.includes("hay 14")));
  comprobar("Con 20 fuentes en el registro, la lista vacía escrita a mano no falta",
    !revisarApartado(tb, vacia, op, { fuentesReferencias: refs(20) }).some((r) => r.nivel === "falta"));
  comprobar("El registro y las escritas a mano se suman",
    !revisarApartado(tb, { partes: { lista: refs(5).join("\n") }, autoevaluacion: [] }, op, { fuentesReferencias: refs(15) }).some((r) => r.id === "items-min-lista"));
  comprobar("Los pendientes del protocolo cuentan el registro",
    !problemasProtocolo({ tipo: "protocolo", espacios: [bib] }, {}, { fuentesReferencias: refs(20) }).length && problemasProtocolo({ tipo: "protocolo", espacios: [bib] }, {}).length === 1);

  // Precarga de la fundamentación al marco teórico del informe final (texto)
  const marco = { ...informeFinalNuevo("if").espacios.find((e) => e.id === "if_marco")!, precargarDe: "fundamentacion" };
  const pre = precargaEspacio(marco, prot.espacios, { descripcionProblema: "", justificacion: "", objetivoGeneral: "", objetivosEspecificos: [],
    respuestas: { fundamentacion: guardarComoTexto(conPar([{ texto: "Primero.", fuentes: [1], cita: "Ruiz, 2021" }])) } });
  comprobar("La fundamentación pasa al marco teórico como texto con sus citas", leerApartado(tipoApartado(marco)!, pre).partes.desarrollo === "Primero (Ruiz, 2021).");
}

// 24. Recursos y presupuesto, y plantilla nueva del protocolo (ajustes al protocolo, 19-nov-2026)
{
  const prot = protocoloNuevo("p");
  const rec = prot.espacios.find((e) => e.elemento === "recursos_presupuesto")!;
  const reglas = reglasRecursos(rec);
  comprobar("Recursos: seis categorías, con costos en USD y al menos 3", reglas.categorias.length === 6 && reglas.conCostos && reglas.moneda === "USD" && reglas.minimo === 3);
  const lista: Recurso[] = [
    { categoria: "tecnicos", descripcion: "Laboratorio de cómputo (horas)", cantidad: 10, costoUnitario: 5 },
    { categoria: "tecnicos", descripcion: "Proyector", cantidad: 1, costoUnitario: 25.5 },
    { categoria: "operacionales", descripcion: "Gasolina", cantidad: 4, costoUnitario: 12.25 },
  ];
  const pres = presupuesto(lista);
  comprobar("El presupuesto suma por categoría y en total",
    pres.porCategoria.map((x) => `${x.categoria}:${x.total}`).join() === "tecnicos:75.5,operacionales:49" && pres.total === 124.5, JSON.stringify(pres));
  comprobar("Recursos completos no tienen pendientes", problemasRecursos(rec, lista).length === 0);
  comprobar("Faltan recursos si hay menos del mínimo", problemasRecursos(rec, lista.slice(0, 2)).some((m) => m.includes("al menos 3")));
  comprobar("Con costos, cada recurso pide cantidad y costo", problemasRecursos(rec, [...lista, { categoria: "materiales", descripcion: "Reactivos" }]).some((m) => m.includes("sin cantidad")));
  const sinCostos = { ...rec, parametros: { ...rec.parametros, conCostos: false, minimo: 1, categorias: ["tecnicos", "inmateriales"] } };
  comprobar("Sin costos basta la descripción", problemasRecursos(sinCostos, [{ categoria: "tecnicos", descripcion: "Laboratorio" }]).length === 0);
  const limpios = limpiarRecursos([...lista, { categoria: "inventada", descripcion: "X" }, { categoria: "inmateriales", descripcion: " Internet ", cantidad: 3 }], reglasRecursos(sinCostos));
  comprobar("Al guardar quedan solo las categorías de la ficha y, sin costos, sin montos",
    JSON.stringify(limpios) === JSON.stringify([{ categoria: "tecnicos", descripcion: "Laboratorio de cómputo (horas)" }, { categoria: "tecnicos", descripcion: "Proyector" }, { categoria: "inmateriales", descripcion: "Internet" }]), JSON.stringify(limpios));
  comprobar("Un protocolo sin recursos los tiene pendientes", problemasProtocolo({ tipo: "protocolo", espacios: [rec] }, {}).length === 1);
  comprobar("Los recursos solo van en el protocolo", elementoEnEtapa("recursos_presupuesto", "protocolo") && !elementoEnEtapa("recursos_presupuesto", "propuesta"));

  // Plantilla nueva
  comprobar("La plantilla sigue el orden de la reunión",
    prot.espacios.map((e) => e.id).join() === "introduccion,generalidades,problematica,justificacion_protocolo,objetivos_protocolo,fundamentacion,hipotesis,matriz_hipotesis,variables,metodologia,eticas,recursos,bibliografia,anexos_protocolo");
  comprobar("Las generalidades piden el resumen del proyecto", tipoApartado(prot.espacios.find((e) => e.id === "generalidades")!)!.partes.some((p) => p.id === "resumen" && !p.opcional));
  comprobar("En las versiones anteriores el resumen es opcional", TIPOS_APARTADO.generalidades.partes.find((p) => p.id === "resumen")?.opcional === true);
  const eticas = prot.espacios.find((e) => e.id === "eticas")!;
  comprobar("Las consideraciones éticas son opcionales, con consentimiento y confidencialidad",
    !eticas.obligatorio && tipoApartado(eticas)!.partes.map((p) => p.id).join() === "consentimiento,confidencialidad,riesgos");
  const d = investigacionCompleta();
  d.etapas = d.etapas.map((e) => (e.tipo === "protocolo" ? protocoloNuevo(e.id) : e));
  comprobar("La ficha con la plantilla nueva es válida", validarDefinicion(d).length === 0, validarDefinicion(d).map((p) => p.mensaje).join(" | "));
  comprobar("La ficha con la plantilla nueva conserva su forma", tieneFormaDeDefinicion(JSON.parse(JSON.stringify(d))));
}

// 25. Documento del protocolo (ajustes al protocolo, 19-nov-2026)
{
  const prot = protocoloNuevo("p");
  // Cronograma: dos períodos de dos columnas; a1 en P1, a2 en P2.
  const columnas = [{ periodo: 1 }, { periodo: 1 }, { periodo: 2 }, { periodo: 2 }];
  const hoja = (id: string, codigo: string, montos: number[]): NodoPlan => ({ id, codigo, nivel: 4, titulo: `Actividad ${codigo}`, responsable: null, montos, hijos: [] });
  const arbol: NodoPlan = { id: "og", codigo: "1", nivel: 1, titulo: "OG", responsable: null, montos: [], hijos: [
    { id: "o", codigo: "1.1", nivel: 2, titulo: "Objetivo", responsable: null, montos: [], hijos: [
      { id: "m", codigo: "1.1.1", nivel: 3, titulo: "Macro", responsable: null, montos: [], hijos: [hoja("a1", "1.1.1.1", [0, 1, 0, 0]), hoja("a2", "1.1.1.2", [0, 0, 1, 0])] }] }] };
  const cron = bloquesCronograma(arbol, columnas);
  const tabla = cron.find((b) => b.tipo === "tabla") as { columnas: string[]; filas: string[][] };
  comprobar("El cronograma tiene una columna por período", tabla.columnas.join() === "Código,Objetivo, macroactividad o actividad,P1,P2");
  comprobar("Cada actividad marca su período y los niveles superiores los de sus actividades",
    tabla.filas.map((f) => `${f[0]}:${f.slice(2).join("")}`).join("|") === "1.1:■■|1.1.1:■■|1.1.1.1:■|1.1.1.2:■", tabla.filas.map((f) => f.join("/")).join(" | "));
  const rec = prot.espacios.find((e) => e.elemento === "recursos_presupuesto")!;
  const recursos = JSON.stringify([{ categoria: "operacionales", descripcion: "Gasolina", cantidad: 4, costoUnitario: 12.25 }, { categoria: "tecnicos", descripcion: "Laboratorio", cantidad: 10, costoUnitario: 5 }]);
  const br = bloquesRecursos(rec, recursos);
  const tablas = br.filter((b) => b.tipo === "tabla") as { filas: string[][] }[];
  comprobar("Los recursos salen en el orden de las categorías, con su total", tablas[0].filas[0][0] === "Técnicos o de infraestructura" && tablas[0].filas[0][4] === "$50.00");
  comprobar("El presupuesto cierra con el total general", tablas[1].filas.at(-1)!.join("|") === "Total general|2|$99.00", tablas[1].filas.at(-1)!.join("|"));
  comprobar("Sin recursos, el documento lo marca pendiente", bloquesRecursos(rec, "")[0].tipo === "pendiente");

  // Armado del documento
  const contenidos: Record<string, string> = { recursos };
  const { apartados } = apartadosInformeFinal(prot, contenidos, (e) => (e.elemento === "recursos_presupuesto" ? bloquesRecursos(e, contenidos[e.id]) : []),
    { referencias: ["Zeta, A. (2020). Obra. Editorial.", "Alfa, B. (2019). Libro. Editorial."], insertar: [{ antesDe: "recursos", titulo: "Cronograma de actividades", bloques: () => cron }] });
  const titulos = apartados.map((a) => `${a.numero ?? "-"} ${a.titulo}`);
  const iCron = titulos.findIndex((t) => t.endsWith("Cronograma de actividades"));
  comprobar("El cronograma va justo antes de los recursos y se numera", iCron >= 0 && titulos[iCron + 1].endsWith("Recursos y presupuesto") && apartados[iCron].numero === apartados[iCron + 1].numero! - 1, titulos.join(" | "));
  const refs = apartados.find((a) => a.titulo === "Referencias bibliográficas")!;
  const lista = refs.bloques.find((b) => b.tipo === "lista") as { items: string[] } | undefined;
  comprobar("Las referencias del registro salen en orden alfabético y sin número", refs.numero === null && lista?.items.join(" / ") === "Alfa, B. (2019). Libro. Editorial. / Zeta, A. (2020). Obra. Editorial.");
  comprobar("La portada del protocolo lleva su nombre", portadaInformeFinal({ titulo: "T", facultad: null, carrera: null, integrantes: [], asesor: null, fecha: "2026-11-19" }, "Protocolo de investigación").portada.grupos[0][0] === "PROTOCOLO DE INVESTIGACIÓN");
  const sinRecursos = apartadosInformeFinal({ espacios: prot.espacios.filter((e) => e.id !== "recursos") }, {}, () => [], { insertar: [{ antesDe: "recursos", titulo: "Cronograma de actividades", bloques: () => cron }] });
  comprobar("Si no está el espacio indicado, el cronograma va al final", sinRecursos.apartados.at(-1)!.titulo === "Cronograma de actividades");
}

// 26. Cronograma de investigación (notas del 19-nov-2026, entrega E1)
{
  // La estructura sin la metodología por objetivo (que se prueba en la sección 27).
  const plan = { ...planNuevo("plan", "investigacion"), metodologiaObjetivo: false };
  const columnas = 8;
  const crudo: NodoPlan = { id: "og", codigo: "1", nivel: 1, titulo: "OG", responsable: 1, montos: [], hijos: [
    { id: "o1", codigo: "", nivel: 2, titulo: "Objetivo 1", responsable: null, montos: [], hijos: [], productos: ["Algo"] },
  ] };
  const n1 = normalizarArbol(crudo, plan);
  const o1 = n1.hijos[0];
  comprobar("Cada objetivo recibe sus cinco elementos, al mismo nivel y en orden",
    o1.hijos.map((h) => `${h.codigo} ${h.titulo}`).join(" | ") === "1.1.1 Metodología | 1.1.2 Desarrollo | 1.1.3 Resultados | 1.1.4 Conclusiones preliminares | 1.1.5 Elementos de discusión"
      && o1.hijos.every((h) => h.nivel === 3 && h.componente), o1.hijos.map((h) => `${h.codigo} ${h.titulo}`).join(" | "));
  comprobar("El objetivo ya no lleva productos en el cronograma de investigación", productosDe(o1).length === 0);
  const cierre = n1.hijos.at(-1)!;
  comprobar("El cronograma termina con el bloque de preparación del informe", cierre.cierre === true && cierre.codigo === "1.2" && cierre.hijos.map((h) => h.titulo).join() === "Redacción del informe final,Conclusiones finales");
  comprobar("objetivosEspecificos y objetivosDelPlan no cuentan el bloque de cierre", objetivosEspecificos(n1).length === 1 && objetivosDelPlan(n1).length === 1);
  comprobar("Un cronograma de proyecto no se toca", normalizarArbol(crudo, planNuevo("p")) === crudo);

  // Conserva lo planificado y las subactividades; descarta lo que no es un elemento; es idempotente.
  const conDatos = structuredClone(n1);
  conDatos.hijos[0].hijos[0].montos = [1, 1];
  conDatos.hijos[0].hijos[1].hijos = [{ id: "s1", codigo: "", nivel: 4, titulo: "Aplicar encuesta", responsable: null, montos: [0, 0, 1], hijos: [] }];
  conDatos.hijos[0].hijos.push({ id: "x", codigo: "", nivel: 3, titulo: "Macroactividad suelta", responsable: null, montos: [], hijos: [] });
  conDatos.hijos[0].hijos[0].titulo = "Otro nombre";
  const n2 = normalizarArbol(conDatos, plan);
  comprobar("Se conservan lo planificado y las subactividades de cada elemento",
    n2.hijos[0].hijos[0].montos.join() === "1,1" && n2.hijos[0].hijos[1].hijos[0]?.titulo === "Aplicar encuesta" && n2.hijos[0].hijos[1].hijos[0].codigo === "1.1.2.1");
  comprobar("Solo quedan los elementos de la ficha, con su nombre", n2.hijos[0].hijos.length === 5 && n2.hijos[0].hijos[0].titulo === "Metodología");
  comprobar("Normalizar dos veces da lo mismo", JSON.stringify(normalizarArbol(n2, plan)) === JSON.stringify(n2));
  const sinCierre = normalizarArbol(n2, { ...plan, cierre: { activo: false, titulo: "x" } });
  comprobar("Sin bloque de cierre en la ficha, el cronograma no lo tiene", !sinCierre.hijos.some((h) => h.cierre));
  const renombrado = normalizarArbol(n2, { ...plan, componentes: componentesDe(plan).map((c) => (c.clave === "desarrollo" ? { ...c, nombre: "Trabajo de campo" } : c)) });
  comprobar("El nombre de cada elemento sale de la ficha", renombrado.hijos[0].hijos[1].titulo === "Trabajo de campo");

  // Hojas y reglas
  comprobar("Un elemento sin subactividades es hoja; con subactividades, no", esHojaPlan(n2.hijos[0].hijos[0]) && !esHojaPlan(n2.hijos[0].hijos[1]) && esHojaPlan(n2.hijos[0].hijos[1].hijos[0]));
  const reglas = { ...plan, minimos: { ...plan.minimos, objetivosPorIntegrante: 1 } };
  const vacio = validarPlanEquipo(n1, reglas, [1], columnas).map((p) => p.mensaje);
  comprobar("Cada elemento obligatorio debe planificarse", ["1.1.1:", "1.1.2:", "1.1.3:", "1.1.4:", "1.2.1:", "1.2.2:"].every((c) => vacio.some((m) => m.startsWith(c) && m.includes("planifica"))), vacio.join(" | "));
  comprobar("Los elementos de discusión pueden quedar sin planificar", !vacio.some((m) => m.startsWith("1.1.5")));
  comprobar("No se piden macroactividades ni productos en investigación", !vacio.some((m) => m.includes("macroactividad") || m.includes("producto")));
  const lleno = structuredClone(n1);
  for (const n of aplanar(lleno)) if (esHojaPlan(n) && n.componente !== "discusion") n.montos = [1];
  comprobar("Con los elementos planificados no quedan pendientes", validarPlanEquipo(lleno, reglas, [1], columnas).length === 0, validarPlanEquipo(lleno, reglas, [1], columnas).map((p) => p.mensaje).join(" | "));
  const conSub = structuredClone(lleno);
  conSub.hijos[0].hijos[1].hijos = [{ id: "s1", codigo: "1.1.2.1", nivel: 4, titulo: "", responsable: null, montos: [], hijos: [] }];
  const pend = validarPlanEquipo(conSub, reglas, [1], columnas).map((p) => p.mensaje);
  comprobar("Una subactividad necesita título y su período", pend.some((m) => m.includes("falta el título de la subactividad")) && pend.some((m) => m.startsWith("1.1.2.1") && m.includes("marca al menos")), pend.join(" | "));
  comprobar("El cronograma de investigación llega hasta las subactividades",
    validarPlanEquipo({ ...conSub, hijos: [{ ...conSub.hijos[0], hijos: [{ ...conSub.hijos[0].hijos[0], hijos: [{ id: "s", codigo: "1.1.1.1", nivel: 4, titulo: "S", responsable: null, montos: [1], hijos: [{ id: "ss", codigo: "1.1.1.1.1", nivel: 5, titulo: "SS", responsable: null, montos: [1], hijos: [] }] }] }, ...conSub.hijos[0].hijos.slice(1)] }, conSub.hijos[1]] }, reglas, [1], columnas)
      .some((m) => m.mensaje.includes("llega hasta las subactividades")));
  comprobar("Los elementos del período son las hojas planificadas en él", actividadesDelPeriodo(lleno, 1, Array.from({ length: columnas }, () => ({ periodo: 1 }))).length === 6);

  // Ejemplo y equipo
  const ej = planEjemplo(reglas, 1, columnas);
  comprobar("El cronograma de ejemplo de investigación cumple sus reglas", validarPlanEquipo(ej, reglas, [1], columnas).length === 0, validarPlanEquipo(ej, reglas, [1], columnas).map((p) => p.mensaje).join(" | "));
  const ej2 = planEjemplo(plan, 2, 16);
  comprobar("En equipo, cada integrante tiene sus objetivos y el bloque de cierre es de todos",
    validarPlanEquipo(ej2, plan, [1, 2], 16).length === 0 && [1, 2].every((i) => planIndividual(ej2, i)!.hijos.filter((h) => !h.cierre).length === 3 && planIndividual(ej2, i)!.hijos.some((h) => h.cierre)),
    validarPlanEquipo(ej2, plan, [1, 2], 16).map((p) => p.mensaje).join(" | "));
  comprobar("La carga por integrante no cuenta el bloque de cierre como objetivo", cargaPorIntegrante(ej2, 2, 16).every((c) => c.objetivos === 3));
  const sinResp = { ...ej2, hijos: ej2.hijos.map((h, i) => (i === 0 ? { ...h, responsable: null } : h)) };
  comprobar("En equipo, cada objetivo necesita responsable (el bloque de cierre no)", validarPlanEquipo(sinResp, plan, [1, 2], 16).map((p) => p.mensaje).join() === "1.1: falta el integrante responsable.,Cada integrante debe tener al menos 3 objetivos específicos; uno de ellos tiene 2.", validarPlanEquipo(sinResp, plan, [1, 2], 16).map((p) => p.mensaje).join(" | "));
  const cron = bloquesCronograma(lleno, [{ periodo: 1 }]);
  comprobar("El cronograma del protocolo muestra los elementos de cada objetivo y el cierre", JSON.stringify(cron).includes("Metodología") && JSON.stringify(cron).includes("Preparación del informe final"));

  // Ficha
  const d = investigacionCompleta();
  comprobar("La ficha de investigación con el cronograma nuevo es válida", validarDefinicion(d).length === 0 && esCronogramaInvestigacion(d.etapas.find(esEtapaPlan)!), validarDefinicion(d).map((p) => p.mensaje).join(" | "));
  comprobar("La ficha con el cronograma nuevo conserva su forma", tieneFormaDeDefinicion(JSON.parse(JSON.stringify(d))));
  comprobar("Las versiones anteriores son cronogramas de proyecto", estructuraPlan({}) === "actividades" && !cierreDe({}).activo);
  const cambiada = structuredClone(d);
  const pc = cambiada.etapas.find(esEtapaPlan)!;
  pc.componentes = componentesDe(pc).map((c) => (c.clave === "discusion" ? { ...c, obligatorio: true } : c));
  pc.cierre = { activo: false, titulo: "" };
  const cambios = compararDefiniciones(d, cambiada);
  comprobar("Los cambios de los elementos y del cierre aparecen al habilitar", cambios.some((c) => c.includes("elementos de cada objetivo")) && cambios.some((c) => c.includes("preparación del informe final, Preparación")), cambios.join(" | "));
  comprobar("Cambiar el tipo de cronograma aparece al habilitar", compararDefiniciones(d, (() => { const x = structuredClone(d); x.etapas.find(esEtapaPlan)!.estructura = "actividades"; return x; })()).some((c) => c.includes("tipo de cronograma, de investigación → de proyecto")));
}
detecta("cronograma de investigación en proyecto", proyectoConCambio((d) => { Object.assign(d.etapas.find(esEtapaPlan)!, { estructura: "investigacion" }); }), "solo para la modalidad de investigación");
detecta("cronograma de investigación con responsable por actividad", investigacionConCambio((d) => { d.etapas.find(esEtapaPlan)!.equipo.responsable = "actividad"; }), "se asigna por objetivo específico");
detecta("cronograma de investigación con productos", investigacionConCambio((d) => { d.etapas.find(esEtapaPlan)!.productosObjetivo = "obligatorio"; }), "no lleva productos ni documentos");
detecta("ningún elemento obligatorio", investigacionConCambio((d) => { const p = d.etapas.find(esEtapaPlan)!; p.componentes = componentesDe(p).map((c) => ({ ...c, obligatorio: false })); }), "al menos un elemento del proceso");
detecta("dos elementos con el mismo nombre", investigacionConCambio((d) => { const p = d.etapas.find(esEtapaPlan)!; p.componentes = componentesDe(p).map((c) => ({ ...c, nombre: c.clave === "resultados" ? "Desarrollo" : c.nombre })); }), "mismo nombre");

// 27. Metodología de cada objetivo con referencias (cronograma de investigación, entrega E2)
{
  const plan = { ...planNuevo("plan", "investigacion"), minimos: { objetivosPorIntegrante: 1, macroPorObjetivo: 1, actividadesPorMacro: 1 } };
  comprobar("La plantilla de investigación pide la metodología de cada objetivo", pideMetodologia(plan) && !pideMetodologia(planNuevo("p")));
  const base = normalizarArbol({ id: "og", codigo: "1", nivel: 1, titulo: "OG", responsable: 1, montos: [], hijos: [{ id: "o1", codigo: "", nivel: 2, titulo: "O1", responsable: null, montos: [], hijos: [] }] }, plan);
  for (const n of aplanar(base)) if (esHojaPlan(n) && n.componente !== "discusion") n.montos = [1];
  const met = () => aplanar(base).find((n) => n.componente === "metodologia")!;
  const conMet = (m: NonNullable<NodoPlan["metodologia"]>) => {
    const a = structuredClone(base);
    aplanar(a).find((n) => n.componente === "metodologia")!.metodologia = m;
    return a;
  };
  const msj = (a: NodoPlan) => validarPlanEquipo(a, plan, [1], 4).map((p) => p.mensaje);
  comprobar("Sin metodología, el plan no se envía", msj(base).some((m) => m.startsWith("1.1.1: describe la metodología")), msj(base).join(" | "));
  const sinCita = conMet({ parrafos: [{ texto: "Se aplicará una encuesta.", fuentes: [] }], propia: false, fundamentacion: [] });
  comprobar("Sin ninguna cita, tampoco", msj(sinCita).some((m) => m.includes("al menos una cita del registro")));
  const conCita = conMet({ parrafos: [{ texto: "Se aplicará una encuesta.", fuentes: [7] }, { texto: "Luego se tabulará.", fuentes: [] }], propia: false, fundamentacion: [] });
  comprobar("Con una cita basta (no se exige en cada párrafo)", msj(conCita).length === 0, msj(conCita).join(" | "));
  const propia = conMet({ parrafos: [{ texto: "Procedimiento propio.", fuentes: [7] }], propia: true, fundamentacion: [] });
  comprobar("Una metodología propia pide su fundamentación", msj(propia).some((m) => m.includes("fundamenta la metodología propia")));
  const propiaSinCita = conMet({ parrafos: [{ texto: "Procedimiento propio.", fuentes: [7] }], propia: true, fundamentacion: [{ texto: "Se basa en estudios previos.", fuentes: [] }] });
  comprobar("La fundamentación necesita al menos una cita", msj(propiaSinCita).some((m) => m.includes("fundamentación de la metodología propia necesita")));
  comprobar("Sin la opción en la ficha no se pide metodología", validarPlanEquipo(base, { ...plan, metodologiaObjetivo: false }, [1], 4).length === 0);

  // Citas, fuentes citadas y forma
  const mapa = new Map([[7, { ...datosCitaVacios(), autores: [{ apellidos: "Hernández-Sampieri", iniciales: "R." }], anio: "2018", titulo: "Metodología" }]]);
  const citado = arbolConCitas(propiaSinCita, mapa);
  const mc = leerMetodologia(aplanar(citado).find((n) => n.componente === "metodologia")!);
  comprobar("El servidor arma la cita de cada párrafo", mc.parrafos[0].cita === "Hernández-Sampieri, 2018" && !mc.fundamentacion[0].cita, JSON.stringify(mc));
  comprobar("Una fuente que ya no está se quita del párrafo", leerMetodologia(aplanar(arbolConCitas(propiaSinCita, new Map())).find((n) => n.componente === "metodologia")!).parrafos[0].fuentes.length === 0);
  comprobar("Las fuentes citadas del plan cuentan para el registro", fuentesCitadasPlan(conCita).join() === "7" && fuentesCitadasPlan(base).length === 0);
  comprobar("La metodología se conserva al normalizar", leerMetodologia(aplanar(normalizarArbol(conCita, plan)).find((n) => n.componente === "metodologia")!).parrafos.length === 2);
  comprobar("Texto de la metodología con sus citas", textoMetodologia(mc.parrafos) === "Procedimiento propio (Hernández-Sampieri, 2018).");
  comprobar("Forma válida de la metodología", metodologiaValida(undefined) && metodologiaValida({ parrafos: [], propia: false, fundamentacion: [] })
    && !metodologiaValida({ parrafos: [{ texto: 1, fuentes: [] }], propia: false, fundamentacion: [] }) && !metodologiaValida({ parrafos: [], propia: "no", fundamentacion: [] }));
  comprobar("El ejemplo del constructor trae una metodología citada", validarPlanEquipo(planEjemplo(plan, 1, 8), plan, [1], 8).length === 0);
  comprobar("met() sigue sin metodología en el plan base", leerMetodologia(met()).parrafos.length === 0);

  // Equipo: un integrante no cambia la metodología de un objetivo ajeno
  const ajeno = structuredClone(conCita);
  ajeno.hijos[0].responsable = 2;
  const cambiado = structuredClone(ajeno);
  aplanar(cambiado).find((n) => n.componente === "metodologia")!.metodologia = { parrafos: [{ texto: "Otra.", fuentes: [7] }], propia: false, fundamentacion: [] };
  comprobar("Un integrante no cambia la metodología de un objetivo ajeno", cambioNoPermitido(ajeno, cambiado, 3) !== null && cambioNoPermitido(ajeno, cambiado, 2) === null);

  // Ficha
  comprobar("Cambiar la opción aparece al habilitar", compararDefiniciones(investigacionCompleta(), (() => { const x = investigacionCompleta(); x.etapas.find(esEtapaPlan)!.metodologiaObjetivo = false; return x; })())
    .some((c) => c.includes("metodología de cada objetivo con referencias")));
}
detecta("metodología por objetivo en un cronograma de proyecto", proyectoConCambio((d) => { d.etapas.find(esEtapaPlan)!.metodologiaObjetivo = true; }), "parte del cronograma de investigación");
detecta("metodología por objetivo con el elemento opcional", investigacionConCambio((d) => { const p = d.etapas.find(esEtapaPlan)!; p.componentes = componentesDe(p).map((c) => (c.clave === "metodologia" ? { ...c, obligatorio: false } : c)); }), "márcalo como obligatorio");

// 28. Ejecución por elementos y avance (cronograma de investigación, entrega E3)
{
  const plan = { ...planNuevo("plan", "investigacion"), metodologiaObjetivo: false };
  const arbol = normalizarArbol({ id: "og", codigo: "1", nivel: 1, titulo: "OG", responsable: 1, montos: [], hijos: [{ id: "o1", codigo: "", nivel: 2, titulo: "O1", responsable: null, montos: [], hijos: [] }] }, plan);
  const o1 = arbol.hijos[0];
  const id = (c: string) => o1.hijos.find((h) => h.componente === c)!.id;
  comprobar("Solo la discusión queda marcada como opcional", o1.hijos.filter((h) => h.opcional).map((h) => h.componente).join() === "discusion");
  const av = (pares: [string, number][]) => avancePorNodo(arbol, new Map(pares.map(([c, a]) => [id(c), a])));
  comprobar("Con la metodología terminada, el objetivo va al 25 % (la discusión sin usar no cuenta)", av([["metodologia", 100]]).get("o1") === 25, String(av([["metodologia", 100]]).get("o1")));
  comprobar("Con la discusión usada, cada elemento vale 20 %", av([["metodologia", 100], ["discusion", 0]]).get("o1") === 20);
  const planificada = structuredClone(arbol);
  planificada.hijos[0].hijos.find((h) => h.componente === "discusion")!.montos = [1];
  comprobar("La discusión planificada también cuenta", avancePorNodo(planificada, new Map([[id("metodologia"), 100]])).get("o1") === 20);
  comprobar("En un plan de proyecto el promedio no cambia", avancePorNodo(numerar({ id: "r", codigo: "1", nivel: 1, titulo: "R", responsable: null, montos: [], hijos: [
    { id: "a", codigo: "", nivel: 4, titulo: "A", responsable: null, montos: [], hijos: [] }, { id: "b", codigo: "", nivel: 4, titulo: "B", responsable: null, montos: [], hijos: [] }] }), new Map([["a", 100]])).get("r") === 50);

  // Estados de un elemento
  const reg = (nodoId: string, avance: number | null, estado: string, periodo = 1) => ({ nodoId, avance, estado, periodo });
  const met = o1.hijos.find((h) => h.componente === "metodologia")!;
  comprobar("Sin registros, el elemento está sin iniciar", estadoElemento(met, []) === "sin_iniciar");
  comprobar("Al 60 % está en curso", estadoElemento(met, [reg(met.id, 60, "enviado")]) === "en_curso");
  comprobar("Al 100 % enviado, está concluido y por validar", estadoElemento(met, [reg(met.id, 100, "enviado")]) === "por_validar");
  comprobar("Al 100 % aprobado por el asesor, está validado", estadoElemento(met, [reg(met.id, 60, "aprobado"), reg(met.id, 100, "aprobado", 2)]) === "validado");
  comprobar("Un registro observado lo marca con observaciones", estadoElemento(met, [reg(met.id, 100, "observado")]) === "observado");
  const conSubs = structuredClone(arbol);
  const des = conSubs.hijos[0].hijos.find((h) => h.componente === "desarrollo")!;
  des.hijos = [{ id: "s1", codigo: "", nivel: 4, titulo: "S1", responsable: null, montos: [1], hijos: [] }, { id: "s2", codigo: "", nivel: 4, titulo: "S2", responsable: null, montos: [1], hijos: [] }];
  comprobar("Con subactividades, el elemento se valida cuando todas lo están",
    estadoElemento(des, [reg("s1", 100, "aprobado")]) === "en_curso" && estadoElemento(des, [reg("s1", 100, "aprobado"), reg("s2", 100, "aprobado")]) === "validado");
  comprobar("La subactividad pertenece a su elemento", elementoDe(conSubs, "s2")?.componente === "desarrollo" && elementoDe(conSubs, des.id)?.id === des.id && elementoDe(conSubs, "o1") === null);

  // Proceso del objetivo
  const validados = ["metodologia", "desarrollo", "resultados", "conclusiones"].map((c) => reg(id(c), 100, "aprobado"));
  const proc = procesoPorObjetivo(arbol, validados);
  comprobar("Con los 4 elementos obligatorios validados, el objetivo queda validado al 100 %", proc[0].cerrado && proc[0].avance === 100, JSON.stringify({ c: proc[0].cerrado, a: proc[0].avance }));
  comprobar("La discusión sin usar no cuenta para cerrar el objetivo", proc[0].elementos.find((e) => e.nodo.componente === "discusion")!.cuenta === false);
  const conDiscusion = procesoPorObjetivo(arbol, [...validados, reg(id("discusion"), 50, "enviado")]);
  comprobar("Si se usa la discusión, también debe validarse", !conDiscusion[0].cerrado && conDiscusion[0].avance === 90);
  comprobar("Un borrador de la discusión no la hace contar", procesoPorObjetivo(arbol, [...validados, reg(id("discusion"), null, "borrador")])[0].cerrado);
  comprobar("El bloque de preparación del informe tiene su propio proceso", procesoPorObjetivo(arbol, []).at(-1)!.nodo.cierre === true);
  comprobar("Las conclusiones (preliminares y finales) se revisan como conclusión", TEXTOS_ELEMENTO.conclusiones.conclusion === true && TEXTOS_ELEMENTO.conclusiones_finales.conclusion === true && !TEXTOS_ELEMENTO.desarrollo.conclusion);

  // Bitácora: tipos de investigación y aceptación del asesor
  const entradas = entradasBitacora({ arbol, registros: [{ nodoId: met.id, periodo: 1, estado: "aprobado", modificacionTipo: "metodologia", modificacion: "Se cambió la muestra." }, { nodoId: id("desarrollo"), periodo: 1, estado: "enviado", modificacionTipo: "hallazgo", modificacion: "Supuesto nuevo." }], entregas: [] });
  comprobar("La bitácora registra ajustes a la metodología y hallazgos, con el estado de su aceptación",
    entradas.map((e) => `${e.tipo}:${e.estado}`).join() === "metodologia:aprobado,hallazgo:enviado", entradas.map((e) => `${e.tipo}:${e.estado}`).join());
}

// 29. Informe final por objetivo (cronograma de investigación, entrega E4)
{
  const plan = { ...planNuevo("plan", "investigacion"), metodologiaObjetivo: true };
  const arbol = normalizarArbol({ id: "og", codigo: "1", nivel: 1, titulo: "Analizar los hábitos", responsable: 1, montos: [], hijos: [
    { id: "o1", codigo: "", nivel: 2, titulo: "Caracterizar los hábitos", responsable: null, montos: [], hijos: [] },
    { id: "o2", codigo: "", nivel: 2, titulo: "Medir el rendimiento", responsable: null, montos: [], hijos: [] }] }, plan);
  const el = (o: number, c: string) => arbol.hijos[o].hijos.find((h) => h.componente === c)!;
  el(0, "metodologia").metodologia = { parrafos: [{ texto: "Se aplicará un cuestionario", fuentes: [1], cita: "Pérez, 2020" }], propia: true, fundamentacion: [{ texto: "Se basa en estudios previos", fuentes: [2], cita: "Ruiz, 2019" }] };
  el(0, "desarrollo").hijos = [
    { id: "s1", codigo: "1.1.2.1", nivel: 4, titulo: "Aplicar la encuesta", responsable: null, montos: [1], hijos: [] },
    { id: "s2", codigo: "1.1.2.2", nivel: 4, titulo: "Tabular", responsable: null, montos: [1], hijos: [] }];
  const r = (nodoId: string, periodo: number, avance: number, estado: string, acciones: string, resultado: string) =>
    ({ nodoId, periodo, avance, estado, acciones, resultado, fechaInicio: "2026-10-16", fechaFin: "2026-10-30" });
  const registros = [
    r(el(0, "metodologia").id, 1, 100, "aprobado", "Se validó el cuestionario", "Instrumento listo"),
    r("s1", 1, 50, "aprobado", "Se aplicó a 60 estudiantes", "60 respuestas"),
    r("s1", 2, 100, "aprobado", "Se aplicó a los 60 restantes", "120 respuestas"),
    r("s2", 2, 100, "enviado", "Se tabularon los datos", "Base de datos"),
    r(el(0, "resultados").id, 2, 100, "aprobado", "Se analizaron", "El 40 % estudia menos de 5 horas"),
    r(el(0, "conclusiones").id, 2, 100, "aprobado", "Se integraron", "Se determinó que los hábitos son deficientes"),
    r(el(1, "metodologia").id, 2, 30, "borrador", "Borrador", "Borrador"),
  ];
  const evidencias = [{ nodoId: "s1", periodo: 1, tipo: "enlace" as const, leyenda: "Cuestionario", nombre: null, url: "https://x.y", nota: null }];
  const { bloques, anexos } = resultadosPorObjetivo({ arbol, registros, evidencias, entregas: [], productos: [], numero: 8 });
  const texto = JSON.stringify(bloques);
  const subtitulos = bloques.filter((b) => b.tipo === "subtitulo").map((b) => (b as { texto: string }).texto);
  comprobar("El capítulo va por objetivo y por las partes de su proceso",
    subtitulos.slice(0, 7).join(" | ") === "8.1 Objetivo general | 8.2 Objetivo específico 1.1: Caracterizar los hábitos | 8.2.1 Metodología utilizada | 8.2.2 Desarrollo realizado | 8.2.3 Resultados obtenidos | 8.2.4 Conclusiones preliminares | 8.3 Objetivo específico 1.2: Medir el rendimiento", subtitulos.join(" | "));
  comprobar("La discusión sin usar y el bloque de cierre no entran", !texto.includes("Elementos de discusión") && !texto.includes("Preparación del informe final"));
  comprobar("La metodología trae lo planificado con sus citas, la fundamentación propia y cómo se aplicó",
    texto.includes("Se aplicará un cuestionario (Pérez, 2020).") && texto.includes("Fundamentación de la metodología propia: Se basa en estudios previos (Ruiz, 2019).") && texto.includes("Aplicación: Del 16/10/2026 al 30/10/2026: Se validó el cuestionario. Instrumento listo."));
  comprobar("El desarrollo se cuenta registro por registro, con su subactividad, sus fechas y sus evidencias",
    texto.includes("1.1.2.1 Aplicar la encuesta. Del 16/10/2026 al 30/10/2026: Se aplicó a 60 estudiantes. 60 respuestas. Evidencias: Anexo 1.") && texto.includes("1.1.2.1 Aplicar la encuesta. Del 16/10/2026 al 30/10/2026: Se aplicó a los 60 restantes. 120 respuestas."));
  comprobar("Los resultados y las conclusiones preliminares traen lo que se obtuvo", texto.includes("El 40 % estudia menos de 5 horas.") && texto.includes("Se determinó que los hábitos son deficientes."));
  comprobar("Las evidencias pasan a los anexos con su procedencia", anexos.length === 1 && anexos[0].actividad === "subactividad 1.1.2.1");
  comprobar("Un borrador no entra y lo que falta queda pendiente", !texto.includes("Borrador") && texto.includes("Pendiente: «Desarrollo» todavía no tiene registros enviados."));
  comprobar("El objetivo general resume el avance y los objetivos validados", texto.includes("Objetivos específicos validados por el asesor: 0 de 2."));
  comprobar("Un plan de proyecto sigue con su capítulo de siempre", !esPlanPorElementos(planEjemplo(planNuevo("p"), 1, 4)) && esPlanPorElementos(arbol));
  comprobar("La plantilla nombra el capítulo por objetivo", informeFinalNuevo("if").espacios.find((e) => e.id === "if_resultados")!.titulo === "Desarrollo o ejecución de la investigación");
}

// 30. Plantilla recomendada al crear una ficha (recorrido integral, 19-nov-2026)
{
  for (const m of ["proyecto", "investigacion"] as const) {
    const d = plantillaRecomendada(m);
    comprobar(`La plantilla recomendada de ${m} es válida`, validarDefinicion(d).length === 0 && tieneFormaDeDefinicion(JSON.parse(JSON.stringify(d))), validarDefinicion(d).map((p) => p.mensaje).join(" | "));
  }
  comprobar("Proyecto: propuesta, plan, ejecución e informe final (H7)", plantillaRecomendada("proyecto").etapas.map((e) => e.tipo).join() === "propuesta,plan,ejecucion,informe_final");
  comprobar("Investigación: propuesta, protocolo, cronograma de investigación, ejecución e informe final",
    plantillaRecomendada("investigacion").etapas.map((e) => e.tipo).join() === "propuesta,protocolo,plan,ejecucion,informe_final"
      && esCronogramaInvestigacion(plantillaRecomendada("investigacion").etapas.find(esEtapaPlan)!));
  comprobar("La pasantía usa su ficha base", JSON.stringify(plantillaRecomendada("pasantia")) === JSON.stringify(definicionBase("pasantia")));
}

// 31. Decisiones de la reunión del 20-nov-2026 y textos del recorrido integral
{
  // R4 (26-nov-2026): individual de 4 a 5; en grupo, 4 por integrante, multiplicado por el equipo.
  comprobar("Regla por defecto: individual de 4 a 5 y 4 por integrante", OBJETIVOS_INDIVIDUAL.min === 4 && OBJETIVOS_INDIVIDUAL.max === 5 && OBJETIVOS_POR_INTEGRANTE.min === 4 && OBJETIVOS_POR_INTEGRANTE.max === 4);
  comprobar("En equipo de 3 se piden 12", JSON.stringify(rangoObjetivos(REGLA_OBJETIVOS, 3)) === JSON.stringify({ min: 12, max: 12 }));
  comprobar("Individual: de 4 a 5", textoRangoObjetivos(REGLA_OBJETIVOS, 1) === "de 4 a 5");
  comprobar("En equipo de 2: 8 (4 por integrante)", textoRangoObjetivos(REGLA_OBJETIVOS, 2) === "8 (4 por integrante, 2 integrantes)");
  comprobar("Las plantillas recomendadas usan la regla nueva",
    (["proyecto", "investigacion"] as const).every((m) => JSON.stringify(reglaObjetivosDe(plantillaRecomendada(m))) === JSON.stringify(REGLA_OBJETIVOS)));
  const fichaConRangos = { ...plantillaRecomendada("proyecto") };
  fichaConRangos.etapas = fichaConRangos.etapas.map((e) => ("espacios" in e && e.tipo === "propuesta"
    ? { ...e, espacios: e.espacios.map((x) => (x.elemento === "objetivos" ? { ...x, parametros: { ...x.parametros, minIndividual: 3, maxIndividual: 3, minPorIntegrante: 2, maxPorIntegrante: 3 } } : x)) }
    : e)) as typeof fichaConRangos.etapas;
  comprobar("La ficha configura los dos rangos", JSON.stringify(rangoObjetivos(reglaObjetivosDe(fichaConRangos), 1)) === JSON.stringify({ min: 3, max: 3 })
    && JSON.stringify(rangoObjetivos(reglaObjetivosDe(fichaConRangos), 2)) === JSON.stringify({ min: 4, max: 6 }));
  // R4: revisión SMART sobre el texto
  const completo = revisarSmart("Desarrollar módulo de inventario", "Desarrollar un módulo de inventario mediante una aplicación web para reducir en 30 % el tiempo de registro, en los primeros 3 meses.");
  comprobar("SMART: un objetivo completo cumple los cinco criterios", completo.porcentaje === 100, completo.criterios.filter((c) => !c.cumple).map((c) => c.criterio).join());
  const vago = revisarSmart("Conocer el proceso", "Conocer el proceso de ventas de la empresa.");
  comprobar("SMART: «conocer» no es específico", !vago.criterios.find((c) => c.criterio === "S")!.cumple && vago.porcentaje <= 20);
  comprobar("SMART: sin texto no se revisa", revisarSmart("", "").vacio && revisarSmart("", "").porcentaje === 0);
  comprobar("Fortaleza de objetivos: los que faltan para el mínimo cuentan 0 %",
    fortalezaObjetivos([{ titulo: "Desarrollar módulo", descripcion: "Desarrollar un módulo de inventario mediante una aplicación web para reducir en 30 % el tiempo de registro, en los primeros 3 meses." }], 4) === 25);
  comprobar("El plan nuevo tiene máximo 4 por integrante", planNuevo("p").minimos.maxObjetivosPorIntegrante === 4);
  const tipoObj = tipoApartado({ parametros: { tipo: "objetivos" } })!;
  comprobar("El protocolo pide de 3 a 4 específicos por defecto", tipoObj.partes.find((p) => p.id === "especificos")!.maxItems === 4);
  const conEquipo = conRangoObjetivos(tipoObj, { min: 6, max: 8 });
  comprobar("En equipo el protocolo usa el rango del trabajo", conEquipo.partes.find((p) => p.id === "especificos")!.minItems === 6 && conEquipo.partes.find((p) => p.id === "especificos")!.maxItems === 8);
  const cinco = { partes: { general: "Determinar el uso de la IA en estudiantes", especificos: "Identificar a\nDeterminar b\nAnalizar c\nComparar d\nDescribir e" }, autoevaluacion: [] };
  const opObj = opcionesDeEspacio({ parametros: { tipo: "objetivos" } }, "protocolo");
  comprobar("Individual: 5 objetivos en el protocolo no pasan", revisarApartado(tipoObj, cinco, opObj).some((r) => r.id === "items-max-especificos"));
  comprobar("Con el rango del trabajo (de 4 a 8), 5 objetivos sí pasan", !revisarApartado(tipoObj, cinco, opObj, { rangoObjetivos: { min: 4, max: 8 } }).some((r) => r.id.startsWith("items-")));
  const planMax = { ...planNuevo("p"), minimos: { ...planNuevo("p").minimos, objetivosPorIntegrante: 1, maxObjetivosPorIntegrante: 1 } };
  const dos = numerar(planEjemplo({ ...planMax, minimos: { ...planMax.minimos, objetivosPorIntegrante: 2 } }, 1, 4));
  comprobar("El plan detecta más objetivos del máximo", validarPlanEquipo(dos, planMax, [dos.responsable ?? 1], 4).some((p) => p.mensaje.includes("admite hasta 1")),
    validarPlanEquipo(dos, planMax, [dos.responsable ?? 1], 4).map((p) => p.mensaje).join(" | "));

  // H14: los 3 documentos obligatorios con los mismos nombres en todas las pantallas.
  // Nombres vigentes desde el ajuste de la primera vista del egresado (26-nov-2026)
  comprobar("Documentos obligatorios: comprobante de inscripción, constancia de servicio social y certificación global de notas",
    ["src/components/DocumentGate.tsx", "src/components/DocumentosEstudianteForm.tsx"].every((f) => contiene(f, /Comprobante de inscripción del trabajo de graduación/) && contiene(f, /Constancia de servicio social/) && contiene(f, /"Certificación global de notas"/)));

  // H18: los eventos del historial no son cambios de estado.
  const ev = describirHistorial("coordinador_asignado", "solicitud_asesor_enviada");
  comprobar("La solicitud de asesoría es un evento, no un cambio de estado", ev.tipo === "evento" && ev.texto === "Solicitud de asesoría enviada al docente" && ev.estado === "Coordinador asignado");
  const cambio = describirHistorial("enviada", "coordinador_asignado");
  comprobar("Un cambio real se muestra con nombres legibles", cambio.tipo === "cambio" && cambio.de === "Enviada" && cambio.a === "Coordinador asignado");

  // H13: título al que se opta.
  comprobar("Título a partir de la carrera", tituloDeCarrera("Ingeniería en Sistemas Informáticos") === "Ingeniero(a) en Sistemas Informáticos"
    && tituloDeCarrera("Licenciatura en Enfermería") === "Licenciado(a) en Enfermería" && tituloDeCarrera("Arquitectura") === "Arquitecto(a)" && tituloDeCarrera(null) === null);
}

// 32. Elementos propios del catálogo (catálogo editable, entrega C1)
{
  const nuevo = elementoPropioNuevo("c1");
  comprobar("Un elemento nuevo tiene la forma esperada y se puede publicar", tieneFormaElementoPropio(nuevo) && problemasElementoPropio(nuevo).length === 0,
    problemasElementoPropio(nuevo).join(" | "));
  comprobar("Cada tipo de campo nuevo tiene la forma esperada",
    TIPOS_CAMPO.every((t) => tieneFormaElementoPropio({ ...nuevo, campos: [{ ...campoNuevo(t.valor, "x"), etiqueta: "X" }] })));
  const sinNada = { ...nuevo, nombre: " ", etapas: [], campos: [] };
  const p1 = problemasElementoPropio(sinNada);
  comprobar("Detecta nombre, etapas y campos que faltan", p1.some((p) => p.includes("nombre")) && p1.some((p) => p.includes("etapa")) && p1.some((p) => p.includes("al menos un campo")));
  const repetidos = { ...nuevo, campos: [{ ...campoNuevo("texto", "a"), etiqueta: "Título" }, { ...campoNuevo("texto", "b"), etiqueta: "título", obligatorio: false }] };
  comprobar("Detecta etiquetas repetidas", problemasElementoPropio(repetidos).some((p) => p.includes("etiqueta «título»")));
  const sel = { ...nuevo, campos: [{ ...campoNuevo("seleccion", "s"), etiqueta: "Área", opciones: ["Uno", " "] }] };
  comprobar("Una selección necesita al menos dos opciones", problemasElementoPropio(sel).some((p) => p.includes("dos opciones")));
  const limites = { ...nuevo, campos: [{ ...campoNuevo("lista", "l"), etiqueta: "Ideas", minimo: 5, maximo: 2 }, { ...campoNuevo("archivo", "f"), etiqueta: "Anexo", maxMB: 50, obligatorio: false }] };
  const p2 = problemasElementoPropio(limites);
  comprobar("Detecta límites invertidos y tamaños fuera de rango", p2.some((p) => p.includes("mínimo es mayor")) && p2.some((p) => p.includes("entre 1 y 10 MB")));
  const opcionales = { ...nuevo, campos: [{ ...campoNuevo("texto", "o"), etiqueta: "Nota", obligatorio: false }] };
  comprobar("Pide al menos un campo obligatorio", problemasElementoPropio(opcionales).some((p) => p.includes("obligatorio")));
  const cambiado = cambiarTipo({ ...campoNuevo("texto", "t"), etiqueta: "Evidencia", ayuda: "PDF", obligatorio: false }, "archivo");
  comprobar("Al cambiar el tipo se conservan la etiqueta, la ayuda y si es obligatorio", cambiado.etiqueta === "Evidencia" && cambiado.ayuda === "PDF" && !cambiado.obligatorio && cambiado.maxMB === 5 && cambiado.id === "t");
  comprobar("Rechaza una definición con ids de campo repetidos o un tipo desconocido",
    !tieneFormaElementoPropio({ ...nuevo, campos: [campoNuevo("texto", "a"), campoNuevo("texto", "a")] }) && !tieneFormaElementoPropio({ ...nuevo, campos: [{ ...campoNuevo("texto", "a"), tipo: "firma" }] }));
  comprobar("Resume las reglas del campo", reglasCampo({ ...campoNuevo("lista", "l"), etiqueta: "Ideas" }) === "Lista · obligatorio · de 1 a 10 elementos");
}

// 33. Elementos propios dentro de una ficha (catálogo editable, entrega C2)
{
  const el = { ...elementoPropioNuevo("c1"), nombre: "Ficha técnica", etapas: ["propuesta" as const] };
  const espacioPropio = (id: string, def = el, elementoId = 7): Espacio => ({ id, elemento: "propio", titulo: def.nombre, descripcion: "", ayuda: "", obligatorio: true, parametros: {}, propio: copiaDe(elementoId, def) });
  const conPropio = (espacios: Espacio[], etapa: "propuesta" | "protocolo" = "propuesta") => {
    const d = plantillaRecomendada("investigacion");
    const e = d.etapas.find((x) => x.tipo === etapa) as { espacios: Espacio[] };
    e.espacios.push(...espacios);
    return d;
  };
  const valida = conPropio([espacioPropio("p1")]);
  comprobar("Una ficha con un elemento propio es válida y conserva su forma", validarDefinicion(valida).length === 0 && tieneFormaDeDefinicion(JSON.parse(JSON.stringify(valida))),
    validarDefinicion(valida).map((p) => p.mensaje).join(" | "));
  comprobar("La copia es independiente del catálogo", (() => { const c = copiaDe(1, el); c.definicion.campos[0].etiqueta = "Otro"; return el.campos[0].etiqueta === "Descripción"; })());
  comprobar("Detecta un elemento propio en una etapa que no admite", validarDefinicion(conPropio([espacioPropio("p1")], "protocolo")).some((p) => p.mensaje.includes("no se puede usar en el protocolo")));
  comprobar("Detecta un elemento no repetible agregado dos veces", validarDefinicion(conPropio([espacioPropio("p1"), espacioPropio("p2")])).some((p) => p.mensaje.includes("solo puede aparecer una vez")));
  comprobar("Un elemento repetible sí puede ir dos veces", validarDefinicion(conPropio([espacioPropio("p1", { ...el, repetible: true }), espacioPropio("p2", { ...el, repetible: true })])).length === 0);
  const sinCopia = conPropio([{ ...espacioPropio("p1"), propio: undefined }]);
  comprobar("Detecta un elemento propio sin copia", validarDefinicion(sinCopia).some((p) => p.mensaje.includes("falta la copia")));
  const copiaMala = JSON.parse(JSON.stringify(valida));
  copiaMala.etapas[0].espacios.at(-1).propio.definicion.campos[0].tipo = "firma";
  comprobar("La revisión de forma rechaza una copia dañada", !tieneFormaDeDefinicion(copiaMala));
  comprobar("Una copia con pendientes no se puede habilitar", validarDefinicion(conPropio([espacioPropio("p1", { ...el, campos: [] })])).some((p) => p.mensaje.includes("al menos un campo")));

  const cambiado = { ...el, campos: [{ ...el.campos[0], maxPalabras: 300 }, { ...campoNuevo("archivo", "c2"), etiqueta: "Manual" }] };
  const antes = conPropio([espacioPropio("p1")]);
  const despues = conPropio([espacioPropio("p1", cambiado)]);
  const cambios = compararDefiniciones(antes, despues);
  comprobar("Los cambios de la copia aparecen en la pestaña Cambios",
    cambios.some((c) => c.includes("se agregó el campo «Manual»")) && cambios.some((c) => c.includes("«Descripción»: Texto largo · obligatorio · hasta 500 palabras → Texto largo · obligatorio · hasta 300 palabras")), cambios.join(" | "));
  comprobar("Agregar el espacio aparece como elemento propio", compararDefiniciones(conPropio([]), valida).some((c) => c.includes("elemento propio «Ficha técnica»")));
  const reordenado = JSON.parse(JSON.stringify(el), (_k, v) => (v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).reverse()) : v));
  comprobar("Comparar copias no depende del orden de las claves", mismaDefinicion(el, reordenado) && !mismaDefinicion(el, cambiado));
  comprobar("Solo cambiar la ayuda se informa sin repetir las reglas",
    cambiosElementoPropio(el, { ...el, campos: [{ ...el.campos[0], ayuda: "Nueva" }] })[0] === "«Descripción»: cambió la ayuda o una opción");
  comprobar("El genérico de los elementos propios no aparece entre los del sistema", !Object.values(CATALOGO).filter((e) => e.clave !== "propio").some((e) => e.clave === "propio") && CATALOGO.propio.formularioEn.join() === "pasantia,proyecto,investigacion");
}

// 34. Respuestas de los elementos propios (catálogo editable, entrega C3)
{
  const def = {
    ...elementoPropioNuevo("d"), nombre: "Ficha técnica", etapas: ["propuesta" as const, "protocolo" as const, "informe_final" as const],
    campos: [
      { ...campoNuevo("texto_largo", "d"), etiqueta: "Descripción", minPalabras: 3, maxPalabras: 20 },
      { ...campoNuevo("seleccion", "p"), etiqueta: "Plataforma", opciones: ["Web", "Móvil"] },
      { ...campoNuevo("numero", "u"), etiqueta: "Usuarios", minimo: 1, maximo: 100, obligatorio: false },
      { ...campoNuevo("archivo", "m"), etiqueta: "Manual", obligatorio: false, maxMB: 1 },
      { ...campoNuevo("enlace", "e"), etiqueta: "Repositorio", obligatorio: false },
    ],
  };
  const pdf = "data:application/pdf;base64," + Buffer.from("%PDF-1.4 prueba").toString("base64");
  const bien = limpiarValores(def, { d: "  Sistema de control de inventario  ", p: ["Web"], u: "25", m: [{ url: pdf, nombre: "manual.pdf" }], x: "campo que no existe" });
  comprobar("Limpia los valores: recorta, convierte el número y descarta campos ajenos",
    bien.ok && bien.valores.d === "Sistema de control de inventario" && bien.valores.u === 25 && !("x" in bien.valores) && (bien.valores.m as { tipo: string }[])[0].tipo === "application/pdf");
  comprobar("Rechaza un archivo con formato no permitido", !limpiarValores(def, { m: [{ url: "data:text/plain;base64,aG9sYQ==", nombre: "a.txt" }] }).ok);
  const grande = "data:application/pdf;base64," + "A".repeat(Math.ceil((1.2 * 1024 * 1024) / 3) * 4);
  comprobar("Rechaza un archivo más grande que el límite del campo", !limpiarValores(def, { m: [{ url: grande, nombre: "grande.pdf" }] }).ok);
  comprobar("Rechaza dos opciones en una selección simple y una fecha mal escrita",
    !limpiarValores(def, { p: ["Web", "Móvil"] }).ok && !limpiarValores({ ...def, campos: [{ ...campoNuevo("fecha", "f"), etiqueta: "Inicio" }] }, { f: "31/02/2026" }).ok);
  comprobar("Una opción que no existe se descarta", (() => { const r = limpiarValores(def, { p: ["Escritorio"] }); return r.ok && !("p" in r.valores); })());
  comprobar("Pendientes: obligatorios y palabras", (() => {
    const p = problemasValores(def, { d: "Uno dos" });
    return p.some((x) => x.includes("«Descripción» necesita al menos 3 palabras")) && p.some((x) => x.includes("falta «Plataforma»"));
  })());
  comprobar("Completo cuando cumple las reglas", bien.ok && problemasValores(def, bien.valores).length === 0, bien.ok ? problemasValores(def, bien.valores).join(" | ") : "");
  comprobar("Detecta un enlace inválido", problemasValores(def, { d: "uno dos tres", p: ["Web"], e: [{ url: "no es url", descripcion: "Repo" }] }).some((x) => x.includes("no es una dirección válida")));

  // Por integrante: cada uno guarda su parte sin tocar la de los demás; se revisa la de cada uno con su nombre.
  const porInt = { ...def, alcance: "integrante" as const };
  const equipo = [{ id: 11, nombre: "Ana" }, { id: 12, nombre: "Beto" }];
  let r = conValores({}, porInt, 11, { d: "parte de Ana completa", p: ["Web"] });
  r = conValores(r, porInt, 12, { d: "Beto" });
  const json = guardarRespuesta(r);
  comprobar("Por integrante: cada uno conserva su parte", leerRespuestaPropia(json).integrantes?.["11"]?.d === "parte de Ana completa" && leerRespuestaPropia(json).integrantes?.["12"]?.d === "Beto");
  const pend = problemasRespuestaPropia(porInt, json, equipo);
  comprobar("Por integrante: los pendientes dicen de quién son", pend.length > 0 && pend.every((x) => x.startsWith("Beto: ")), pend.join(" | "));
  comprobar("Un espacio opcional vacío no tiene pendientes; uno obligatorio sí", problemasRespuestaPropia(def, "", [], false).length === 0 && problemasRespuestaPropia(def, "", []).length > 0);
  comprobar("Respuesta vacía", respuestaVacia(def, "") && respuestaVacia(def, "[]") && !respuestaVacia(def, guardarRespuesta({ valores: { d: "x" } })));
  const limpio = limpiarRespuesta(porInt, JSON.stringify({ integrantes: { "11": { d: "texto", z: 1 }, "malo": { d: "x" } } }));
  comprobar("El capítulo se limpia entero (solo ids de usuario y campos del elemento)", limpio.ok && limpio.valor === JSON.stringify({ integrantes: { "11": { d: "texto" } } }));

  // Protocolo e informe final: los pendientes del elemento propio y el documento.
  const espacio: Espacio = { id: "ft", elemento: "propio", titulo: "Ficha técnica", descripcion: "", ayuda: "", obligatorio: true, parametros: {}, propio: copiaDe(5, def) };
  const prot = { tipo: "protocolo", espacios: [espacio] };
  comprobar("El protocolo pide el elemento propio", problemasProtocolo(prot, {}).some((x) => x.mensaje.includes("falta «Plataforma»")));
  const completo = bien.ok ? guardarRespuesta({ valores: bien.valores }) : "";
  comprobar("Con la respuesta completa, el protocolo no tiene pendientes", problemasProtocolo(prot, { ft: completo }).length === 0);
  const { apartados, anexosCapitulo } = apartadosInformeFinal({ ...informeFinalNuevo("if"), espacios: [espacio] }, { ft: completo });
  const txt = JSON.stringify(apartados);
  comprobar("El documento trae cada campo y manda los archivos a los anexos",
    txt.includes("Plataforma: Web") && txt.includes("Sistema de control de inventario") && anexosCapitulo.length === 1 && anexosCapitulo[0].nombre === "manual.pdf", txt);
  comprobar("La revisión muestra cada campo con su etiqueta, por persona", bloquesRespuesta(porInt, json, equipo)[0].persona === "Ana" && archivosRespuesta(def, completo).length === 1);
  comprobar("Un capítulo propio vacío cuenta como vacío", contenidoVacio(espacio, "") && !contenidoVacio(espacio, completo));
}

// 35. Campos adicionales en los elementos del sistema (catálogo editable, entrega C4)
{
  const extra = [{ ...campoNuevo("texto", "rep"), etiqueta: "Repositorio del código" }, { ...campoNuevo("numero", "hrs"), etiqueta: "Horas estimadas", obligatorio: false, minimo: 1 }];
  const conExtra = (cambiar: (d: DefinicionFicha) => void) => { const d = plantillaRecomendada("investigacion"); cambiar(d); return d; };
  const enObjetivos = conExtra((d) => { d.etapas.find(esEtapaPropuesta)!.espacios.find((e) => e.elemento === "objetivos")!.camposExtra = extra; });
  comprobar("Un elemento del sistema con campos adicionales es válido y conserva su forma", validarDefinicion(enObjetivos).length === 0 && tieneFormaDeDefinicion(JSON.parse(JSON.stringify(enObjetivos))),
    validarDefinicion(enObjetivos).map((p) => p.mensaje).join(" | "));
  const enDocumentos = conExtra((d) => { const e = d.etapas.find(esEtapaPropuesta)!.espacios.find((x) => x.elemento === "documentos"); if (e) e.camposExtra = extra; });
  comprobar("Los documentos obligatorios no admiten campos adicionales", validarDefinicion(enDocumentos).some((p) => p.mensaje.includes("no admite campos adicionales")));
  const enInforme = conExtra((d) => { d.etapas.find(esEtapaInformeFinal)!.espacios[0].camposExtra = extra; });
  comprobar("El informe final no lleva campos adicionales", validarDefinicion(enInforme).some((p) => p.mensaje.includes("informe final no llevan campos adicionales")));
  const pas = definicionBase("pasantia");
  const pasEsp = pas.etapas.find(esEtapaPropuesta)!.espacios.find((x) => x.elemento === "portada")!;
  pasEsp.camposExtra = extra;
  comprobar("W1: la pasantía con ficha también admite campos adicionales", !validarDefinicion(pas).some((p) => p.mensaje.includes("campos adicionales")));
  const repetidos = conExtra((d) => { d.etapas.find(esEtapaPropuesta)!.espacios.find((e) => e.elemento === "objetivos")!.camposExtra = [extra[0], { ...extra[0], id: "otro" }]; });
  comprobar("Detecta campos adicionales con la misma etiqueta", validarDefinicion(repetidos).some((p) => p.mensaje.includes("campos adicionales: Hay 2 campos")));
  const mala = JSON.parse(JSON.stringify(enObjetivos));
  mala.etapas[0].espacios.find((e: Espacio) => e.elemento === "objetivos").camposExtra[0].tipo = "firma";
  comprobar("La revisión de forma rechaza campos adicionales dañados", !tieneFormaDeDefinicion(mala));
  const cambios = compararDefiniciones(plantillaRecomendada("investigacion"), enObjetivos);
  comprobar("Cambios lista los campos adicionales agregados", cambios.some((c) => c.includes("campos adicionales: se agregó el campo «Repositorio del código»")), cambios.join(" | "));

  // Protocolo: los campos adicionales se exigen y su respuesta va aparte.
  const esp: Espacio = { id: "prob", elemento: "texto", titulo: "Problema", descripcion: "", ayuda: "", obligatorio: true, parametros: { minPalabras: 0, maxPalabras: 0 }, camposExtra: extra };
  const prot = { tipo: "protocolo", espacios: [esp] };
  comprobar("El protocolo pide los campos adicionales", problemasProtocolo(prot, { prob: "Texto del problema" }).some((p) => p.mensaje.includes("datos adicionales: falta «Repositorio del código»")));
  const resp = guardarRespuesta({ valores: { rep: "github.com/equipo/proyecto" } });
  comprobar("Con los datos adicionales, el protocolo no tiene pendientes", problemasProtocolo(prot, { prob: "Texto del problema", [claveCamposExtra("prob")]: resp }).length === 0);
  const doc = JSON.stringify(apartadosInformeFinal({ ...informeFinalNuevo("if"), espacios: [esp] }, { prob: "Texto del problema", [claveCamposExtra("prob")]: resp }).apartados);
  comprobar("El documento agrega los datos adicionales debajo del apartado", doc.includes("Datos adicionales") && doc.includes("Repositorio del código: github.com/equipo/proyecto"), doc);
  comprobar("Los campos adicionales se tratan como una respuesta por trabajo", defCamposExtra(esp).alcance === "equipo" && defCamposExtra(esp).campos.length === 2);
}

// 36. Pendientes de la reunión del 20-nov-2026: cohortes (H1/H11) e informe final de proyecto (H7)
{
  const v = (id: number, nivel: number, fecha: string, cohortes: number[] = []) => ({ id, nivel, habilitadaEn: fecha, cohortes });
  comprobar("Gana la versión ligada a la cohorte del egresado", elegirVersion([v(1, 3, "2026-11-01", [7]), v(2, 3, "2026-11-19")], 7) === 1);
  comprobar("Sin versión de su cohorte, gana la que no tiene cohortes", elegirVersion([v(1, 3, "2026-11-19", [8]), v(2, 3, "2026-11-01")], 7) === 2);
  comprobar("Si todas son de otras cohortes, igual recibe una (la más reciente)", elegirVersion([v(1, 3, "2026-11-01", [8]), v(2, 3, "2026-11-19", [9])], 7) === 2);
  comprobar("H11: a igual alcance gana la habilitada más recientemente, no el número de versión", elegirVersion([v(12, 3, "2026-10-01"), v(3, 3, "2026-11-19")], null) === 3);
  comprobar("La ficha de su carrera gana a la de su facultad aunque sea más vieja", elegirVersion([v(1, 2, "2026-11-19"), v(2, 3, "2026-01-01")], null) === 2);
  comprobar("Una versión que no lo alcanza nunca se elige", elegirVersion([v(1, -1, "2026-11-19", [7])], 7) === null);
  comprobar("Avisa qué cohortes dejan otra versión al habilitar",
    JSON.stringify(cohortesQueSeMueven([7, 8], [{ numero: 1, estado: "habilitada", cohortes: [7] }, { numero: 2, estado: "retirada", cohortes: [8] }])) === JSON.stringify([{ cohorteId: 7, deVersion: 1 }]));

  const proyecto = plantillaRecomendada("proyecto");
  const inf = proyecto.etapas.find(esEtapaInformeFinal)!;
  const idsPropuesta = new Set(proyecto.etapas.find(esEtapaPropuesta)!.espacios.map((e) => e.id));
  comprobar("Proyecto: el informe final se llama así y se revisa por capítulo", inf.nombre === "Informe final del proyecto" && inf.revision.porCapitulo && inf.revision.ratificacion);
  comprobar("Proyecto: los capítulos parten de la propuesta (justificación, alcance, objetivos)",
    ["if_justificacion", "if_alcance", "if_objetivos"].every((id) => idsPropuesta.has(inf.espacios.find((e) => e.id === id)?.precargarDe ?? "")));
  comprobar("Proyecto: el desarrollo por objetivo y la bitácora los genera el sistema; las conclusiones parten de las de cada objetivo",
    inf.espacios.some((e) => e.elemento === "resultados_objetivos") && inf.espacios.some((e) => e.elemento === "reporte_modificaciones")
      && inf.espacios.find((e) => e.id === "if_conclusiones")?.precargarDe === PRECARGA_CONCLUSIONES_OBJETIVOS);
  comprobar("Proyecto: el informe final sale en una ficha válida", validarDefinicion({ ...proyecto, etapas: [...proyecto.etapas.filter((e) => e.tipo !== "informe_final"), informeFinalProyectoNuevo("if")] }).length === 0);
}

// 37. Informe final de investigación, entrega F1 (notas del 20-nov-2026)
{
  const inv = plantillaRecomendada("investigacion");
  const inf = inv.etapas.find(esEtapaInformeFinal)!;
  comprobar("F1: el informe sigue el orden de las notas",
    inf.espacios.map((e) => e.id).join() === "if_agradecimientos,if_introduccion,if_generalidades,if_problematica,if_justificacion,if_objetivos,if_marco,if_metodologia,if_resultados,if_analisis,if_resultados_obtenidos,if_hipotesis,if_hallazgos,if_conclusiones,if_referencias,if_bibliografia,if_presentacion,if_derechos,if_carta,if_modificaciones,if_involucrados,if_recursos,if_anexos");
  comprobar("F1: el cuerpo se llama «Desarrollo o ejecución de la investigación» y se genera solo",
    inf.espacios.find((e) => e.id === "if_resultados")!.titulo === "Desarrollo o ejecución de la investigación" && capituloGenerado(inf.espacios.find((e) => e.id === "if_resultados")!));
  comprobar("F1: la plantilla de investigación es válida", validarDefinicion(inv).length === 0, validarDefinicion(inv).map((p) => p.mensaje).join(" | "));
  const actores = inv.etapas.find(esEtapaPropuesta)!.espacios.find((e) => e.elemento === "actores")!;
  comprobar("Q4: la propuesta de investigación tiene la sección «Involucrados» con las demás personas o entidades",
    actores.titulo === "Involucrados" && actores.camposExtra?.[0]?.tipo === "lista" && !actores.camposExtra[0].obligatorio);
  comprobar("Q4: proyecto conserva «Actores intervinientes»", plantillaRecomendada("proyecto").etapas.find(esEtapaPropuesta)!.espacios.find((e) => e.elemento === "actores")!.titulo !== "Involucrados");

  // Introducción en cuatro párrafos (las reglas de pasantía).
  const intro = tipoApartado({ parametros: { tipo: "introduccion_informe" } })!;
  const opInf = opcionesDeEspacio({ parametros: { tipo: "introduccion_informe" } }, "informe_final");
  const p = (n: number) => Array.from({ length: n }, (_, i) => `palabra${i}`).join(" ") + ".";
  const bien = { partes: { p1: p(30), p2: p(30), p3: p(30), p4: p(30) }, autoevaluacion: [] };
  comprobar("Introducción: cuatro párrafos de 20 a 70 palabras pasan", !revisarApartado(intro, bien, opInf).some((r) => r.nivel === "falta"));
  const largo = { partes: { ...bien.partes, p1: p(80) }, autoevaluacion: [] };
  comprobar("Introducción: pasar de 70 palabras impide enviar", revisarApartado(intro, largo, opInf).some((r) => r.id === "max-p1" && r.nivel === "falta"));
  const dos = { partes: { ...bien.partes, p2: `${p(15)}\n${p(15)}` }, autoevaluacion: [] };
  comprobar("Introducción: un solo párrafo y con punto final", revisarApartado(intro, dos, opInf).some((r) => r.id === "unparrafo-p2")
    && revisarApartado(intro, { partes: { ...bien.partes, p3: p(30).slice(0, -1) }, autoevaluacion: [] }, opInf).some((r) => r.id === "punto-p3"));

  // Agradecimientos de investigación.
  const ag = tipoApartado({ parametros: { tipo: "agradecimientos" } })!;
  const opAg = opcionesDeEspacio({ parametros: { tipo: "agradecimientos" } }, "informe_final");
  comprobar("Agradecimientos: avisa los personales o familiares", revisarApartado(ag, { partes: { texto: "A mi familia y a mis amigos por su apoyo incondicional durante todo este tiempo." }, autoevaluacion: [] }, opAg).some((r) => r.id === "agradecimientos-personales"));
  comprobar("Agradecimientos: a mentores y entidades no avisa", !revisarApartado(ag, { partes: { texto: "Al Laboratorio de Química por facilitar los equipos y a la asesora por su guía metodológica constante." }, autoevaluacion: [] }, opAg).some((r) => r.id === "agradecimientos-personales"));

  // Objetivos originales y finales (Q3).
  const obj = tipoApartado({ parametros: { tipo: "objetivos_informe" } })!;
  const base = guardarComoTexto({ partes: { general: "Determinar el uso de la IA", especificos: "Identificar a\nDeterminar b\nAnalizar c" }, autoevaluacion: [] });
  comprobar("Objetivos: si no cambiaron, no se agregan finales", conObjetivosFinales(base, ["Identificar a", "Determinar b", "Analizar c"], "x") === base);
  const conCambio = leerApartado(obj, conObjetivosFinales(base, ["Identificar a", "Describir b", "Analizar c"], "1.2 Objetivo 2: se cambió por falta de datos."));
  comprobar("Objetivos: si cambiaron, se agregan los finales y la justificación de la bitácora",
    conCambio.partes.especificos_finales === "Identificar a\nDescribir b\nAnalizar c" && conCambio.partes.justificacion_cambio === "1.2 Objetivo 2: se cambió por falta de datos.");
  const opObj = opcionesDeEspacio({ parametros: { tipo: "objetivos_informe" } }, "informe_final");
  comprobar("Objetivos: cambiar sin justificar impide enviar",
    revisarApartado(obj, { partes: { ...conCambio.partes, justificacion_cambio: "" }, autoevaluacion: [] }, opObj).some((r) => r.id === "finales-sin-justificacion" && r.nivel === "falta"));

  // Cronograma original y ejecutado.
  const plan = numerar(planEjemplo(planNuevo("p"), 1, 4));
  const columnas = [1, 1, 2, 2].map((periodo) => ({ periodo }));
  const hoja = aplanar(plan).find((n) => n.nivel === 4)!;
  const tabla = bloquesCronogramaComparado(plan, columnas, [{ nodoId: hoja.id, periodo: 2, estado: "aprobado" }, { nodoId: hoja.id, periodo: 1, estado: "borrador" }]);
  const fila = (tabla[1] as { filas: string[][] }).filas.find((f) => f[0] === hoja.codigo)!;
  comprobar("Cronograma: marca lo ejecutado (●) aparte de lo planificado (■) y no cuenta borradores", tabla.length === 2 && fila.slice(2).some((x) => x.includes("●")) && !fila[2].includes("●"), JSON.stringify(fila));
  const conCron = resultadosPorObjetivo({ arbol: plan, registros: [], evidencias: [], entregas: [], productos: [], numero: 9, columnas });
  comprobar("El capítulo de desarrollo termina con el cronograma original y ejecutado, numerado",
    conCron.bloques.some((b) => b.tipo === "subtitulo" && /^9\.\d+ Cronograma original y ejecutado$/.test(b.texto)));
}

// 38. Figuras, tablas e indicadores del informe final (entrega F2)
{
  const figs = limpiarFigurasTablas("figuras", JSON.stringify([{ id: 5, leyenda: "  Prueba ANOVA  ", fuente: "Elaboración propia.", extra: 1 }, { id: "x" }, { id: 7, leyenda: "" }]));
  comprobar("Figuras: se guardan solo id, leyenda y fuente, recortadas", JSON.stringify(leerFiguras(figs)) === JSON.stringify([{ id: 5, leyenda: "Prueba ANOVA", fuente: "Elaboración propia." }, { id: 7, leyenda: "", fuente: "" }]));
  const tabs = limpiarFigurasTablas("tablas", JSON.stringify([{ titulo: "Medias", columnas: ["Grupo", "Media"], filas: [["A", "7.5"], ["", ""]] }]));
  comprobar("Tablas: se guardan sin filas vacías", leerTablas(tabs)[0].filas.length === 1 && leerTablas(tabs)[0].columnas.join() === "Grupo,Media");

  const tipoAn = tipoApartado({ parametros: { tipo: "analisis_informe" } })!;
  const opAn = opcionesDeEspacio({ parametros: { tipo: "analisis_informe" } }, "informe_final");
  const texto60 = Array.from({ length: 70 }, (_, i) => `dato${i}`).join(" ") + ".";
  const conFig = { partes: { analisis: texto60, figuras: figs, tablas: JSON.stringify([{ titulo: "", columnas: ["A"], filas: [["1"]] }]) }, autoevaluacion: [] };
  const rev = revisarApartado(tipoAn, conFig, opAn);
  comprobar("Una figura sin leyenda y una tabla sin título impiden enviar", rev.some((r) => r.id === "figura-leyenda-figuras-1" && r.nivel === "falta") && rev.some((r) => r.id === "tabla-titulo-tablas-0"));
  comprobar("Figuras y tablas vacías cuentan como vacías", parteVacia(tipoAn.partes.find((p) => p.id === "figuras")!, "[]") && !parteVacia(tipoAn.partes.find((p) => p.id === "figuras")!, figs));

  // Documento: numeración en todo el informe y el índice de figuras.
  const cap = (id: string, tipo: string): Espacio => ({ id, elemento: "apartado", titulo: id, descripcion: "", ayuda: "", obligatorio: true, parametros: parametrosPorDefecto("apartado", { tipo }) });
  const espacios = [cap("an", "analisis_informe"), cap("res", "resultados")];
  const cont = {
    an: guardarComoTexto({ partes: { analisis: texto60, figuras: figs, tablas: tabs }, autoevaluacion: [] }),
    res: guardarComoTexto({ partes: { resultados: texto60, figuras: limpiarFigurasTablas("figuras", JSON.stringify([{ id: 9, leyenda: "Rendimiento por grupo", fuente: "" }])) }, autoevaluacion: [] }),
  };
  comprobar("Se encuentran los ids de las figuras del documento", idsFigurasDe(espacios, cont).join() === "5,7,9");
  const { apartados } = apartadosInformeFinal({ ...informeFinalNuevo("if"), espacios }, cont, () => [], { figuras: new Map([[5, "data:image/png;base64,AAAA"]]) });
  const indice = figurasDe(apartados);
  comprobar("Las figuras se numeran en todo el documento y forman el índice", indice.map((f) => `${f.numero}:${f.leyenda}`).join("|") === "1:Prueba ANOVA|2:|3:Rendimiento por grupo");
  const bloquesAn = apartados[0].bloques;
  comprobar("La figura lleva su imagen; la que no es de la propuesta queda sin imagen",
    bloquesAn.some((b) => b.tipo === "figura" && b.numero === 1 && b.url === "data:image/png;base64,AAAA") && bloquesAn.some((b) => b.tipo === "figura" && b.numero === 2 && b.url === null));
  comprobar("Las tablas llevan su número y su título", bloquesAn.some((b) => b.tipo === "tabla" && b.titulo === "Tabla 1. Medias"));

  // Indicadores del protocolo.
  const variables: Espacio = { id: "variables", elemento: "apartado", titulo: "Variables", descripcion: "", ayuda: "", obligatorio: true, parametros: parametrosPorDefecto("apartado", { tipo: "variables" }) };
  const cuadro = guardarComoTexto({ partes: { cuadro: JSON.stringify([["Uso de IA", "def", "op", "Horas por semana; tareas con IA"], ["Rendimiento", "def", "op", "Nota final"]]) }, autoevaluacion: [] });
  const filas = indicadoresDeVariables(variables, cuadro);
  comprobar("Indicadores: una fila por indicador del cuadro de variables", filas.length === 3 && filas[0][0] === "Uso de IA: Horas por semana" && filas[2][0] === "Rendimiento: Nota final" && filas[0].length === 4);
  const hip = informeFinalNuevo("if").espacios.find((e) => e.id === "if_hipotesis")!;
  const pre = leerApartado(tipoApartado(hip)!, precargaCapitulo(hip, [variables], { respuestas: { variables: cuadro } }, ""));
  comprobar("La comprobación de hipótesis se precarga con los indicadores", leerTabla(pre.partes.indicadores, 4).length === 3);
}

// 39. Citas y referencias separadas de la bibliografía (entrega F3)
{
  const registro = [
    { id: 1, referencia: "Pérez, J. (2020). Hábitos de estudio. Editorial A." },
    { id: 2, referencia: "Gómez, L., y Ruiz, M. (2019). Aprendizaje autónomo. Editorial B." },
    { id: 3, referencia: "Chen, X. (2021). Asistentes de IA. Revista C, 4(2), 10-20." },
    { id: 4, referencia: "Zúñiga, P. (2018). Estadística aplicada. Editorial D." },
  ];
  const r = separarReferencias({
    textos: ["Según Perez (2020), los hábitos… y otros estudios (Chen, 2021; Martínez, 2017)."],
    idsCitados: [2],
    registro,
    manuales: ["Martínez, R. (2017). Métodos mixtos. Editorial E.", "Alvarado, S. (2015). Lecturas complementarias. Editorial F."],
  });
  comprobar("Citadas: por id (párrafos citados o plan), por cita en el texto (sin importar tildes) y las escritas a mano que se citan",
    r.citadas.length === 4 && r.citadas.some((x) => x.startsWith("Pérez")) && r.citadas.some((x) => x.startsWith("Gómez")) && r.citadas.some((x) => x.startsWith("Chen")) && r.citadas.some((x) => x.startsWith("Martínez")), r.citadas.join(" | "));
  comprobar("Bibliografía: las consultadas que no se citaron, del registro y escritas a mano", r.bibliografia.join(" | ") === "Alvarado, S. (2015). Lecturas complementarias. Editorial F. | Zúñiga, P. (2018). Estadística aplicada. Editorial D.");
  comprobar("Las dos listas van en orden alfabético y sin repetir", r.citadas[0].startsWith("Chen") && new Set(r.citadas).size === r.citadas.length);
  comprobar("Un año distinto no cuenta como cita", separarReferencias({ textos: ["(Pérez, 2010)"], idsCitados: [], registro: registro.slice(0, 1), manuales: [] }).citadas.length === 0);

  // Documento: el capítulo generado y la bibliografía separada.
  const inf = informeFinalNuevo("if");
  const refs = inf.espacios.find((e) => e.id === "if_referencias")!;
  const bib = inf.espacios.find((e) => e.id === "if_bibliografia")!;
  comprobar("«Citas y referencias» se genera solo y va antes de la bibliografía, que es opcional",
    capituloGenerado(refs) && inf.espacios.indexOf(refs) === inf.espacios.indexOf(bib) - 1 && !bib.obligatorio);
  const cont = { [bib.id]: guardarComoTexto({ partes: { lista: "Alvarado, S. (2015). Lecturas complementarias. Editorial F.\nMartínez, R. (2017). Métodos mixtos. Editorial E." }, autoevaluacion: [] }) };
  const { apartados } = apartadosInformeFinal({ ...inf, espacios: [refs, bib] }, cont,
    (e) => (e.elemento === "referencias_citadas" ? [{ tipo: "lista", items: r.citadas, referencias: true }] : []),
    { referencias: registro.map((x) => x.referencia), bibliografia: r.bibliografia });
  const aRefs = apartados.find((a) => a.titulo === "Citas y referencias")!;
  const aBib = apartados.find((a) => a.titulo === "Bibliografía")!;
  comprobar("En el documento, las citadas van en «Citas y referencias» y sin número", aRefs.numero === null && JSON.stringify(aRefs.bloques).includes("Chen, X."));
  comprobar("La bibliografía del documento lleva solo lo no citado", JSON.stringify(aBib.bloques).includes("Zúñiga") && !JSON.stringify(aBib.bloques).includes("Martínez") && !JSON.stringify(aBib.bloques).includes("Chen"));
  comprobar("Sin la separación (fichas anteriores), la bibliografía sigue sumando todo el registro",
    JSON.stringify(apartadosInformeFinal({ ...inf, espacios: [bib] }, cont, () => [], { referencias: registro.map((x) => x.referencia) }).apartados[0].bloques).includes("Chen, X."));
}

// 40. Cierre y anexos del informe final (entrega F4)
{
  const inv = plantillaRecomendada("investigacion");
  const pro = plantillaRecomendada("proyecto");
  comprobar("F4: las plantillas de investigación y proyecto son válidas", validarDefinicion(inv).length === 0 && validarDefinicion(pro).length === 0,
    [...validarDefinicion(inv), ...validarDefinicion(pro)].map((p) => p.mensaje).join(" | "));
  const infInv = inv.etapas.find(esEtapaInformeFinal)!;
  const infPro = pro.etapas.find(esEtapaInformeFinal)!;
  comprobar("Investigación: presentación pública, derechos, carta, involucrados y recursos",
    ["if_presentacion", "if_derechos", "if_carta", "if_involucrados", "if_recursos"].every((id) => infInv.espacios.some((e) => e.id === id)));
  comprobar("Proyecto (Q7): presentación pública y carta, sin los anexos de investigación",
    infPro.espacios.some((e) => e.id === "if_presentacion") && infPro.espacios.some((e) => e.id === "if_carta") && !infPro.espacios.some((e) => e.id === "if_recursos"));
  const carta = infInv.espacios.find((e) => e.id === "if_carta")!;
  comprobar("La carta es un PDF obligatorio que revisa el asesor (no se genera)", carta.elemento === "archivo" && carta.obligatorio && !capituloGenerado(carta)
    && JSON.stringify(carta.parametros.tipos) === JSON.stringify(["pdf"]) && carta.parametros.minimo === 1);
  comprobar("Involucrados, recursos y derechos se generan solos", ["if_involucrados", "if_recursos", "if_derechos"].every((id) => capituloGenerado(infInv.espacios.find((e) => e.id === id)!)));
  comprobar("El anexo de recursos necesita los recursos del protocolo",
    validarDefinicion({ ...pro, etapas: pro.etapas.map((e) => (e.tipo === "informe_final" ? { ...e, espacios: [...(e as { espacios: Espacio[] }).espacios, infInv.espacios.find((x) => x.id === "if_recursos")!] } : e)) } as DefinicionFicha)
      .some((p) => p.mensaje.includes("anexo de recursos sale de los recursos del protocolo")));

  const inv1 = bloquesInvolucrados({ actores: [{ papel: "Solicita o patrocina la investigación", nombre: "Facultad de Ingeniería" }, { papel: "Ejecutor", nombre: "N/A" }], otros: ["Laboratorio de Química: presta los equipos"], equipo: ["Ana"], asesor: "Dr. López" });
  const filasInv = (inv1[1] as { filas: string[][] }).filas;
  comprobar("Involucrados: primero quien solicita o patrocina; sin N/A; con los demás, el equipo y el asesor",
    filasInv[0][0] === "Facultad de Ingeniería" && !filasInv.some((f) => f[0] === "N/A") && filasInv.some((f) => f[0] === "Laboratorio de Química" && f[1] === "presta los equipos") && filasInv.at(-1)![0] === "Dr. López");
  const espRec = inv.etapas.find(esEtapaProtocolo)!.espacios.find((e) => e.elemento === "recursos_presupuesto")!;
  const rec = bloquesRecursosInforme(espRec, "[]", [{ codigo: "1.1.1", titulo: "Encuesta", origen: "actividad", periodo: 2, tipo: "recursos", texto: "Subió el costo de impresión.", estado: "aprobado" }]);
  comprobar("Recursos: lo planificado y los cambios de recursos de la bitácora", JSON.stringify(rec).includes("Recursos y presupuesto planificados") && JSON.stringify(rec).includes("Subió el costo de impresión."));
  comprobar("Derechos: el texto de la ficha o el provisional", (bloquesDerechos({ parametros: { parrafos: ["Texto oficial."] } })[0] as { parrafos: string[] }).parrafos[0] === "Texto oficial."
    && (bloquesDerechos({ parametros: {} })[0] as { parrafos: string[] }).parrafos[0].startsWith("Texto provisional"));

  // Presentación pública: sin fotografías no se puede enviar.
  const pres = tipoApartado({ parametros: { tipo: "presentacion_publica" } })!;
  const opPres = opcionesDeEspacio({ parametros: { tipo: "presentacion_publica" } }, "informe_final");
  comprobar("Presentación pública: pide fotografías", revisarApartado(pres, { partes: { descripcion: "El 28 de noviembre se presentó en el auditorio ante docentes y estudiantes de la facultad." }, autoevaluacion: [] }, opPres)
    .some((r) => r.parte === "fotografias" && r.nivel === "falta"));

  // Documento: la carta va a los anexos con su nombre; los generados van sin número.
  const { apartados, anexosCapitulo } = apartadosInformeFinal({ ...infInv, espacios: [carta, infInv.espacios.find((e) => e.id === "if_derechos")!] },
    { if_carta: JSON.stringify([{ url: "data:application/pdf;base64,AA", nombre: "carta.pdf", tipo: "pdf" }]) }, (e) => bloquesDerechos(e));
  comprobar("La carta pasa a los anexos con el nombre del capítulo", anexosCapitulo[0]?.nombre === "Carta de finalización satisfactoria (carta.pdf)");
  comprobar("Los derechos de autoría van sin número", apartados[0].numero === null && apartados[0].titulo.startsWith("Derechos"));
}

// 42. Informe final de proyecto (notas del 20-nov-2026) y sin la pestaña «Cierre»
{
  const pro = plantillaRecomendada("proyecto");
  const inf = pro.etapas.find(esEtapaInformeFinal)!;
  comprobar("Proyecto: los capítulos van en el orden de las notas",
    inf.espacios.map((e) => e.id).join(",") === "if_agradecimientos,if_introduccion,if_justificacion,if_alcance,if_objetivos,if_resultados,if_cronograma,if_involucrados,if_conclusiones,if_bibliografia,if_modificaciones,if_presentacion,if_carta,if_anexos",
    inf.espacios.map((e) => e.id).join(","));
  comprobar("Proyecto: la plantilla es válida", validarDefinicion(pro).length === 0, validarDefinicion(pro).map((p) => p.mensaje).join(" | "));
  const ag = tipoApartado(inf.espacios[0])!;
  const conNombres = conIntegrantes(ag, [{ id: 1, nombre: "Ana" }, { id: 2, nombre: "Luis" }]);
  comprobar("Agradecimientos: una parte por integrante, con su nombre", conNombres.partes.length === 2 && conNombres.partes[1].titulo === "Agradecimientos de Luis");
  const contenidoAg = JSON.stringify({ partes: { i1: "A la cooperativa de productores, por abrirnos sus registros de inventario durante todo el proyecto." }, autoevaluacion: [] });
  const { apartados } = apartadosInformeFinal(inf, { if_agradecimientos: contenidoAg }, (e, numero) => [{ tipo: "parrafos", parrafos: [`${e.elemento}:${numero}`] }],
    { integrantes: [{ id: 1, nombre: "Ana" }, { id: 2, nombre: "Luis" }] });
  comprobar("Agradecimientos: solo la página de quien la escribió, sin número", apartados[0].titulo === "Agradecimientos de Ana" && apartados[0].numero === null && !apartados.some((a) => a.titulo === "Agradecimientos de Luis"));
  const crono = apartados.find((a) => a.titulo === "Cronograma original y ejecutado")!;
  const invol = apartados.find((a) => a.titulo === "Involucrados")!;
  const desarrollo = apartados.find((a) => a.titulo === "Desarrollo y ejecución del proyecto")!;
  comprobar("El cronograma y los involucrados son capítulos con número, después del desarrollo",
    crono.numero === desarrollo.numero! + 1 && invol.numero === crono.numero! + 1);
  const inv = plantillaRecomendada("investigacion");
  const { apartados: apInv } = apartadosInformeFinal(inv.etapas.find(esEtapaInformeFinal)!, {}, () => []);
  comprobar("Investigación: los involucrados siguen siendo un anexo sin número", apInv.find((a) => a.titulo === "Involucrados")?.numero === null);
  comprobar("Involucrados de proyecto: se nombra el proyecto", JSON.stringify(bloquesInvolucrados({ actores: [], otros: [], equipo: ["Ana"], asesor: null, trabajo: "proyecto" })).includes("equipo del proyecto"));
  comprobar("Un cronograma sin plan de trabajo es un problema", validarDefinicion({ ...pro, etapas: pro.etapas.filter((e) => !esEtapaPlan(e)) }).some((p) => p.mensaje.includes("el cronograma sale del plan de trabajo")));
}

// 43. Datos empresariales y supervisor en proyecto e investigación (recorrido del 23-nov-2026)
{
  comprobar("Empresa y supervisor tienen formulario en las tres modalidades",
    (["empresa", "supervisor"] as const).every((k) => ["pasantia", "proyecto", "investigacion"].every((m) => CATALOGO[k].formularioEn.includes(m as Modalidad))));
}

// 44. Seguimiento de cohortes (K1, specs/SEGUIMIENTO_COHORTES.md)
{
  const c = { inicioRecepcion: "2026-11-01", finRecepcion: "2026-11-30", maxInicioProceso: "2026-12-21", maxInformeFinal: "2027-05-21", maxAprobacionFinal: "2027-06-21" };
  comprobar("Fases de la cohorte según la fecha",
    faseCohorte(c, "2026-11-10") === "recepcion" && faseCohorte(c, "2026-12-10") === "pre_ejecucion" && faseCohorte(c, "2027-02-01") === "ejecucion"
    && faseCohorte(c, "2027-05-01") === "ultimo_mes" && faseCohorte(c, "2027-06-01") === "cierre" && faseCohorte(c, "2027-07-01") === "finalizada");
  comprobar("Comenzando y finalizando", grupoFase("pre_ejecucion") === "comenzando" && grupoFase("ultimo_mes") === "finalizando" && grupoFase("finalizada") === null);
  const base = { fechaAprobacion: "2026-12-01", inicioEjecucion: null, cohorte: c };
  const pendiente = calcularPreEjecucion({ ...base, requisitos: { plan: "2026-12-05", dictamen_propuesta: null, dictamen_plan: null, primer_contacto: "no_aplica" } }, "2026-12-11");
  comprobar("Pre-ejecución: días, faltantes y requisitos (sin contar los que no aplican)",
    pendiente.diasTranscurridos === 10 && pendiente.diasRestantes === 11 && pendiente.entregados.join() === "plan" && pendiente.pendientes.length === 2 && pendiente.diaCompleto === null);
  const tarde = calcularPreEjecucion({ ...base, requisitos: { plan: "2026-12-05", dictamen_propuesta: null, dictamen_plan: null, primer_contacto: null } }, "2026-12-31");
  comprobar("Pasados los 21 días: retraso y el fin estimado se corre", tarde.diasRetraso === 9 && tarde.finEstimado > pendiente.finEstimado);
  const lejos = calcularPreEjecucion({ ...base, requisitos: { plan: null, dictamen_propuesta: null, dictamen_plan: null, primer_contacto: null } }, "2027-03-01");
  comprobar("Si el fin estimado pasa del período técnico, riesgo de baja", lejos.riesgoBaja && !pendiente.riesgoBaja);
  const rapido = calcularPreEjecucion({ ...base, requisitos: { plan: "2026-12-03", dictamen_propuesta: "2026-12-06", dictamen_plan: "2026-12-06", primer_contacto: "2026-12-07" } }, "2026-12-20");
  const cumpl = cumplimientoPorDia([rapido, pendiente, tarde]);
  comprobar("Cumplimiento al día 7, 14 y pasados de 21", rapido.diaCompleto === 6 && cumpl.dia7 === 1 && cumpl.dia14 === 1 && cumpl.pasaron21 === 1);
  comprobar("CSV para Excel: BOM, punto y coma y comillas", aCsv([["a;b", 'di "x"'], [1, null]]) === String.fromCharCode(0xfeff) + '"a;b";"di ""x"""' + String.fromCharCode(13, 10) + "1;");
}

// 45. Seguimiento de la cohorte que finaliza (K2)
{
  const entregas = [
    { nombre: "Informe 1", limite: "2026-10-10", enviado: "2026-10-08", observado: false },
    { nombre: "Informe 2", limite: "2026-11-10", enviado: "2026-11-15", observado: true },
    { nombre: "Informe 3", limite: "2026-12-10", enviado: null, observado: false },
  ];
  const alDia = calcularSeguimiento(entregas, false, "2026-11-09");
  comprobar("Seguimiento a un corte pasado: al día si nada vencido falta", alDia.estado === "al_dia" && alDia.entregados === 1 && alDia.vencidos === 1);
  const tarde = calcularSeguimiento(entregas, false, "2026-12-20");
  comprobar("Seguimiento: retrasado con días y en qué; entregados tarde y observados",
    tarde.estado === "retrasado" && tarde.diasRetraso === 10 && tarde.atrasadoEn.join() === "Informe 3 (10 días)" && tarde.entregadosTarde === 1 && tarde.observados === 1);
  comprobar("Un trabajo terminado no cuenta retraso", calcularSeguimiento(entregas, true, "2026-12-20").estado === "terminado");
  const c = { inicioRecepcion: "2026-07-01", finRecepcion: "2026-08-01", maxInicioProceso: "2026-09-10", maxInformeFinal: "2027-02-10", maxAprobacionFinal: "2027-03-10" };
  const a = corteAutomatico(c, "2026-11-23");
  comprobar("Corte automático cada 30 días desde el inicio del proceso", a.corte === "2026-11-09" && a.proximo === "2026-12-09" && !a.diario);
  comprobar("En el último mes el corte es diario", corteAutomatico(c, "2027-01-20").diario && corteAutomatico(c, "2027-01-20").corte === "2027-01-20");
  comprobar("Asesor disponible, terminando u ocupado",
    disponibilidadAsesor([{ estado: "terminado", soloFalta: "mas" }]) === "disponible"
    && disponibilidadAsesor([{ estado: "terminado", soloFalta: "mas" }, { estado: "al_dia", soloFalta: "final" }]) === "terminando"
    && disponibilidadAsesor([{ estado: "retrasado", soloFalta: "mas" }]) === "ocupado");
}

// 46. Pasantía con ficha (entrega W1)
{
  comprobar("W1: la pasantía toma su versión de ficha al crear la propuesta", MODALIDADES_CON_FICHA.includes("pasantia"));
  const pas = definicionBase("pasantia");
  const prop = pas.etapas.find(esEtapaPropuesta)!;
  const conTexto = JSON.parse(JSON.stringify(pas)) as DefinicionFicha;
  const propTexto = conTexto.etapas.find(esEtapaPropuesta)!;
  propTexto.espacios.splice(6, 0, { ...prop.espacios.find((e) => e.elemento === "texto")!, id: "objetivos_pasantia", titulo: "Objetivos de la pasantía", origenFase1: undefined });
  comprobar("W1: una ficha de pasantía con un paso nuevo es válida", validarDefinicion(conTexto).length === 0, validarDefinicion(conTexto).map((x) => x.mensaje).join(" | "));
  const desordenada = JSON.parse(JSON.stringify(pas)) as DefinicionFicha;
  const esp = desordenada.etapas.find(esEtapaPropuesta)!.espacios;
  const iCron = esp.findIndex((e) => e.elemento === "cronograma");
  const [cron] = esp.splice(iCron, 1);
  esp.splice(1, 0, cron);
  comprobar("W1: el cronograma no puede ir antes de la carta (necesita sus fechas)", validarDefinicion(desordenada).some((x) => x.mensaje.includes("debe ir después")));
  comprobar("W1: imagen, archivo, enlace, lista y elementos propios tienen formulario en pasantía",
    (["imagen", "archivo", "enlace", "lista", "propio"] as const).every((k) => CATALOGO[k].formularioEn.includes("pasantia")));
}

// 47. Ejecución de pasantía desde la ficha (entrega W2)
{
  const base = reglasDeDefinicion(definicionBase("pasantia"));
  comprobar("W2: la ficha base de pasantía da las reglas de la fase 1",
    base.duracionDias === 150 && base.periodos === 5 && base.diasPorPeriodo === 30 && base.semanasPorPeriodo === 4 && base.paginasMinimas === REGLAS_FASE1.paginasMinimas && calendarioFase1(base));
  comprobar("W2: sin ficha, las de la fase 1", !reglasDeDefinicion(null).deFicha && reglasDeDefinicion(null).duracionDias === 150);
  const especial = definicionBase("pasantia");
  const ej = especial.etapas.find(esEtapaEjecucion)!;
  ej.periodos = 6; ej.duracionPeriodo = 25; ej.subperiodos = 5;
  ej.registro.descripcion = { min: 120, max: 200 };
  ej.informe.paginasMinimas = 12;
  const r = reglasDeDefinicion(especial);
  comprobar("W2: una pasantía especial cambia duración, períodos, semanas y límites",
    r.duracionDias === 150 && r.periodos === 6 && r.diasPorPeriodo === 25 && r.semanasPorPeriodo === 5 && r.descripcion.min === 120 && r.paginasMinimas === 12 && !calendarioFase1(r));
  const periodos = generarPeriodosPasantia(new Date(2027, 0, 1), r.duracionDias, r.diasPorPeriodo, r.semanasPorPeriodo);
  comprobar("W2: el cronograma tiene los períodos y semanas de la ficha", periodos.length === 6 && periodos.every((p) => p.semanas === 5) && periodos[1].rango.startsWith("26/01"));
  comprobar("W2: el informe final es el del último período de la ficha", esInformeFinal(6, 6) && !esInformeFinal(5, 6) && nombreInforme(5, 6) === "Informe del período 5" && esInformeFinal(5));
  const registro = { descriptor: Array.from({ length: 150 }, () => "palabra").join(" ") + "." };
  comprobar("W2: los límites de palabras de la ficha valen al registrar",
    validarContenidoRegistro(registro).some((x) => x.startsWith("La descripción debe tener entre 200"))
    && !validarContenidoRegistro(registro, r).some((x) => x.startsWith("La descripción debe tener")));
}

// 48. Documento final e informe de período de pasantía desde la ficha (entrega W3)
{
  const fase1 = estructuraFinal(configFinalFase1(), true);
  comprobar("W3: sin configuración, la estructura de la fase 1 (capítulos y anexos)",
    fase1.capitulos.map((c) => c.clave).join() === "introduccion,empresa,actividades,conclusiones"
    && JSON.stringify(fase1.anexos.map((a) => a.titulo)) === JSON.stringify(anexosFinal(true).map((a) => a.titulo))
    && JSON.stringify(estructuraFinal(configFinalFase1(), false).anexos.map((a) => a.titulo)) === JSON.stringify(anexosFinal(false).map((a) => a.titulo)));
  const c = configFinalFase1();
  c.capitulos[3].titulo = "CONCLUSIONES Y RECOMENDACIONES";
  c.capitulos.splice(3, 0, { clave: "extra:rec", titulo: "RECOMENDACIONES", activo: true, ayuda: "", minPalabras: 5, maxPalabras: 20 });
  c.capitulos.find((x) => x.clave === "empresa")!.activo = false;
  c.anexos.find((a) => a.clave === "glosario")!.activo = false;
  const e = estructuraFinal(leerConfigFinal(JSON.parse(JSON.stringify(c))), true);
  comprobar("W3: orden, títulos, capítulos quitados y capítulos de texto de la ficha",
    e.capitulos.map((x) => x.clave).join() === "introduccion,actividades,extra:rec,conclusiones" && e.capitulos[3].titulo === "CONCLUSIONES Y RECOMENDACIONES");
  comprobar("W3: sin el glosario, los anexos se renumeran", e.anexos.length === 6 && e.anexos[5].titulo === "Anexo 6. Carta de finalización satisfactoria");
  const sinActividades = configFinalFase1();
  sinActividades.capitulos.find((x) => x.clave === "actividades")!.activo = false;
  comprobar("W3: el capítulo de actividades no se puede quitar", leerConfigFinal(sinActividades).capitulos.find((x) => x.clave === "actividades")!.activo
    && problemasConfigFinal({ ...sinActividades, capitulos: sinActividades.capitulos }).some((m) => m.includes("actividades es obligatorio")));
  const contar = (t: string) => t.split(/\s+/).filter(Boolean).length;
  const cap = c.capitulos.find((x) => x.clave === "extra:rec")!;
  comprobar("W3: el capítulo de texto revisa sus palabras", problemasCapituloExtra(cap, "", contar).length === 1
    && problemasCapituloExtra(cap, "uno dos", contar)[0].includes("al menos 5") && problemasCapituloExtra(cap, "uno dos tres cuatro cinco seis", contar).length === 0);
  const per = leerConfigPeriodo({ cronograma: { activo: true, titulo: "Plan del período" }, cambios: { activo: false } });
  comprobar("W3: partes del informe de período", per.cronograma.titulo === "Plan del período" && !per.cambios.activo && per.cambios.titulo === "Cambios al cronograma");
  const pas = definicionBase("pasantia");
  const ej = pas.etapas.find(esEtapaEjecucion)!;
  const sinTitulo = configFinalFase1();
  sinTitulo.capitulos.push({ clave: "extra:x", titulo: "   ", activo: true, minPalabras: 50, maxPalabras: 10 });
  ej.informe.documentoFinal = sinTitulo;
  comprobar("W3: el constructor avisa los problemas del documento final", validarDefinicion(pas).some((p) => p.mensaje.startsWith("Documento final:")));
}

// 41. Facultades, carreras y título a otorgar (datos oficiales, 20-nov-2026)
{
  comprobar("El título registrado de la carrera gana al deducido", tituloDeCarrera("Ingeniería Mecánica", "Ingeniero o Ingeniera Mecánico") === "Ingeniero o Ingeniera Mecánico");
  comprobar("Sin título registrado se deduce del grado", tituloDeCarrera("Ingeniería Civil", null) === "Ingeniero(a) Civil");
  const portada = portadaInformeFinal({ titulo: "T", facultad: "Facultad Multidisciplinaria de Ilobasco", carrera: "Ingeniería en Sistemas Informáticos", tituloCarrera: "Ingeniero o Ingeniera en Sistemas Informáticos", integrantes: [], asesor: null, fecha: "2026-11-20" }).portada;
  comprobar("La portada lleva el título registrado y la sede del egresado", JSON.stringify(portada).includes("INGENIERO O INGENIERA EN SISTEMAS INFORMÁTICOS") && JSON.stringify(portada).includes("ILOBASCO"));
  // Ilobasco (5) ofrece Sistemas (de Ingeniería, 1) sin duplicarla.
  const sedes = sedesPorCarrera([{ carreraId: 1, facultadId: 5 }, { carreraId: 1, facultadId: 7 }]);
  const sistemas = { facultadId: 1, sedes: sedes.get(1) };
  comprobar("Una carrera se ofrece en su facultad y en sus sedes", seOfreceEn(sistemas, 1) && seOfreceEn(sistemas, "5") && !seOfreceEn(sistemas, 3) && seOfreceEn(sistemas, ""));
}

// Plan de trabajo (27-nov-2026, P1): objetivos fijos desde la propuesta
{
  const obj = [{ titulo: "Diagnosticar", descripcion: "Elaborar un diagnóstico..." }, { titulo: "", descripcion: "Diseñar el módulo" }];
  const act = (id: string): NodoPlan => ({ id, codigo: "", nivel: 3, titulo: "Macro", responsable: null, montos: [], hijos: [] });
  const viejo: NodoPlan = {
    id: "og", codigo: "1", nivel: 1, titulo: "General viejo", responsable: null, montos: [],
    hijos: [
      { id: "a", codigo: "", nivel: 2, titulo: "Cambiado a mano", responsable: 7, montos: [], hijos: [act("m1")] },
      { id: "b", codigo: "", nivel: 2, titulo: "Otro", responsable: null, montos: [], hijos: [] },
      { id: "c", codigo: "", nivel: 2, titulo: "De más", responsable: null, montos: [], hijos: [act("m2")] },
    ],
  };
  const s1 = sincronizarObjetivos(viejo, "General de la propuesta", obj);
  const esp = objetivosEspecificos(s1);
  comprobar("P1: el plan toma el objetivo general y los específicos de la propuesta", s1.titulo === "General de la propuesta" && esp.length === 2 && esp[0].titulo === "Diagnosticar" && esp[1].titulo === "Diseñar el módulo");
  comprobar("P1: cada objetivo conserva por posición su id, responsable y macroactividades", esp[0].id === "a" && esp[0].responsable === 7 && esp[0].hijos[0]?.id === "m1");
  comprobar("P1: los objetivos de más se quitan", !esp.some((o) => o.id === "c"));
  // P2: actividades por período y la regla de envío
  const cols = [{ periodo: 1 }, { periodo: 1 }, { periodo: 2 }, { periodo: 2 }, { periodo: 3 }, { periodo: 3 }];
  const hoja = (id: string, montos: number[]): NodoPlan => ({ id, codigo: "", nivel: 4, titulo: "Act", responsable: null, montos, hijos: [] });
  const conActs: NodoPlan = { ...viejo, hijos: [{ ...viejo.hijos[0], hijos: [{ ...act("m9"), hijos: [hoja("h1", [1, 0, 0, 1]), hoja("h2", [0, 1])] }] }] };
  comprobar("P2: actividades por período", JSON.stringify(actividadesPorPeriodo(conActs, cols)) === JSON.stringify([2, 1, 0]));
  comprobar("P2: un período sin actividades impide enviar", problemasPeriodos(conActs, cols).length === 1 && problemasPeriodos(conActs, cols)[0].mensaje.includes("período 3"));
  comprobar("P1: objetivosCoinciden detecta un objetivo cambiado o de más", objetivosCoinciden(s1, "General de la propuesta", obj) && !objetivosCoinciden(viejo, "General de la propuesta", obj));
}

// Panel del asesor (27-nov-2026, S1): etapa, responsables de los 21 días y orden por urgencia
{
  const req = { plan: null, dictamen_propuesta: "2026-12-01", dictamen_plan: null, primer_contacto: "no_aplica" } as const;
  comprobar("S1: etapa según el estado", etapaDe("coordinador_asignado") === "revision" && etapaDe("redactando") === "ajustes" && etapaDe("aprobada") === "pre_ejecucion" && etapaDe("en_ejecucion") === "ejecucion" && etapaDe("anulada") === "cerrado");
  comprobar("S1: los cerrados no van a ninguna pestaña", pestanaDe("cerrado") === null && pestanaDe("ajustes") === "propuesta" && pestanaDe("ejecucion") === "ejecucion");
  const rp = requisitosProceso("proyecto", req, "redactando");
  const re = requisitosProceso("proyecto", req, "enviado");
  comprobar("S1: el plan es del equipo hasta que lo envía; luego le toca al asesor", rp[0].responsable === "equipo" && re[0].responsable === "asesor" && rp[1].responsable === "asesor");
  comprobar("S1: pendientes del asesor (solo los suyos y no los «no aplica»)", pendientesAsesor("pre_ejecucion", rp) === 1 && pendientesAsesor("pre_ejecucion", re) === 2 && pendientesAsesor("revision", rp) === 1 && pendientesAsesor("ejecucion", rp) === 0);
  const orden = [{ pendientesAsesor: 0, diasRestantes: 2, numero: 1 }, { pendientesAsesor: 1, diasRestantes: 10, numero: 2 }, { pendientesAsesor: 1, diasRestantes: -3, numero: 3 }].sort(compararUrgencia).map((x) => x.numero).join(",");
  comprobar("S1: primero lo que espera al asesor y con menos días", orden === "3,2,1");
}

console.log(fallas === 0 ? "\nTodo en orden." : `\n${fallas} comprobación(es) fallaron.`);
process.exit(fallas === 0 ? 0 : 1);
