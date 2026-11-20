"use client";

import { useState } from "react";
import { ACTORES, CATALOGO, DOCUMENTOS_ESTUDIANTE } from "@/lib/fichas/catalogo";
import { CAMPOS_ELEMENTO, type CampoElemento } from "@/lib/fichas/disenoFuturo";
import { reglasRecurso } from "@/lib/fichas/elementosRecurso";
import { reglasCampo, type TipoCampo } from "@/lib/fichas/elementosPropios";
import { tipoApartado } from "@/lib/fichas/apartadosAcademicos";
import { reglasRecursos } from "@/lib/fichas/recursos";
import { cierreDe, componentesDe, esCronogramaInvestigacion, PRECARGA_CONCLUSIONES_OBJETIVOS, PRECARGA_MARCO_REGISTROS, diasSubperiodos, esEtapaEjecucion, esEtapaPlan, esEtapaPropuesta, opcionesRegistro, type DefinicionFicha, type Espacio, type EtapaConEspacios, type EtapaEjecucion } from "@/lib/fichas/tipos";

/** Campos que dibuja la vista del egresado: los del elemento o, en un elemento propio, los de su copia (C2). */
const TIPO_VISTA: Record<TipoCampo, CampoElemento["tipo"]> = {
  texto: "texto", texto_largo: "texto largo", numero: "texto", fecha: "fecha", seleccion: "selección",
  lista: "lista", archivo: "archivo", imagen: "imagen", enlace: "texto",
};
function camposDelPaso(e: Espacio): CampoElemento[] {
  if (e.propio) return e.propio.definicion.campos.map((c) => ({ nombre: c.etiqueta, tipo: TIPO_VISTA[c.tipo], obligatorio: c.obligatorio }));
  // Campos adicionales (C4): al final de los del sistema.
  return [...CAMPOS_ELEMENTO[e.elemento], ...(e.camposExtra ?? []).map((c) => ({ nombre: c.etiqueta, tipo: TIPO_VISTA[c.tipo], obligatorio: c.obligatorio }))];
}

/** Reglas de un espacio en frases cortas, como las leería el egresado. */
function reglas(e: Espacio, equipo: boolean): string[] {
  const p = e.parametros as Record<string, unknown>;
  const etiqueta = (lista: { valor: string; etiqueta: string }[], v: unknown) =>
    (Array.isArray(v) ? v : []).map((x) => lista.find((o) => o.valor === x)?.etiqueta ?? x).join(", ");
  switch (e.elemento) {
    case "portada":
      return equipo ? ["Título del trabajo e invitación de integrantes."] : ["Título del trabajo."];
    case "empresa":
      return [p.aprobarEmpresaNueva ? "Si la empresa no está en el catálogo, se solicita su registro y queda en revisión." : "Puede registrar una empresa nueva sin aprobación."];
    case "supervisor":
      return [p.revisarSupervisorNuevo ? "Un supervisor nuevo queda en revisión administrativa." : "Puede registrar un supervisor nuevo sin revisión."];
    case "carta":
      return [`El inicio debe ser al menos ${p.diasAnticipacion} días después de la emisión.`, `El fin se calcula a ${p.duracionDias} días del inicio.`];
    case "cronograma":
      return [
        `Al menos ${p.minActividadesPeriodo} actividades por período y ${p.minActividadesSubperiodo} por subperíodo.`,
        ...(p.responsablePorActividad ? ["Cada actividad tiene un integrante responsable."] : []),
      ];
    case "texto": {
      const min = Number(p.minPalabras) || 0;
      const max = Number(p.maxPalabras) || 0;
      return [min && max ? `Entre ${min} y ${max} palabras.` : min ? `Al menos ${min} palabras.` : max ? `Hasta ${max} palabras.` : "Texto libre, sin límite de palabras."];
    }
    case "actores":
      return [`Se piden: ${etiqueta(ACTORES, p.actores)}.`];
    case "objetivos":
      return [`Un objetivo general y de ${p.minEspecificos} a ${p.maxEspecificos} objetivos específicos por integrante (en equipo, por la cantidad de integrantes).`];
    case "documentos":
      return [`${CATALOGO.documentos.alcance === "integrante" && equipo ? "Cada integrante sube" : "Se sube"}: ${etiqueta(DOCUMENTOS_ESTUDIANTE, p.documentos) || "ningún documento"}.`];
    case "imagen":
    case "archivo":
    case "enlace":
    case "lista":
    case "tabla":
      return reglasRecurso({ ...e, elemento: e.elemento });
    case "apartado": {
      const tipo = tipoApartado(e);
      if (!tipo) return ["Tipo de apartado desconocido."];
      return [
        `${tipo.nombre}: se redacta por subapartados (${tipo.partes.map((x) => x.titulo).join(" · ")}).`,
        ...(tipo.citasMinimas ? [`Al menos ${tipo.citasMinimas} citas en formato APA 7.`] : []),
        "Con guía, autoevaluación y revisión de redacción (tercera persona, tiempo verbal, oraciones largas).",
      ];
    }
    case "recursos_presupuesto": {
      const r = reglasRecursos(e);
      return [
        `Recursos por categoría: ${r.categorias.length} de 6.`,
        r.conCostos ? `Con cantidad y costo unitario en ${r.moneda}; el presupuesto se calcula solo.` : "Solo la lista de recursos, sin costos.",
        r.minimo ? `Al menos ${r.minimo} recurso(s).` : "Sin mínimo de recursos.",
      ];
    }
    case "reporte_modificaciones":
      return ["Lo genera el sistema con la bitácora de la ejecución: va sin número, como anexo, y no se revisa aparte."];
    case "propio":
      return e.propio
        ? [
            ...(e.propio.definicion.alcance === "integrante" && equipo ? ["Cada integrante responde por separado."] : []),
            ...e.propio.definicion.campos.map((c) => `${c.etiqueta}: ${reglasCampo(c)}.`),
          ]
        : ["Falta la copia del elemento propio."];
    case "resultados_objetivos":
      return [
        "Lo genera el sistema: no se redacta ni se revisa aparte.",
        "Por objetivo: productos entregados y, por macroactividad, cada actividad con sus fechas, su resultado y sus evidencias (como anexos).",
        "Con el cronograma de investigación: por objetivo, la metodología utilizada, el desarrollo realizado, los resultados obtenidos, las conclusiones preliminares y la discusión.",
      ];
  }
}

