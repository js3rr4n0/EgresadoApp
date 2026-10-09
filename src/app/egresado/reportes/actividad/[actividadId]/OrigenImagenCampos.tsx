"use client";

import {
  ORIGENES_IMAGEN,
  fuenteImagenVacia,
  notaImagen,
  validarOrigenImagen,
  type FuenteImagen,
  type OrigenImagen,
} from "@/lib/fuenteImagen";

export interface DatosOrigenImagen {
  origen: OrigenImagen | null;
  fuente: FuenteImagen | null;
}

const campo =
  "w-full min-w-0 bg-white border border-border rounded-lg px-3 py-1.5 text-xs font-medium focus:ring-1 focus:ring-unicaes outline-none disabled:bg-slate-100 disabled:text-slate-500";
const etiqueta = "block text-[10px] font-bold uppercase text-slate-400 mb-1";

/**
 * ¿Cuál es el origen de la imagen? Autoría propia (la nota indica "Elaboración propia") o fuente externa, que exige citar
 * de dónde se obtuvo (APA 7: "Tomado de" o "Adaptado de" con título, autor, año, sitio y URL).
 */
export default function OrigenImagenCampos({
  valor,
  onChange,
  deshabilitado,
  idBase,
}: {
  valor: DatosOrigenImagen;
  onChange: (v: DatosOrigenImagen) => void;
  deshabilitado?: boolean;
  idBase: string;
}) {
  const fuente = valor.fuente ?? fuenteImagenVacia();
  const setFuente = (k: keyof FuenteImagen, v: string) => onChange({ ...valor, fuente: { ...fuente, [k]: v } as FuenteImagen });
  const problemas = valor.origen ? validarOrigenImagen(valor.origen, fuente) : [];
  const nota = notaImagen(valor.origen, fuente);

  const texto = (k: keyof FuenteImagen, label: string, placeholder: string, extra = "") => (
    <div className={extra}>
      <label htmlFor={`${idBase}-${k}`} className={etiqueta}>
        {label}
      </label>
      <input
        id={`${idBase}-${k}`}
        type="text"
        value={fuente[k]}
        disabled={deshabilitado}
        onChange={(e) => setFuente(k, e.target.value)}
        placeholder={placeholder}
        className={campo}
      />
    </div>
  );

  return (
    <div className="space-y-2">
      <span className={etiqueta}>¿Cuál es el origen de la imagen?</span>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="radiogroup" aria-label="Origen de la imagen">
        {ORIGENES_IMAGEN.map((o) => (
          <label
            key={o.id}
            className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
              valor.origen === o.id ? "border-unicaes bg-red-50/40" : "border-slate-200 hover:bg-slate-50"
            } ${deshabilitado ? "cursor-default opacity-80" : ""}`}
          >
            <input
              type="radio"
              name={`${idBase}-origen`}
              checked={valor.origen === o.id}
              disabled={deshabilitado}
              onChange={() => onChange({ origen: o.id, fuente: o.id === "externa" ? fuente : null })}
              className="mt-0.5 accent-unicaes"
            />
            <span>
              <span className="block text-xs font-extrabold text-slate-800">{o.label}</span>
              <span className="block text-[11px] text-slate-500 font-medium">{o.ayuda}</span>
            </span>
          </label>
        ))}
      </div>

      {valor.origen === "externa" && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1">
          <div className="sm:col-span-4 flex flex-wrap gap-3 text-[11px] font-semibold text-slate-700">
            {(
              [
                ["tomada", "Se usa tal como está en la fuente"],
                ["adaptada", "La modifiqué a partir del original"],
              ] as const
            ).map(([id, label]) => (
              <label key={id} className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name={`${idBase}-uso`}
                  checked={fuente.uso === id}
                  disabled={deshabilitado}
                  onChange={() => setFuente("uso", id)}
                  className="accent-unicaes"
                />
                {label}
              </label>
            ))}
          </div>
          {texto("autor", "Autor u organización", "Ej.: Microsoft o R. S. Pressman", "sm:col-span-3")}
          {texto("anio", "Año", "Ej.: 2023 o s.f.")}
          {texto("titulo", "Título de la imagen o página", "Título tal como aparece en la fuente", "sm:col-span-4")}
          {texto("sitio", "Sitio web o publicación", "Ej.: Microsoft Learn", "sm:col-span-2")}
          {texto("url", "URL", "https://...", "sm:col-span-2")}
        </div>
      )}

      {nota.length > 0 && (
        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
          <p className="text-[10px] font-bold uppercase text-slate-400">Nota que aparecerá bajo la imagen</p>
          <p className="text-[11px] text-slate-700 font-medium">
            {nota.map((s, i) => (s.cursiva ? <em key={i}>{s.texto}</em> : <span key={i}>{s.texto}</span>))}
          </p>
          {problemas.length > 0 && (
            <ul className="list-disc pl-5 text-[11px] text-amber-800 font-semibold">
              {problemas.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
