"use client";

import { useState } from "react";
import { esEtapaEjecucion, esEtapaPlan, esEtapaPropuesta, NIVELES_PLAN, type DefinicionFicha, type EtapaPlan } from "@/lib/fichas/tipos";
import type { ProblemaFicha } from "@/lib/fichas/validar";
import { planNuevo } from "@/lib/fichas/plantillas";
import { aplanar, cargaPorIntegrante, planEjemplo, planIndividual, totalesNodo } from "@/lib/fichas/planTrabajo";
import { campoCompacto, etiquetaCompacta, Interruptor, Tarjeta } from "./EditorPropuesta";
import { nuevoId } from "./ids";

function Numero({ id, etiqueta, valor, onChange, editable, min = 1, max = 20, sufijo }: {
  id: string; etiqueta: string; valor: number; onChange: (n: number) => void; editable: boolean; min?: number; max?: number; sufijo?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className={etiquetaCompacta}>{etiqueta}</label>
      <div className="flex items-center gap-1.5">
        <input id={id} type="number" min={min} max={max} className={`${campoCompacto} w-[4.5rem]`} disabled={!editable} value={valor} onChange={(e) => onChange(Number(e.target.value))} />
        {sufijo && <span className="text-xs text-gray-500">{sufijo}</span>}
      </div>
    </div>
  );
}

function Opciones<T extends string>({ id, valor, opciones, onChange, editable }: {
  id: string; valor: T; opciones: { valor: T; texto: string }[]; onChange: (v: T) => void; editable: boolean;
}) {
  return (
    <div role="radiogroup" aria-labelledby={id} className="inline-flex flex-wrap gap-1">
      {opciones.map((o) => (
        <button key={o.valor} type="button" role="radio" aria-checked={valor === o.valor} disabled={!editable} onClick={() => onChange(o.valor)}
          className={`text-xs font-bold px-2.5 py-1.5 rounded-md border transition-colors disabled:cursor-not-allowed ${valor === o.valor ? "bg-red-50 border-brand-red text-brand-red" : "bg-white border-gray-200 text-gray-600 hover:border-gray-400"}`}>
          {o.texto}
        </button>
      ))}
    </div>
  );
}

function Fila({ texto, ayuda, children }: { texto: string; ayuda?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm text-gray-700">
      <span>
        {texto}
        {ayuda && <span className="block text-[11px] text-gray-500">{ayuda}</span>}
      </span>
      <span className="shrink-0">{children}</span>
    </div>
  );
}

