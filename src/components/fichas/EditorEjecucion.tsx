"use client";

import { esEtapaEjecucion, esEtapaPlan, esEtapaPropuesta, opcionesRegistro, TIPOS_HITO, type DefinicionFicha, type EtapaEjecucion, type Hito, type TipoHito } from "@/lib/fichas/tipos";
import { ejecucionNueva } from "@/lib/fichas/plantillas";
import { APARTADOS_INFORME_PERIODO_PROYECTO } from "@/lib/fichas/disenoFuturo";
import type { ProblemaFicha } from "@/lib/fichas/validar";
import { campoCompacto, EncabezadoSeccion, etiquetaCompacta, Interruptor, Tarjeta } from "./EditorPropuesta";
import LineaTiempo from "./LineaTiempo";
import { CalendarioEjecucion } from "./VistaPrevia";
import { nuevoId } from "./ids";
import { Proximamente } from "./comunes";

function Numero({ id, etiqueta, valor, onChange, editable, min = 0, max = 999, sufijo }: {
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

/** Recorrido completo del trabajo, de la propuesta al cierre. */
function Recorrido({ definicion }: { definicion: DefinicionFicha }) {
  const propuesta = definicion.etapas.find(esEtapaPropuesta);
  const ejecuciones = definicion.etapas.filter(esEtapaEjecucion);
  const plan = definicion.etapas.find(esEtapaPlan);
  const requisitos = ejecuciones[0]?.hitos.filter((h) => h.momento === "antes").length ?? 0;
  const pasos = [
    { titulo: "Propuesta", detalle: `${propuesta?.espacios.length ?? 0} espacios`, color: "bg-gray-700" },
    ...(plan ? [{ titulo: plan.nombre, detalle: plan.presupuesto.activo ? "cronograma y presupuesto" : "cronograma", color: "bg-sky-600" }] : []),
    ...(requisitos > 0 ? [{ titulo: "Requisitos", detalle: `${requisitos} antes de iniciar`, color: "bg-indigo-500" }] : []),
    ...ejecuciones.map((e) => ({ titulo: e.nombre, detalle: `${e.periodos} × ${e.duracionPeriodo} ${e.unidad === "dias" ? "días" : "meses"}`, color: "bg-brand-red" })),
    { titulo: "Cierre", detalle: "Informe final", color: "bg-gray-400" },
    { titulo: "Presentaciones", detalle: "Revisión y pública", color: "bg-gray-400" },
  ];
  return (
    <ol className="flex flex-wrap items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-3 py-2.5" aria-label="Recorrido del trabajo">
      {pasos.map((p, i) => (
        <li key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-gray-300" aria-hidden="true">→</span>}
          <span className={`text-[11px] font-bold text-white rounded-md px-2 py-1 ${p.color}`}>{p.titulo}</span>
          <span className="text-[11px] text-gray-500">{p.detalle}</span>
        </li>
      ))}
    </ol>
  );
}

export default function EditorEjecucion({
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
  const ejecuciones = definicion.etapas.filter(esEtapaEjecucion);

  function reemplazar(id: string, cambios: Partial<EtapaEjecucion>) {
    onChange({ ...definicion, etapas: definicion.etapas.map((e) => (e.id === id && esEtapaEjecucion(e) ? { ...e, ...cambios } : e)) });
  }

  function agregarEtapa() {
    onChange({ ...definicion, etapas: [...definicion.etapas, ejecucionNueva(nuevoId("ejecucion"), definicion.modalidad, ejecuciones.length + 1, ejecuciones.length === 0)] });
  }

  function quitarEtapa(etapa: EtapaEjecucion) {
    if (!window.confirm(`¿Quitar la etapa "${etapa.nombre}"?`)) return;
    const etapas = definicion.etapas.filter((e) => e.id !== etapa.id);
    // La primera ejecución que quede debe iniciar con la carta.
    const primera = etapas.find(esEtapaEjecucion);
    onChange({ ...definicion, etapas: etapas.map((e) => (e === primera ? { ...primera, inicio: "carta" as const } : e)) });
  }

  function agregarHito(et: EtapaEjecucion, tipo: TipoHito) {
    const t = TIPOS_HITO.find((x) => x.tipo === tipo)!;
    const total = et.periodos * et.duracionPeriodo;
    const hito: Hito = t.momento === "antes"
      ? { id: nuevoId("hito"), nombre: t.nombre, tipo, momento: "antes", desde: 0, hasta: 0, requisitoDeInforme: null }
      : { id: nuevoId("hito"), nombre: t.tipo === "personalizado" ? "Nuevo hito" : t.nombre, tipo, momento: "durante", desde: 1, hasta: Math.min(7, total), requisitoDeInforme: null };
    reemplazar(et.id, { hitos: [...et.hitos, hito] });
  }

  return (
    <div className="space-y-4">
      <Recorrido definicion={definicion} />

      {ejecuciones.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 text-sm text-gray-600">
          Esta ficha no tiene etapa de ejecución: el proceso termina con la aprobación de la propuesta, como hoy en proyecto e investigación.
        </div>
      )}

      {ejecuciones.map((et, n) => {
        const total = et.periodos * et.duracionPeriodo;
        const propios = problemas.filter((p) => p.ubicacion === et.id);
        const pre = `et${n}`;
        const op = opcionesRegistro(et);
        const equipo = definicion.participantes.max > 1;
        const sinMetrica = et.informe.paginasMinimas === 0 && et.registro.imagenes === 0 && et.registro.descripcion.min === 0;
        const setHito = (id: string, cambios: Partial<Hito>) => reemplazar(et.id, { hitos: et.hitos.map((h) => (h.id === id ? { ...h, ...cambios } : h)) });
        const quitarHito = (id: string) => reemplazar(et.id, { hitos: et.hitos.filter((h) => h.id !== id) });
        const antes = et.hitos.filter((h) => h.momento === "antes");
        const durante = et.hitos.filter((h) => (h.momento ?? "durante") === "durante");
        const tiposDisponibles = TIPOS_HITO.filter((t) => t.tipo === "personalizado" || !et.hitos.some((h) => h.tipo === t.tipo))
          .filter((t) => t.tipo !== "primer_contacto")
          .filter((t) => t.momento === "durante" || n === 0);

        return (
          <section key={et.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <header className="px-4 py-2.5 border-b border-gray-100 bg-gray-50 flex flex-wrap items-center gap-3 justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-xs font-bold text-white bg-brand-red rounded-full w-6 h-6 flex items-center justify-center shrink-0">{n + 1}</span>
                <label htmlFor={`${pre}-nombre`} className="sr-only">Nombre de la etapa</label>
                <input id={`${pre}-nombre`} className={`${campoCompacto} font-bold w-64 max-w-full`} disabled={!editable} value={et.nombre} onChange={(e) => reemplazar(et.id, { nombre: e.target.value })} />
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span>Inicia {et.inicio === "carta" ? "con la fecha de la carta" : "al terminar la etapa anterior"}</span>
                {editable && <button type="button" onClick={() => quitarEtapa(et)} className="font-bold text-gray-400 hover:text-red-700">Quitar etapa</button>}
              </div>
            </header>

            <div className="p-4 space-y-4">
              {propios.length > 0 && (
                <ul className="text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg px-3 py-2 space-y-1">
                  {propios.map((p, i) => <li key={i}>{p.mensaje}</li>)}
                </ul>
              )}

              <EncabezadoSeccion titulo="Estructura" descripcion="Cuánto dura la etapa y cómo se divide en períodos y subperíodos." />
              <div className="border border-gray-100 rounded-lg p-3 bg-gray-50/40">
                <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">Línea de tiempo</div>
                <LineaTiempo etapa={et} />
              </div>

              <div className="grid lg:grid-cols-2 gap-3">
                <Tarjeta titulo="Períodos">
                  <div className="flex flex-wrap gap-3">
                    <Numero id={`${pre}-per`} etiqueta="Períodos" valor={et.periodos} min={1} max={36} editable={editable} onChange={(v) => reemplazar(et.id, { periodos: v })} />
                    <Numero id={`${pre}-dur`} etiqueta="Duración" valor={et.duracionPeriodo} min={1} max={365} editable={editable} onChange={(v) => reemplazar(et.id, { duracionPeriodo: v })} />
                    <div>
                      <label htmlFor={`${pre}-uni`} className={etiquetaCompacta}>Unidad</label>
                      <select id={`${pre}-uni`} className={`${campoCompacto} w-24`} disabled={!editable} value={et.unidad} onChange={(e) => reemplazar(et.id, { unidad: e.target.value as EtapaEjecucion["unidad"] })}>
                        <option value="dias">Días</option>
                        <option value="meses">Meses</option>
                      </select>
                    </div>
                    <Numero id={`${pre}-sub`} etiqueta="Subperíodos" valor={et.subperiodos} min={1} max={10} editable={editable} onChange={(v) => reemplazar(et.id, { subperiodos: v })} />
                  </div>
                  {et.unidad === "meses" && <p className="text-[11px] text-gray-500 mt-2">La unidad en meses aún no la usa el seguimiento actual (caso de Medicina, por definir).</p>}
                </Tarjeta>
              </div>

              <EncabezadoSeccion titulo="Comportamiento durante la ejecución"
                descripcion="Qué registra el egresado, cómo se revisa, qué se entrega en cada período y los momentos de control." />
              <div className="grid lg:grid-cols-2 gap-3">
                <Tarjeta titulo="Registro de cada actividad">
                  <div className="flex flex-wrap gap-3 mb-3">
                    <div>
                      <label htmlFor={`${pre}-modo`} className={etiquetaCompacta}>Se registra</label>
                      <select id={`${pre}-modo`} className={`${campoCompacto} w-48`} disabled={!editable} value={op.modo}
                        onChange={(e) => reemplazar(et.id, { registro: { ...et.registro, modo: e.target.value as typeof op.modo } })}>
                        <option value="subperiodo">Por subperíodo</option>
                        <option value="actividad">Por actividad del plan</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor={`${pre}-marco`} className={etiquetaCompacta}>Marco teórico</label>
                      <select id={`${pre}-marco`} className={`${campoCompacto} w-36`} disabled={!editable} value={op.marcoTeorico}
                        onChange={(e) => reemplazar(et.id, { registro: { ...et.registro, marcoTeorico: e.target.value as typeof op.marcoTeorico } })}>
                        <option value="obligatorio">Obligatorio</option>
                        <option value="opcional">Opcional</option>
                        <option value="no">No se pide</option>
                      </select>
                    </div>
                    <div>
                      <span className={etiquetaCompacta}>Avance (%)</span>
                      <div className="h-9 flex items-center">
                        <Interruptor etiqueta="Registrar el porcentaje de avance de cada actividad" activo={op.avance} deshabilitado={!editable}
                          onChange={(v) => reemplazar(et.id, { registro: { ...et.registro, avance: v } })} />
                      </div>
                    </div>
                  </div>
                  {equipo && op.modo === "actividad" && (
                    <p className="text-[11px] text-gray-500 mb-2">Cada integrante registra las actividades de su plan individual; el asesor ve quién hizo qué.</p>
                  )}
                  <div className="flex flex-wrap gap-3">
                    <div>
                      <span className={etiquetaCompacta}>Descripción</span>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <label className="sr-only" htmlFor={`${pre}-dmin`}>Mínimo de palabras de la descripción</label>
                        <input id={`${pre}-dmin`} type="number" className={`${campoCompacto} w-[4.5rem]`} disabled={!editable} value={et.registro.descripcion.min}
                          onChange={(e) => reemplazar(et.id, { registro: { ...et.registro, descripcion: { ...et.registro.descripcion, min: Number(e.target.value) } } })} />
                        –
                        <label className="sr-only" htmlFor={`${pre}-dmax`}>Máximo de palabras de la descripción</label>
                        <input id={`${pre}-dmax`} type="number" className={`${campoCompacto} w-[4.5rem]`} disabled={!editable} value={et.registro.descripcion.max}
                          onChange={(e) => reemplazar(et.id, { registro: { ...et.registro, descripcion: { ...et.registro.descripcion, max: Number(e.target.value) } } })} />
                      </div>
                    </div>
                    <div>
                      <span className={etiquetaCompacta}>Conclusión</span>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <label className="sr-only" htmlFor={`${pre}-cmin`}>Mínimo de palabras de la conclusión</label>
                        <input id={`${pre}-cmin`} type="number" className={`${campoCompacto} w-[4.5rem]`} disabled={!editable} value={et.registro.conclusion.min}
                          onChange={(e) => reemplazar(et.id, { registro: { ...et.registro, conclusion: { ...et.registro.conclusion, min: Number(e.target.value) } } })} />
                        –
                        <label className="sr-only" htmlFor={`${pre}-cmax`}>Máximo de palabras de la conclusión</label>
                        <input id={`${pre}-cmax`} type="number" className={`${campoCompacto} w-[4.5rem]`} disabled={!editable} value={et.registro.conclusion.max}
                          onChange={(e) => reemplazar(et.id, { registro: { ...et.registro, conclusion: { ...et.registro.conclusion, max: Number(e.target.value) } } })} />
                      </div>
                    </div>
                    {op.modo === "actividad" ? (
                      <div>
                        <span className={etiquetaCompacta}>Evidencias</span>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <label className="sr-only" htmlFor={`${pre}-evmin`}>Mínimo de evidencias por actividad</label>
                          <input id={`${pre}-evmin`} type="number" min={0} max={20} className={`${campoCompacto} w-[4.5rem]`} disabled={!editable} value={op.evidencias.min}
                            onChange={(e) => reemplazar(et.id, { registro: { ...et.registro, evidencias: { ...op.evidencias, min: Number(e.target.value) } } })} />
                          –
                          <label className="sr-only" htmlFor={`${pre}-evmax`}>Máximo de evidencias por actividad</label>
                          <input id={`${pre}-evmax`} type="number" min={0} max={20} className={`${campoCompacto} w-[4.5rem]`} disabled={!editable} value={op.evidencias.max}
                            onChange={(e) => reemplazar(et.id, { registro: { ...et.registro, evidencias: { ...op.evidencias, max: Number(e.target.value) } } })} />
                        </div>
                      </div>
                    ) : (
                      <Numero id={`${pre}-img`} etiqueta="Imágenes" valor={et.registro.imagenes} max={10} editable={editable} onChange={(v) => reemplazar(et.id, { registro: { ...et.registro, imagenes: v } })} />
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-2">
                    0 = sin mínimo (sin métrica). {sinMetrica ? "Imágenes, tablas y marco teórico quedan como apoyo opcional." : ""}
                    {op.modo === "actividad" ? " Evidencias: imágenes, documentos PDF o enlaces (por ejemplo, a un video) que respaldan el resultado de cada actividad; con máximo 0 no se piden." : ""}
                  </p>
                </Tarjeta>

                <Tarjeta titulo="Revisión y cambios">
                  <div className="flex flex-wrap gap-3">
                    <Numero id={`${pre}-rev`} etiqueta="Días de revisión" valor={et.diasRevision} max={30} editable={editable} onChange={(v) => reemplazar(et.id, { diasRevision: v })} />
                    <Numero id={`${pre}-ade`} etiqueta="Adelantables" valor={et.subperiodosAdelantables} max={5} editable={editable} onChange={(v) => reemplazar(et.id, { subperiodosAdelantables: v })} />
                    <Numero id={`${pre}-eli`} etiqueta="Eliminaciones" valor={et.eliminacionesPorPeriodo} max={10} editable={editable} sufijo="/ período" onChange={(v) => reemplazar(et.id, { eliminacionesPorPeriodo: v })} />
                  </div>
                </Tarjeta>

                <Tarjeta titulo="Informe de cada período">
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap gap-3">
                      <div>
                        <label htmlFor={`${pre}-inf`} className={etiquetaCompacta}>Quién redacta</label>
                        <select id={`${pre}-inf`} className={`${campoCompacto} w-64 max-w-full`} disabled={!editable} value={op.informe}
                          onChange={(e) => reemplazar(et.id, { informe: { ...et.informe, modo: e.target.value as typeof op.informe } })}>
                          <option value="unico">Un informe por trabajo</option>
                          <option value="individual_y_general">Cada integrante + informe general</option>
                        </select>
                      </div>
                      <div>
                        <Numero id={`${pre}-pag`} etiqueta="Páginas mínimas" valor={et.informe.paginasMinimas} max={200} editable={editable} onChange={(v) => reemplazar(et.id, { informe: { ...et.informe, paginasMinimas: v } })} />
                      </div>
                    </div>
                    {op.informe === "individual_y_general" && (
                      <p className="text-[11px] text-gray-500">
                        {equipo ? "Cada integrante redacta su informe del período y con ellos se arma el informe general del período." : "En trabajo individual, el informe del egresado es también el general."}
                        {et.informe.paginasMinimas === 0 && " Sin mínimo de páginas."}
                      </p>
                    )}
                    <div className="flex items-center justify-between gap-3 text-sm text-gray-700">
                      <span>Exigir todas las actividades aprobadas</span>
                      <Interruptor etiqueta="Exigir actividades aprobadas" activo={et.informe.exigirActividadesAprobadas} deshabilitado={!editable}
                        onChange={(v) => reemplazar(et.id, { informe: { ...et.informe, exigirActividadesAprobadas: v } })} />
                    </div>
                    <div className="flex items-center justify-between gap-3 text-sm text-gray-700">
                      <span>
                        Preguntas del asesor para el decanato
                        {et.informe.comentariosDecanato.activo && (
                          <span className="inline-flex items-center gap-1 ml-2 text-xs text-gray-500">
                            <label className="sr-only" htmlFor={`${pre}-com`}>Palabras mínimas por pregunta</label>
                            mín.
                            <input id={`${pre}-com`} type="number" className={`${campoCompacto} w-16 h-7`} disabled={!editable} value={et.informe.comentariosDecanato.minPalabras}
                              onChange={(e) => reemplazar(et.id, { informe: { ...et.informe, comentariosDecanato: { ...et.informe.comentariosDecanato, minPalabras: Number(e.target.value) } } })} />
                            palabras
                          </span>
                        )}
                      </span>
                      <Interruptor etiqueta="Preguntas para el decanato" activo={et.informe.comentariosDecanato.activo} deshabilitado={!editable}
                        onChange={(v) => reemplazar(et.id, { informe: { ...et.informe, comentariosDecanato: { ...et.informe.comentariosDecanato, activo: v } } })} />
                    </div>
                    {op.modo === "actividad" && (
                      <details className="border-t border-gray-100 pt-2">
                        <summary className="text-xs font-bold text-gray-600 cursor-pointer flex items-center gap-2">
                          Partes del informe del período <Proximamente texto="Diseño" />
                        </summary>
                        <ol className="list-decimal pl-5 mt-1.5 text-xs text-gray-600 space-y-0.5">
                          {APARTADOS_INFORME_PERIODO_PROYECTO.map((a) => <li key={a.nombre}><span className="text-gray-800">{a.nombre}</span>{a.detalle && ` — ${a.detalle}`}</li>)}
                        </ol>
                      </details>
                    )}
                  </div>
                </Tarjeta>
              </div>

              <Tarjeta titulo="Hitos" extra={editable && tiposDisponibles.length > 0 ? (
                <div className="flex flex-wrap gap-1 justify-end">
                  {tiposDisponibles.map((t) => (
                    <button key={t.tipo} type="button" title={t.descripcion} onClick={() => agregarHito(et, t.tipo)}
                      className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-white border border-gray-200 text-gray-600 hover:border-brand-red hover:text-brand-red">
                      + {t.nombre.replace("Dictamen de aprobación ", "Dictamen ")}
                    </button>
                  ))}
                </div>
              ) : undefined}>
                <div className="grid lg:grid-cols-2 gap-4">
                  {n === 0 && (
                    <div>
                      <h4 className="text-[11px] font-bold text-indigo-700 uppercase tracking-wide mb-1.5">Antes de iniciar la ejecución</h4>
                      <p className="text-[11px] text-gray-500 mb-2">Requisitos obligatorios: sin ellos no se puede dar inicio al plan de trabajo.</p>
                      {antes.length === 0 && <p className="text-sm text-gray-400">Sin requisitos previos.</p>}
                      <ul className="space-y-1.5">
                        {antes.map((h) => (
                          <li key={h.id} className="flex items-center gap-2 border border-indigo-100 bg-indigo-50/50 rounded-md px-2.5 py-1.5">
                            <span className="text-indigo-600" aria-hidden="true">◆</span>
                            <label className="sr-only" htmlFor={`${pre}-${h.id}-n`}>Nombre del requisito</label>
                            <input id={`${pre}-${h.id}-n`} className={`${campoCompacto} h-8 flex-1`} disabled={!editable} value={h.nombre} onChange={(e) => setHito(h.id, { nombre: e.target.value })} />
                            {editable && <button type="button" onClick={() => quitarHito(h.id)} className="text-xs font-bold text-gray-400 hover:text-red-700">Quitar</button>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className={n === 0 ? "" : "lg:col-span-2"}>
                    <h4 className="text-[11px] font-bold text-amber-700 uppercase tracking-wide mb-1.5">Durante la ejecución</h4>
                    <p className="text-[11px] text-gray-500 mb-2">Ventanas de {et.unidad === "dias" ? "días" : "meses"} contadas desde el inicio de la etapa (total {total}).</p>
                    <ul className="space-y-1.5">
                      <li className="flex flex-wrap items-center gap-2 border border-teal-100 bg-teal-50/50 rounded-md px-2.5 py-1.5 text-sm">
                        <span className="text-teal-600" aria-hidden="true">●</span>
                        <span className="flex-1 min-w-[10rem] text-gray-700">Primer contacto con el asesor</span>
                        <label className="sr-only" htmlFor={`${pre}-pc`}>Plazo del primer contacto</label>
                        <select id={`${pre}-pc`} className={`${campoCompacto} h-8 w-36`} disabled={!editable} value={et.diasPrimerContacto === null ? "" : String(et.diasPrimerContacto)}
                          onChange={(e) => reemplazar(et.id, { diasPrimerContacto: e.target.value === "" ? null : Number(e.target.value) })}>
                          <option value="">No se pide</option>
                          {[3, 5, 7, 10, 14].map((d) => <option key={d} value={d}>Plazo de {d} días</option>)}
                        </select>
                      </li>
                      {durante.map((h) => (
                        <li key={h.id} className="flex flex-wrap items-center gap-2 border border-amber-100 bg-amber-50/40 rounded-md px-2.5 py-1.5">
                          <span className="text-amber-600" aria-hidden="true">●</span>
                          <label className="sr-only" htmlFor={`${pre}-${h.id}-n`}>Nombre del hito</label>
                          <input id={`${pre}-${h.id}-n`} className={`${campoCompacto} h-8 flex-1 min-w-[10rem]`} disabled={!editable} value={h.nombre} onChange={(e) => setHito(h.id, { nombre: e.target.value })} />
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <label className="sr-only" htmlFor={`${pre}-${h.id}-d`}>Desde</label>
                            <input id={`${pre}-${h.id}-d`} type="number" className={`${campoCompacto} h-8 w-16`} disabled={!editable} value={h.desde} onChange={(e) => setHito(h.id, { desde: Number(e.target.value) })} />
                            a
                            <label className="sr-only" htmlFor={`${pre}-${h.id}-h`}>Hasta</label>
                            <input id={`${pre}-${h.id}-h`} type="number" className={`${campoCompacto} h-8 w-16`} disabled={!editable} value={h.hasta} onChange={(e) => setHito(h.id, { hasta: Number(e.target.value) })} />
                          </span>
                          <label className="sr-only" htmlFor={`${pre}-${h.id}-r`}>Requisito para aprobar</label>
                          <select id={`${pre}-${h.id}-r`} className={`${campoCompacto} h-8 w-40`} disabled={!editable} value={h.requisitoDeInforme ?? ""}
                            onChange={(e) => setHito(h.id, { requisitoDeInforme: e.target.value === "" ? null : Number(e.target.value) })}>
                            <option value="">No es requisito</option>
                            {Array.from({ length: et.periodos }, (_, k) => <option key={k} value={k + 1}>Requisito del informe {k + 1}</option>)}
                          </select>
                          {editable && <button type="button" onClick={() => quitarHito(h.id)} className="text-xs font-bold text-gray-400 hover:text-red-700">Quitar</button>}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Tarjeta>
            </div>
          </section>
        );
      })}

      {editable && (
        <button type="button" onClick={agregarEtapa}
          className="w-full border-2 border-dashed border-gray-300 rounded-xl py-2.5 text-sm font-bold text-gray-600 hover:border-brand-red hover:text-brand-red">
          + Agregar etapa de ejecución{ejecuciones.length > 0 ? " (inicia al terminar la anterior)" : ""}
        </button>
      )}

      <CalendarioEjecucion ejecuciones={ejecuciones} />
    </div>
  );
}
