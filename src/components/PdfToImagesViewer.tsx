"use client";

import { useEffect, useState } from "react";

interface PdfToImagesViewerProps {
  url: string;
  title: string;
}

export default function PdfToImagesViewer({ url, title }: PdfToImagesViewerProps) {
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadPdfJs = async () => {
      try {
        // Check if window.pdfjsLib is loaded
        if (!(window as any).pdfjsLib) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("No se pudo cargar el visor de PDF."));
            document.body.appendChild(script);
          });
        }

        const pdfjsLib = (window as any).pdfjsLib;
        if (!pdfjsLib) throw new Error("pdfjsLib no disponible.");

        pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

        const loadingTask = pdfjsLib.getDocument(url);
        const pdf = await loadingTask.promise;
        const pageImages: string[] = [];

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 2.0 }); // High quality resolution
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
        console.error("Error convirtiendo PDF:", err);
        if (isMounted) {
          setError(err.message || "Error al renderizar el documento PDF.");
          setLoading(false);
        }
      }
    };

    loadPdfJs();

    return () => {
      isMounted = false;
    };
  }, [url]);

  if (loading) {
    return (
      <div style={{ pageBreakAfter: "always" }} className="pt-8 flex flex-col items-center justify-center min-h-[400px] border rounded bg-slate-50 p-8 my-4 text-center">
        <div className="w-10 h-10 border-4 border-brand-red border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-bold text-card-dark text-sm">Convertiendo PDF a imágenes ({title})...</p>
        <p className="text-xs text-muted mt-1">Generando vista previa de alta calidad...</p>
      </div>
    );
  }

  if (error || images.length === 0) {
    return (
      <div style={{ pageBreakAfter: "always" }} className="pt-8 flex flex-col items-center">
        <h2 className="text-lg font-bold uppercase mb-4 border-b-2 border-brand-red pb-2 w-full text-center">
          {title}
        </h2>
        <div className="w-full h-[600px] border shadow-sm relative flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
          <p className="font-bold text-amber-700">No se pudieron renderizar las páginas del PDF.</p>
          <p className="text-xs text-gray-500 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {images.map((imgSrc, index) => (
        <div key={index} style={{ pageBreakAfter: "always" }} className="pt-8 flex flex-col items-center w-full">
          <h2 className="text-lg font-bold uppercase mb-4 border-b-2 border-brand-red pb-2 w-full text-center">
            {title} {images.length > 1 ? `(Página ${index + 1} de ${images.length})` : ""}
          </h2>
          <div className="w-full flex justify-center border shadow-sm rounded overflow-hidden bg-white p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imgSrc}
              alt={`${title} - Página ${index + 1}`}
              className="max-w-full h-auto object-contain max-h-[1050px]"
            />
          </div>
        </div>
      ))}
    </>
  );
}
