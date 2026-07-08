"use client";

import { useEffect } from "react";
import { EmpresaData } from "@/app/actions/empresas";

export default function PrintView({ empresa }: { empresa: EmpresaData }) {
  useEffect(() => {
    // Only trigger print once the page is fully loaded
    const timeoutId = setTimeout(() => {
      window.print();
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, []);

  const getMesSpanish = (date: Date) => {
    const meses = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
    return meses[date.getMonth()];
  };

  const today = new Date();
  const fechaTexto = `SANTA ANA, ${today.getDate()} DE ${getMesSpanish(today)} DE ${today.getFullYear()}`;

  return (
    <div className="bg-white min-h-screen font-sans text-black">
      {/* Portada */}
      <div className="print-page flex flex-col items-center justify-center min-h-screen text-center p-8 page-break-after">
        <h1 className="text-2xl font-bold mb-12 tracking-wide uppercase">
          UNIVERSIDAD CATÓLICA DE EL SALVADOR
        </h1>

        {/* Logo Placeholder (red circle style) */}
        <div className="w-48 h-48 rounded-full bg-[#992222] text-white flex flex-col items-center justify-center mb-12 border-4 border-amber-500 shadow-xl relative overflow-hidden">
           <div className="absolute inset-2 border border-dashed border-amber-300 rounded-full"></div>
           <span className="font-serif font-bold text-sm tracking-widest text-amber-400 mt-2">UNICAES</span>
           <div className="bg-white text-black p-2 mt-2 w-24 text-center rounded text-[10px] leading-tight font-serif">
             Litterae Sine Moribus Vanae
           </div>
        </div>
        
        <h2 className="text-xl font-bold mb-8 tracking-widest uppercase">
          INFORMACIÓN EMPRESA:
        </h2>

        <h3 className="text-2xl font-black mb-auto text-[#992222] uppercase underline underline-offset-8">
          {empresa.nombre}
        </h3>

        <div className="mt-auto pt-24 font-bold text-lg tracking-widest">
          <p className="mb-1">FECHA:</p>
          <p>{fechaTexto}</p>
        </div>
      </div>

      {/* Contenido (Info de Empresa) */}
      <div className="print-page p-12 max-w-4xl mx-auto space-y-8">
        <h2 className="text-2xl font-bold text-center border-b-2 border-[#992222] pb-4 mb-8">
          DATOS DE LA INSTITUCIÓN
        </h2>

        <div className="space-y-4 text-sm leading-relaxed">
          <div className="grid grid-cols-4 border-b border-gray-200 pb-2">
            <span className="font-bold col-span-1">Nombre:</span>
            <span className="col-span-3">{empresa.nombre}</span>
          </div>
          <div className="grid grid-cols-4 border-b border-gray-200 pb-2">
            <span className="font-bold col-span-1">Área o Sector:</span>
            <span className="col-span-3">{empresa.area || "No especificado"}</span>
          </div>
          <div className="grid grid-cols-4 border-b border-gray-200 pb-2">
            <span className="font-bold col-span-1">Dirección:</span>
            <span className="col-span-3">{empresa.direccion || "No especificada"}</span>
          </div>
          {empresa.mapaUrl && (
            <div className="grid grid-cols-4 border-b border-gray-200 pb-2">
              <span className="font-bold col-span-1">Mapa/GPS:</span>
              <span className="col-span-3 text-blue-600">{empresa.mapaUrl}</span>
            </div>
          )}
          <div className="pt-2">
            <span className="font-bold block mb-1">Descripción:</span>
            <p className="text-justify text-gray-700">{empresa.descripcion || "No especificada"}</p>
          </div>
          <div className="pt-2">
            <span className="font-bold block mb-1">Antecedentes:</span>
            <p className="text-justify text-gray-700">{empresa.antecedentes || "No especificados"}</p>
          </div>
        </div>

        {/* Supervisores */}
        <h2 className="text-2xl font-bold text-center border-b-2 border-[#992222] pb-4 mt-12 mb-8">
          SUPERVISORES / CONTACTOS
        </h2>
        
        {empresa.supervisores && empresa.supervisores.length > 0 ? (
          <div className="space-y-6">
            {empresa.supervisores.map((sup, idx) => (
              <div key={idx} className="border border-gray-300 p-4 rounded-lg bg-gray-50">
                <p className="font-bold text-lg mb-2">{sup.titulo} {sup.nombres} {sup.apellidos}</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p><span className="font-semibold">Cargo:</span> {sup.cargo || "N/A"}</p>
                  <p><span className="font-semibold">Especialidad:</span> {sup.especialidad || "N/A"}</p>
                  <p><span className="font-semibold">Teléfono:</span> {sup.telefono || "N/A"}</p>
                  <p><span className="font-semibold">Correo:</span> {sup.correo || "N/A"}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center italic text-gray-500">No hay supervisores registrados.</p>
        )}

        {/* Firmantes */}
        <h2 className="text-2xl font-bold text-center border-b-2 border-[#992222] pb-4 mt-12 mb-8 page-break-before">
          FIRMANTES LEGALES
        </h2>
        
        {empresa.firmantes && empresa.firmantes.length > 0 ? (
          <div className="space-y-8">
            {empresa.firmantes.map((firm, idx) => (
              <div key={idx} className="border border-gray-300 p-6 rounded-lg bg-white relative">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="font-bold text-xl mb-1">{firm.titulo} {firm.nombres} {firm.apellidos}</p>
                    <p className="font-bold text-[#992222] mb-4">{firm.cargo}</p>
                    <div className="text-sm space-y-1">
                      <p><span className="font-semibold">Teléfono:</span> {firm.telefono || "N/A"}</p>
                      <p><span className="font-semibold">Correo:</span> {firm.correo || "N/A"}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center border-l border-gray-200 pl-4">
                    <p className="font-semibold text-xs text-gray-400 mb-2 uppercase tracking-widest">Firma Registrada</p>
                    {firm.firmaUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={firm.firmaUrl} alt={`Firma de ${firm.nombres}`} className="max-h-24 object-contain" />
                    ) : (
                      <div className="h-16 w-32 border-b-2 border-dashed border-gray-300 flex items-end justify-center pb-1">
                        <span className="text-gray-300 text-xs italic">Sin firma digital</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center italic text-gray-500">No hay firmantes registrados.</p>
        )}
      </div>

      <style jsx global>{`
        @media print {
          body {
            background-color: white !important;
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }
          .page-break-after {
            page-break-after: always;
          }
          .page-break-before {
            page-break-before: always;
          }
          /* Hide all Next.js UI elements, assume this takes over */
          nav, header, footer { display: none !important; }
        }
      `}</style>
    </div>
  );
}
