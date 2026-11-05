"use client";

export default function BotonImprimir() {
  return (
    <button type="button" onClick={() => window.print()} className="px-3.5 py-2 rounded-lg text-sm font-bold border border-gray-300 text-gray-700 hover:bg-gray-50">
      Imprimir / PDF
    </button>
  );
}
