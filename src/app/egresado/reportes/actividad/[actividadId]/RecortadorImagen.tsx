"use client";

import { useEffect, useRef, useState } from "react";
import { validarOrigenImagen } from "@/lib/fuenteImagen";
import OrigenImagenCampos, { type DatosOrigenImagen } from "./OrigenImagenCampos";

const LADO_VISTA = 288; // px del recuadro de recorte en pantalla
const LADO_SALIDA = 600; // px de la imagen resultante (5 x 5 cm a ~300 ppp)
const ZOOM_MAXIMO = 4;

/**
 * Recorta una imagen a un cuadrado (5 x 5 cm en el documento): el egresado ubica y amplía la imagen dentro del recuadro
 * y se genera un PNG cuadrado. También solicita el pie de imagen y su origen (propia o fuente externa citada), obligatorios.
 */
export default function RecortadorImagen({
  archivo,
  enviando,
  titulo = "Recortar imagen de soporte",
  onCancelar,
  onConfirmar,
}: {
  archivo: File;
  enviando: boolean;
  titulo?: string;
  onCancelar: () => void;
  onConfirmar: (imagen: Blob, pieDeImagen: string, origen: DatosOrigenImagen) => void;
}) {
  const imagenRef = useRef<HTMLImageElement | null>(null);
  const arrastre = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [dimensiones, setDimensiones] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [desplazamiento, setDesplazamiento] = useState({ x: 0, y: 0 });
  const [pie, setPie] = useState("");
  const [origen, setOrigen] = useState<DatosOrigenImagen>({ origen: null, fuente: null });
  const [errorLectura, setErrorLectura] = useState(false);

  useEffect(() => {
    const lector = new FileReader();
    lector.onload = () => setUrl(String(lector.result));
    lector.onerror = () => setErrorLectura(true);
    lector.readAsDataURL(archivo);
    return () => {
      lector.onload = null;
      lector.onerror = null;
    };
  }, [archivo]);

  const escalaBase = dimensiones ? LADO_VISTA / Math.min(dimensiones.w, dimensiones.h) : 1;
  const escala = escalaBase * zoom;

  // Mantiene la imagen cubriendo todo el recuadro.
  const limitar = (x: number, y: number, esc: number) => {
    if (!dimensiones) return { x, y };
    const minX = LADO_VISTA - dimensiones.w * esc;
    const minY = LADO_VISTA - dimensiones.h * esc;
    return { x: Math.min(0, Math.max(minX, x)), y: Math.min(0, Math.max(minY, y)) };
  };

  const alCargarImagen = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    setDimensiones({ w, h });
    const base = LADO_VISTA / Math.min(w, h);
    setDesplazamiento({ x: (LADO_VISTA - w * base) / 2, y: (LADO_VISTA - h * base) / 2 });
  };

  const cambiarZoom = (nuevoZoom: number) => {
    if (!dimensiones) return;
    // El zoom se aplica respecto al centro del recuadro.
    const nuevaEscala = escalaBase * nuevoZoom;
    const centroX = (LADO_VISTA / 2 - desplazamiento.x) / escala;
    const centroY = (LADO_VISTA / 2 - desplazamiento.y) / escala;
    setZoom(nuevoZoom);
    setDesplazamiento(limitar(LADO_VISTA / 2 - centroX * nuevaEscala, LADO_VISTA / 2 - centroY * nuevaEscala, nuevaEscala));
  };

  const iniciarArrastre = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    arrastre.current = { x: e.clientX, y: e.clientY, ox: desplazamiento.x, oy: desplazamiento.y };
  };

  const moverArrastre = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!arrastre.current) return;
    const { x, y, ox, oy } = arrastre.current;
    setDesplazamiento(limitar(ox + (e.clientX - x), oy + (e.clientY - y), escala));
  };

  const terminarArrastre = () => {
    arrastre.current = null;
  };

  const confirmar = () => {
    const img = imagenRef.current;
    if (!img || !dimensiones) return;
    const canvas = document.createElement("canvas");
    canvas.width = LADO_SALIDA;
    canvas.height = LADO_SALIDA;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, LADO_SALIDA, LADO_SALIDA);
    const lado = LADO_VISTA / escala;
    ctx.drawImage(img, -desplazamiento.x / escala, -desplazamiento.y / escala, lado, lado, 0, 0, LADO_SALIDA, LADO_SALIDA);
    canvas.toBlob((blob) => {
      if (blob) onConfirmar(blob, pie.trim(), origen);
    }, "image/png");
  };

  const pieValido = pie.trim().length >= 3;
  const origenValido = validarOrigenImagen(origen.origen, origen.fuente).length === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
        <div className="p-5 border-b border-slate-200">
          <h3 className="text-base font-extrabold text-slate-900">{titulo}</h3>
          <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
            La imagen se presenta a 5 x 5 cm en el informe. Arrastre para centrarla y use el control para ampliarla.
          </p>
        </div>

        <div className="p-5 space-y-4">
          <div
            className="relative mx-auto overflow-hidden border-2 border-slate-400 bg-slate-100 touch-none cursor-grab active:cursor-grabbing"
            style={{ width: LADO_VISTA, height: LADO_VISTA }}
            onPointerDown={iniciarArrastre}
            onPointerMove={moverArrastre}
            onPointerUp={terminarArrastre}
            onPointerCancel={terminarArrastre}
          >
            {url && !errorLectura && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                ref={imagenRef}
                src={url}
                alt="Imagen por recortar"
                draggable={false}
                onLoad={alCargarImagen}
                onError={() => setErrorLectura(true)}
                className="absolute max-w-none select-none"
                style={
                  dimensiones
                    ? {
                        left: desplazamiento.x,
                        top: desplazamiento.y,
                        width: dimensiones.w * escala,
                        height: dimensiones.h * escala,
                      }
                    : { visibility: "hidden" }
                }
              />
            )}
            {errorLectura && (
              <p className="absolute inset-0 flex items-center justify-center p-4 text-center text-xs font-bold text-red-700">
                No se pudo leer la imagen. Seleccione un archivo PNG o JPG.
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label htmlFor="zoom-imagen" className="block text-[10px] font-bold uppercase text-slate-400">
              Ampliación
            </label>
            <input
              id="zoom-imagen"
              type="range"
              min={1}
              max={ZOOM_MAXIMO}
              step={0.01}
              value={zoom}
              disabled={!dimensiones}
              onChange={(e) => cambiarZoom(Number(e.target.value))}
              className="w-full accent-unicaes"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="pie-imagen" className="block text-[10px] font-bold uppercase text-slate-400">
              Pie de imagen (obligatorio)
            </label>
            <input
              id="pie-imagen"
              type="text"
              value={pie}
              maxLength={255}
              onChange={(e) => setPie(e.target.value)}
              placeholder="Descripción breve de la imagen"
              className="w-full bg-white border border-border rounded-lg px-3 py-2 text-xs font-semibold focus:ring-1 focus:ring-unicaes outline-none"
            />
            {!pieValido && <p className="text-[11px] text-amber-700 font-semibold">Sin pie de imagen no es posible adjuntarla.</p>}
          </div>

          <OrigenImagenCampos idBase="recorte" valor={origen} onChange={setOrigen} />
        </div>

        <div className="p-5 border-t border-slate-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancelar}
            disabled={enviando}
            className="px-4 py-2 rounded-lg border border-border text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirmar}
            disabled={enviando || !dimensiones || !pieValido || !origenValido}
            className="px-5 py-2 rounded-lg bg-unicaes hover:bg-unicaes-hover text-white text-xs font-extrabold transition-colors disabled:opacity-50"
          >
            {enviando ? "Adjuntando..." : "Adjuntar imagen"}
          </button>
        </div>
      </div>
    </div>
  );
}
