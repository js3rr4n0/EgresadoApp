"use client";

import { useEffect, useState } from "react";
import { validarOrigenImagen } from "@/lib/fuenteImagen";
import { reducirImagen } from "@/lib/reducirImagen";
import OrigenImagenCampos, { type DatosOrigenImagen } from "./OrigenImagenCampos";

/** Imagen de anexo: conserva su proporción (no se recorta) y solicita el pie de imagen y su origen. */
export default function SubirAnexo({
  archivo,
  enviando,
  onCancelar,
  onConfirmar,
}: {
  archivo: File;
  enviando: boolean;
  onCancelar: () => void;
  onConfirmar: (imagen: File, pieDeImagen: string, origen: DatosOrigenImagen) => void;
}) {
  const [vista, setVista] = useState<string | null>(null);
  const [pie, setPie] = useState("");
  const [origen, setOrigen] = useState<DatosOrigenImagen>({ origen: null, fuente: null });
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    const lector = new FileReader();
    lector.onload = () => setVista(String(lector.result));
    lector.readAsDataURL(archivo);
    return () => {
      lector.onload = null;
    };
  }, [archivo]);

  const valido = pie.trim().length >= 3 && validarOrigenImagen(origen.origen, origen.fuente).length === 0;

  const confirmar = async () => {
    setProcesando(true);
    const reducida = await reducirImagen(archivo, "anexo.jpg");
    setProcesando(false);
    onConfirmar(reducida, pie.trim(), origen);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
        <div className="p-5 border-b border-slate-200">
          <h3 className="text-base font-extrabold text-slate-900">Agregar imagen de anexo</h3>
          <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
            Las imágenes de anexo forman parte de los anexos del informe final y conservan su proporción original.
          </p>
        </div>
        <div className="p-5 space-y-4">
          {vista && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={vista} alt="Vista previa del anexo" className="mx-auto max-h-56 object-contain rounded-lg border border-slate-200" />
          )}
          <div className="space-y-1">
            <label htmlFor="pie-anexo" className="block text-[10px] font-bold uppercase text-slate-400">
              Pie de imagen (obligatorio)
            </label>
            <input
              id="pie-anexo"
              type="text"
              value={pie}
              maxLength={255}
              onChange={(e) => setPie(e.target.value)}
              placeholder="Descripción breve de la imagen"
              className="w-full bg-white border border-border rounded-lg px-3 py-2 text-xs font-semibold focus:ring-1 focus:ring-unicaes outline-none"
            />
          </div>
          <OrigenImagenCampos idBase="anexo" valor={origen} onChange={setOrigen} />
        </div>
        <div className="p-5 border-t border-slate-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancelar}
            disabled={enviando || procesando}
            className="px-4 py-2 rounded-lg border border-border text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirmar}
            disabled={enviando || procesando || !valido}
            className="px-5 py-2 rounded-lg bg-unicaes hover:bg-unicaes-hover text-white text-xs font-extrabold transition-colors disabled:opacity-50"
          >
            {enviando || procesando ? "Adjuntando..." : "Adjuntar anexo"}
          </button>
        </div>
      </div>
    </div>
  );
}
