// Cambios entre dos definiciones de una ficha, en lenguaje del administrador. Se muestran antes de habilitar
// una versión nueva para que se vea qué cambia respecto de la anterior. Módulo puro.
import { CATALOGO } from "./catalogo";
import {
  documentoSolicitado, productosObjetivo, esEtapaEjecucion, esEtapaInformeFinal, esEtapaPlan, esEtapaPropuesta, esEtapaProtocolo, opcionesRegistro, rangoPalabras,
  type DefinicionFicha, type EtapaConEspacios, type EtapaEjecucion, type EtapaInformeFinal, type EtapaPlan, type EtapaProtocolo, type ValorParametro,
} from "./tipos";

const texto = (v: ValorParametro | null | undefined) =>
  Array.isArray(v) ? (v.length ? v.join(", ") : "ninguno") : typeof v === "boolean" ? (v ? "sí" : "no") : String(v ?? "—");

const CAMPOS_EJECUCION: [string, (e: EtapaEjecucion) => ValorParametro | null][] = [
  ["Períodos", (e) => e.periodos],
  ["Duración de cada período", (e) => `${e.duracionPeriodo} ${e.unidad}`],
  ["Subperíodos por período", (e) => e.subperiodos],
  ["Palabras de la descripción", (e) => rangoPalabras(e.registro.descripcion.min, e.registro.descripcion.max, "")],
  ["Palabras de la conclusión", (e) => rangoPalabras(e.registro.conclusion.min, e.registro.conclusion.max, "")],
  ["Imágenes por actividad", (e) => e.registro.imagenes],
  ["Registro", (e) => (opcionesRegistro(e).modo === "actividad" ? "por actividad del plan" : "por subperíodo")],
  ["Marco teórico", (e) => opcionesRegistro(e).marcoTeorico],
  ["Avance por actividad", (e) => opcionesRegistro(e).avance],
  ["Reporte de modificaciones (bitácora)", (e) => opcionesRegistro(e).modificaciones],
  ["Adelantar actividades de períodos siguientes", (e) => opcionesRegistro(e).adelantar],
  ["Evidencias por actividad", (e) => {
    if (opcionesRegistro(e).modo !== "actividad") return null;
    const { min, max } = opcionesRegistro(e).evidencias;
    return max === 0 ? "no se piden" : min > 0 ? `${min}–${max}` : `hasta ${max}`;
  }],
  ["Informe de cada período", (e) => (opcionesRegistro(e).informe === "individual_y_general" ? "individual por integrante y general" : "uno por trabajo")],
  ["Días para revisar un subperíodo", (e) => e.diasRevision],
  ["Subperíodos que se pueden adelantar", (e) => e.subperiodosAdelantables],
  ["Eliminaciones por período", (e) => e.eliminacionesPorPeriodo],
  ["Páginas mínimas del informe", (e) => e.informe.paginasMinimas],
  ["Exigir actividades aprobadas para el informe", (e) => e.informe.exigirActividadesAprobadas],
  ["Comentarios para el decanato", (e) => (e.informe.comentariosDecanato.activo ? `sí, ${e.informe.comentariosDecanato.minPalabras} palabras` : "no")],
  ["Plazo del primer contacto", (e) => (e.diasPrimerContacto === null ? "no se pide" : `${e.diasPrimerContacto} días`)],
  ["Hitos", (e) => e.hitos.map((h) => `${h.nombre} (${h.desde}–${h.hasta}${h.requisitoDeInforme ? `, informe ${h.requisitoDeInforme}` : ""})`)],
];

