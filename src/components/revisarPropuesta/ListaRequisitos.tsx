// D1 (specs/COORDINADOR_ASIGNACION.md): lista de lo que el sistema y la administración verificaron antes de asignar.
// Sirve en el servidor y en el cliente (solo muestra datos).

import type { Requisito } from "@/lib/requisitosAsignacionServidor";

export default function ListaRequisitos({ requisitos, compacta = false }: { requisitos: Requisito[]; compacta?: boolean }) {
  if (!requisitos.length) return null;
  return (
    <ul className={compacta ? "space-y-1.5" : "space-y-2"}>
      {requisitos.map((r) => (
        <li key={r.clave} className="flex items-start gap-2">
          <span
            className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${r.cumple ? "bg-emerald-600 text-white" : "bg-red-100 text-red-700 border border-red-300"}`}
            aria-hidden="true"
          >
            {r.cumple ? (
              <svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>
            ) : (
              <svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M6 18L18 6M6 6l12 12" /></svg>
            )}
          </span>
          <span className="min-w-0">
            <span className={`block text-xs font-bold ${r.cumple ? "text-gray-800" : "text-red-800"}`}>
              {r.titulo}
              <span className="sr-only">{r.cumple ? " (cumple)" : " (no cumple)"}</span>
            </span>
            <span className="block text-[11px] text-gray-600">{r.detalle}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
