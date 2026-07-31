"use client";

import { useEffect, useState } from "react";
import MediaZoomViewer from "./MediaZoomViewer";

interface PdfToImagesViewerProps {
  url: string;
  title: string;
}

export default function PdfToImagesViewer({ url, title }: PdfToImagesViewerProps) {
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  if (!url) return null;

  const isDirectImage =
    Boolean(url.match(/\.(jpeg|jpg|gif|png|webp|svg)(\?.*)?$/i)) ||
    url.startsWith("data:image/");

  useEffect(() => {
    let isMounted = true;

    if (isDirectImage) {
      setImages([url]);
      setLoading(false);
      return;
    }

    const loadPdfJsAndRenderPages = async () => {
      try {
        if (!(window as any).pdfjsLib) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("No se pudo cargar la librería PDF.js"));
            document.body.appendChild(script);
          });
        }

        const pdfjsLib = (window as any).pdfjsLib;
        if (!pdfjsLib) throw new Error("pdfjsLib no disponible.");

        pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

        // Fetch PDF file as ArrayBuffer to bypass CORS and URL loading restrictions
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status} al descargar el archivo.`);
        const arrayBuffer = await response.arrayBuffer();

        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        const pageImages: string[] = [];

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 2.0 }); // Ultra crisp resolution
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          if (context) {
            await page.render({ canvasContext: context, viewport }).promise;
            pageImages.push(canvas.toDataURL("image/png"));
          }
        }

        if (isMounted) {
          setImages(pageImages);
          setLoading(false);
        }
      } catch (err: any) {
        console.error("Error convirtiendo PDF a foto:", err);
        if (isMounted) {
          setError(err.message || "Error al procesar el archivo PDF.");
          setLoading(false);
        }
      }
    };

    loadPdfJsAndRenderPages();

    return () => {
      isMounted = false;
    };
  }, [url, isDirectImage]);

  if (loading) {
    return (
      <div className="pt-6 flex flex-col items-center justify-center min-h-[250px] border border-slate-200 rounded-2xl bg-slate-50 p-6 my-4 text-center">
        <div className="w-9 h-9 border-4 border-rose-600 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="font-bold text-slate-800 text-xs">Cargando documento en formato foto ({title})...</p>
        <p className="text-[11px] text-slate-500 mt-1">Renderizando páginas sin deslizadores...</p>
      </div>
    );
  }

  if (error || images.length === 0) {
    return (
      <div className="pt-6 flex flex-col items-center w-full">
        <h2 className="text-sm font-black uppercase mb-3 border-b-2 border-rose-600 pb-2 w-full text-slate-900 tracking-wider">
          {title}
        </h2>
        <div className="w-full bg-slate-50 border border-slate-300 rounded-xl p-6 text-center space-y-3">
          <p className="text-xs font-bold text-slate-700">Visualización de foto de documento</p>
          <MediaZoomViewer url={url} title={title} alt={title} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full my-6">
      {images.map((imgSrc, index) => {
        const pageTitle = `${title} ${images.length > 1 ? `(PÁGINA ${index + 1} DE ${images.length})` : ""}`;
        return (
          <div key={index} className="pt-6 flex flex-col items-center w-full">
            <h2 className="text-sm font-black uppercase mb-3 border-b-2 border-rose-600 pb-2 w-full text-slate-900 tracking-wider">
              {pageTitle}
            </h2>
            <div className="w-full bg-white border border-slate-300 shadow-md rounded-xl p-2">
              <MediaZoomViewer
                url={imgSrc}
                title={pageTitle}
                alt={pageTitle}
                className="w-full"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
