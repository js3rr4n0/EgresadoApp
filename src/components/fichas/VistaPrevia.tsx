"use client";

import { useState } from "react";
import { ACTORES, CATALOGO, DOCUMENTOS_ESTUDIANTE } from "@/lib/fichas/catalogo";
import { CAMPOS_ELEMENTO } from "@/lib/fichas/disenoFuturo";
import { reglasRecurso } from "@/lib/fichas/elementosRecurso";
import { diasSubperiodos, esEtapaEjecucion, esEtapaPlan, esEtapaPropuesta, opcionesRegistro, type DefinicionFicha, type Espacio, type EtapaEjecucion } from "@/lib/fichas/tipos";

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
      return [`Un objetivo general y de ${p.minEspecificos} a ${p.maxEspecificos} objetivos específicos.`];
    case "documentos":
      return [`${CATALOGO.documentos.alcance === "integrante" && equipo ? "Cada integrante sube" : "Se sube"}: ${etiqueta(DOCUMENTOS_ESTUDIANTE, p.documentos) || "ningún documento"}.`];
    case "imagen":
    case "archivo":
    case "enlace":
    case "lista":
      return reglasRecurso({ ...e, elemento: e.elemento });
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
export function PasosEgresado({ definicion }: { definicion: DefinicionFicha }) {
  const propuesta = definicion.etapas.find(esEtapaPropuesta);
  const equipo = definicion.participantes.max > 1;
  const [paso, setPaso] = useState(0);
  const espacio = propuesta?.espacios[paso];

  return (
    <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <header className="px-5 py-3 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-bold text-gray-800">Propuesta</h2>
          <p className="text-xs text-gray-500">Los pasos se habilitan en orden: cada uno se desbloquea al completar el anterior.</p>
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
                {reglas(espacio, equipo).map((r, i) => <li key={i}>{r}</li>)}
                {!espacio.obligatorio && <li>Este paso es opcional.</li>}
              </ul>
              <div className="grid sm:grid-cols-2 gap-2">
                {CAMPOS_ELEMENTO[espacio.elemento].map((c) => (
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
          ) : <p className="text-sm text-gray-500">La propuesta no tiene espacios.</p>}
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

  const frasesPlan = plan
    ? [
        "Se elabora después de aprobada la propuesta, a partir de sus objetivos: objetivo general → objetivos específicos → macroactividades → actividades.",
        plan.subactividades === "no" ? "No se usan subactividades." : plan.subactividades === "opcional" ? "Las subactividades son opcionales." : "Cada actividad se divide en subactividades.",
        `${equipo ? "Cada integrante desarrolla" : "Desarrollas"} al menos ${plan.minimos.objetivosPorIntegrante} objetivos específicos, con al menos ${plan.minimos.macroPorObjetivo} macroactividad(es) por objetivo y ${plan.minimos.actividadesPorMacro} actividad(es) por macroactividad.`,
        ...(plan.presupuesto.activo
          ? [`El cronograma es también el presupuesto: cada actividad lleva ${plan.presupuesto.desglose === "monto" ? "su monto" : "sus recursos y gastos"} (${plan.presupuesto.moneda}) en ${plan.granularidad === "subperiodo" ? "los subperíodos" : "los períodos"} en que se ejecuta, y el sistema suma cada nivel.`]
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
