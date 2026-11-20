// Validación de la definición de una ficha antes de guardarla o habilitarla. Módulo puro.
// Devuelve la lista de problemas en lenguaje del administrador; una lista vacía significa que la ficha es válida.
import { CATALOGO, elementoEnEtapa } from "./catalogo";
import { esRecurso } from "./elementosRecurso";
import { ELEMENTOS_CON_CAMPOS_EXTRA, problemasCampos, problemasElementoPropio, tieneFormaCampos, tieneFormaCopia } from "./elementosPropios";
import { partePrecarga, partesConfiguradas, tipoApartado, TIPOS_APARTADO } from "./apartadosAcademicos";
import {
  cierreDe, componentesDe, documentoSolicitado, esCronogramaInvestigacion, productosObjetivo,
  esEtapaEjecucion, esEtapaInformeFinal, esEtapaPlan, esEtapaPropuesta, esEtapaProtocolo, FORMATO_DEFINICION, PRECARGA_CONCLUSIONES_OBJETIVOS, PRECARGA_MARCO_REGISTROS, PRECARGAS_EJECUCION,
  type DefinicionFicha, type Espacio, type EtapaConEspacios, type EtapaEjecucion, type EtapaInformeFinal, type EtapaPlan, type EtapaProtocolo,
} from "./tipos";

const ID_PROPIA = /^x_[a-z0-9_]{1,30}$/;

/**
 * Configuración de los subapartados de un apartado académico (ajustes al protocolo, 19-nov-2026): al menos uno activo,
 * ids sin repetir, subapartados del tipo que existan, propios con id "x_…" y formato válido, y mínimos ≤ máximos.
 */
export function problemasPartes(esp: Pick<Espacio, "elemento" | "parametros" | "partes">): string[] {
  const lista: string[] = [];
  const p = (m: string) => lista.push(m);
  if (esp.elemento !== "apartado") return ["solo los apartados académicos configuran subapartados."];
  const tipo = TIPOS_APARTADO[String(esp.parametros.tipo)];
  if (!tipo) return [];
  const ids = new Set<string>();
  for (const c of esp.partes ?? []) {
    const nombre = c.titulo?.trim() || tipo.partes.find((x) => x.id === c.id)?.titulo || c.id;
    if (ids.has(c.id)) p(`el subapartado «${nombre}» está repetido.`);
    ids.add(c.id);
    if (c.propia) {
      if (!ID_PROPIA.test(c.id)) p(`el subapartado propio «${nombre}» tiene un identificador no válido.`);
      if (!c.titulo?.trim()) p("un subapartado propio no tiene título.");
      if (!["texto", "lista", "tabla"].includes(c.propia.formato)) p(`«${nombre}» tiene un formato no válido.`);
      if (c.propia.formato === "tabla" && (!c.propia.columnas?.length || c.propia.columnas.length > 8 || c.propia.columnas.some((x) => !x.trim()))) {
        p(`la tabla «${nombre}» necesita de 1 a 8 columnas con nombre.`);
      }
    } else if (!tipo.partes.some((x) => x.id === c.id)) p(`el subapartado «${c.id}» no existe en el tipo «${tipo.nombre}».`);
    if ((c.titulo ?? "").length > 120) p(`el título de «${nombre}» es demasiado largo.`);
    const entero = (n: number | undefined) => n === undefined || (Number.isInteger(n) && n >= 0 && n <= 10000);
    if (![c.min, c.max, c.minItems, c.maxItems].every(entero)) p(`«${nombre}» tiene un límite no válido.`);
    if (c.min && c.max && c.min > c.max) p(`en «${nombre}» el mínimo de palabras es mayor que el máximo.`);
    if (c.minItems && c.maxItems && c.minItems > c.maxItems) p(`en «${nombre}» el mínimo de elementos o filas es mayor que el máximo.`);
  }
  if (partesConfiguradas(esp).every((x) => !x.activa)) p("el apartado necesita al menos un subapartado activo.");
  return lista;
}

export interface ProblemaFicha {
  /** Dónde está el problema: "ficha", el id de una etapa o "etapaId/espacioId". */
  ubicacion: string;
  mensaje: string;
}

const entero = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n);

