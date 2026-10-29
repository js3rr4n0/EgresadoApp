"use client";

import { diasSubperiodos, esEtapaEjecucion, type DefinicionFicha, type EtapaEjecucion, type Hito } from "@/lib/fichas/tipos";
import type { ProblemaFicha } from "@/lib/fichas/validar";
import { nuevoId } from "./ids";

const campo = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/30 focus:border-brand-red disabled:bg-gray-50 disabled:text-gray-500";

function etapaNueva(n: number, primera: boolean): EtapaEjecucion {
  return {
    tipo: "ejecucion",
    id: nuevoId("ejecucion"),
    nombre: primera ? "Ejecución" : `Etapa de ejecución ${n}`,
    inicio: primera ? "carta" : "etapa_anterior",
    unidad: "dias",
    periodos: 5,
    duracionPeriodo: 30,
    subperiodos: 4,
    registro: { descripcion: { min: 200, max: 300 }, conclusion: { min: 40, max: 60 }, imagenes: 2 },
    diasRevision: 3,
    subperiodosAdelantables: 1,
    eliminacionesPorPeriodo: 1,
    informe: { paginasMinimas: 20, exigirActividadesAprobadas: true, comentariosDecanato: { activo: true, minPalabras: 40 } },
    diasPrimerContacto: primera ? 7 : null,
    hitos: [],
  };
}

