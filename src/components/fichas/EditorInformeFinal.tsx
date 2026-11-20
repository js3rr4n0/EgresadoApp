"use client";

import { esEtapaEjecucion, esEtapaInformeFinal, type DefinicionFicha, type EtapaInformeFinal } from "@/lib/fichas/tipos";
import type { ProblemaFicha } from "@/lib/fichas/validar";
import { informeFinalNuevo, informeFinalProyectoNuevo } from "@/lib/fichas/plantillas";
import EditorPropuesta, { campoCompacto, EncabezadoSeccion, etiquetaCompacta, Interruptor, Tarjeta } from "./EditorPropuesta";
import { nuevoId } from "./ids";

/**
 * Pestaña "Informe final" del constructor (investigación, I5): el documento final por capítulos que el equipo redacta
 * dentro del sistema, con versiones, revisión del asesor y ratificación. Va al final, después de la ejecución.
 */
export default function EditorInformeFinal({
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
  const informe = definicion.etapas.find(esEtapaInformeFinal);
  const tieneEjecucion = definicion.etapas.some(esEtapaEjecucion);

  if (!informe) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-3">
        <h2 className="font-bold text-gray-800">Esta ficha no tiene informe final por capítulos</h2>
        <p className="text-sm text-gray-600 max-w-2xl">
          El informe final es el documento con que cierra el proyecto o la investigación (la tesis). El equipo lo redacta en el sistema
          capítulo por capítulo: cada guardado queda como versión, el asesor revisa y al final todos ratifican la versión que se
          entrega, que queda congelada. Se exporta a PDF y Word con el formato del documento final.
        </p>
        {!tieneEjecucion && <p className="text-xs text-amber-800">Primero agrega la etapa de ejecución: el informe final va después de ella.</p>}
        {editable && (
          <button type="button" disabled={!tieneEjecucion}
            onClick={() => onChange({ ...definicion, etapas: [...definicion.etapas.filter((e) => !esEtapaInformeFinal(e)), (definicion.modalidad === "proyecto" ? informeFinalProyectoNuevo : informeFinalNuevo)(nuevoId("informe_final"))] })}
            className="px-3.5 py-2 rounded-lg text-sm font-bold bg-brand-red hover:bg-red-800 text-white disabled:opacity-50">
            + Agregar informe final
          </button>
        )}
      </div>
    );
  }

  const set = (cambios: Partial<EtapaInformeFinal>) =>
    onChange({ ...definicion, etapas: definicion.etapas.map((e) => (esEtapaInformeFinal(e) ? { ...e, ...cambios } : e)) });
  const revision = (cambios: Partial<EtapaInformeFinal["revision"]>) => set({ revision: { ...informe.revision, ...cambios } });
  const propios = problemas.filter((p) => p.ubicacion === informe.id || (p.ubicacion === "ficha" && p.mensaje.includes("informe final")));

  return (
    <div className="space-y-4">
      <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <header className="px-4 py-2.5 border-b border-gray-100 bg-gray-50 flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xs font-bold text-white bg-emerald-700 rounded-md px-2 py-1 shrink-0">Al final de la ejecución</span>
            <label htmlFor="if-nombre" className="sr-only">Nombre de la etapa</label>
            <input id="if-nombre" className={`${campoCompacto} font-bold w-64 max-w-full`} disabled={!editable} value={informe.nombre} onChange={(e) => set({ nombre: e.target.value })} />
          </div>
          {editable && (
            <button type="button" className="text-xs font-bold text-gray-400 hover:text-red-700"
              onClick={() => { if (window.confirm("¿Quitar el informe final de la ficha?")) onChange({ ...definicion, etapas: definicion.etapas.filter((e) => !esEtapaInformeFinal(e)) }); }}>
              Quitar informe final
            </button>
          )}
        </header>

        <div className="p-4 space-y-4">
          {propios.length > 0 && (
            <ul className="text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg px-3 py-2 space-y-1">
              {propios.map((p, i) => <li key={i}>{p.mensaje}</li>)}
            </ul>
          )}

          <EncabezadoSeccion titulo="Estructura" descripcion="Los capítulos son los espacios de abajo." />
          <ul className="text-[12px] text-gray-600 list-disc pl-5 space-y-0.5">
            <li>La <strong>portada</strong>, las <strong>autoridades académicas</strong> y el <strong>índice</strong> se generan con el formato del documento final.</li>
            <li>Los <strong>anexos de resultados</strong> se agregan solos con las evidencias de las actividades, numeradas.</li>
            <li>Un capítulo puede <strong>precargarse</strong> con lo que ya existe: la propuesta, el protocolo o el marco teórico registrado en las actividades.</li>
          </ul>

          <EncabezadoSeccion titulo="Comportamiento" descripcion="Cómo se redacta, se revisa y se entrega." />
          <div className="grid lg:grid-cols-2 gap-3">
            <Tarjeta titulo="Redacción">
              <ul className="text-[12px] text-gray-600 list-disc pl-5 space-y-0.5">
                <li>Todos los integrantes redactan cualquier capítulo; cada versión guarda quién la escribió.</li>
                <li>Cada guardado es una versión nueva (nada se sobrescribe); se puede ver el historial y volver a una anterior.</li>
                <li>Guardado automático, aviso de quién está editando y protección si dos guardan a la vez.</li>
              </ul>
            </Tarjeta>
            <Tarjeta titulo="Revisión y entrega">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3 text-sm text-gray-700">
                  <span>El asesor revisa capítulo por capítulo<span className="block text-[11px] text-gray-500">Si no, el equipo envía el documento completo.</span></span>
                  <Interruptor etiqueta="Revisión por capítulo" activo={informe.revision.porCapitulo} deshabilitado={!editable} onChange={(v) => revision({ porCapitulo: v })} />
                </div>
                <div className="flex items-start justify-between gap-3 text-sm text-gray-700">
                  <span>Todos ratifican la versión final<span className="block text-[11px] text-gray-500">Solo aplica en equipo. La versión entregada queda congelada con su huella.</span></span>
                  <Interruptor etiqueta="Ratificación final" activo={informe.revision.ratificacion} deshabilitado={!editable} onChange={(v) => revision({ ratificacion: v })} />
                </div>
                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <label htmlFor="if-dias" className={etiquetaCompacta}>Plazo del asesor por revisión</label>
                    <div className="flex items-center gap-1.5">
                      <input id="if-dias" type="number" min={1} max={30} className={`${campoCompacto} w-[4.5rem]`} disabled={!editable}
                        value={informe.revision.diasRevision} onChange={(e) => revision({ diasRevision: Number(e.target.value) })} />
                      <span className="text-xs text-gray-500">días</span>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-gray-600 pb-2">
                    Hábiles
                    <Interruptor etiqueta="Días hábiles" activo={informe.revision.diasHabiles} deshabilitado={!editable} onChange={(v) => revision({ diasHabiles: v })} />
                  </label>
                </div>
              </div>
            </Tarjeta>
          </div>
        </div>
      </section>

      <EditorPropuesta key="informe_final" tipoEtapa="informe_final" definicion={definicion} editable={editable} problemas={problemas} onChange={onChange} />
    </div>
  );
}