function validarEjecucion(etapa: EtapaEjecucion, indice: number, problemas: ProblemaFicha[]) {
  const p = (mensaje: string) => problemas.push({ ubicacion: etapa.id, mensaje: `${etapa.nombre}: ${mensaje}` });

  if (!entero(etapa.periodos) || etapa.periodos < 1) p("debe tener al menos un período.");
  if (!entero(etapa.duracionPeriodo) || etapa.duracionPeriodo < 1) p("la duración de cada período debe ser de al menos 1.");
  if (!entero(etapa.subperiodos) || etapa.subperiodos < 1) p("cada período debe tener al menos un subperíodo.");
  else if (etapa.unidad === "dias" && etapa.subperiodos > etapa.duracionPeriodo) p("hay más subperíodos que días en el período.");
  if (indice === 1 && etapa.inicio !== "carta") p("la primera etapa de ejecución debe iniciar con la fecha de la carta.");
  if (indice > 1 && etapa.inicio !== "etapa_anterior") p("solo la primera etapa de ejecución inicia con la fecha de la carta.");

  const { descripcion, conclusion, imagenes } = etapa.registro;
  // Un máximo de 0 significa "sin máximo".
  if (descripcion.min < 0 || descripcion.max < 0 || conclusion.min < 0 || conclusion.max < 0) p("las palabras del registro no pueden ser negativas.");
  if (descripcion.max > 0 && descripcion.min > descripcion.max) p("el mínimo de palabras de la descripción es mayor que el máximo.");
  if (conclusion.max > 0 && conclusion.min > conclusion.max) p("el mínimo de palabras de la conclusión es mayor que el máximo.");
  if (!entero(imagenes) || imagenes < 0) p("el número de imágenes por actividad no es válido.");
  const ev = etapa.registro.evidencias;
  if (ev && (!entero(ev.min) || !entero(ev.max) || ev.min < 0 || ev.max < 0 || ev.max > 20)) p("las evidencias por actividad van de 0 a 20.");
  else if (ev && ev.max > 0 && ev.min > ev.max) p("el mínimo de evidencias por actividad es mayor que el máximo.");
  else if (ev && ev.max === 0 && ev.min > 0) p("si se pide un mínimo de evidencias, el máximo no puede ser 0.");
  if (etapa.informe.paginasMinimas < 0) p("las páginas mínimas del informe no pueden ser negativas.");
  if (etapa.eliminacionesPorPeriodo < 0) p("las eliminaciones por período no pueden ser negativas.");

  const total = etapa.periodos * etapa.duracionPeriodo;
  for (const h of etapa.hitos) {
    if (h.momento === "antes") {
      // Requisito previo: no ocupa días de la ejecución.
      if (indice > 1) p(`el requisito "${h.nombre}" solo puede ir en la primera etapa de ejecución.`);
      continue;
    }
    if (h.desde > h.hasta) p(`el hito "${h.nombre}" termina antes de empezar.`);
    if (h.hasta > total) p(`el hito "${h.nombre}" termina después del fin de la etapa (${total} ${etapa.unidad}).`);
    if (h.requisitoDeInforme !== null && (h.requisitoDeInforme < 1 || h.requisitoDeInforme > etapa.periodos)) {
      p(`el hito "${h.nombre}" es requisito de un informe que no existe.`);
    }
  }
}

