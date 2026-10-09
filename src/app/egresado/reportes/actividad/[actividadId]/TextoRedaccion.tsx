"use client";

import { contarPalabras, normalizarTexto, terminaEnPunto } from "@/lib/reglasRegistroActividad";

const areaTexto =
  "w-full bg-white border border-border rounded-lg px-3 py-2 text-xs font-medium leading-relaxed focus:ring-1 focus:ring-unicaes outline-none resize-none disabled:bg-slate-100 disabled:text-slate-500";

/**
 * Cuadro de redacción de un apartado de la actividad: no admite espacios dobles ni líneas en blanco (los párrafos se
 * separan con un solo Enter), muestra el conteo de palabras frente al rango permitido y recuerda terminar con punto.
 */
export default function TextoRedaccion({
  id,
  valor,
  onChange,
  deshabilitado,
  filas,
  placeholder,
  minimo,
  maximo,
}: {
  id: string;
  valor: string;
  onChange: (v: string) => void;
  deshabilitado?: boolean;
  filas: number;
  placeholder: string;
  minimo?: number;
  maximo?: number;
}) {
  const palabras = contarPalabras(valor);
  const conRango = minimo !== undefined && maximo !== undefined;
  const enRango = !conRango || (palabras >= minimo && palabras <= maximo);
  const faltaPunto = valor.trim().length > 0 && !terminaEnPunto(valor);

  const alPresionar = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    const antes = el.value.slice(0, el.selectionStart);
    const despues = el.value.slice(el.selectionEnd);
    if (e.key === " " && (antes.endsWith(" ") || antes.endsWith("\n") || antes === "" || despues.startsWith(" "))) {
      e.preventDefault();
    }
    if (e.key === "Enter" && (antes.trim() === "" || antes.endsWith("\n") || despues.startsWith("\n"))) {
      e.preventDefault();
    }
  };

  // Lo pegado o dictado también se normaliza (sin espacios dobles ni líneas en blanco).
  const alCambiar = (texto: string) => {
    const tieneDobles = / {2,}|\n\s*\n|^\s/.test(texto);
    onChange(tieneDobles ? normalizarTexto(texto) : texto);
  };

  const porcentaje = conRango ? Math.min(100, Math.round((palabras / maximo) * 100)) : 0;
  const marcaMinimo = conRango ? Math.round((minimo / maximo) * 100) : 0;

  return (
    <div className="space-y-1.5">
      <textarea
        id={id}
        rows={filas}
        value={valor}
        disabled={deshabilitado}
        onKeyDown={alPresionar}
        onChange={(e) => alCambiar(e.target.value)}
        placeholder={placeholder}
        lang="es"
        spellCheck
        className={areaTexto}
      />
      {conRango && (
        <div className="space-y-1">
          <div className="relative h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${palabras > maximo ? "bg-red-600" : enRango ? "bg-emerald-600" : "bg-amber-500"}`}
              style={{ width: `${porcentaje}%` }}
            />
            <div className="absolute top-0 h-full w-0.5 bg-slate-500" style={{ left: `${marcaMinimo}%` }} title={`Mínimo: ${minimo} palabras`} />
          </div>
          <div className="flex flex-wrap justify-between gap-x-3 text-[11px] font-semibold">
            <span className={palabras > maximo ? "text-red-700" : enRango ? "text-emerald-700" : "text-amber-700"}>
              {palabras} palabra{palabras === 1 ? "" : "s"}
              {palabras < minimo
                ? ` · faltan ${minimo - palabras} para el mínimo`
                : palabras > maximo
                  ? ` · sobran ${palabras - maximo}`
                  : " · dentro del rango"}
            </span>
            <span className="text-slate-400">
              Mínimo {minimo}, máximo {maximo} palabras
            </span>
          </div>
        </div>
      )}
      {faltaPunto && !deshabilitado && <p className="text-[11px] text-amber-700 font-semibold">El texto debe terminar con punto.</p>}
    </div>
  );
}