function Numero({ id, etiqueta, valor, onChange, editable, min = 0, max = 999, sufijo }: {
  id: string; etiqueta: string; valor: number; onChange: (n: number) => void; editable: boolean; min?: number; max?: number; sufijo?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm text-gray-700 mb-1">{etiqueta}</label>
      <div className="flex items-center gap-2">
        <input id={id} type="number" min={min} max={max} className={`${campo} w-24`} disabled={!editable} value={valor} onChange={(e) => onChange(Number(e.target.value))} />
        {sufijo && <span className="text-sm text-gray-500">{sufijo}</span>}
      </div>
    </div>
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
    onChange({ ...definicion, etapas: [...definicion.etapas, etapaNueva(ejecuciones.length + 1, ejecuciones.length === 0)] });
  }

  function quitarEtapa(etapa: EtapaEjecucion) {
    if (!window.confirm(`¿Quitar la etapa "${etapa.nombre}"?`)) return;
    const etapas = definicion.etapas.filter((e) => e.id !== etapa.id);
    // La primera ejecución que quede debe iniciar con la carta.
    const primera = etapas.find(esEtapaEjecucion);
    onChange({ ...definicion, etapas: etapas.map((e) => (e === primera ? { ...primera, inicio: "carta" as const } : e)) });
  }

  return (
    <div className="space-y-5">
      {ejecuciones.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 text-sm text-gray-600">
          Esta ficha no tiene etapa de ejecución: el proceso termina con la aprobación de la propuesta, como hoy en proyecto e investigación.
        </div>
      )}

      {ejecuciones.map((et, n) => {
        const total = et.periodos * et.duracionPeriodo;
        const subs = et.unidad === "dias" && et.subperiodos > 0 && et.duracionPeriodo >= et.subperiodos ? diasSubperiodos(et.duracionPeriodo, et.subperiodos) : null;
        const propios = problemas.filter((p) => p.ubicacion === et.id);
        const pre = `et${n}`;
        const setHito = (i: number, cambios: Partial<Hito>) => reemplazar(et.id, { hitos: et.hitos.map((h, j) => (j === i ? { ...h, ...cambios } : h)) });

        return (
          <section key={et.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <header className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex flex-wrap items-center gap-3 justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xs font-bold text-white bg-gray-700 rounded-full w-6 h-6 flex items-center justify-center shrink-0">{n + 1}</span>
                <label htmlFor={`${pre}-nombre`} className="sr-only">Nombre de la etapa</label>
                <input id={`${pre}-nombre`} className={`${campo} font-bold max-w-xs`} disabled={!editable} value={et.nombre} onChange={(e) => reemplazar(et.id, { nombre: e.target.value })} />
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span>Inicia: {et.inicio === "carta" ? "fecha de inicio de la carta" : "al terminar la etapa anterior"}</span>
                {editable && <button type="button" onClick={() => quitarEtapa(et)} className="font-bold text-gray-500 hover:text-red-700">Quitar etapa</button>}
              </div>
            </header>

            <div className="p-5 space-y-6">
              {propios.length > 0 && (
                <ul className="text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg px-3 py-2 space-y-1">
                  {propios.map((p, i) => <li key={i}>{p.mensaje}</li>)}
                </ul>
              )}

              <div>
                <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-3">Períodos</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Numero id={`${pre}-per`} etiqueta="Períodos (informes)" valor={et.periodos} min={1} max={36} editable={editable} onChange={(v) => reemplazar(et.id, { periodos: v })} />
                  <Numero id={`${pre}-dur`} etiqueta="Duración de cada período" valor={et.duracionPeriodo} min={1} max={365} editable={editable} onChange={(v) => reemplazar(et.id, { duracionPeriodo: v })} />
                  <div>
                    <label htmlFor={`${pre}-uni`} className="block text-sm text-gray-700 mb-1">Unidad</label>
                    <select id={`${pre}-uni`} className={campo} disabled={!editable} value={et.unidad} onChange={(e) => reemplazar(et.id, { unidad: e.target.value as EtapaEjecucion["unidad"] })}>
                      <option value="dias">Días</option>
                      <option value="meses">Meses</option>
                    </select>
                  </div>
                  <Numero id={`${pre}-sub`} etiqueta="Subperíodos por período" valor={et.subperiodos} min={1} max={10} editable={editable} onChange={(v) => reemplazar(et.id, { subperiodos: v })} />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Duración total: {total} {et.unidad === "dias" ? "días" : "meses"}.
                  {subs && ` Cada período se divide en subperíodos de ${subs.join(", ")} días.`}
                  {et.unidad === "meses" && " La unidad en meses aún no la usa el seguimiento actual (pendiente de definir con el caso de Medicina)."}
                </p>
              </div>

              <div>
                <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-3">Registro de cada actividad</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <Numero id={`${pre}-dmin`} etiqueta="Descripción mín." valor={et.registro.descripcion.min} max={2000} editable={editable} sufijo="pal." onChange={(v) => reemplazar(et.id, { registro: { ...et.registro, descripcion: { ...et.registro.descripcion, min: v } } })} />
                  <Numero id={`${pre}-dmax`} etiqueta="Descripción máx." valor={et.registro.descripcion.max} max={2000} editable={editable} sufijo="pal." onChange={(v) => reemplazar(et.id, { registro: { ...et.registro, descripcion: { ...et.registro.descripcion, max: v } } })} />
                  <Numero id={`${pre}-cmin`} etiqueta="Conclusión mín." valor={et.registro.conclusion.min} max={500} editable={editable} sufijo="pal." onChange={(v) => reemplazar(et.id, { registro: { ...et.registro, conclusion: { ...et.registro.conclusion, min: v } } })} />
                  <Numero id={`${pre}-cmax`} etiqueta="Conclusión máx." valor={et.registro.conclusion.max} max={500} editable={editable} sufijo="pal." onChange={(v) => reemplazar(et.id, { registro: { ...et.registro, conclusion: { ...et.registro.conclusion, max: v } } })} />
                  <Numero id={`${pre}-img`} etiqueta="Imágenes de soporte" valor={et.registro.imagenes} max={10} editable={editable} onChange={(v) => reemplazar(et.id, { registro: { ...et.registro, imagenes: v } })} />
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-3">Revisión y cambios</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Numero id={`${pre}-rev`} etiqueta="Días para revisar un subperíodo" valor={et.diasRevision} max={30} editable={editable} sufijo="días" onChange={(v) => reemplazar(et.id, { diasRevision: v })} />
                  <Numero id={`${pre}-ade`} etiqueta="Subperíodos adelantables" valor={et.subperiodosAdelantables} max={5} editable={editable} onChange={(v) => reemplazar(et.id, { subperiodosAdelantables: v })} />
                  <Numero id={`${pre}-eli`} etiqueta="Eliminaciones por período" valor={et.eliminacionesPorPeriodo} max={10} editable={editable} onChange={(v) => reemplazar(et.id, { eliminacionesPorPeriodo: v })} />
                  <div>
                    <label htmlFor={`${pre}-pc`} className="block text-sm text-gray-700 mb-1">Informe de primer contacto</label>
                    <select id={`${pre}-pc`} className={campo} disabled={!editable} value={et.diasPrimerContacto === null ? "" : String(et.diasPrimerContacto)}
                      onChange={(e) => reemplazar(et.id, { diasPrimerContacto: e.target.value === "" ? null : Number(e.target.value) })}>
                      <option value="">No se pide</option>
                      {[3, 5, 7, 10, 14].map((d) => <option key={d} value={d}>Plazo de {d} días</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-3">Informe de cada período</h3>
                <div className="grid md:grid-cols-3 gap-4 items-start">
                  <Numero id={`${pre}-pag`} etiqueta="Páginas mínimas" valor={et.informe.paginasMinimas} max={200} editable={editable} onChange={(v) => reemplazar(et.id, { informe: { ...et.informe, paginasMinimas: v } })} />
                  <label className="flex items-start gap-2 text-sm text-gray-700 md:pt-6">
                    <input type="checkbox" className="accent-brand-red mt-0.5" disabled={!editable} checked={et.informe.exigirActividadesAprobadas}
                      onChange={(e) => reemplazar(et.id, { informe: { ...et.informe, exigirActividadesAprobadas: e.target.checked } })} />
                    Exigir que todas las actividades del período estén aprobadas
                  </label>
                  <div className="md:pt-6 space-y-2">
                    <label className="flex items-start gap-2 text-sm text-gray-700">
                      <input type="checkbox" className="accent-brand-red mt-0.5" disabled={!editable} checked={et.informe.comentariosDecanato.activo}
                        onChange={(e) => reemplazar(et.id, { informe: { ...et.informe, comentariosDecanato: { ...et.informe.comentariosDecanato, activo: e.target.checked } } })} />
                      El asesor responde las preguntas para el decanato
                    </label>
                    {et.informe.comentariosDecanato.activo && (
                      <Numero id={`${pre}-com`} etiqueta="Palabras mínimas por pregunta" valor={et.informe.comentariosDecanato.minPalabras} max={500} editable={editable}
                        onChange={(v) => reemplazar(et.id, { informe: { ...et.informe, comentariosDecanato: { ...et.informe.comentariosDecanato, minPalabras: v } } })} />
                    )}
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide">Hitos</h3>
                  {editable && (
                    <button type="button" className="text-xs font-bold text-brand-red hover:underline"
                      onClick={() => reemplazar(et.id, { hitos: [...et.hitos, { id: nuevoId("hito"), nombre: "Nuevo hito", desde: 1, hasta: Math.min(7, total), requisitoDeInforme: null }] })}>
                      + Agregar hito
                    </button>
                  )}
                </div>
                {et.hitos.length === 0 && <p className="text-sm text-gray-500">Sin hitos.</p>}
                <div className="space-y-2">
                  {et.hitos.map((h, i) => (
                    <div key={h.id} className="grid grid-cols-2 md:grid-cols-[minmax(0,2fr)_6rem_6rem_minmax(0,1.3fr)_auto] gap-3 items-end border border-gray-100 rounded-lg p-3">
                      <div className="col-span-2 md:col-span-1">
                        <label htmlFor={`${pre}-h${i}-n`} className="block text-xs text-gray-500 mb-1">Hito</label>
                        <input id={`${pre}-h${i}-n`} className={campo} disabled={!editable} value={h.nombre} onChange={(e) => setHito(i, { nombre: e.target.value })} />
                      </div>
                      <Numero id={`${pre}-h${i}-d`} etiqueta={`Desde (${et.unidad === "dias" ? "día" : "mes"})`} valor={h.desde} max={total} editable={editable} onChange={(v) => setHito(i, { desde: v })} />
                      <Numero id={`${pre}-h${i}-h`} etiqueta="Hasta" valor={h.hasta} max={total} editable={editable} onChange={(v) => setHito(i, { hasta: v })} />
                      <div>
                        <label htmlFor={`${pre}-h${i}-r`} className="block text-xs text-gray-500 mb-1">Requisito para aprobar</label>
                        <select id={`${pre}-h${i}-r`} className={campo} disabled={!editable} value={h.requisitoDeInforme ?? ""}
                          onChange={(e) => setHito(i, { requisitoDeInforme: e.target.value === "" ? null : Number(e.target.value) })}>
                          <option value="">Ningún informe</option>
                          {Array.from({ length: et.periodos }, (_, k) => <option key={k} value={k + 1}>Informe {k + 1}</option>)}
                        </select>
                      </div>
                      {editable && (
                        <button type="button" className="text-xs font-bold text-gray-500 hover:text-red-700 pb-2"
                          onClick={() => reemplazar(et.id, { hitos: et.hitos.filter((_, j) => j !== i) })}>Quitar</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        );
      })}

      {editable && (
        <button type="button" onClick={agregarEtapa}
          className="w-full border-2 border-dashed border-gray-300 rounded-xl py-3 text-sm font-bold text-gray-600 hover:border-brand-red hover:text-brand-red">
          + Agregar etapa de ejecución{ejecuciones.length > 0 ? " (inicia al terminar la anterior)" : ""}
        </button>
      )}
    </div>
  );
}