function validarPlan(plan: EtapaPlan, def: DefinicionFicha, problemas: ProblemaFicha[]) {
  const p = (mensaje: string) => problemas.push({ ubicacion: plan.id, mensaje: `${plan.nombre}: ${mensaje}` });
  const { objetivosPorIntegrante, macroPorObjetivo, actividadesPorMacro } = plan.minimos;
  if (!entero(objetivosPorIntegrante) || objetivosPorIntegrante < 1 || objetivosPorIntegrante > 10) p("los objetivos específicos por integrante deben estar entre 1 y 10.");
  const maxObj = plan.minimos.maxObjetivosPorIntegrante;
  if (maxObj !== undefined && (!entero(maxObj) || maxObj < objetivosPorIntegrante || maxObj > 10)) p("el máximo de objetivos por integrante debe estar entre el mínimo y 10.");
  if (!entero(macroPorObjetivo) || macroPorObjetivo < 1 || macroPorObjetivo > 10) p("las macroactividades por objetivo deben estar entre 1 y 10.");
  if (!entero(actividadesPorMacro) || actividadesPorMacro < 1 || actividadesPorMacro > 20) p("las actividades por macroactividad deben estar entre 1 y 20.");
  if (!entero(plan.aprobacion.diasRevision) || plan.aprobacion.diasRevision < 1 || plan.aprobacion.diasRevision > 30) p("los días de revisión del asesor deben estar entre 1 y 30.");
  if (plan.presupuesto.activo && !plan.presupuesto.moneda.trim()) p("falta la moneda del presupuesto.");
  if (def.modalidad === "pasantia") p("la pasantía usa el cronograma dentro de la propuesta; el plan de trabajo es para proyecto e investigación.");
  if (!["no", "opcional", "obligatorio", undefined].includes(plan.documentoSolicitado)) p("el documento solicitado por actividad no es válido.");
  if (!["no", "opcional", "obligatorio", undefined].includes(plan.productosObjetivo)) p("los productos por objetivo no son válidos.");
  // Cronograma de investigación (notas del 19-nov-2026).
  if (plan.metodologiaObjetivo && !esCronogramaInvestigacion(plan)) p("la metodología de cada objetivo es parte del cronograma de investigación.");
  if (esCronogramaInvestigacion(plan)) {
    if (def.modalidad !== "investigacion") p("el cronograma de investigación es solo para la modalidad de investigación.");
    if (plan.equipo.responsable !== "objetivo") p("en el cronograma de investigación el responsable se asigna por objetivo específico.");
    if (productosObjetivo(plan) !== "no" || documentoSolicitado(plan) !== "no") p("el cronograma de investigación no lleva productos ni documentos: las evidencias van en los registros.");
    const comps = componentesDe(plan);
    if (comps.some((c) => c.nombre.length > 80)) p("el nombre de un elemento del proceso es demasiado largo (máximo 80 caracteres).");
    if (!comps.some((c) => c.obligatorio)) p("al menos un elemento del proceso debe ser obligatorio.");
    if (plan.metodologiaObjetivo && !comps.find((c) => c.clave === "metodologia")?.obligatorio) p("la metodología de cada objetivo se pide en el elemento «Metodología»: márcalo como obligatorio.");
    if (new Set(comps.map((c) => c.nombre.toLowerCase())).size !== comps.length) p("dos elementos del proceso tienen el mismo nombre.");
    const cierre = cierreDe(plan);
    if (cierre.activo && cierre.titulo.length > 120) p("el nombre del bloque de preparación del informe es demasiado largo (máximo 120 caracteres).");
  }
}

/**
 * Espacios de una etapa (propuesta o protocolo): elementos permitidos, orden de dependencias y parámetros.
 * Devuelve los elementos presentes, en orden, para las reglas de coherencia entre etapas.
 */
