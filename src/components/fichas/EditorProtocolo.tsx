"use client";

import { esEtapaPlan, esEtapaProtocolo, type DefinicionFicha, type EtapaProtocolo } from "@/lib/fichas/tipos";
import type { ProblemaFicha } from "@/lib/fichas/validar";
import { planNuevo, protocoloNuevo } from "@/lib/fichas/plantillas";
import EditorPropuesta, { campoCompacto, EncabezadoSeccion, etiquetaCompacta, Interruptor, Tarjeta } from "./EditorPropuesta";
import { nuevoId } from "./ids";

/**
 * Pestaña "Protocolo" del constructor (investigación, contexto del 12-nov-2026). El protocolo se redacta después de
 * la propuesta aprobada, junto con el plan de trabajo, y lo dictamina el asesor.
 */
export default function EditorProtocolo({
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
  const protocolo = definicion.etapas.find(esEtapaProtocolo);
  const tienePlan = definicion.etapas.some(esEtapaPlan);

  if (!protocolo) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-3">
        <h2 className="font-bold text-gray-800">Esta ficha no tiene protocolo</h2>
        <p className="text-sm text-gray-600 max-w-2xl">
          En investigación, después de aprobar la propuesta se presenta el <strong>protocolo</strong>: introducción, generalidades,
          hipótesis, metodología, esquema del informe final, bibliografía y anexos. Su cronograma de actividades es el plan de
          trabajo, y el asesor dictamina los dos juntos.
        </p>
        {editable && (
          <button type="button" onClick={() => {
            const [propuesta, ...resto] = definicion.etapas;
            // El plan de trabajo es el cronograma del protocolo: si no existe, se agrega con él.
            const plan = tienePlan ? [] : [planNuevo(nuevoId("plan"), definicion.modalidad)];
            onChange({ ...definicion, etapas: [propuesta, protocoloNuevo(nuevoId("protocolo")), ...plan, ...resto] });
          }} className="px-3.5 py-2 rounded-lg text-sm font-bold bg-brand-red hover:bg-red-800 text-white">
            + Agregar protocolo{tienePlan ? "" : " y plan de trabajo"}
          </button>
        )}
      </div>
    );
  }

  const set = (cambios: Partial<EtapaProtocolo>) =>
    onChange({ ...definicion, etapas: definicion.etapas.map((e) => (esEtapaProtocolo(e) ? { ...e, ...cambios } : e)) });
  const revision = (cambios: Partial<EtapaProtocolo["revision"]>) => set({ revision: { ...protocolo.revision, ...cambios } });
  const propios = problemas.filter((p) => p.ubicacion === protocolo.id || (p.ubicacion === "ficha" && p.mensaje.includes("protocolo")));

  return (
    <div className="space-y-4">
      <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <header className="px-4 py-2.5 border-b border-gray-100 bg-gray-50 flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xs font-bold text-white bg-violet-600 rounded-md px-2 py-1 shrink-0">Después de la propuesta</span>
            <label htmlFor="prot-nombre" className="sr-only">Nombre de la etapa</label>
            <input id="prot-nombre" className={`${campoCompacto} font-bold w-64 max-w-full`} disabled={!editable} value={protocolo.nombre} onChange={(e) => set({ nombre: e.target.value })} />
          </div>
          {editable && (
            <button type="button" className="text-xs font-bold text-gray-400 hover:text-red-700"
              onClick={() => { if (window.confirm("¿Quitar el protocolo? El plan de trabajo se conserva.")) onChange({ ...definicion, etapas: definicion.etapas.filter((e) => !esEtapaProtocolo(e)) }); }}>
              Quitar protocolo
            </button>
          )}
        </header>

        <div className="p-4 space-y-4">
          {propios.length > 0 && (
            <ul className="text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg px-3 py-2 space-y-1">
              {propios.map((p, i) => <li key={i}>{p.mensaje}</li>)}
            </ul>
          )}

          <EncabezadoSeccion titulo="Estructura" descripcion="Las partes del protocolo son los espacios de abajo." />
          <ul className="text-[12px] text-gray-600 list-disc pl-5 space-y-0.5">
            <li>La <strong>portada</strong> y el <strong>índice</strong> se generan con los datos del trabajo: no son espacios.</li>
            <li>El <strong>cronograma de actividades</strong> es el plan de trabajo (pestaña Plan de trabajo){tienePlan ? "." : ": esta ficha todavía no lo tiene."}</li>
            <li>Un texto o un apartado académico puede <strong>precargarse</strong> con una respuesta de la propuesta (problemática, justificación, objetivos).</li>
            <li>Los <strong>apartados académicos</strong> se redactan por subapartados, con guía, autoevaluación y revisión de redacción y citas APA 7 (guía de UNICAES).</li>
          </ul>

          <EncabezadoSeccion titulo="Comportamiento" descripcion="Cómo se entrega y se revisa el protocolo." />
          <Tarjeta titulo="Revisión y dictamen">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="prot-dias" className={etiquetaCompacta}>Plazo del asesor para el dictamen</label>
                <div className="flex items-center gap-1.5">
                  <input id="prot-dias" type="number" min={1} max={30} className={`${campoCompacto} w-[4.5rem]`} disabled={!editable}
                    value={protocolo.revision.diasRevision} onChange={(e) => revision({ diasRevision: Number(e.target.value) })} />
                  <span className="text-xs text-gray-500">días</span>
                </div>
              </div>
              <div className="flex items-start justify-between gap-3 text-sm text-gray-700">
                <span>Contar solo días hábiles<span className="block text-[11px] text-gray-500">Sin sábados ni domingos.</span></span>
                <Interruptor etiqueta="Contar solo días hábiles" activo={protocolo.revision.diasHabiles} deshabilitado={!editable} onChange={(v) => revision({ diasHabiles: v })} />
              </div>
              <div className="flex items-start justify-between gap-3 text-sm text-gray-700 sm:col-span-2">
                <span>
                  Todos los integrantes ratifican antes de enviar
                  <span className="block text-[11px] text-gray-500">Como en la propuesta: todos participan en todas las fases. Solo aplica en equipo.</span>
                </span>
                <Interruptor etiqueta="Ratificación del equipo" activo={protocolo.revision.ratificacion} deshabilitado={!editable} onChange={(v) => revision({ ratificacion: v })} />
              </div>
            </div>
          </Tarjeta>
        </div>
      </section>

      <EditorPropuesta key="protocolo" tipoEtapa="protocolo" definicion={definicion} editable={editable} problemas={problemas} onChange={onChange} />
    </div>
  );
}