export default function EditorPlan({
  definicion,
  editable,
  problemas,
  onChange,
}: {
  definicion: DefinicionFicha;
  editable: boolean;
  problemas: ProblemaFicha[];
  onChange: (d: DefinicionFicha) => void;
}) {
  const plan = definicion.etapas.find(esEtapaPlan);
  const equipo = definicion.participantes.max > 1;

  if (definicion.modalidad === "pasantia") {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-5 text-sm text-gray-600">
        En la pasantía el plan de trabajo es el <strong>cronograma de actividades</strong> que va dentro de la propuesta (pestaña Propuesta).
        El plan de trabajo jerárquico, con presupuesto, es para proyecto e investigación.
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-3">
        <h2 className="font-bold text-gray-800">Esta ficha no tiene plan de trabajo</h2>
        <p className="text-sm text-gray-600 max-w-2xl">
          En proyecto, después de aprobar la propuesta se elabora el plan de trabajo: un cronograma con consecuencia lógica
          (objetivo general → objetivos específicos → macroactividades → actividades) que es también la tabla de presupuesto.
          En equipo hay un plan general y uno individual por integrante, y el asesor revisa que el reparto sea equitativo.
        </p>
        {editable && (
          <button type="button" onClick={() => {
            const [propuesta, ...resto] = definicion.etapas;
            onChange({ ...definicion, etapas: [propuesta, planNuevo(nuevoId("plan")), ...resto] });
          }} className="px-3.5 py-2 rounded-lg text-sm font-bold bg-brand-red hover:bg-red-800 text-white">
            + Agregar plan de trabajo
          </button>
        )}
      </div>
    );
  }

  const set = (cambios: Partial<EtapaPlan>) =>
    onChange({ ...definicion, etapas: definicion.etapas.map((e) => (esEtapaPlan(e) ? { ...e, ...cambios } : e)) });
  const propios = problemas.filter((p) => p.ubicacion === plan.id);
  const objetivos = definicion.etapas.find(esEtapaPropuesta)?.espacios.find((e) => e.elemento === "objetivos");
  const maxPropuesta = objetivos ? Number(objetivos.parametros.maxEspecificos) : null;
  const necesarios = plan.minimos.objetivosPorIntegrante * definicion.participantes.max;

  return (
    <div className="space-y-4">
      <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <header className="px-4 py-2.5 border-b border-gray-100 bg-gray-50 flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xs font-bold text-white bg-sky-600 rounded-md px-2 py-1 shrink-0">Después de la propuesta</span>
            <label htmlFor="plan-nombre" className="sr-only">Nombre de la etapa</label>
            <input id="plan-nombre" className={`${campoCompacto} font-bold w-64 max-w-full`} disabled={!editable} value={plan.nombre} onChange={(e) => set({ nombre: e.target.value })} />
          </div>
          {editable && (
            <button type="button" className="text-xs font-bold text-gray-400 hover:text-red-700"
              onClick={() => { if (window.confirm("¿Quitar el plan de trabajo?")) onChange({ ...definicion, etapas: definicion.etapas.filter((e) => !esEtapaPlan(e)) }); }}>
              Quitar plan
            </button>
          )}
        </header>

        <div className="p-4 space-y-4">
          {propios.length > 0 && (
            <ul className="text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg px-3 py-2 space-y-1">
              {propios.map((p, i) => <li key={i}>{p.mensaje}</li>)}
            </ul>
          )}

          <div className="grid lg:grid-cols-2 gap-3">
            <Tarjeta titulo="Estructura">
              <ol className="space-y-1 mb-3">
                {NIVELES_PLAN.map((n) => (
                  <li key={n.nivel} className="flex items-center gap-2 text-sm">
                    <span className="font-mono text-[11px] text-gray-400 w-20 shrink-0">{n.codigo}</span>
                    <span style={{ paddingLeft: `${(n.nivel - 1) * 0.75}rem` }} className={n.nivel === 5 && plan.subactividades === "no" ? "text-gray-300 line-through" : "text-gray-800"}>{n.nombre}</span>
                    {n.nivel === 5 && plan.subactividades === "opcional" && <span className="text-[11px] text-gray-500">(opcional)</span>}
                  </li>
                ))}
              </ol>
              <div className="space-y-3">
                <div>
                  <span id="plan-sub" className={etiquetaCompacta}>Subactividades</span>
                  <Opciones id="plan-sub" valor={plan.subactividades} editable={editable} onChange={(v) => set({ subactividades: v })}
                    opciones={[{ valor: "no", texto: "No se usan" }, { valor: "opcional", texto: "Opcionales" }, { valor: "obligatorio", texto: "Obligatorias" }]} />
                </div>
                <div className="flex flex-wrap gap-3">
                  <Numero id="plan-obj" etiqueta={equipo ? "Objetivos por integrante" : "Objetivos específicos"} valor={plan.minimos.objetivosPorIntegrante} max={10} editable={editable}
                    onChange={(v) => set({ minimos: { ...plan.minimos, objetivosPorIntegrante: v } })} sufijo="mín." />
                  <Numero id="plan-mac" etiqueta="Macro por objetivo" valor={plan.minimos.macroPorObjetivo} max={10} editable={editable}
                    onChange={(v) => set({ minimos: { ...plan.minimos, macroPorObjetivo: v } })} sufijo="mín." />
                  <Numero id="plan-act" etiqueta="Actividades por macro" valor={plan.minimos.actividadesPorMacro} max={20} editable={editable}
                    onChange={(v) => set({ minimos: { ...plan.minimos, actividadesPorMacro: v } })} sufijo="mín." />
                </div>
                {equipo && maxPropuesta !== null && necesarios > maxPropuesta && (
                  <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-1.5">
                    Con {definicion.participantes.max} integrantes el plan pide al menos {necesarios} objetivos específicos, pero la propuesta permite hasta {maxPropuesta}.
                    Pregunta pendiente: ¿el mínimo depende del equipo o el plan puede agregar objetivos? (FICHA_PROYECTO.md §7)
                  </p>
                )}
              </div>
            </Tarjeta>

            <Tarjeta titulo="Presupuesto" extra={<Interruptor etiqueta="El cronograma lleva presupuesto" activo={plan.presupuesto.activo} deshabilitado={!editable} onChange={(v) => set({ presupuesto: { ...plan.presupuesto, activo: v } })} />}>
              {plan.presupuesto.activo ? (
                <div className="space-y-3">
                  <p className="text-[11px] text-gray-500">
                    Cada actividad lleva su monto en las columnas en que se ejecuta. Cada nivel suma los de sus hijos, por columna, hasta el objetivo general.
                  </p>
                  <div>
                    <span id="plan-des" className={etiquetaCompacta}>Se registra</span>
                    <Opciones id="plan-des" valor={plan.presupuesto.desglose} editable={editable} onChange={(v) => set({ presupuesto: { ...plan.presupuesto, desglose: v } })}
                      opciones={[{ valor: "monto", texto: "Un monto" }, { valor: "recursos_gastos", texto: "Recursos y gastos" }]} />
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <div>
                      <label htmlFor="plan-mon" className={etiquetaCompacta}>Moneda</label>
                      <input id="plan-mon" className={`${campoCompacto} w-20`} maxLength={5} disabled={!editable} value={plan.presupuesto.moneda}
                        onChange={(e) => set({ presupuesto: { ...plan.presupuesto, moneda: e.target.value.toUpperCase() } })} />
                    </div>
                    <div>
                      <span id="plan-gra" className={etiquetaCompacta}>Columnas</span>
                      <Opciones id="plan-gra" valor={plan.granularidad} editable={editable} onChange={(v) => set({ granularidad: v })}
                        opciones={[{ valor: "subperiodo", texto: "Por subperíodo" }, { valor: "periodo", texto: "Por período" }]} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500">El cronograma no lleva montos.</p>
                  <div>
                    <span id="plan-gra2" className={etiquetaCompacta}>Columnas</span>
                    <Opciones id="plan-gra2" valor={plan.granularidad} editable={editable} onChange={(v) => set({ granularidad: v })}
                      opciones={[{ valor: "subperiodo", texto: "Por subperíodo" }, { valor: "periodo", texto: "Por período" }]} />
                  </div>
                </div>
              )}
            </Tarjeta>

            <Tarjeta titulo="Trabajo en equipo">
              {equipo ? (
                <div className="space-y-3">
                  <div>
                    <span id="plan-res" className={etiquetaCompacta}>El responsable se asigna por</span>
                    <Opciones id="plan-res" valor={plan.equipo.responsable} editable={editable} onChange={(v) => set({ equipo: { ...plan.equipo, responsable: v } })}
                      opciones={[{ valor: "objetivo", texto: "Objetivo específico" }, { valor: "actividad", texto: "Actividad" }]} />
                    <p className="text-[11px] text-gray-500 mt-1">
                      {plan.equipo.responsable === "objetivo" ? "Todo lo que cuelga de un objetivo es del mismo integrante." : "Dentro de un objetivo puede haber actividades de distintos integrantes."}
                    </p>
                  </div>
                  <Fila texto="Plan individual por integrante" ayuda="Es el plan general filtrado por responsable; cada integrante registra el suyo en la ejecución.">
                    <Interruptor etiqueta="Plan individual por integrante" activo={plan.equipo.planIndividual} deshabilitado={!editable} onChange={(v) => set({ equipo: { ...plan.equipo, planIndividual: v } })} />
                  </Fila>
                  <Fila texto="Panel de carga para el asesor" ayuda="Muestra objetivos, actividades y montos de cada integrante. El reparto equitativo lo decide el asesor.">
                    <Interruptor etiqueta="Panel de carga para el asesor" activo={plan.equipo.panelCarga} deshabilitado={!editable} onChange={(v) => set({ equipo: { ...plan.equipo, panelCarga: v } })} />
                  </Fila>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Trabajo individual: el plan es del egresado. Para trabajo en equipo, sube el máximo de participantes en la pestaña Propuesta.</p>
              )}
            </Tarjeta>

            <Tarjeta titulo="Revisión y aprobación">
              <div className="space-y-3">
                <Fila texto="Aprueba el asesor" ayuda="El dictamen del plan de trabajo es requisito antes de iniciar la ejecución (pestaña Ejecución → Hitos).">
                  <span className="text-xs font-bold text-gray-500">Siempre</span>
                </Fila>
                <Numero id="plan-rev" etiqueta="Días de revisión del asesor" valor={plan.aprobacion.diasRevision} max={30} editable={editable}
                  onChange={(v) => set({ aprobacion: { ...plan.aprobacion, diasRevision: v } })} />
                <Fila texto="Lo valida el supervisor de la institución" ayuda="Queda documentado en el informe de primer contacto del asesor.">
                  <Interruptor etiqueta="Validación del supervisor" activo={plan.aprobacion.validaSupervisor} deshabilitado={!editable} onChange={(v) => set({ aprobacion: { ...plan.aprobacion, validaSupervisor: v } })} />
                </Fila>
              </div>
            </Tarjeta>
          </div>
        </div>
      </section>

      <EjemploPlan definicion={definicion} plan={plan} />
    </div>
  );
}