function validarEspacios(etapa: EtapaConEspacios, def: DefinicionFicha, problemas: ProblemaFicha[], fuentes: EtapaConEspacios[]): Set<string> {
  const vistos = new Set<string>();
  const idsEspacios = new Set<string>();
  const propiosVistos = new Set<number>();
  const nombreEtapa = etapa.tipo === "propuesta" ? "la propuesta" : etapa.tipo === "protocolo" ? "el protocolo" : "el informe final";
  for (const esp of etapa.espacios) {
    const el = CATALOGO[esp.elemento];
    const ubicacion = `${etapa.id}/${esp.id}`;
    const p = (mensaje: string) => problemas.push({ ubicacion, mensaje: `${esp.titulo || el?.nombre || esp.elemento}: ${mensaje}` });

    if (!el) {
      p(`el elemento "${esp.elemento}" no existe en el catálogo.`);
      continue;
    }
    if (idsEspacios.has(esp.id)) p(`el identificador "${esp.id}" está repetido.`);
    idsEspacios.add(esp.id);
    if (!esp.titulo.trim()) p("falta el título.");
    // Cualquier elemento se puede usar en cualquier modalidad (revisión del 13-nov-2026); solo se limita por etapa.
    if (!elementoEnEtapa(esp.elemento, etapa.tipo)) p(`este elemento no se puede usar en ${nombreEtapa}.`);
    if (!el.repetible && vistos.has(esp.elemento)) p("este elemento solo puede aparecer una vez.");
    for (const req of el.requiere) {
      if (!vistos.has(req)) p(`debe ir después de "${CATALOGO[req].nombre}".`);
    }
    vistos.add(esp.elemento);

    for (const par of el.parametros) {
      const v = esp.parametros[par.clave];
      if (par.tipo === "numero") {
        if (!entero(v) || v < par.min || v > par.max) p(`"${par.etiqueta}" debe estar entre ${par.min} y ${par.max}.`);
      } else if (par.tipo === "booleano") {
        if (typeof v !== "boolean") p(`"${par.etiqueta}" debe ser sí o no.`);
        else if (v && par.soloEquipo && def.participantes.max < 2) p(`"${par.etiqueta}" solo aplica a trabajos en equipo.`);
      } else if (par.tipo === "textos") {
        if (!Array.isArray(v) || v.some((x) => typeof x !== "string")) p(`"${par.etiqueta}" no es válido.`);
        else if (v.some((x) => !x.trim())) p(`"${par.etiqueta}" tiene un texto vacío.`);
        else if (v.length < par.minimo || v.length > par.maximo) p(`"${par.etiqueta}" debe tener de ${par.minimo} a ${par.maximo}.`);
        else if (new Set(v.map((x) => x.trim().toLowerCase())).size !== v.length) p(`"${par.etiqueta}" tiene textos repetidos.`);
      } else if (par.tipo === "opcion") {
        if (typeof v !== "string" || !par.opciones.some((o) => o.valor === v)) p(`"${par.etiqueta}" tiene una opción que no existe.`);
      } else {
        const validos = new Set(par.opciones.map((o) => o.valor));
        if (!Array.isArray(v) || v.some((x) => !validos.has(x))) p(`"${par.etiqueta}" tiene opciones que no existen.`);
        else if (v.length < par.minimo) p(`"${par.etiqueta}" necesita al menos ${par.minimo} opción(es).`);
      }
    }
    if (esp.partes !== undefined) problemasPartes(esp).forEach((m) => p(m));
    // Catálogo editable (C2): el espacio lleva la copia válida de un elemento propio, en una etapa que el elemento admite.
    if (esp.elemento === "propio") {
      if (!tieneFormaCopia(esp.propio)) p("falta la copia del elemento propio.");
      else {
        const d = esp.propio.definicion;
        problemasElementoPropio(d).forEach((m) => p(`elemento «${d.nombre}»: ${m}`));
        if (!d.etapas.includes(etapa.tipo)) p(`el elemento «${d.nombre}» no se puede usar en ${nombreEtapa}.`);
        if (!d.repetible && propiosVistos.has(esp.propio.elementoId)) p(`el elemento «${d.nombre}» solo puede aparecer una vez.`);
        propiosVistos.add(esp.propio.elementoId);
      }
    } else if (esp.propio !== undefined) p("solo un elemento propio lleva copia del catálogo.");
    // Catálogo editable (C4): campos adicionales al final de un elemento del sistema, en la propuesta o el protocolo.
    if (esp.camposExtra !== undefined) {
      if (etapa.tipo === "informe_final") p("los capítulos del informe final no llevan campos adicionales.");
      else if (!(ELEMENTOS_CON_CAMPOS_EXTRA as readonly string[]).includes(esp.elemento)) p("este elemento no admite campos adicionales.");
      else if (def.modalidad === "pasantia") p("el asistente de pasantía todavía no muestra campos adicionales.");
      else if (esp.camposExtra.length === 0) p("la lista de campos adicionales está vacía.");
      else problemasCampos(esp.camposExtra).forEach((m) => p(`campos adicionales: ${m}`));
    }
    if (esp.elemento === "texto") {
      const { minPalabras, maxPalabras } = esp.parametros as { minPalabras: number; maxPalabras: number };
      if (maxPalabras > 0 && minPalabras > maxPalabras) p("el mínimo de palabras es mayor que el máximo.");
    }
    if (esRecurso(esp.elemento)) {
      const { minimo, maximo } = esp.parametros as { minimo: number; maximo: number };
      if (minimo > maximo) p("la cantidad mínima es mayor que la máxima.");
    }
    if (esp.elemento === "objetivos") {
      const { minEspecificos, maxEspecificos } = esp.parametros as { minEspecificos: number; maxEspecificos: number };
      if (minEspecificos > maxEspecificos) p("el mínimo de objetivos específicos es mayor que el máximo.");
    }
    if (esp.elemento === "resultados_objetivos" && !def.etapas.some(esEtapaPlan)) p("los resultados por objetivo salen del plan de trabajo: la ficha necesita uno.");
    if (esp.elemento === "cronograma_comparado" && !def.etapas.some(esEtapaPlan)) p("el cronograma sale del plan de trabajo: la ficha necesita uno.");
    if (esp.elemento === "anexo_recursos" && !def.etapas.find(esEtapaProtocolo)?.espacios.some((x) => x.elemento === "recursos_presupuesto")) {
      p("el anexo de recursos sale de los recursos del protocolo: la ficha necesita ese espacio.");
    }
    if (esp.elemento === "reporte_modificaciones" && !def.etapas.filter(esEtapaEjecucion).some((x) => x.registro.modificaciones)) {
      p("el reporte de modificaciones sale de la bitácora: la ejecución debe pedirla.");
    }
    if (esp.precargarDe !== undefined) {
      // Protocolo: desde la propuesta. Informe final: desde la propuesta, el protocolo o el marco teórico de los registros.
      if (etapa.tipo === "propuesta") p("solo los espacios del protocolo y del informe final se precargan.");
      else if (PRECARGAS_EJECUCION.includes(esp.precargarDe)) {
        const que = esp.precargarDe === PRECARGA_MARCO_REGISTROS ? "el marco teórico de las actividades" : "las conclusiones de los objetivos";
        if (etapa.tipo !== "informe_final") p(`${que} solo se precarga en el informe final.`);
        else if (esp.elemento !== "texto" && esp.elemento !== "apartado") p(`${que} solo se precarga en un bloque de texto o un apartado académico.`);
        else if (esp.precargarDe === PRECARGA_CONCLUSIONES_OBJETIVOS && (def.etapas.find(esEtapaPlan)?.productosObjetivo ?? "no") === "no") {
          p("las conclusiones de los objetivos solo existen si el plan pide productos por objetivo.");
        }
      } else if (esp.elemento !== "texto" && esp.elemento !== "lista" && esp.elemento !== "apartado") p("solo un texto, una lista o un apartado académico se pueden precargar.");
      else {
        // "id#parte": un subapartado de un apartado académico (por ejemplo, "bibliografia#lista").
        const [id, parte] = partePrecarga(esp.precargarDe);
        const origen = fuentes.flatMap((x) => x.espacios).find((x) => x.id === id);
        const tipoOrigen = origen?.elemento === "apartado" ? tipoApartado(origen) : undefined;
        const formatoParte = parte ? tipoOrigen?.partes.find((x) => x.id === parte)?.formato : undefined;
        if (!origen) p(`se precarga desde un espacio que ya no está en ${etapa.tipo === "protocolo" ? "la propuesta" : "la propuesta ni en el protocolo"}.`);
        else if (parte && !formatoParte) p(`se precarga desde el subapartado "${parte}", que no existe en "${origen.titulo}".`);
        else if (esp.elemento === "texto" && !["texto", "objetivos", "apartado"].includes(origen.elemento)) p(`no se puede precargar desde "${origen.titulo}": solo desde un texto, los objetivos o un apartado.`);
        else if (esp.elemento === "lista" && origen.elemento !== "lista" && !(formatoParte === "lista" || formatoParte === "referencias")) p(`no se puede precargar desde "${origen.titulo}": una lista solo se precarga desde otra lista o un subapartado de lista.`);
        else if (esp.elemento === "apartado" && !["texto", "objetivos", "apartado"].includes(origen.elemento)) p(`no se puede precargar desde "${origen.titulo}": un apartado se precarga desde un texto, los objetivos u otro apartado.`);
      }
    }
  }
  return vistos;
}

