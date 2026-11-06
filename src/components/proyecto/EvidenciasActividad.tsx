"use client";

// Evidencias de una actividad del plan (reunión 6-nov-2026): imágenes, documentos PDF o enlaces (por ejemplo, a un
// video) que respaldan el resultado. Las imágenes piden su pie y su origen, con los mismos campos que pasantía; en el
// informe del período se numeran en el orden del plan. El servidor valida todo otra vez (evidenciasPlan.ts).
import { useState } from "react";
import { useRouter } from "next/navigation";
import { eliminarEvidenciaPlan, subirEvidenciaPlan, type EvidenciaCompleta } from "@/app/actions/evidenciasPlan";
import OrigenImagenCampos, { type DatosOrigenImagen } from "@/app/egresado/reportes/actividad/[actividadId]/OrigenImagenCampos";
import { AVISO_ORIGEN_IMAGEN, notaImagen, validarOrigenImagen } from "@/lib/fuenteImagen";
import { MAX_CARACTERES_LEYENDA } from "@/lib/reglasRegistroActividad";
import { reducirImagen } from "@/lib/reducirImagen";
import { openDocument } from "@/lib/pdfViewer";

type Tipo = "imagen" | "documento" | "enlace";

const TIPOS: { id: Tipo; label: string; ayuda: string }[] = [
  { id: "imagen", label: "Imagen", ayuda: "Fotografía o captura (PNG o JPG). Se incluye en el informe con su pie y su origen." },
  { id: "documento", label: "Documento PDF", ayuda: "Acta, manual, informe técnico u otro documento (hasta 10 MB)." },
  { id: "enlace", label: "Enlace", ayuda: "Video, repositorio, sitio publicado u otro recurso en línea." },
];

const campo = "w-full bg-white border border-border rounded-lg px-3 py-2 text-xs font-semibold focus:ring-1 focus:ring-unicaes outline-none";
const etiqueta = "block text-[10px] font-bold uppercase text-slate-400";