const moneda = (n: number, m: string) => (n === 0 ? "" : `${m === "USD" ? "$" : `${m} `}${n.toLocaleString("es-SV")}`);

/** Cronograma de ejemplo con las reglas de la ficha: muestra las sumas por nivel y el plan de cada integrante. */
export function EjemploPlan({ definicion, plan }: { definicion: DefinicionFicha; plan: EtapaPlan }) {
  const ejecucion = definicion.etapas.find(esEtapaEjecucion);
  const integrantes = Math.max(1, Math.min(definicion.participantes.max, 5));
  const [vista, setVista] = useState(0); // 0 = general; n = integrante n
  const [periodo, setPeriodo] = useState(1);
  if (!ejecucion) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-5 text-sm text-gray-600">
        Agrega una etapa de ejecución (pestaña Ejecución) para ver el cronograma de ejemplo: sus períodos y subperíodos son las columnas del plan.
      </div>
    );
  }
  const porSub = plan.granularidad === "subperiodo";
  const periodos = Math.min(ejecucion.periodos, 36);
  const columnas = porSub ? ejecucion.subperiodos * periodos : periodos;
  const raiz = planEjemplo(plan, integrantes, columnas);
  const mostrado = vista === 0 ? raiz : planIndividual(raiz, vista);
  const filas = mostrado ? aplanar(mostrado) : [];
  const visibles = porSub ? Array.from({ length: ejecucion.subperiodos }, (_, s) => (periodo - 1) * ejecucion.subperiodos + s) : Array.from({ length: columnas }, (_, c) => c);
  const carga = cargaPorIntegrante(raiz, integrantes, columnas);
  const conSubs = plan.subactividades !== "no";
  const sangria = ["", "pl-3", "pl-6", "pl-9", "pl-12"];

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-bold text-gray-800">Cronograma de ejemplo</h2>
          <p className="text-xs text-gray-500">Datos ficticios con las reglas de esta ficha. Cada nivel suma los montos de sus hijos.</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          {integrantes > 1 && plan.equipo.planIndividual && (
            <div role="tablist" aria-label="Plan" className="inline-flex bg-gray-100 rounded-lg p-1">
              {Array.from({ length: integrantes + 1 }, (_, i) => (
                <button key={i} role="tab" type="button" aria-selected={vista === i} onClick={() => setVista(i)}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold ${vista === i ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"}`}>
                  {i === 0 ? "General" : `Integrante ${i}`}
                </button>
              ))}
            </div>
          )}
          {porSub && (
            <div>
              <label htmlFor="ej-per" className={etiquetaCompacta}>Período</label>
              <select id="ej-per" className={`${campoCompacto} w-28`} value={periodo} onChange={(e) => setPeriodo(Number(e.target.value))}>
                {Array.from({ length: periodos }, (_, i) => <option key={i} value={i + 1}>Período {i + 1}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[36rem] border border-gray-200">
          <thead className="bg-gray-800 text-white text-[11px] uppercase">
            <tr>
              <th className="text-left px-2 py-1.5 w-20">ID</th>
              <th className="text-left px-2 py-1.5">Descripción</th>
              {integrantes > 1 && <th className="text-left px-2 py-1.5 w-24">Responsable</th>}
              {visibles.map((c) => (
                <th key={c} className="text-right px-2 py-1.5 w-16">{porSub ? `S${(c % ejecucion.subperiodos) + 1}` : `P${c + 1}`}</th>
              ))}
              {plan.presupuesto.activo && <th className="text-right px-2 py-1.5 w-20">Total</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filas.map((n) => {
              const totales = totalesNodo(n, columnas);
              const total = totales.reduce((a, b) => a + b, 0);
              const hoja = n.hijos.length === 0;
              return (
                <tr key={n.codigo} className={n.nivel === 1 ? "bg-gray-100 font-bold" : n.nivel === 2 ? "bg-sky-50/60 font-bold" : n.nivel === 3 ? "font-bold text-gray-700" : "text-gray-600"}>
                  <td className="px-2 py-1 font-mono text-gray-500">{n.codigo}</td>
                  <td className={`px-2 py-1 ${sangria[n.nivel - 1]}`}>{n.titulo}</td>
                  {integrantes > 1 && <td className="px-2 py-1 text-gray-500">{n.responsable ? `Integrante ${n.responsable}` : ""}</td>}
                  {visibles.map((c) => (
                    <td key={c} className="px-2 py-1 text-right tabular-nums">
                      {plan.presupuesto.activo ? moneda(totales[c], plan.presupuesto.moneda) : hoja && c % 2 === 0 ? <span className="inline-block w-full h-2.5 bg-brand-red/70 rounded-sm" aria-label="Se ejecuta" /> : ""}
                    </td>
                  ))}
                  {plan.presupuesto.activo && <td className="px-2 py-1 text-right tabular-nums font-bold">{moneda(total, plan.presupuesto.moneda)}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {conSubs && plan.subactividades === "opcional" && <p className="text-[11px] text-gray-500">Las subactividades son opcionales: el ejemplo no las incluye.</p>}

      {integrantes > 1 && plan.equipo.panelCarga && (
        <div>
          <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Carga por integrante (lo que verá el asesor)</h3>
          <div className="grid sm:grid-cols-3 gap-2">
            {carga.map((c) => (
              <div key={c.integrante} className="border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600">
                <div className="font-bold text-gray-800 text-sm">Integrante {c.integrante}</div>
                {c.objetivos} objetivos · {c.macroactividades} macro · {c.actividades} actividades
                {plan.presupuesto.activo && <div>Presupuesto: {moneda(c.monto, plan.presupuesto.moneda) || "—"}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
