// Validación de la definición de una ficha antes de guardarla o habilitarla. Módulo puro.
// Devuelve la lista de problemas en lenguaje del administrador; una lista vacía significa que la ficha es válida.
import { CATALOGO } from "./catalogo";
import { esRecurso } from "./elementosRecurso";
import { esEtapaEjecucion, esEtapaPlan, esEtapaPropuesta, FORMATO_DEFINICION, type DefinicionFicha, type EtapaEjecucion, type EtapaPlan } from "./tipos";

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
  if (!entero(macroPorObjetivo) || macroPorObjetivo < 1 || macroPorObjetivo > 10) p("las macroactividades por objetivo deben estar entre 1 y 10.");
  if (!entero(actividadesPorMacro) || actividadesPorMacro < 1 || actividadesPorMacro > 20) p("las actividades por macroactividad deben estar entre 1 y 20.");
  if (!entero(plan.aprobacion.diasRevision) || plan.aprobacion.diasRevision < 1 || plan.aprobacion.diasRevision > 30) p("los días de revisión del asesor deben estar entre 1 y 30.");
  if (plan.presupuesto.activo && !plan.presupuesto.moneda.trim()) p("falta la moneda del presupuesto.");
  if (def.modalidad === "pasantia") p("la pasantía usa el cronograma dentro de la propuesta; el plan de trabajo es para proyecto e investigación.");
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
  // Orden: propuesta, a lo sumo un plan de trabajo (inmediatamente después) y luego las ejecuciones.
  const planes = resto.filter(esEtapaPlan);
  if (planes.length > 1) ficha("La ficha solo puede tener un plan de trabajo.");
  if (planes.length === 1 && !esEtapaPlan(resto[0])) ficha("El plan de trabajo debe ir inmediatamente después de la propuesta.");
  if (resto.some((e) => !esEtapaEjecucion(e) && !esEtapaPlan(e))) ficha("Después de la propuesta solo puede haber un plan de trabajo y etapas de ejecución.");

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
    if (esRecurso(esp.elemento)) {
      const { minimo, maximo } = esp.parametros as { minimo: number; maximo: number };
      if (minimo > maximo) p("la cantidad mínima es mayor que la máxima.");
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
    if (e.tipo === "plan") {
      const m = e.minimos, pr = e.presupuesto, eq = e.equipo, ap = e.aprobacion;
      return (
        ["no", "opcional", "obligatorio"].includes(e.subactividades as string) &&
        obj(m) && num(m.objetivosPorIntegrante) && num(m.macroPorObjetivo) && num(m.actividadesPorMacro) &&
        obj(pr) && typeof pr.activo === "boolean" && (pr.desglose === "monto" || pr.desglose === "recursos_gastos") && str(pr.moneda) &&
        (e.granularidad === "subperiodo" || e.granularidad === "periodo") &&
        obj(eq) && (eq.responsable === "objetivo" || eq.responsable === "actividad") && typeof eq.planIndividual === "boolean" && typeof eq.panelCarga === "boolean" &&
        obj(ap) && typeof ap.validaSupervisor === "boolean" && num(ap.diasRevision)
      );
    }
    if (e.tipo === "propuesta") {
      return (
        Array.isArray(e.espacios) &&
        e.espacios.every(
          (s: unknown) =>
            obj(s) && str(s.id) && str(s.elemento) && str(s.titulo) && str(s.descripcion) && str(s.ayuda) &&
            typeof s.obligatorio === "boolean" && obj(s.parametros)
        )
      );
    }
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
