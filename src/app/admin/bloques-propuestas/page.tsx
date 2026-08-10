import React from 'react';

export const metadata = {
  title: 'Editar Bloques Propuestas | Gestión TG UNICAES',
};

export default function EditarBloquesPropuestasPage() {
  return (
    <div className="p-6 h-full flex flex-col items-center justify-center min-h-[60vh]">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center max-w-lg w-full">
        <svg className="w-16 h-16 mx-auto text-[#CC292B] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">¡Próximamente!</h1>
        <p className="text-gray-500">Este módulo para editar los bloques de las propuestas estará disponible en una futura actualización.</p>
      </div>
    </div>
  );
}
