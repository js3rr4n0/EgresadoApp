// Validación de la definición de una ficha antes de guardarla o habilitarla. Módulo puro.
// Devuelve la lista de problemas en lenguaje del administrador; una lista vacía significa que la ficha es válida.
import { CATALOGO } from "./catalogo";
import { esEtapaEjecucion, esEtapaPropuesta, FORMATO_DEFINICION, type DefinicionFicha, type EtapaEjecucion } from "./tipos";

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
  if (descripcion.min > descripcion.max) p("el mínimo de palabras de la descripción es mayor que el máximo.");
  if (conclusion.min > conclusion.max) p("el mínimo de palabras de la conclusión es mayor que el máximo.");
  if (!entero(imagenes) || imagenes < 0) p("el número de imágenes por actividad no es válido.");
  if (etapa.informe.paginasMinimas < 0) p("las páginas mínimas del informe no pueden ser negativas.");
  if (etapa.eliminacionesPorPeriodo < 0) p("las eliminaciones por período no pueden ser negativas.");

  const total = etapa.periodos * etapa.duracionPeriodo;
  for (const h of etapa.hitos) {
    if (h.desde > h.hasta) p(`el hito "${h.nombre}" termina antes de empezar.`);
    if (h.hasta > total) p(`el hito "${h.nombre}" termina después del fin de la etapa (${total} ${etapa.unidad}).`);
    if (h.requisitoDeInforme !== null && (h.requisitoDeInforme < 1 || h.requisitoDeInforme > etapa.periodos)) {
      p(`el hito "${h.nombre}" es requisito de un informe que no existe.`);
    }
  }
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
  if (resto.some((e) => !esEtapaEjecucion(e))) ficha("Después de la propuesta solo puede haber etapas de ejecución.");

  const ids = new Set<string>();
  for (const e of def.etapas) {
    if (ids.has(e.id)) ficha(`Hay dos etapas con el identificador "${e.id}".`);
    ids.add(e.id);
  }

  // Etapa de propuesta: elementos permitidos, orden de dependencias y parámetros.
  if (primera.espacios.length === 0) ficha("La propuesta no tiene espacios.");
  const vistos = new Set<string>();
  const idsEspacios = new Set<string>();
  for (const esp of primera.espacios) {
    const el = CATALOGO[esp.elemento];
    const ubicacion = `${primera.id}/${esp.id}`;
    const p = (mensaje: string) => problemas.push({ ubicacion, mensaje: `${esp.titulo || el?.nombre || esp.elemento}: ${mensaje}` });

    if (!el) {
      p(`el elemento "${esp.elemento}" no existe en el catálogo.`);
      continue;
    }
    if (idsEspacios.has(esp.id)) p(`el identificador "${esp.id}" está repetido.`);
    idsEspacios.add(esp.id);
    if (!esp.titulo.trim()) p("falta el título.");
    if (!el.modalidades.includes(def.modalidad)) p(`este elemento todavía no está disponible para la modalidad ${def.modalidad}.`);
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
      } else {
        const validos = new Set(par.opciones.map((o) => o.valor));
        if (!Array.isArray(v) || v.some((x) => !validos.has(x))) p(`"${par.etiqueta}" tiene opciones que no existen.`);
        else if (v.length < par.minimo) p(`"${par.etiqueta}" necesita al menos ${par.minimo} opción(es).`);
      }
    }
    if (esp.elemento === "texto") {
      const { minPalabras, maxPalabras } = esp.parametros as { minPalabras: number; maxPalabras: number };
      if (maxPalabras > 0 && minPalabras > maxPalabras) p("el mínimo de palabras es mayor que el máximo.");
    }
    if (esp.elemento === "objetivos") {
      const { minEspecificos, maxEspecificos } = esp.parametros as { minEspecificos: number; maxEspecificos: number };
      if (minEspecificos > maxEspecificos) p("el mínimo de objetivos específicos es mayor que el máximo.");
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

  return problemas;
}