export default function EvidenciasActividad({
  propuestaId,
  nodoId,
  periodo,
  evidencias,
  limite,
  editable,
}: {
  propuestaId: number;
  nodoId: string;
  periodo: number;
  evidencias: EvidenciaCompleta[];
  limite: { min: number; max: number };
  editable: boolean;
}) {
  const router = useRouter();
  const [tipo, setTipo] = useState<Tipo>("imagen");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [leyenda, setLeyenda] = useState("");
  const [origen, setOrigen] = useState<DatosOrigenImagen>({ origen: null, fuente: null });
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputKey, setInputKey] = useState(0);

  const lleno = evidencias.length >= limite.max;
  const listo =
    leyenda.trim().length >= 3 &&
    (tipo === "enlace" ? /^https?:\/\/\S+$/.test(url.trim()) : !!archivo) &&
    (tipo !== "imagen" || validarOrigenImagen(origen.origen, origen.fuente).length === 0);

  const limpiar = () => {
    setArchivo(null);
    setUrl("");
    setLeyenda("");
    setOrigen({ origen: null, fuente: null });
    setInputKey((k) => k + 1);
  };

  async function adjuntar() {
    setError(null);
    setOcupado(true);
    const fd = new FormData();
    fd.set("tipo", tipo);
    fd.set("leyenda", leyenda.trim());
    if (tipo === "enlace") fd.set("url", url.trim());
    else if (archivo) fd.set("archivo", tipo === "imagen" ? await reducirImagen(archivo, "evidencia.jpg") : archivo);
    if (tipo === "imagen") {
      fd.set("origen", origen.origen ?? "");
      fd.set("fuente", JSON.stringify(origen.fuente));
    }
    const res = await subirEvidenciaPlan(propuestaId, nodoId, periodo, fd);
    setOcupado(false);
    if (!res.success) return setError(res.error);
    limpiar();
    router.refresh();
  }

  async function quitar(id: number) {
    if (!window.confirm("¿Quitar esta evidencia de la actividad?")) return;
    setError(null);
    setOcupado(true);
    const res = await eliminarEvidenciaPlan(propuestaId, id);
    setOcupado(false);
    if (!res.success) return setError(res.error);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {evidencias.length === 0 ? (
        <p className="text-xs text-slate-500 font-semibold">Todavía no hay evidencias adjuntas.</p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {evidencias.map((e, i) => {
            const nota = e.tipo === "imagen" ? notaImagen(e.origen, e.fuente) : [];
            return (
              <li key={e.id} className="border border-slate-200 rounded-xl p-3 space-y-2 bg-slate-50">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
                    Evidencia {i + 1} · {TIPOS.find((t) => t.id === e.tipo)?.label}
                  </span>
                  {editable && (
                    <button type="button" disabled={ocupado} onClick={() => quitar(e.id)} className="text-[11px] font-bold text-red-600 hover:underline disabled:opacity-50">
                      Quitar
                    </button>
                  )}
                </div>
                {e.tipo === "imagen" && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={e.url} alt={e.leyenda} className="w-full max-h-48 object-contain rounded-lg border border-slate-200 bg-white" />
                )}
                <p className="text-xs font-bold text-slate-800">{e.leyenda}</p>
                {nota.length > 0 && (
                  <p className="text-[11px] text-slate-500 font-medium">
                    {nota.map((s, k) => (s.cursiva ? <em key={k}>{s.texto}</em> : <span key={k}>{s.texto}</span>))}
                  </p>
                )}
                {e.tipo === "documento" && (
                  <button type="button" onClick={() => openDocument(e.url, e.nombre ?? e.leyenda)} className="text-[11px] font-bold text-unicaes hover:underline">
                    Abrir {e.nombre ?? "documento"}
                  </button>
                )}
                {e.tipo === "enlace" && (
                  <a href={e.url} target="_blank" rel="noopener noreferrer" className="block text-[11px] font-bold text-unicaes hover:underline break-all">
                    {e.url}
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {error && <div className="p-3 bg-red-50 text-red-600 border border-red-200 rounded-xl text-xs font-bold">{error}</div>}

      {editable && !lleno && (
        <div className="border border-dashed border-slate-300 rounded-xl p-4 space-y-3">
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Tipo de evidencia">
            {TIPOS.map((t) => (
              <button key={t.id} type="button" role="radio" aria-checked={tipo === t.id}
                onClick={() => { setTipo(t.id); setArchivo(null); setInputKey((k) => k + 1); }}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${tipo === t.id ? "bg-unicaes text-white border-unicaes" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"}`}>
                {t.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-500 font-semibold">{TIPOS.find((t) => t.id === tipo)?.ayuda}</p>
          {tipo === "enlace" ? (
            <div className="space-y-1">
              <label htmlFor="evidencia-url" className={etiqueta}>Dirección del enlace</label>
              <input id="evidencia-url" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" className={campo} />
            </div>
          ) : (
            <div className="space-y-1">
              <label htmlFor="evidencia-archivo" className={etiqueta}>{tipo === "imagen" ? "Imagen" : "Documento"}</label>
              <input key={inputKey} id="evidencia-archivo" type="file" accept={tipo === "imagen" ? "image/png,image/jpeg" : "application/pdf"}
                onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} className="block text-xs font-semibold text-slate-700" />
            </div>
          )}
          <div className="space-y-1">
            <label htmlFor="evidencia-leyenda" className={etiqueta}>{tipo === "imagen" ? "Pie de imagen (obligatorio)" : "Descripción (obligatoria)"}</label>
            <input id="evidencia-leyenda" type="text" value={leyenda} maxLength={MAX_CARACTERES_LEYENDA} onChange={(e) => setLeyenda(e.target.value)}
              placeholder="Descripción breve de lo que demuestra" className={campo} />
            <p className="text-[10px] text-slate-400 font-semibold text-right">{leyenda.length}/{MAX_CARACTERES_LEYENDA} caracteres</p>
          </div>
          {tipo === "imagen" && (
            <>
              <OrigenImagenCampos idBase="evidencia" valor={origen} onChange={setOrigen} />
              <p className="text-[10px] text-slate-500 font-semibold">{AVISO_ORIGEN_IMAGEN}</p>
            </>
          )}
          <div className="flex justify-end">
            <button type="button" disabled={!listo || ocupado} onClick={adjuntar}
              className="px-5 py-2 rounded-lg bg-unicaes hover:bg-unicaes-hover text-white text-xs font-extrabold transition-colors disabled:opacity-50">
              {ocupado ? "Adjuntando..." : "Adjuntar evidencia"}
            </button>
          </div>
        </div>
      )}
      {editable && lleno && <p className="text-[11px] text-slate-500 font-semibold">Alcanzó el máximo de {limite.max} evidencia(s) para esta actividad.</p>}
    </div>
  );
}