function fechaLocal(iso: string) {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(a, m - 1, d);
}
const sumarDias = (f: Date, n: number) => new Date(f.getFullYear(), f.getMonth(), f.getDate() + n);
const sumarMeses = (f: Date, n: number) => new Date(f.getFullYear(), f.getMonth() + n, f.getDate());
const corta = (f: Date) => f.toLocaleDateString("es-SV", { day: "numeric", month: "short" });
const larga = (f: Date) => f.toLocaleDateString("es-SV", { day: "numeric", month: "short", year: "numeric" });
const aISO = (f: Date) => `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}-${String(f.getDate()).padStart(2, "0")}`;

/** Fechas de cada etapa de ejecución: la primera desde la carta, las siguientes al terminar la anterior. */
function calcularCalendario(ejecuciones: EtapaEjecucion[], inicio: string) {
  let cursor = inicio ? fechaLocal(inicio) : null;
  return ejecuciones.map((et) => {
    const desde = cursor;
    const periodos = Array.from({ length: Math.max(0, Math.min(et.periodos, 36)) }, (_, i) => {
      if (!desde) return null;
      const ini = et.unidad === "dias" ? sumarDias(desde, i * et.duracionPeriodo) : sumarMeses(desde, i * et.duracionPeriodo);
      const fin = et.unidad === "dias" ? sumarDias(ini, et.duracionPeriodo - 1) : sumarDias(sumarMeses(ini, et.duracionPeriodo), -1);
      return { ini, fin };
    });
    const ultimo = periodos[periodos.length - 1];
    cursor = ultimo ? sumarDias(ultimo.fin, 1) : cursor;
    const subs = et.unidad === "dias" && et.subperiodos > 0 && et.duracionPeriodo >= et.subperiodos ? diasSubperiodos(et.duracionPeriodo, et.subperiodos) : null;
    return { et, periodos, subs, desde };
  });
}