function validarInformeFinal(informe: EtapaInformeFinal, def: DefinicionFicha, problemas: ProblemaFicha[]) {
  const p = (mensaje: string) => problemas.push({ ubicacion: informe.id, mensaje: `${informe.nombre}: ${mensaje}` });
  // H7 (20-nov-2026): también proyecto. La pasantía sigue con su documento final de la fase 1.
  if (def.modalidad === "pasantia") p("el informe final por capítulos es para proyecto e investigación; la pasantía usa su documento final.");
  if (informe.espacios.length === 0) p("no tiene capítulos.");
  const { diasRevision } = informe.revision;
  if (!entero(diasRevision) || diasRevision < 1 || diasRevision > 30) p("los días de revisión del asesor deben estar entre 1 y 30.");
}

function validarProtocolo(protocolo: EtapaProtocolo, def: DefinicionFicha, problemas: ProblemaFicha[]) {
  const p = (mensaje: string) => problemas.push({ ubicacion: protocolo.id, mensaje: `${protocolo.nombre}: ${mensaje}` });
  if (def.modalidad !== "investigacion") p("el protocolo es, por ahora, solo para investigación.");
  if (protocolo.espacios.length === 0) p("no tiene espacios.");
  const { diasRevision } = protocolo.revision;
  if (!entero(diasRevision) || diasRevision < 1 || diasRevision > 30) p("los días para el dictamen del asesor deben estar entre 1 y 30.");
}