const CAMPOS_PLAN: [string, (p: EtapaPlan) => ValorParametro][] = [
  ["Subactividades", (p) => p.subactividades],
  ["Objetivos específicos por integrante", (p) => p.minimos.objetivosPorIntegrante],
  ["Macroactividades por objetivo", (p) => p.minimos.macroPorObjetivo],
  ["Actividades por macroactividad", (p) => p.minimos.actividadesPorMacro],
  ["Presupuesto", (p) => (p.presupuesto.activo ? `${p.presupuesto.desglose === "monto" ? "un monto" : "recursos y gastos"} en ${p.presupuesto.moneda}` : "no")],
  ["Columnas del cronograma", (p) => (p.granularidad === "subperiodo" ? "por subperíodo" : "por período")],
  ["Responsable", (p) => (p.equipo.responsable === "objetivo" ? "por objetivo específico" : "por actividad")],
  ["Plan individual por integrante", (p) => p.equipo.planIndividual],
  ["Panel de carga para el asesor", (p) => p.equipo.panelCarga],
  ["Validación del supervisor", (p) => p.aprobacion.validaSupervisor],
  ["Días de revisión del asesor", (p) => p.aprobacion.diasRevision],
  ["Documento solicitado por actividad", (p) => documentoSolicitado(p)],
  ["Productos esperados por objetivo específico", (p) => productosObjetivo(p)],
];

const CAMPOS_INFORME_FINAL: [string, (p: EtapaInformeFinal) => ValorParametro][] = [
  ["Revisión del asesor", (p) => (p.revision.porCapitulo ? "por capítulo" : "documento completo")],
  ["Ratificación del equipo", (p) => p.revision.ratificacion],
  ["Plazo de revisión", (p) => `${p.revision.diasRevision} días ${p.revision.diasHabiles ? "hábiles" : "calendario"}`],
];

const CAMPOS_PROTOCOLO: [string, (p: EtapaProtocolo) => ValorParametro][] = [
  ["Plazo del dictamen", (p) => `${p.revision.diasRevision} días ${p.revision.diasHabiles ? "hábiles" : "calendario"}`],
  ["Ratificación del equipo", (p) => p.revision.ratificacion],
];

/** Cambios en los espacios de una etapa (propuesta o protocolo). */
function compararEspacios(a: EtapaConEspacios, n: EtapaConEspacios, prefijo: string, nombreEtapa: string): string[] {
  const cambios: string[] = [];
  const porIdA = new Map(a.espacios.map((e, i) => [e.id, { e, i }]));
  const porIdN = new Map(n.espacios.map((e, i) => [e.id, { e, i }]));
  for (const { e } of porIdA.values()) if (!porIdN.has(e.id)) cambios.push(`${prefijo}Se quitó el espacio "${e.titulo}".`);
  for (const { e, i } of porIdN.values()) {
    const previo = porIdA.get(e.id);
    if (!previo) {
      cambios.push(`${prefijo}Se agregó el espacio "${e.titulo}" (${CATALOGO[e.elemento]?.nombre ?? e.elemento}) en la posición ${i + 1}.`);
      continue;
    }
    const v = previo.e;
    if (v.titulo !== e.titulo) cambios.push(`${prefijo}El espacio "${v.titulo}" ahora se llama "${e.titulo}".`);
    if (v.descripcion !== e.descripcion || v.ayuda !== e.ayuda) cambios.push(`${prefijo}"${e.titulo}": cambió la descripción o la ayuda.`);
    if (v.obligatorio !== e.obligatorio) cambios.push(`${prefijo}"${e.titulo}": ahora es ${e.obligatorio ? "obligatorio" : "opcional"}.`);
    if ((v.precargarDe ?? "") !== (e.precargarDe ?? "")) cambios.push(`${prefijo}"${e.titulo}": cambió de dónde se precarga.`);
    if (v.elemento !== e.elemento) {
      // Otro elemento (por ejemplo, un texto que pasa a apartado académico): sus reglas no se comparan una por una.
      cambios.push(`${prefijo}"${e.titulo}": pasó de ${CATALOGO[v.elemento]?.nombre ?? v.elemento} a ${CATALOGO[e.elemento]?.nombre ?? e.elemento}.`);
      continue;
    }
    for (const par of CATALOGO[e.elemento]?.parametros ?? []) {
      const va = v.parametros[par.clave];
      const vn = e.parametros[par.clave];
      if (texto(va) !== texto(vn)) cambios.push(`${prefijo}"${e.titulo}": ${par.etiqueta.toLowerCase()}, ${texto(va)} → ${texto(vn)}.`);
    }
  }
  const ordenA = a.espacios.filter((e) => porIdN.has(e.id)).map((e) => e.id).join();
  const ordenN = n.espacios.filter((e) => porIdA.has(e.id)).map((e) => e.id).join();
  if (ordenA !== ordenN) cambios.push(`Cambió el orden de los espacios de ${nombreEtapa}.`);
  return cambios;
}

