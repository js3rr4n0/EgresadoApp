"use client";

import {
  TIPOS_FUENTE,
  MAX_AUTORES_CITA,
  formatearIniciales,
  segmentosCitaApa,
  validarCitaApa,
  type DatosCitaApa,
  type TipoFuente,
} from "@/lib/citaApa";

const campoBase =
  "min-w-0 bg-white border border-border rounded-lg px-3 py-1.5 text-xs font-medium focus:ring-1 focus:ring-unicaes outline-none disabled:bg-slate-100 disabled:text-slate-500";
const campo = `w-full ${campoBase}`;
const etiqueta = "block text-[10px] font-bold uppercase text-slate-400 mb-1";

/** Referencia APA 7 por campos: el sistema arma la referencia con el formato correcto y señala lo que falta. */
export default function CitaApaCampos({
  datos,
  onChange,
  deshabilitado,
  citaAnterior,
}: {
  datos: DatosCitaApa;
  onChange: (d: DatosCitaApa) => void;
  deshabilitado?: boolean;
  /** Referencia de texto libre registrada antes de existir los campos. */
  citaAnterior?: string | null;
}) {
  const set = <K extends keyof DatosCitaApa>(k: K, v: DatosCitaApa[K]) => onChange({ ...datos, [k]: v });
  const setAutor = (i: number, k: "apellidos" | "iniciales", v: string) =>
    set(
      "autores",
      datos.autores.map((a, j) => (j === i ? { ...a, [k]: v } : a))
    );

  const usado = datos.titulo.trim() || datos.autores.some((a) => a.apellidos.trim()) || datos.autorInstitucional.trim();
  const problemas = usado ? validarCitaApa(datos) : [];
  const segmentos = segmentosCitaApa(datos);

  const texto = (k: keyof DatosCitaApa, label: string, placeholder: string, extra = "") => (
    <div className={extra}>
      <label className={etiqueta}>{label}</label>
      <input
        type="text"
        value={datos[k] as string}
        disabled={deshabilitado}
        onChange={(e) => set(k, e.target.value as never)}
        placeholder={placeholder}
        className={campo}
      />
    </div>
  );

  return (
    <div className="space-y-3">
      {citaAnterior && !usado && (
        <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-[11px] text-slate-600 font-semibold space-y-1">
          <p>Referencia registrada en texto libre:</p>
          <p className="font-medium italic">{citaAnterior}</p>
          {!deshabilitado && <p>Complete los campos para registrarla con el formato APA 7.</p>}
        </div>
      )}

      <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Tipo de fuente">
        {TIPOS_FUENTE.map((t) => (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={datos.tipo === t.id}
            disabled={deshabilitado}
            onClick={() => set("tipo", t.id as TipoFuente)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
              datos.tipo === t.id ? "bg-unicaes text-white border-unicaes" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <span className={etiqueta}>Autores (apellidos e iniciales del nombre)</span>
        {datos.autores.map((a, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input
              type="text"
              value={a.apellidos}
              disabled={deshabilitado}
              onChange={(e) => setAutor(i, "apellidos", e.target.value)}
              placeholder="Apellidos (ej.: Pressman)"
              aria-label={`Apellidos del autor ${i + 1}`}
              className={`${campoBase} flex-1`}
            />
            <input
              type="text"
              value={a.iniciales}
              disabled={deshabilitado}
              onChange={(e) => setAutor(i, "iniciales", e.target.value)}
              onBlur={(e) => setAutor(i, "iniciales", formatearIniciales(e.target.value))}
              placeholder="Iniciales (ej.: R. S.)"
              aria-label={`Iniciales del autor ${i + 1}`}
              className={`${campoBase} w-32 shrink-0`}
            />
            {!deshabilitado && datos.autores.length > 1 && (
              <button
                type="button"
                onClick={() => set("autores", datos.autores.filter((_, j) => j !== i))}
                className="text-[11px] font-bold text-red-600 hover:text-red-700 shrink-0"
              >
                Quitar
              </button>
            )}
          </div>
        ))}
        {!deshabilitado && datos.autores.length < MAX_AUTORES_CITA && (
          <button
            type="button"
            onClick={() => set("autores", [...datos.autores, { apellidos: "", iniciales: "" }])}
            className="text-[11px] font-bold text-unicaes hover:underline"
          >
            Agregar autor
          </button>
        )}
        {texto("autorInstitucional", "Autor institucional (solo si no hay autores personales)", "Ej.: Organización Mundial de la Salud")}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
        {texto("anio", "Año", "Ej.: 2010 o s.f.")}
        {texto("titulo", datos.tipo === "articulo" ? "Título del artículo" : datos.tipo === "web" ? "Título de la página" : "Título del libro", "Título completo", "sm:col-span-3")}
        {datos.tipo === "libro" && (
          <>
            {texto("edicion", "Edición (número)", "Ej.: 7")}
            {texto("editorial", "Editorial", "Ej.: McGraw-Hill", "sm:col-span-3")}
          </>
        )}
        {datos.tipo === "articulo" && (
          <>
            {texto("revista", "Nombre de la revista", "Ej.: Revista Ingeniería", "sm:col-span-2")}
            {texto("volumen", "Volumen", "Ej.: 12")}
            {texto("numero", "Número", "Ej.: 3")}
            {texto("paginas", "Páginas", "Ej.: 45-60")}
            {texto("url", "DOI o URL (opcional)", "https://doi.org/...", "sm:col-span-3")}
          </>
        )}
        {datos.tipo === "web" && (
          <>
            {texto("sitio", "Nombre del sitio web", "Ej.: Microsoft Learn", "sm:col-span-2")}
            {texto("url", "URL", "https://...", "sm:col-span-2")}
          </>
        )}
      </div>

      {usado && (
        <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-1.5">
          <p className="text-[10px] font-bold uppercase text-slate-400">Así aparecerá la referencia en el informe</p>
          <p className="text-xs text-slate-800 font-medium">
            {segmentos.map((s, i) => (s.cursiva ? <em key={i}>{s.texto}</em> : <span key={i}>{s.texto}</span>))}
          </p>
          {problemas.length > 0 && (
            <ul className="list-disc pl-5 text-[11px] text-amber-800 font-semibold space-y-0.5">
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