export function validarDefinicion(def: DefinicionFicha): ProblemaFicha[] {
  const problemas: ProblemaFicha[] = [];
  const ficha = (mensaje: string) => problemas.push({ ubicacion: "ficha", mensaje });

  if (def.formato !== FORMATO_DEFINICION) ficha(`El formato ${def.formato} no es compatible con esta versión del sistema.`);
  if (def.participantes.min < 1 || def.participantes.max < def.participantes.min) {
    ficha("El número de participantes no es válido.");
  }

  const [primera, ...resto] = def.etapas;
  if (!primera || !esEtapaPropuesta(primera)) {
    ficha("La ficha debe empezar con la etapa de propuesta.");
    return problemas;
  }
  // Orden: propuesta, a lo sumo un protocolo (inmediatamente después), a lo sumo un plan de trabajo (después de la
  // propuesta o del protocolo) y luego las ejecuciones.
  const protocolos = resto.filter(esEtapaProtocolo);
  const planes = resto.filter(esEtapaPlan);
  if (protocolos.length > 1) ficha("La ficha solo puede tener un protocolo.");
  if (protocolos.length === 1 && !esEtapaProtocolo(resto[0])) ficha("El protocolo debe ir inmediatamente después de la propuesta.");
  if (planes.length > 1) ficha("La ficha solo puede tener un plan de trabajo.");
  const posPlan = protocolos.length === 1 && esEtapaProtocolo(resto[0]) ? 1 : 0;
  if (planes.length === 1 && !esEtapaPlan(resto[posPlan])) {
    ficha(posPlan === 1 ? "El plan de trabajo debe ir inmediatamente después del protocolo." : "El plan de trabajo debe ir inmediatamente después de la propuesta.");
  }
  const informesFinales = resto.filter(esEtapaInformeFinal);
  if (informesFinales.length > 1) ficha("La ficha solo puede tener un informe final.");
  if (informesFinales.length === 1 && !esEtapaInformeFinal(resto[resto.length - 1])) ficha("El informe final debe ser la última etapa.");
  if (resto.some((e) => !esEtapaEjecucion(e) && !esEtapaPlan(e) && !esEtapaProtocolo(e) && !esEtapaInformeFinal(e))) ficha("Después de la propuesta solo puede haber un protocolo, un plan de trabajo, etapas de ejecución y el informe final.");
  if (resto.some((e) => esEtapaPropuesta(e))) ficha("La ficha solo puede tener una propuesta.");

  const ids = new Set<string>();
  for (const e of def.etapas) {
    if (ids.has(e.id)) ficha(`Hay dos etapas con el identificador "${e.id}".`);
    ids.add(e.id);
  }

  // Etapa de propuesta: elementos permitidos, orden de dependencias y parámetros.
  if (primera.espacios.length === 0) ficha("La propuesta no tiene espacios.");
  const vistos = validarEspacios(primera, def, problemas, []);

  // Protocolo (investigación): mismos elementos, sin los que solo van en la propuesta.
  const protocolo = protocolos[0];
  if (protocolo) {
    validarProtocolo(protocolo, def, problemas);
    validarEspacios(protocolo, def, problemas, [primera]);
    if (!planes.length) ficha("El protocolo incluye el cronograma de actividades: agrega el plan de trabajo.");
  }

  // Informe final (investigación): capítulos con el mismo catálogo; se precargan de la propuesta, el protocolo o los registros.
  const informeFinal = informesFinales[0];
  if (informeFinal) {
    validarInformeFinal(informeFinal, def, problemas);
    validarEspacios(informeFinal, def, problemas, [primera, ...protocolos]);
    if (!resto.some(esEtapaEjecucion)) ficha("El informe final necesita una etapa de ejecución antes.");
  }

  // Las respuestas de la propuesta y el protocolo se guardan juntas (respuestas_espacios), por id de espacio; el
  // informe final usa sus propias versiones, pero sus ids tampoco deben confundirse con los de las otras etapas.
  const usados = new Map<string, string>();
  for (const etapa of [primera, ...protocolos, ...informesFinales]) {
    for (const e of etapa.espacios) {
      const otra = usados.get(e.id);
      if (otra && otra !== etapa.id) {
        const nombre = otra === primera.id ? "la propuesta" : protocolos.some((x) => x.id === otra) ? "el protocolo" : "otra etapa";
        problemas.push({ ubicacion: `${etapa.id}/${e.id}`, mensaje: `${e.titulo}: el identificador "${e.id}" ya se usa en ${nombre}.` });
      } else usados.set(e.id, etapa.id);
    }
  }

  // Etapas de ejecución.
  const ejecuciones = resto.filter(esEtapaEjecucion);
  ejecuciones.forEach((e, i) => validarEjecucion(e, i + 1, problemas));

  // Coherencia entre la propuesta y la ejecución.
  const tieneCronograma = vistos.has("cronograma");
  if (tieneCronograma && ejecuciones.length === 0) ficha("El cronograma necesita una etapa de ejecución que defina sus períodos.");
  const carta = primera.espacios.find((e) => e.elemento === "carta");
  const primeraEjecucion = ejecuciones[0];
  if (carta && primeraEjecucion && primeraEjecucion.unidad === "dias") {
    const total = primeraEjecucion.periodos * primeraEjecucion.duracionPeriodo;
    if (carta.parametros.duracionDias !== total) {
      ficha(`La duración de la carta (${carta.parametros.duracionDias} días) no coincide con la de "${primeraEjecucion.nombre}" (${total} días).`);
    }
  }
  if (primeraEjecucion && !carta) ficha("La ejecución inicia con la fecha de la carta, pero la propuesta no tiene carta de aceptación.");

  // Plan de trabajo: necesita los objetivos de la propuesta (consecuencia lógica) y la ejecución que da sus columnas.
  const plan = planes[0];
  if (plan) {
    validarPlan(plan, def, problemas);
    if (!vistos.has("objetivos")) ficha("El plan de trabajo parte de los objetivos de la propuesta: agrega el espacio \"Objetivos\".");
    if (ejecuciones.length === 0) ficha("El plan de trabajo necesita una etapa de ejecución que defina sus períodos y subperíodos.");
    if (tieneCronograma) ficha("Usa el cronograma de la propuesta o el plan de trabajo, no los dos.");
  }
  for (const e of ejecuciones) {
    if (e.registro.modo === "actividad" && !plan) {
      problemas.push({ ubicacion: e.id, mensaje: `${e.nombre}: el registro por actividad necesita un plan de trabajo.` });
    }
  }

  return problemas;
}

