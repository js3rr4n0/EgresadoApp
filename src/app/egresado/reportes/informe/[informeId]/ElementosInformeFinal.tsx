"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { guardarAgradecimientos, guardarApartadoExtra, subirCartaFinalizacion, eliminarCartaFinalizacion } from "@/app/actions/informeFinal";
import { contarPalabras, normalizarTexto, parrafosDe } from "@/lib/reglasRegistroActividad";
import {
  AYUDA_CARTA_FINALIZACION,
  MAX_PALABRAS_AGRADECIMIENTOS,
  MAX_PARRAFOS_AGRADECIMIENTOS,
  validarAgradecimientos,
} from "@/lib/informeFinal";

/** Capítulo de texto que la ficha agrega al documento final (entrega W3). */
export interface CapituloExtraEgresado { clave: string; titulo: string; ayuda: string; minPalabras: number; maxPalabras: number; texto: string }

function CapituloExtra({ informeId, editable, cap }: { informeId: number; editable: boolean; cap: CapituloExtraEgresado }) {
  const router = useRouter();
  const [valor, setValor] = useState(cap.texto);
  const [guardado, setGuardado] = useState(cap.texto);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const palabras = normalizarTexto(valor) ? contarPalabras(normalizarTexto(valor)) : 0;
  const fuera = (cap.minPalabras > 0 && palabras < cap.minPalabras) || (cap.maxPalabras > 0 && palabras > cap.maxPalabras);
  const id = `extra-${cap.clave.replace(":", "-")}`;
  const guardar = async () => {
    setOcupado(true);
    setError(null);
    const res = await guardarApartadoExtra(informeId, cap.clave, valor);
    setOcupado(false);
    if (res.success) { setValor(res.texto ?? ""); setGuardado(res.texto ?? ""); router.refresh(); }
    else setError(res.error || "No se pudo guardar el capítulo.");
  };
  return (
    <div className="space-y-2 pt-4 border-t border-slate-100">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-xs font-extrabold text-slate-800">{cap.titulo}</label>
        <span className={`text-[11px] font-bold ${fuera ? "text-red-700" : "text-slate-500"}`}>
          {palabras} palabras{cap.minPalabras > 0 ? ` · mínimo ${cap.minPalabras}` : ""}{cap.maxPalabras > 0 ? ` · máximo ${cap.maxPalabras}` : ""}
        </span>
      </div>
      {cap.ayuda && <p className="text-[11px] text-slate-500 font-medium">{cap.ayuda}</p>}
      <textarea id={id} rows={8} value={valor} disabled={!editable} onChange={(e) => setValor(e.target.value)}
        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium leading-relaxed focus:ring-1 focus:ring-unicaes outline-none resize-y disabled:bg-slate-50 disabled:text-slate-600" />
      {error && <p className="text-[11px] text-red-700 font-semibold">{error}</p>}
      {editable && (
        <div className="flex justify-end">
          <button type="button" onClick={guardar} disabled={ocupado || normalizarTexto(valor) === normalizarTexto(guardado)}
            className="px-4 py-2 rounded-lg bg-unicaes hover:bg-unicaes-hover text-white text-xs font-extrabold disabled:opacity-40 disabled:cursor-not-allowed">
            {ocupado ? "Guardando..." : "Guardar capítulo"}
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Elementos del informe final que aporta el egresado: los agradecimientos (opcionales) y la carta de finalización
 * satisfactoria emitida por la empresa. El resto del documento lo genera el sistema.
 */
export default function ElementosInformeFinal({
  informeId,
  editable,
  agradecimientos: agradecimientosIniciales,
  carta,
  cartaVerificada,
  conAgradecimientos = true,
  conCarta = true,
  extras = [],
}: {
  informeId: number;
  editable: boolean;
  agradecimientos: string;
  carta: { nombre: string; url: string } | null;
  cartaVerificada: boolean;
  /** Entrega W3: la ficha puede quitar los agradecimientos o la carta y agregar capítulos de texto. */
  conAgradecimientos?: boolean;
  conCarta?: boolean;
  extras?: CapituloExtraEgresado[];
}) {
  const router = useRouter();
  const archivoRef = useRef<HTMLInputElement>(null);
  const [texto, setTexto] = useState(agradecimientosIniciales);
  const [guardado, setGuardado] = useState(agradecimientosIniciales);
  const [ocupado, setOcupado] = useState<"texto" | "carta" | null>(null);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  const limpio = normalizarTexto(texto);
  const palabras = limpio ? contarPalabras(limpio) : 0;
  const parrafos = parrafosDe(limpio).length;
  const problemas = validarAgradecimientos(texto);
  const sinCambios = limpio === normalizarTexto(guardado);

  const guardar = async () => {
    setMensaje(null);
    setOcupado("texto");
    const res = await guardarAgradecimientos(informeId, texto);
    setOcupado(null);
    if (res.success) {
      setTexto(res.texto ?? "");
      setGuardado(res.texto ?? "");
      setMensaje({ tipo: "ok", texto: "Agradecimientos guardados." });
      router.refresh();
    } else setMensaje({ tipo: "error", texto: res.error || "No se pudieron guardar los agradecimientos." });
  };

  const subir = async (archivo: File | undefined) => {
    if (!archivo) return;
    setMensaje(null);
    setOcupado("carta");
    const datos = new FormData();
    datos.append("archivo", archivo);
    const res = await subirCartaFinalizacion(informeId, datos);
    setOcupado(null);
    if (archivoRef.current) archivoRef.current.value = "";
    if (res.success) router.refresh();
    else setMensaje({ tipo: "error", texto: res.error || "No se pudo subir la carta." });
  };

  const quitar = async () => {
    setMensaje(null);
    setOcupado("carta");
    const res = await eliminarCartaFinalizacion(informeId);
    setOcupado(null);
    if (res.success) router.refresh();
    else setMensaje({ tipo: "error", texto: res.error || "No se pudo quitar la carta." });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5">
      <div>
        <h2 className="text-sm font-extrabold text-slate-900">Elementos del informe final</h2>
        <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
          El sistema genera la portada, las autoridades académicas, el índice, la descripción de la empresa, las actividades, las
          conclusiones y los anexos del cronograma. Usted aporta la introducción, los agradecimientos (opcionales) y la carta de finalización.
        </p>
      </div>

      {mensaje && (
        <div
          className={`p-3 rounded-lg border text-xs font-bold ${
            mensaje.tipo === "ok" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          {mensaje.texto}
        </div>
      )}

      {/* Capítulos de texto que agrega la ficha (W3) */}
      {extras.map((cap) => <CapituloExtra key={cap.clave} informeId={informeId} editable={editable} cap={cap} />)}

      {/* Agradecimientos */}
      {conAgradecimientos && (
      <div className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <label htmlFor="agradecimientos" className="text-xs font-extrabold text-slate-800">
            Agradecimientos <span className="font-semibold text-slate-400">(opcional)</span>
          </label>
          <span className={`text-[11px] font-bold ${problemas.length ? "text-red-700" : "text-slate-500"}`}>
            {palabras} de {MAX_PALABRAS_AGRADECIMIENTOS} palabras · {parrafos} de {MAX_PARRAFOS_AGRADECIMIENTOS} párrafos
          </span>
        </div>
        <p className="text-[11px] text-slate-500 font-medium">
          Deben caber en una sola página. Recuerde que es un trabajo de grado: evite comentarios fuera de lugar. Separe los párrafos
          con un salto de línea.
        </p>
        <textarea
          id="agradecimientos"
          rows={8}
          value={texto}
          disabled={!editable}
          onChange={(e) => setTexto(e.target.value)}
          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium leading-relaxed focus:ring-1 focus:ring-unicaes outline-none resize-y disabled:bg-slate-50 disabled:text-slate-600"
        />
        {problemas.length > 0 && (
          <ul className="list-disc pl-5 text-[11px] text-red-700 font-semibold">
            {problemas.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        )}
        {editable && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={guardar}
              disabled={ocupado !== null || sinCambios || problemas.length > 0}
              className="px-4 py-2 rounded-lg bg-unicaes hover:bg-unicaes-hover text-white text-xs font-extrabold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {ocupado === "texto" ? "Guardando..." : "Guardar agradecimientos"}
            </button>
          </div>
        )}
      </div>
      )}

      {/* Carta de finalización satisfactoria */}
      {conCarta && (
      <div className="space-y-2 pt-4 border-t border-slate-100">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-extrabold text-slate-800">Carta de finalización satisfactoria</span>
          {carta && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                cartaVerificada ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-slate-50 text-slate-600 border-slate-200"
              }`}
            >
              {cartaVerificada ? "Verificada por el asesor" : "Pendiente de verificación"}
            </span>
          )}
        </div>
        <p className="text-[11px] text-slate-500 font-medium">{AYUDA_CARTA_FINALIZACION} Imagen PNG o JPG de hasta 5 MB.</p>
        {carta ? (
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={carta.url} alt={carta.nombre} className="w-40 h-52 object-contain border border-slate-200 rounded-lg bg-slate-50" />
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-700 break-all">{carta.nombre}</p>
              {editable && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => archivoRef.current?.click()}
                    disabled={ocupado !== null}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-[11px] font-bold disabled:opacity-50"
                  >
                    Reemplazar
                  </button>
                  <button
                    type="button"
                    onClick={quitar}
                    disabled={ocupado !== null}
                    className="px-3 py-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-[11px] font-bold disabled:opacity-50"
                  >
                    Quitar
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : editable ? (
          <button
            type="button"
            onClick={() => archivoRef.current?.click()}
            disabled={ocupado !== null}
            className="px-4 py-2 rounded-lg border border-unicaes text-unicaes hover:bg-red-50 text-xs font-extrabold disabled:opacity-50"
          >
            {ocupado === "carta" ? "Subiendo..." : "Adjuntar carta"}
          </button>
        ) : (
          <p className="text-[11px] text-slate-500 font-semibold">No se adjuntó la carta.</p>
        )}
        <input
          ref={archivoRef}
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={(e) => subir(e.target.files?.[0])}
        />
      </div>
      )}
    </div>
  );
}