/** Propuesta paso a paso, como la ve el egresado. */
export function PasosEgresado({ definicion, etapa }: { definicion: DefinicionFicha; etapa?: EtapaConEspacios }) {
  const origen = definicion.etapas.find(esEtapaPropuesta);
  const propuesta = etapa ?? origen;
  const esProtocolo = propuesta?.tipo === "protocolo";
  const esInformeFinal = propuesta?.tipo === "informe_final";
  const equipo = definicion.participantes.max > 1;
  const [paso, setPaso] = useState(0);
  const espacio = propuesta?.espacios[paso];
  const fuentesPrecarga = definicion.etapas.flatMap((e) => (e.tipo === "propuesta" || e.tipo === "protocolo" ? e.espacios : []));
  const precarga = espacio?.precargarDe === PRECARGA_MARCO_REGISTROS
    ? { titulo: "marco teórico de las actividades" }
    : espacio?.precargarDe === PRECARGA_CONCLUSIONES_OBJETIVOS
    ? { titulo: "conclusiones aprobadas de los objetivos" }
    : espacio?.precargarDe ? fuentesPrecarga.find((e) => e.id === espacio.precargarDe) : undefined;

  return (
    <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <header className="px-5 py-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-bold text-gray-800">{esProtocolo || esInformeFinal ? propuesta.nombre : "Propuesta"}</h2>
          <p className="text-xs text-gray-500">
            {esInformeFinal
              ? "Lo redacta todo el equipo por capítulos, durante y al final de la ejecución. La portada, las autoridades, el índice y los anexos de resultados se generan."
              : esProtocolo
              ? "Después de la propuesta aprobada. La portada y el índice se generan, y el cronograma de actividades es el plan de trabajo."
              : "Los pasos se habilitan en orden: cada uno se desbloquea al completar el anterior."}
          </p>
        </div>
        <span className="text-xs font-bold text-gray-500">Paso {paso + 1} de {propuesta?.espacios.length ?? 0}</span>
      </header>
      <div className="grid md:grid-cols-[16rem_minmax(0,1fr)]">
        <ol className="border-b md:border-b-0 md:border-r border-gray-100 p-3 space-y-1">
          {propuesta?.espacios.map((e, i) => (
            <li key={e.id}>
              <button type="button" onClick={() => setPaso(i)}
                className={`w-full text-left flex gap-3 items-start rounded-lg px-2 py-2 ${paso === i ? "bg-red-50" : "hover:bg-gray-50"}`}>
                <span className={`w-6 h-6 shrink-0 rounded-full text-xs font-bold flex items-center justify-center ${paso === i ? "bg-brand-red text-white" : i < paso ? "bg-emerald-500 text-white" : "bg-gray-200 text-gray-600"}`}>
                  {i < paso ? "✓" : i + 1}
                </span>
                <span className="min-w-0">
                  <span className={`block text-sm font-bold ${paso === i ? "text-brand-red" : "text-gray-700"}`}>{e.titulo || "(sin título)"}</span>
                  {e.descripcion && <span className="block text-xs text-gray-500">{e.descripcion}</span>}
                </span>
              </button>
            </li>
          ))}
        </ol>
        <div className="p-5 min-w-0">
          {espacio ? (
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-gray-800">{paso + 1}. {espacio.titulo}</h3>
              {espacio.ayuda ? <p className="text-sm text-gray-600 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">{espacio.ayuda}</p>
                : <p className="text-xs text-gray-400">Sin texto de ayuda.</p>}
              <ul className="text-sm text-gray-700 list-disc pl-5 space-y-1">
                {[...reglas(espacio, equipo), ...(espacio.camposExtra ?? []).map((c) => `Campo adicional «${c.etiqueta}»: ${reglasCampo(c)}.`)].map((r, i) => <li key={i}>{r}</li>)}
                {precarga && <li>Empieza con lo que ya escribieron en «{precarga.titulo}»; pueden ajustarlo.</li>}
                {!espacio.obligatorio && <li>Este paso es opcional.</li>}
              </ul>
              <div className="grid sm:grid-cols-2 gap-2">
                {camposDelPaso(espacio).map((c) => (
                  <div key={c.nombre} className={c.tipo === "texto largo" || c.tipo === "mapa" || c.tipo === "lista" ? "sm:col-span-2" : ""}>
                    <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">{c.nombre}{c.obligatorio && <span className="text-brand-red"> *</span>}</div>
                    <div className={`border border-gray-200 bg-gray-50 rounded-md text-xs text-gray-400 px-2.5 flex items-center ${c.tipo === "texto largo" ? "h-16" : c.tipo === "mapa" ? "h-20 justify-center" : "h-9"}`}>
                      {c.tipo === "archivo" || c.tipo === "imagen" ? "Seleccionar archivo…" : c.tipo === "mapa" ? "Mapa de ubicación" : c.tipo === "fecha" ? "dd/mm/aaaa" : ""}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between pt-1">
                <button type="button" disabled={paso === 0} onClick={() => setPaso(paso - 1)} className="text-sm font-bold text-gray-600 disabled:opacity-40">← Anterior</button>
                <button type="button" disabled={paso >= (propuesta?.espacios.length ?? 1) - 1} onClick={() => setPaso(paso + 1)}
                  className="bg-brand-red text-white text-sm font-bold rounded-lg px-4 py-2 disabled:opacity-40">Guardar y continuar</button>
              </div>
            </div>
          ) : <p className="text-sm text-gray-500">{esInformeFinal ? "El informe final" : esProtocolo ? "El protocolo" : "La propuesta"} no tiene espacios.</p>}
        </div>
      </div>
    </section>
  );
}

/** Fechas calculadas de todas las etapas de ejecución a partir de una fecha de inicio de ejemplo. */
export function CalendarioEjecucion({ ejecuciones }: { ejecuciones: EtapaEjecucion[] }) {
  const [inicio, setInicio] = useState(() => aISO(sumarDias(new Date(), 21)));
  const calendario = calcularCalendario(ejecuciones, inicio);
  if (calendario.length === 0) return null;

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-bold text-gray-800">Calendario de ejecución</h2>
          <p className="text-xs text-gray-500">Fechas de ejemplo calculadas con la fecha de inicio de la carta.</p>
        </div>
        <div>
          <label htmlFor="vp-inicio" className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">Inicio según la carta</label>
          <input id="vp-inicio" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} className="border border-gray-300 rounded-md px-2.5 h-9 text-sm" />
        </div>
      </div>

      {calendario.map(({ et, periodos, subs, desde }) => {
        const durante = et.hitos.filter((h) => (h.momento ?? "durante") === "durante");
        const antes = et.hitos.filter((h) => h.momento === "antes");
        return (
          <div key={et.id} className="space-y-2">
            <h3 className="text-sm font-bold text-gray-700">
              {et.nombre}{desde && periodos.length > 0 && periodos[periodos.length - 1] && ` · ${larga(desde)} al ${larga(periodos[periodos.length - 1]!.fin)}`}
            </h3>
            {antes.length > 0 && <p className="text-xs text-gray-600">Antes de iniciar: {antes.map((h) => h.nombre).join(" · ")}.</p>}
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[32rem]">
                <thead className="text-[11px] text-gray-500 uppercase">
                  <tr><th className="text-left py-1.5 pr-3">Período</th><th className="text-left py-1.5 pr-3">Fechas</th><th className="text-left py-1.5 pr-3">Subperíodos</th><th className="text-left py-1.5">Informe</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {periodos.map((p, i) => {
                    if (!p) return null;
                    let acumulado = 0;
                    const rangos = subs?.map((d) => { const a = sumarDias(p.ini, acumulado); acumulado += d; return `${corta(a)}–${corta(sumarDias(a, d - 1))}`; });
                    const requisitos = durante.filter((h) => h.requisitoDeInforme === i + 1);
                    return (
                      <tr key={i}>
                        <td className="py-2 pr-3 font-bold text-gray-700">{i + 1}</td>
                        <td className="py-2 pr-3 text-gray-700 whitespace-nowrap">{corta(p.ini)} – {corta(p.fin)}</td>
                        <td className="py-2 pr-3 text-xs text-gray-500">{rangos ? rangos.join(" · ") : `${et.subperiodos} subperíodos`}</td>
                        <td className="py-2 text-gray-700 whitespace-nowrap">
                          Entrega el {corta(p.fin)}
                          {requisitos.map((h) => <span key={h.id} className="block text-xs text-amber-700">Requiere: {h.nombre}</span>)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {desde && (durante.length > 0 || et.diasPrimerContacto !== null) && (
              <ul className="text-xs text-gray-600 space-y-0.5">
                {et.diasPrimerContacto !== null && <li>• Primer contacto con el asesor: plazo de {et.diasPrimerContacto} días desde que el asesor crea el informe.</li>}
                {durante.map((h) => (
                  <li key={h.id}>
                    • {h.nombre}: {et.unidad === "dias"
                      // Mismo conteo que el seguimiento actual: el día N cae N días después del inicio (días 90–100).
                      ? `del ${larga(sumarDias(desde, h.desde))} al ${larga(sumarDias(desde, h.hasta))} (días ${h.desde} a ${h.hasta})`
                      : `meses ${h.desde} a ${h.hasta}`}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </section>
  );
}

/** Plan de trabajo y forma de trabajar en la ejecución, en frases, como los verá el egresado. */
export function PlanEgresado({ definicion }: { definicion: DefinicionFicha }) {
  const plan = definicion.etapas.find(esEtapaPlan);
  const ejecucion = definicion.etapas.find(esEtapaEjecucion);
  const equipo = definicion.participantes.max > 1;
  if (!plan && !ejecucion) return null;

  const investigacion = plan ? esCronogramaInvestigacion(plan) : false;
  const frasesPlan = plan
    ? [
        ...(investigacion
          ? [
              `Cronograma de investigación: se elabora a partir de los objetivos y cada objetivo específico se organiza por su proceso metodológico (${componentesDe(plan).map((c) => `${c.nombre}${c.obligatorio ? "" : ", opcional"}`).join(" · ")}). Cada elemento puede tener subactividades.`,
              `${equipo ? "Cada integrante desarrolla" : "Desarrollas"} al menos ${plan.minimos.objetivosPorIntegrante} objetivos específicos.`,
              ...(plan.metodologiaObjetivo ? ["La metodología de cada objetivo se describe en el plan, respaldada con referencias del registro de fuentes; si es una metodología propia, se fundamenta en métodos o investigaciones anteriores. El asesor la revisa con el plan."] : []),
              ...(cierreDe(plan).activo ? [`El cronograma termina con «${cierreDe(plan).titulo}».`] : []),
              "Los productos y documentos no van en el cronograma: las evidencias se suben en los registros de la ejecución.",
            ]
          : [
              "Se elabora después de aprobada la propuesta, a partir de sus objetivos: objetivo general → objetivos específicos → macroactividades → actividades.",
              plan.subactividades === "no" ? "No se usan subactividades." : plan.subactividades === "opcional" ? "Las subactividades son opcionales." : "Cada actividad se divide en subactividades.",
              `${equipo ? "Cada integrante desarrolla" : "Desarrollas"} al menos ${plan.minimos.objetivosPorIntegrante} objetivos específicos, con al menos ${plan.minimos.macroPorObjetivo} macroactividad(es) por objetivo y ${plan.minimos.actividadesPorMacro} actividad(es) por macroactividad.`,
            ]),
        ...(plan.presupuesto.activo
          ? [`El cronograma es también el presupuesto: cada ${investigacion ? "elemento o subactividad" : "actividad"} lleva ${plan.presupuesto.desglose === "monto" ? "su monto" : "sus recursos y gastos"} (${plan.presupuesto.moneda}) en ${plan.granularidad === "subperiodo" ? "los subperíodos" : "los períodos"} en que se ejecuta, y el sistema suma cada nivel.`]
          : []),
        ...(equipo
          ? [
              plan.equipo.responsable === "objetivo" ? "Cada objetivo específico tiene un integrante responsable." : "Cada actividad tiene un integrante responsable.",
              ...(plan.equipo.planIndividual ? ["Hay un plan general del proyecto y uno individual por integrante."] : []),
              "El asesor revisa que la cantidad de trabajo sea equitativa al aprobar el plan.",
            ]
          : []),
        `Lo aprueba el asesor (revisión de ${plan.aprobacion.diasRevision} días)${plan.aprobacion.validaSupervisor ? "; el supervisor de la institución lo valida y queda documentado en el informe de primer contacto" : ""}.`,
      ]
    : [];

  const op = ejecucion ? opcionesRegistro(ejecucion) : null;
  const frasesEjecucion = ejecucion && op
    ? [
        `${ejecucion.periodos} informes, uno cada ${ejecucion.duracionPeriodo} ${ejecucion.unidad === "dias" ? "días" : "meses"}.`,
        op.modo === "actividad"
          ? `${equipo ? "Cada integrante registra las actividades de su plan individual" : "Registras cada actividad de tu plan"}${op.avance ? ", con su porcentaje de avance y sus resultados" : ""}.`
          : "Registras tus actividades en cada subperíodo.",
        op.marcoTeorico === "obligatorio" ? "Cada registro lleva marco teórico con su cita." : op.marcoTeorico === "opcional" ? "El marco teórico es opcional: úsalo si hace falta contextualizar una actividad." : "No se pide marco teórico.",
        ejecucion.informe.paginasMinimas > 0 ? `El informe del período pide al menos ${ejecucion.informe.paginasMinimas} páginas.` : "El informe del período no tiene mínimo de páginas.",
        ...(op.informe === "individual_y_general" && equipo ? ["Cada integrante redacta su informe individual y con ellos se arma el informe general del período."] : []),
      ]
    : [];

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-5 grid md:grid-cols-2 gap-5">
      {plan && (
        <div>
          <h2 className="font-bold text-gray-800 mb-2">{plan.nombre}</h2>
          <ul className="text-sm text-gray-700 list-disc pl-5 space-y-1">{frasesPlan.map((f, i) => <li key={i}>{f}</li>)}</ul>
        </div>
      )}
      {ejecucion && (
        <div>
          <h2 className="font-bold text-gray-800 mb-2">{ejecucion.nombre}</h2>
          <ul className="text-sm text-gray-700 list-disc pl-5 space-y-1">{frasesEjecucion.map((f, i) => <li key={i}>{f}</li>)}</ul>
        </div>
      )}
    </section>
  );
}
