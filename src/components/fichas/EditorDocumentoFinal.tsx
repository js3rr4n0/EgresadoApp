"use client";
// Contenido del documento final y del informe de período de pasantía (entrega W3): títulos, partes opcionales, orden y
// capítulos de texto que redacta el egresado. Sin cambios, es la estructura de la fase 1.

import {
  CAPITULOS_OBLIGATORIOS, esCapituloExtra, leerConfigFinal, leerConfigPeriodo, NOMBRE_ANEXO, NOMBRE_CAPITULO, PREFIJO_EXTRA,
  type CapituloDocFinal, type ConfigDocumentoFinal, type ConfigInformePeriodo,
} from "@/lib/fichas/documentoFinalPasantia";
import type { ClaveCapituloSistema } from "@/lib/fichas/documentoFinalPasantia";
import { campoCompacto, etiquetaCompacta, Interruptor, Tarjeta } from "./EditorPropuesta";
import { nuevoId } from "./ids";

function mover<T>(lista: T[], i: number, d: number): T[] {
  const j = i + d;
  if (j < 0 || j >= lista.length) return lista;
  const copia = [...lista];
  [copia[i], copia[j]] = [copia[j], copia[i]];
  return copia;
}

function Flechas({ i, total, editable, onMover, nombre }: { i: number; total: number; editable: boolean; onMover: (d: number) => void; nombre: string }) {
  return (
    <span className="flex flex-col">
      <button type="button" aria-label={`Subir ${nombre}`} disabled={!editable || i === 0} onClick={() => onMover(-1)} className="text-gray-400 hover:text-gray-800 text-[10px] leading-none px-1 py-0.5 disabled:opacity-30">▲</button>
      <button type="button" aria-label={`Bajar ${nombre}`} disabled={!editable || i === total - 1} onClick={() => onMover(1)} className="text-gray-400 hover:text-gray-800 text-[10px] leading-none px-1 py-0.5 disabled:opacity-30">▼</button>
    </span>
  );
}

