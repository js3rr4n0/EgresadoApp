"use client";

import { useEffect, useRef, useState } from "react";
import { EmpresaData } from "@/app/actions/empresas";

const getStaticMapUrl = (coords: string) => {
  if (!coords || !coords.includes(',')) return null;
  const [lat, lng] = coords.split(',');
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=16&size=800x400&markers=${lat},${lng},red-pushpin`;
};

export default function PrintView({ empresa }: { empresa: EmpresaData }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("Preparando documento...");

  useEffect(() => {
    const generatePDF = async () => {
      try {
        if (typeof window === "undefined" || !contentRef.current) return;
        
        setStatus("Generando PDF (Motor Nativo)...");
        
        // Dynamic imports
        const domtoimage = (await import("dom-to-image-more")).default;
        const { jsPDF } = await import("jspdf");

        // Wait a bit for images and maps to load
        await new Promise(r => setTimeout(r, 2500));
        
        // Use dom-to-image-more which relies on browser's native engine (avoids CSS parser crash)
        const imgData = await domtoimage.toJpeg(contentRef.current, {
          quality: 0.98,
          bgcolor: '#ffffff',
          style: {
            transform: 'scale(2)',
            transformOrigin: 'top left',
            width: contentRef.current.offsetWidth + 'px',
            height: contentRef.current.offsetHeight + 'px'
          },
          width: contentRef.current.offsetWidth * 2,
          height: contentRef.current.offsetHeight * 2,
        });
        
        // Create PDF (Letter size is 8.5 x 11 inches)
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'in',
          format: 'letter'
        });

        // 8.5 inches wide, calculate scaled height
        const pdfWidth = 8.5;
        // height in inches = (pixel height / pixel width) * 8.5
        const pdfHeight = (contentRef.current.offsetHeight / contentRef.current.offsetWidth) * pdfWidth;
        
        let position = 0;
        let pageHeight = 11; // letter height in inches
        let heightLeft = pdfHeight;

        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
          position = heightLeft - pdfHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
          heightLeft -= pageHeight;
        }

        setStatus("Descargando...");
        pdf.save(`Empresa_${empresa.nombre.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
        
        setStatus("¡Descarga completada! Puedes cerrar esta pestaña.");
        
        // Close window after short delay
        setTimeout(() => {
          window.close();
        }, 3000);
      } catch (error: any) {
        console.error("Error generating PDF:", error);
        setStatus(`Error: ${error?.message || 'Error desconocido'}`);
      }
    };

    generatePDF();
  }, [empresa.nombre]);

  const getMesSpanish = (date: Date) => {
    const meses = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
    return meses[date.getMonth()];
  };

  const today = new Date();
  const fechaTexto = `SANTA ANA, ${today.getDate()} DE ${getMesSpanish(today)} DE ${today.getFullYear()}`;

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      {/* Loading Overlay */}
      <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-4 border-brand-red border-t-transparent rounded-full animate-spin mb-4"></div>
        <h2 className="text-xl font-bold text-gray-800">{status}</h2>
        <p className="text-gray-500 mt-2">La descarga iniciará automáticamente.</p>
        <button onClick={() => window.close()} className="mt-8 px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-bold text-sm text-gray-700 transition">
          Cerrar Pestaña
        </button>
      </div>

      {/* Hidden Content for PDF */}
      <div className="absolute left-[-9999px] top-[-9999px]">
        <div ref={contentRef} className="bg-white font-sans text-black w-[8.5in]">
          {/* Portada */}
          <div className="flex flex-col items-center justify-center text-center p-12 min-h-[11in] page-break-after">
            <h1 className="text-3xl font-bold mt-12 mb-16 tracking-wide uppercase">
              UNIVERSIDAD CATÓLICA DE EL SALVADOR
            </h1>

            {/* UNICAES Logo */}
            <div className="mb-16">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src="/unicaes-logo.png" 
                alt="UNICAES Logo" 
                className="w-64 h-64 object-contain"
              />
            </div>
            
            <h2 className="text-2xl font-bold mb-12 tracking-widest uppercase">
              INFORMACIÓN EMPRESA:
            </h2>

            <h3 className="text-3xl font-black mb-auto text-[#992222] uppercase underline underline-offset-8">
              {empresa.nombre}
            </h3>

            <div className="mt-auto pt-32 pb-12 font-bold text-xl tracking-widest">
              <p className="mb-2">FECHA:</p>
              <p>{fechaTexto}</p>
            </div>
          </div>

          {/* Contenido (Info de Empresa) */}
          <div className="p-12 space-y-8 min-h-[11in]">
            <h2 className="text-2xl font-bold text-center border-b-2 border-[#992222] pb-4 mb-8">
              DATOS DE LA INSTITUCIÓN
            </h2>

            <div className="space-y-4 text-base leading-relaxed">
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
                <div className="pt-4 border-t border-gray-200 mt-4">
                  <span className="font-bold block mb-2">Ubicación (Sede Central):</span>
                  <div className="border border-gray-300 p-1 rounded bg-gray-50 h-[300px] flex items-center justify-center overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={getStaticMapUrl(empresa.mapaUrl) || ""} 
                      alt="Mapa Sede Central" 
                      className="w-full h-full object-cover rounded"
                      crossOrigin="anonymous"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1 text-center">Coordenadas: {empresa.mapaUrl}</p>
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

            {/* Sucursales */}
            {empresa.sucursales && empresa.sucursales.length > 0 && (
              <>
                <h2 className="text-2xl font-bold text-center border-b-2 border-[#992222] pb-4 mt-12 mb-8 page-break-before">
                  SUCURSALES
                </h2>
                <div className="space-y-8">
                  {empresa.sucursales.map((suc, idx) => (
                    <div key={idx} className="border border-gray-300 p-6 rounded-lg bg-white shadow-sm">
                      <h3 className="font-bold text-xl mb-4 text-[#992222] uppercase">{suc.nombre}</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                        <p><span className="font-semibold">Dirección:</span> {suc.direccion || "N/A"}</p>
                        <p><span className="font-semibold">Teléfono:</span> {suc.telefono || "N/A"}</p>
                      </div>
                      
                      {suc.mapaUrl && (
                        <div className="border-t border-gray-200 pt-4 mt-2">
                          <span className="font-bold block mb-2 text-sm">Mapa de Sucursal:</span>
                          <div className="border border-gray-300 p-1 rounded bg-gray-50 h-[250px] flex items-center justify-center overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img 
                              src={getStaticMapUrl(suc.mapaUrl) || ""} 
                              alt={`Mapa Sucursal ${suc.nombre}`} 
                              className="w-full h-full object-cover rounded"
                              crossOrigin="anonymous"
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1 text-center">Coordenadas: {suc.mapaUrl}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

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
                          <img src={firm.firmaUrl} alt={`Firma de ${firm.nombres}`} className="max-h-24 object-contain" crossOrigin="anonymous" />
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
        </div>
      </div>

      <style jsx global>{`
        .page-break-after {
          page-break-after: always;
        }
        .page-break-before {
          page-break-before: always;
        }
      `}</style>
    </div>
  );
}