/**
 * Comprueba que un valor recibido (por ejemplo, del navegador) tenga la forma de una definición antes de
 * validarla o guardarla. No revisa las reglas de negocio: para eso está validarDefinicion().
 */
export function tieneFormaDeDefinicion(x: unknown): x is DefinicionFicha {
  const obj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
  const num = (v: unknown) => typeof v === "number" && Number.isFinite(v);
  const str = (v: unknown) => typeof v === "string";
  const rango = (v: unknown) => obj(v) && num(v.min) && num(v.max);

  const opcional = (v: unknown, valores: readonly unknown[]) => v === undefined || valores.includes(v);

  if (!obj(x) || x.formato !== FORMATO_DEFINICION || !str(x.modalidad) || !rango(x.participantes) || !Array.isArray(x.etapas)) {
    return false;
  }
  const mismaCarrera = (x.participantes as Record<string, unknown>).mismaCarrera;
  if (mismaCarrera !== undefined && typeof mismaCarrera !== "boolean") return false;
  return x.etapas.every((e: unknown) => {
    if (!obj(e) || !str(e.id) || !str(e.nombre)) return false;
    const espaciosValidos = (v: unknown) =>
      Array.isArray(v) &&
      v.every(
        (s: unknown) =>
          obj(s) && str(s.id) && str(s.elemento) && str(s.titulo) && str(s.descripcion) && str(s.ayuda) &&
          typeof s.obligatorio === "boolean" && obj(s.parametros) && (s.precargarDe === undefined || str(s.precargarDe)) &&
          (s.partes === undefined || (Array.isArray(s.partes) && s.partes.every((c: unknown) => obj(c) && str((c as { id: unknown }).id) && typeof (c as { activa: unknown }).activa === "boolean"))) &&
          (s.propio === undefined || tieneFormaCopia(s.propio)) &&
          (s.camposExtra === undefined || tieneFormaCampos(s.camposExtra))
      );
    if (e.tipo === "informe_final") {
      const r = e.revision;
      return espaciosValidos(e.espacios) && obj(r) && typeof r.porCapitulo === "boolean" && typeof r.ratificacion === "boolean" && num(r.diasRevision) && typeof r.diasHabiles === "boolean";
    }
    if (e.tipo === "protocolo") {
      const r = e.revision;
      return espaciosValidos(e.espacios) && obj(r) && num(r.diasRevision) && typeof r.diasHabiles === "boolean" && typeof r.ratificacion === "boolean";
    }
    if (e.tipo === "plan") {
      const m = e.minimos, pr = e.presupuesto, eq = e.equipo, ap = e.aprobacion;
      return (
        opcional(e.documentoSolicitado, ["no", "opcional", "obligatorio"]) &&
        opcional(e.productosObjetivo, ["no", "opcional", "obligatorio"]) &&
        opcional(e.estructura, ["actividades", "investigacion"]) &&
        (e.componentes === undefined || (Array.isArray(e.componentes) && e.componentes.length <= 10 &&
          e.componentes.every((c) => obj(c) && str(c.clave) && str(c.nombre) && typeof c.obligatorio === "boolean"))) &&
        (e.cierre === undefined || (obj(e.cierre) && typeof e.cierre.activo === "boolean" && str(e.cierre.titulo))) &&
        (e.metodologiaObjetivo === undefined || typeof e.metodologiaObjetivo === "boolean") &&
        ["no", "opcional", "obligatorio"].includes(e.subactividades as string) &&
        obj(m) && num(m.objetivosPorIntegrante) && (m.maxObjetivosPorIntegrante === undefined || num(m.maxObjetivosPorIntegrante)) && num(m.macroPorObjetivo) && num(m.actividadesPorMacro) &&
        obj(pr) && typeof pr.activo === "boolean" && (pr.desglose === "monto" || pr.desglose === "recursos_gastos") && str(pr.moneda) &&
        (e.granularidad === "subperiodo" || e.granularidad === "periodo") &&
        obj(eq) && (eq.responsable === "objetivo" || eq.responsable === "actividad") && typeof eq.planIndividual === "boolean" && typeof eq.panelCarga === "boolean" &&
        obj(ap) && typeof ap.validaSupervisor === "boolean" && num(ap.diasRevision)
      );
    }
    if (e.tipo === "propuesta") return espaciosValidos(e.espacios);
    if (e.tipo === "ejecucion") {
      const r = e.registro;
      const i = e.informe;
      return (
        (e.inicio === "carta" || e.inicio === "etapa_anterior") && (e.unidad === "dias" || e.unidad === "meses") &&
        num(e.periodos) && num(e.duracionPeriodo) && num(e.subperiodos) &&
        obj(r) && rango(r.descripcion) && rango(r.conclusion) && num(r.imagenes) &&
        opcional(r.modo, ["subperiodo", "actividad"]) && opcional(r.marcoTeorico, ["obligatorio", "opcional", "no"]) &&
        (r.avance === undefined || typeof r.avance === "boolean") &&
        (r.evidencias === undefined || rango(r.evidencias)) &&
        (r.modificaciones === undefined || typeof r.modificaciones === "boolean") &&
        (r.adelantar === undefined || typeof r.adelantar === "boolean") &&
        num(e.diasRevision) && num(e.subperiodosAdelantables) && num(e.eliminacionesPorPeriodo) &&
        obj(i) && num(i.paginasMinimas) && typeof i.exigirActividadesAprobadas === "boolean" && opcional(i.modo, ["unico", "individual_y_general"]) &&
        obj(i.comentariosDecanato) && typeof i.comentariosDecanato.activo === "boolean" && num(i.comentariosDecanato.minPalabras) &&
        (e.diasPrimerContacto === null || num(e.diasPrimerContacto)) &&
        Array.isArray(e.hitos) &&
        e.hitos.every((h: unknown) => obj(h) && str(h.id) && str(h.nombre) && num(h.desde) && num(h.hasta) &&
          (h.requisitoDeInforme === null || num(h.requisitoDeInforme)) &&
          (h.tipo === undefined || str(h.tipo)) && (h.momento === undefined || h.momento === "antes" || h.momento === "durante"))
      );
    }
    return false;
  });
}
