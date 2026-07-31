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

  const isDirectImage =
    url.match(/\.(jpeg|jpg|gif|png|webp|svg)(\?.*)?$/i) ||
    url.startsWith("data:image/");

  useEffect(() => {
    let isMounted = true;

    if (isDirectImage) {
      setImages([url]);
      setLoading(false);
      return;
    }

    const loadPdfJs = async () => {
      try {
        if (!(window as any).pdfjsLib) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("No se pudo cargar la librería de PDF.js"));
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
          const viewport = page.getViewport({ scale: 2.2 }); // Ultra HD quality render
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
        console.error("Error convirtiendo PDF a imágenes:", err);
        if (isMounted) {
          // Fallback to single URL image or show error with direct link
          setError(err.message || "No se pudo convertir el PDF.");
          setImages([url]);
          setLoading(false);
        }
      }
    };

    loadPdfJs();

    return () => {
      isMounted = false;
    };
  }, [url, isDirectImage]);

  if (loading) {
    return (
      <div className="pt-8 flex flex-col items-center justify-center min-h-[300px] border border-slate-200 rounded-2xl bg-slate-50 p-8 my-4 text-center">
        <div className="w-10 h-10 border-4 border-rose-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-bold text-slate-800 text-sm">Generando páginas en formato foto ({title})...</p>
        <p className="text-xs text-slate-500 mt-1">Renderizando documento en alta resolución...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full my-6">
      {images.map((imgSrc, index) => {
        const pageTitle = `${title} ${images.length > 1 ? `(PÁGINA ${index + 1} DE ${images.length})` : ""}`;
        return (
          <div key={index} className="pt-6 flex flex-col items-center w-full">
            <h2 className="text-base font-black uppercase mb-3 border-b-2 border-rose-600 pb-2 w-full text-slate-900 tracking-wider">
              {pageTitle}
            </h2>
            <div className="w-full bg-white border border-slate-300 shadow-md rounded-xl p-1">
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
