"use client";
// Fila de un documento con su visor plegable (A1). El visor convierte el PDF en imágenes, así que solo se carga al abrir.

import { useState } from "react";
import PdfToImagesViewer from "@/components/PdfToImagesViewer";
import { fechaCortaSV } from "@/lib/fechasTexto";

export default function DocumentoPlegable({ nombre, url, subidoEn, detalle }: { nombre: string; url: string | null; subidoEn?: string | null; detalle?: string }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <div className="rounded-lg border border-border bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-card-dark">{nombre}</p>
          <p className="text-xs text-muted">
            {url ? (subidoEn ? `Subido el ${fechaCortaSV(subidoEn)}` : "Subido") : "No se ha subido"}
            {detalle ? ` · ${detalle}` : ""}
          </p>
        </div>
        {url ? (
          <button
            type="button"
            onClick={() => setAbierto(!abierto)}
            aria-expanded={abierto}
            className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-gray-700 hover:border-brand-red hover:text-brand-red"
          >
            {abierto ? "Ocultar" : "Ver documento"}
          </button>
        ) : (
          <span className="shrink-0 rounded-full border border-brand-red/30 bg-red-50 px-2 py-0.5 text-xs font-bold text-brand-red">Falta</span>
        )}
      </div>
      {abierto && url && (
        <div className="border-t border-border bg-gray-50 px-3 pb-3">
          <PdfToImagesViewer url={url} title={nombre} />
        </div>
      )}
    </div>
  );
}
