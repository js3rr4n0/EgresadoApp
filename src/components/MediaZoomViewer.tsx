"use client";

import { useState } from "react";

interface MediaZoomViewerProps {
  url: string;
  alt?: string;
  title?: string;
  className?: string;
  isSignature?: boolean;
}

export default function MediaZoomViewer({
  url,
  alt = "Documento",
  title = "Documento / Imagen",
  className = "",
  isSignature = false,
}: MediaZoomViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  if (!url) return null;

  const isPdf = url.toLowerCase().endsWith(".pdf") || url.includes("pdf");

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => setZoomLevel(1);

  return (
    <>
      <div className={`relative group cursor-pointer w-full bg-white rounded-xl border border-slate-200 overflow-hidden ${className}`}>
        {isSignature ? (
          <div
            onClick={() => setIsOpen(true)}
            className="p-4 flex items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors relative min-h-[100px]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={alt}
              className="max-h-32 w-auto object-contain filter drop-shadow-xs mix-blend-multiply"
            />
            {/* Hover Lupa Button */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/80 text-white px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow-md">
              <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
              </svg>
              <span>Ampliar Firma</span>
            </div>
          </div>
        ) : isPdf ? (
          <div className="flex flex-col w-full">
            <div className="flex items-center justify-between p-3 bg-slate-100 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-700 truncate">{title}</span>
              <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="px-3 py-1 bg-white hover:bg-slate-200 text-indigo-700 text-xs font-bold rounded-lg border border-slate-300 flex items-center gap-1 shadow-2xs"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                </svg>
                🔍 Lupa / Pantalla Completa
              </button>
            </div>
            <iframe
              src={url}
              title={title}
              className="w-full min-h-[900px] border-none"
            />
          </div>
        ) : (
          <div
            onClick={() => setIsOpen(true)}
            className="relative bg-white flex items-center justify-center p-0 w-full"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={alt}
              className="w-full h-auto object-contain block rounded-xl shadow-xs"
            />
            {/* Hover Lupa Overlay */}
            <div className="absolute top-3 right-3 bg-slate-900/85 hover:bg-slate-900 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity">
              <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
              </svg>
              <span>Ampliar 🔍</span>
            </div>
          </div>
        )}
      </div>

      {/* FULLSCREEN LIGHTBOX / ZOOM MODAL */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6 animate-in fade-in duration-150">
          {/* Header Controls */}
          <div className="w-full max-w-5xl flex items-center justify-between bg-slate-900/95 text-white px-5 py-3 rounded-2xl border border-slate-700 shadow-2xl">
            <span className="text-sm font-bold truncate pr-4">{title}</span>

            <div className="flex items-center gap-3">
              {!isPdf && (
                <div className="flex items-center bg-slate-800 rounded-xl p-1 border border-slate-700">
                  <button
                    onClick={handleZoomOut}
                    className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white"
                    title="Alejar (-)"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                  </button>
                  <span className="text-xs font-mono font-bold px-2 text-indigo-300">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    onClick={handleZoomIn}
                    className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white"
                    title="Acercar (+)"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                  <button
                    onClick={handleResetZoom}
                    className="px-2 py-1 text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg ml-1"
                    title="Restablecer"
                  >
                    100%
                  </button>
                </div>
              )}

              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1"
              >
                Pestaña Nueva ↗
              </a>

              <button
                onClick={() => {
                  setIsOpen(false);
                  setZoomLevel(1);
                }}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-colors"
                title="Cerrar"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Modal Main View Content */}
          <div className="w-full flex-1 my-4 flex items-center justify-center overflow-auto">
            {isPdf ? (
              <iframe
                src={url}
                title={title}
                className="w-full max-w-5xl h-full rounded-2xl shadow-2xl border border-slate-700 bg-white"
              />
            ) : (
              <div className="overflow-auto max-w-5xl max-h-[82vh] flex items-center justify-center p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={alt}
                  style={{ transform: `scale(${zoomLevel})` }}
                  className="object-contain transition-transform duration-150 origin-center max-h-[78vh] rounded-lg shadow-2xl"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