export default function EditorDocumentoFinal({ pre, documentoFinal, periodo, editable, onChange }: {
  pre: string;
  documentoFinal: unknown;
  periodo: unknown;
  editable: boolean;
  onChange: (cambios: { documentoFinal: ConfigDocumentoFinal; periodo: ConfigInformePeriodo }) => void;
}) {
  const c = leerConfigFinal(documentoFinal);
  const per = leerConfigPeriodo(periodo);
  const guardar = (doc: ConfigDocumentoFinal, p: ConfigInformePeriodo = per) => onChange({ documentoFinal: doc, periodo: p });
  const setCap = (i: number, cambios: Partial<CapituloDocFinal>) => guardar({ ...c, capitulos: c.capitulos.map((x, k) => (k === i ? { ...x, ...cambios } : x)) });
  const agregarCapitulo = () =>
    guardar({ ...c, capitulos: [...c.capitulos, { clave: `${PREFIJO_EXTRA}${nuevoId("cap")}`, titulo: "NUEVO CAPÍTULO", activo: true, ayuda: "", minPalabras: 100, maxPalabras: 0 }] });

  return (
    <div className="grid lg:grid-cols-2 gap-3">
      <Tarjeta titulo="Documento final: capítulos">
        <div className="space-y-2">
          <p className="text-[11px] text-gray-500">
            La portada, las autoridades y los índices los arma el sistema. Cambie el título de un capítulo, quítelo si no es obligatorio, cámbielo de lugar o
            agregue capítulos de texto que redacta el egresado.
          </p>
          <div className="flex items-center justify-between gap-3 text-sm text-gray-700 border border-gray-100 rounded-md px-2 py-1.5">
            <span>Hoja de agradecimientos (opcional para el egresado)</span>
            <Interruptor etiqueta="Hoja de agradecimientos" activo={c.agradecimientos} deshabilitado={!editable} onChange={(v) => guardar({ ...c, agradecimientos: v })} />
          </div>
          <ol className="space-y-1.5">
            {c.capitulos.map((x, i) => {
              const extra = esCapituloExtra(x.clave);
              const obligatorio = !extra && CAPITULOS_OBLIGATORIOS.includes(x.clave as ClaveCapituloSistema);
              return (
                <li key={x.clave} className={`rounded-md border px-2 py-1.5 ${x.activo ? "border-gray-200 bg-white" : "border-dashed border-gray-200 bg-gray-50 opacity-70"}`}>
                  <div className="flex items-center gap-2">
                    <span className="w-5 text-[11px] font-bold text-gray-400 text-right">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <label htmlFor={`${pre}-cap-${i}`} className="sr-only">Título del capítulo {i + 1}</label>
                      <input id={`${pre}-cap-${i}`} className={`${campoCompacto} w-full font-bold`} disabled={!editable} value={x.titulo} onChange={(e) => setCap(i, { titulo: e.target.value })} />
                      <div className="text-[11px] text-gray-500 mt-0.5">{extra ? "Texto que redacta el egresado" : NOMBRE_CAPITULO[x.clave as ClaveCapituloSistema]}</div>
                    </div>
                    <Flechas i={i} total={c.capitulos.length} editable={editable} nombre={x.titulo} onMover={(d) => guardar({ ...c, capitulos: mover(c.capitulos, i, d) })} />
                    {obligatorio ? (
                      <span className="text-[10px] font-bold text-gray-500">Obligatorio</span>
                    ) : (
                      <Interruptor etiqueta={`Incluir ${x.titulo}`} activo={x.activo} deshabilitado={!editable} onChange={(v) => setCap(i, { activo: v })} />
                    )}
                  </div>
                  {extra && (
                    <div className="mt-1.5 pl-7 space-y-1.5">
                      <div>
                        <label htmlFor={`${pre}-cap-${i}-ayuda`} className={etiquetaCompacta}>Indicación para el egresado</label>
                        <input id={`${pre}-cap-${i}-ayuda`} className={`${campoCompacto} w-full`} disabled={!editable} value={x.ayuda ?? ""} onChange={(e) => setCap(i, { ayuda: e.target.value })} />
                      </div>
                      <div className="flex flex-wrap items-end gap-2">
                      <div>
                        <label htmlFor={`${pre}-cap-${i}-min`} className={etiquetaCompacta}>Palabras mín.</label>
                        <input id={`${pre}-cap-${i}-min`} type="number" min={0} className={`${campoCompacto} w-20`} disabled={!editable} value={x.minPalabras ?? 0} onChange={(e) => setCap(i, { minPalabras: Number(e.target.value) })} />
                      </div>
                      <div>
                        <label htmlFor={`${pre}-cap-${i}-max`} className={etiquetaCompacta}>Máx. (0 = sin)</label>
                        <input id={`${pre}-cap-${i}-max`} type="number" min={0} className={`${campoCompacto} w-20`} disabled={!editable} value={x.maxPalabras ?? 0} onChange={(e) => setCap(i, { maxPalabras: Number(e.target.value) })} />
                      </div>
                      {editable && (
                        <button type="button" onClick={() => guardar({ ...c, capitulos: c.capitulos.filter((_, k) => k !== i) })} className="text-xs font-bold text-gray-400 hover:text-red-700 pb-1.5">Quitar</button>
                      )}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
          {editable && (
            <button type="button" onClick={agregarCapitulo} className="text-xs font-bold text-brand-red hover:underline">+ Capítulo de texto</button>
          )}
        </div>
      </Tarjeta>

      <div className="space-y-3">
        <Tarjeta titulo="Documento final: anexos">
          <ol className="space-y-1.5">
            {c.anexos.map((a, i) => (
              <li key={a.clave} className={`flex items-center gap-2 rounded-md border px-2 py-1.5 ${a.activo ? "border-gray-200 bg-white" : "border-dashed border-gray-200 bg-gray-50 opacity-70"}`}>
                <span className="w-5 text-[11px] font-bold text-gray-400 text-right">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <label htmlFor={`${pre}-anx-${i}`} className="sr-only">Título del anexo {i + 1}</label>
                  <input id={`${pre}-anx-${i}`} className={`${campoCompacto} w-full`} disabled={!editable} value={a.titulo}
                    onChange={(e) => guardar({ ...c, anexos: c.anexos.map((y, k) => (k === i ? { ...y, titulo: e.target.value } : y)) })} />
                  <div className="text-[11px] text-gray-500 mt-0.5">{NOMBRE_ANEXO[a.clave]}</div>
                </div>
                <Flechas i={i} total={c.anexos.length} editable={editable} nombre={a.titulo} onMover={(d) => guardar({ ...c, anexos: mover(c.anexos, i, d) })} />
                <Interruptor etiqueta={`Incluir ${a.titulo}`} activo={a.activo} deshabilitado={!editable}
                  onChange={(v) => guardar({ ...c, anexos: c.anexos.map((y, k) => (k === i ? { ...y, activo: v } : y)) })} />
              </li>
            ))}
          </ol>
          <p className="text-[11px] text-gray-500 mt-2">Los anexos se numeran solos, en este orden. Sin la carta, el asesor no tiene que verificarla para aprobar.</p>
        </Tarjeta>

        <Tarjeta titulo="Informe de cada período: partes">
          <div className="space-y-2">
            {(["cronograma", "cambios"] as const).map((k) => (
              <div key={k} className="flex items-center gap-2">
                <div className="flex-1">
                  <label htmlFor={`${pre}-per-${k}`} className={etiquetaCompacta}>{k === "cronograma" ? "Cronograma del período" : "Cambios al cronograma"}</label>
                  <input id={`${pre}-per-${k}`} className={`${campoCompacto} w-full`} disabled={!editable} value={per[k].titulo}
                    onChange={(e) => guardar(c, { ...per, [k]: { ...per[k], titulo: e.target.value } })} />
                </div>
                <Interruptor etiqueta={`Incluir ${per[k].titulo}`} activo={per[k].activo} deshabilitado={!editable}
                  onChange={(v) => guardar(c, { ...per, [k]: { ...per[k], activo: v } })} />
              </div>
            ))}
            <p className="text-[11px] text-gray-500">Los datos generales y las actividades de cada semana siempre van.</p>
          </div>
        </Tarjeta>
      </div>
    </div>
  );
}