export function compararDefiniciones(anterior: DefinicionFicha, nueva: DefinicionFicha): string[] {
  const cambios: string[] = [];

  if (anterior.participantes.min !== nueva.participantes.min || anterior.participantes.max !== nueva.participantes.max) {
    cambios.push(
      `Participantes: ${anterior.participantes.min}–${anterior.participantes.max} → ${nueva.participantes.min}–${nueva.participantes.max}.`
    );
  }

  if (Boolean(anterior.participantes.mismaCarrera) !== Boolean(nueva.participantes.mismaCarrera)) {
    cambios.push(nueva.participantes.mismaCarrera ? "Ahora los integrantes deben ser de la misma carrera." : "Ya no se exige que los integrantes sean de la misma carrera.");
  }

  const pa = anterior.etapas.find(esEtapaPropuesta);
  const pn = nueva.etapas.find(esEtapaPropuesta);
  if (pa && pn) cambios.push(...compararEspacios(pa, pn, "", "la propuesta"));

  const prA = anterior.etapas.find(esEtapaProtocolo);
  const prN = nueva.etapas.find(esEtapaProtocolo);
  if (prA && !prN) cambios.push("Se quitó el protocolo.");
  if (!prA && prN) cambios.push(`Se agregó el protocolo, con ${prN.espacios.length} espacios.`);
  if (prA && prN) {
    cambios.push(...compararEspacios(prA, prN, "Protocolo: ", "el protocolo"));
    for (const [etiqueta, leer] of CAMPOS_PROTOCOLO) {
      const va = texto(leer(prA));
      const vn = texto(leer(prN));
      if (va !== vn) cambios.push(`Protocolo: ${etiqueta.toLowerCase()}, ${va} → ${vn}.`);
    }
  }

  const ifA = anterior.etapas.find(esEtapaInformeFinal);
  const ifN = nueva.etapas.find(esEtapaInformeFinal);
  if (ifA && !ifN) cambios.push("Se quitó el informe final.");
  if (!ifA && ifN) cambios.push(`Se agregó el informe final, con ${ifN.espacios.length} capítulos.`);
  if (ifA && ifN) {
    cambios.push(...compararEspacios(ifA, ifN, "Informe final: ", "el informe final"));
    for (const [etiqueta, leer] of CAMPOS_INFORME_FINAL) {
      const va = texto(leer(ifA));
      const vn = texto(leer(ifN));
      if (va !== vn) cambios.push(`Informe final: ${etiqueta.toLowerCase()}, ${va} → ${vn}.`);
    }
  }

  const plA = anterior.etapas.find(esEtapaPlan);
  const plN = nueva.etapas.find(esEtapaPlan);
  if (plA && !plN) cambios.push("Se quitó el plan de trabajo.");
  if (!plA && plN) cambios.push("Se agregó el plan de trabajo.");
  if (plA && plN) {
    for (const [etiqueta, leer] of CAMPOS_PLAN) {
      const va = texto(leer(plA));
      const vn = texto(leer(plN));
      if (va !== vn) cambios.push(`Plan de trabajo: ${etiqueta.toLowerCase()}, ${va} → ${vn}.`);
    }
  }

  const ea = anterior.etapas.filter(esEtapaEjecucion);
  const en = nueva.etapas.filter(esEtapaEjecucion);
  const idsA = new Map(ea.map((e) => [e.id, e]));
  for (const e of ea) if (!en.some((x) => x.id === e.id)) cambios.push(`Se quitó la etapa "${e.nombre}".`);
  for (const e of en) {
    const a = idsA.get(e.id);
    if (!a) {
      cambios.push(`Se agregó la etapa "${e.nombre}".`);
      continue;
    }
    if (a.nombre !== e.nombre) cambios.push(`La etapa "${a.nombre}" ahora se llama "${e.nombre}".`);
    for (const [etiqueta, leer] of CAMPOS_EJECUCION) {
      const va = texto(leer(a));
      const vn = texto(leer(e));
      if (va !== vn) cambios.push(`${e.nombre}: ${etiqueta.toLowerCase()}, ${va} → ${vn}.`);
    }
  }

  return cambios;
}
